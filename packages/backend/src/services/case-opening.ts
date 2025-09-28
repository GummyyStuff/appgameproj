/**
 * Case Opening Service for Tarkov Casino Website
 * Handles case opening logic with provably fair item selection
 */

import { DatabaseService } from './database'
import { supabaseAdmin } from '../config/supabase'
import { SecureRandomGenerator } from './game-engine/random-generator'

export interface CaseType {
  id: string
  name: string
  price: number
  description: string
  image_url?: string
  rarity_distribution: RarityDistribution
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TarkovItem {
  id: string
  name: string
  rarity: ItemRarity
  base_value: number
  category: ItemCategory
  image_url?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CaseItemPool {
  id: string
  case_type_id: string
  item_id: string
  weight: number
  value_multiplier: number
  created_at: string
}

export interface CaseOpeningResult {
  case_type: CaseType
  item_won: TarkovItem
  currency_awarded: number
  opening_id: string
  timestamp: string
}

export interface RarityDistribution {
  common: number    // 60%
  uncommon: number  // 25%
  rare: number      // 10%
  epic: number      // 4%
  legendary: number // 1%
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type ItemCategory = 'medical' | 'electronics' | 'consumables' | 'valuables' | 'keycards'

export interface WeightedItem {
  item: TarkovItem
  weight: number
  value_multiplier: number
  effective_value: number
}

export class CaseOpeningService {
  private static randomGenerator = new SecureRandomGenerator()

  /**
   * Get all available case types
   */
  static async getCaseTypes(): Promise<CaseType[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('case_types')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true })

      if (error) {
        console.error('Error fetching case types:', error)
        throw new Error('Failed to fetch case types')
      }

      return data || []
    } catch (error) {
      console.error('Error in getCaseTypes:', error)
      throw new Error('Failed to retrieve case types')
    }
  }

  /**
   * Get a specific case type by ID
   */
  static async getCaseType(caseTypeId: string): Promise<CaseType | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('case_types')
        .select('*')
        .eq('id', caseTypeId)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Case type not found
        }
        console.error('Error fetching case type:', error)
        throw new Error('Failed to fetch case type')
      }

      return data
    } catch (error) {
      console.error('Error in getCaseType:', error)
      throw new Error('Failed to retrieve case type')
    }
  }

  /**
   * Get item pool for a specific case type
   */
  static async getItemPool(caseTypeId: string): Promise<WeightedItem[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('case_item_pools')
        .select(`
          *,
          tarkov_items (*)
        `)
        .eq('case_type_id', caseTypeId)
        .eq('tarkov_items.is_active', true)

      if (error) {
        console.error('Error fetching item pool:', error)
        throw new Error('Failed to fetch item pool')
      }

      if (!data || data.length === 0) {
        throw new Error('No items found for this case type')
      }

      // Transform the data into WeightedItem format
      const weightedItems: WeightedItem[] = data.map((poolItem: any) => ({
        item: poolItem.tarkov_items,
        weight: poolItem.weight,
        value_multiplier: poolItem.value_multiplier,
        effective_value: poolItem.tarkov_items.base_value * poolItem.value_multiplier
      }))

      return weightedItems
    } catch (error) {
      console.error('Error in getItemPool:', error)
      throw new Error('Failed to retrieve item pool')
    }
  }

  /**
   * Select a random item from the case using provably fair algorithm
   */
  static async selectRandomItem(caseType: CaseType, itemPool: WeightedItem[]): Promise<WeightedItem> {
    try {
      // First, filter items by rarity based on the case's rarity distribution
      const selectedRarity = await this.selectRarityByDistribution(caseType.rarity_distribution)
      
      // Filter items by the selected rarity
      const rarityFilteredItems = itemPool.filter(weightedItem => 
        weightedItem.item.rarity === selectedRarity
      )

      if (rarityFilteredItems.length === 0) {
        throw new Error(`No items found for rarity: ${selectedRarity}`)
      }

      // Calculate total weight for the filtered items
      const totalWeight = rarityFilteredItems.reduce((sum, item) => sum + item.weight, 0)
      
      if (totalWeight <= 0) {
        throw new Error('Invalid total weight for item selection')
      }

      // Generate random number for item selection
      const randomValue = await this.randomGenerator.generateSecureRandom()
      const targetWeight = randomValue * totalWeight

      // Select item based on weighted probability
      let currentWeight = 0
      for (const weightedItem of rarityFilteredItems) {
        currentWeight += weightedItem.weight
        if (targetWeight <= currentWeight) {
          return weightedItem
        }
      }

      // Fallback to last item (should not happen with proper weights)
      return rarityFilteredItems[rarityFilteredItems.length - 1]
    } catch (error) {
      console.error('Error in selectRandomItem:', error)
      throw new Error('Failed to select random item')
    }
  }

  /**
   * Select rarity based on case distribution using provably fair algorithm
   */
  private static async selectRarityByDistribution(distribution: RarityDistribution): Promise<ItemRarity> {
    try {
      // Normalize distribution to ensure it adds up to 100
      const total = distribution.common + distribution.uncommon + distribution.rare + 
                   distribution.epic + distribution.legendary
      
      if (total <= 0) {
        throw new Error('Invalid rarity distribution')
      }

      // Generate random number between 0 and total
      const randomValue = await this.randomGenerator.generateSecureRandom()
      const targetValue = randomValue * total

      // Select rarity based on cumulative distribution
      let cumulative = 0
      
      cumulative += distribution.legendary
      if (targetValue <= cumulative) return 'legendary'
      
      cumulative += distribution.epic
      if (targetValue <= cumulative) return 'epic'
      
      cumulative += distribution.rare
      if (targetValue <= cumulative) return 'rare'
      
      cumulative += distribution.uncommon
      if (targetValue <= cumulative) return 'uncommon'
      
      // Default to common (should cover remaining probability)
      return 'common'
    } catch (error) {
      console.error('Error in selectRarityByDistribution:', error)
      throw new Error('Failed to select rarity')
    }
  }

  /**
   * Calculate currency value for an item
   */
  static calculateItemValue(item: TarkovItem, valueMultiplier: number): number {
    return Math.floor(item.base_value * valueMultiplier)
  }

  /**
   * Preview a case opening result without processing transactions
   */
  static async previewCase(userId: string, caseTypeId: string): Promise<CaseOpeningResult> {
    try {
      // Get case type
      const caseType = await this.getCaseType(caseTypeId)
      if (!caseType) {
        throw new Error('Case type not found or inactive')
      }

      // Get item pool for the case
      const itemPool = await this.getItemPool(caseTypeId)
      if (itemPool.length === 0) {
        throw new Error('No items available for this case type')
      }

      // Select random item using provably fair algorithm
      const selectedWeightedItem = await this.selectRandomItem(caseType, itemPool)

      // Calculate currency awarded
      const currencyAwarded = this.calculateItemValue(
        selectedWeightedItem.item,
        selectedWeightedItem.value_multiplier
      )

      // Generate unique opening ID (preview)
      const openingId = `preview_${Date.now()}_${userId.slice(-8)}`

      // Create result object
      const result: CaseOpeningResult = {
        case_type: caseType,
        item_won: selectedWeightedItem.item,
        currency_awarded: currencyAwarded,
        opening_id: openingId,
        timestamp: new Date().toISOString()
      }

      return result
    } catch (error) {
      console.error('Error in previewCase:', error)
      throw new Error('Failed to preview case')
    }
  }

  /**
   * Open a case and return the result
   */
  static async openCase(userId: string, caseTypeId: string): Promise<CaseOpeningResult> {
    try {
      // Get case type
      const caseType = await this.getCaseType(caseTypeId)
      if (!caseType) {
        throw new Error('Case type not found or inactive')
      }

      // Get item pool for the case
      const itemPool = await this.getItemPool(caseTypeId)
      if (itemPool.length === 0) {
        throw new Error('No items available for this case type')
      }

      // Select random item using provably fair algorithm
      const selectedWeightedItem = await this.selectRandomItem(caseType, itemPool)

      // Calculate currency awarded
      const currencyAwarded = this.calculateItemValue(
        selectedWeightedItem.item,
        selectedWeightedItem.value_multiplier
      )

      // Generate unique opening ID
      const openingId = `case_${Date.now()}_${userId.slice(-8)}`

      // Create result object
      const result: CaseOpeningResult = {
        case_type: caseType,
        item_won: selectedWeightedItem.item,
        currency_awarded: currencyAwarded,
        opening_id: openingId,
        timestamp: new Date().toISOString()
      }

      return result
    } catch (error) {
      console.error('Error in openCase:', error)
      throw new Error('Failed to open case')
    }
  }

  /**
   * Get case opening statistics for a user
   */
  static async getCaseOpeningStats(userId: string) {
    try {
      // Get case opening history from game_history table
      const { data, error } = await supabaseAdmin
        .from('game_history')
        .select('*')
        .eq('user_id', userId)
        .eq('game_type', 'case_opening')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching case opening stats:', error)
        throw new Error('Failed to fetch case opening statistics')
      }

      const caseOpenings = data || []
      
      // Calculate statistics
      const totalCasesOpened = caseOpenings.length
      const totalSpent = caseOpenings.reduce((sum, opening) => sum + opening.bet_amount, 0)
      const totalWon = caseOpenings.reduce((sum, opening) => sum + opening.win_amount, 0)
      const netProfit = totalWon - totalSpent

      // Group by rarity (from result_data)
      const rarityStats: Record<ItemRarity, number> = {
        common: 0,
        uncommon: 0,
        rare: 0,
        epic: 0,
        legendary: 0
      }

      caseOpenings.forEach(opening => {
        const resultData = opening.result_data as any
        if (resultData && resultData.item_rarity) {
          rarityStats[resultData.item_rarity as ItemRarity]++
        }
      })

      return {
        total_cases_opened: totalCasesOpened,
        total_spent: totalSpent,
        total_won: totalWon,
        net_profit: netProfit,
        rarity_breakdown: rarityStats,
        recent_openings: caseOpenings.slice(0, 10) // Last 10 openings
      }
    } catch (error) {
      console.error('Error in getCaseOpeningStats:', error)
      throw new Error('Failed to get case opening statistics')
    }
  }

  /**
   * Validate case opening request
   */
  static async validateCaseOpening(userId: string, caseTypeId: string): Promise<{
    isValid: boolean
    error?: string
    caseType?: CaseType
  }> {
    try {
      // Check if case type exists and is active
      const caseType = await this.getCaseType(caseTypeId)
      if (!caseType) {
        return {
          isValid: false,
          error: 'Case type not found or inactive'
        }
      }

      // Check if user has sufficient balance
      const userBalance = await DatabaseService.getUserBalance(userId)
      if (userBalance < caseType.price) {
        return {
          isValid: false,
          error: `Insufficient balance. Required: ${caseType.price}, Available: ${userBalance}`
        }
      }

      // Check if case has items
      const itemPool = await this.getItemPool(caseTypeId)
      if (itemPool.length === 0) {
        return {
          isValid: false,
          error: 'No items available for this case type'
        }
      }

      return {
        isValid: true,
        caseType
      }
    } catch (error) {
      console.error('Error in validateCaseOpening:', error)
      return {
        isValid: false,
        error: 'Failed to validate case opening request'
      }
    }
  }
}