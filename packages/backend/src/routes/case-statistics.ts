/**
 * Case Opening Statistics API routes
 * Provides detailed statistics about items won from case openings
 */

import { Hono, type Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { criticalAuthMiddleware } from '../middleware/auth'
import { asyncHandler } from '../middleware/error'
import { appwriteDb } from '../services/appwrite-database'
import { COLLECTION_IDS } from '../config/collections'
import type { CaseOpeningResult } from '../types/database'

export const caseStatisticsRoutes = new Hono()

// 🔐 SECURITY: All case statistics routes require authentication
caseStatisticsRoutes.use('*', criticalAuthMiddleware)

interface CaseItemStats {
  item_id: string
  item_name: string
  item_rarity: string
  item_category: string
  count: number
  total_value: number
  average_value: number
  percentage: number
  first_won: string
  last_won: string
}

interface CaseStatisticsResponse {
  success: boolean
  statistics: {
    total_cases_opened: number
    total_items_won: number
    total_value_won: number
    average_case_value: number
    items_by_frequency: CaseItemStats[]
    items_by_value: CaseItemStats[]
    rarity_distribution: {
      rarity: string
      count: number
      percentage: number
      total_value: number
    }[]
    category_distribution: {
      category: string
      count: number
      percentage: number
    }[]
    most_common_item: CaseItemStats | null
    rarest_item: CaseItemStats | null
    highest_value_item: CaseItemStats | null
  }
  generated_at: string
}

/**
 * GET /api/case-statistics
 * Get comprehensive case opening item win statistics for the authenticated user
 */
caseStatisticsRoutes.get('/', asyncHandler(async (c: Context) => {
  const user = c.get('user')

  try {
    console.log(`📊 Fetching case statistics for user: ${user.id}`)

    // Query all case opening games for this user
    const queries = [
      appwriteDb.equal('userId', user.id),
      appwriteDb.equal('gameType', 'case_opening'),
      appwriteDb.orderDesc('createdAt'),
      appwriteDb.limit(1000) // Reasonable limit for statistics
    ]

    const { data: games, error } = await appwriteDb.listDocuments(
      COLLECTION_IDS.GAME_HISTORY,
      queries
    )

    if (error) {
      console.error('❌ Error fetching case opening games:', error)
      throw new HTTPException(500, { message: 'Failed to fetch case opening statistics' })
    }

    if (!games || games.length === 0) {
      // Return empty statistics
      return c.json<CaseStatisticsResponse>({
        success: true,
        statistics: {
          total_cases_opened: 0,
          total_items_won: 0,
          total_value_won: 0,
          average_case_value: 0,
          items_by_frequency: [],
          items_by_value: [],
          rarity_distribution: [],
          category_distribution: [],
          most_common_item: null,
          rarest_item: null,
          highest_value_item: null
        },
        generated_at: new Date().toISOString()
      })
    }

    console.log(`✅ Found ${games.length} case opening games`)

    // Map to extract case opening results
    const itemWins = new Map<string, {
      item_id: string
      item_name: string
      item_rarity: string
      item_category: string
      wins: { value: number; timestamp: string }[]
    }>()

    const rarityCount = new Map<string, { count: number; total_value: number }>()
    const categoryCount = new Map<string, number>()

    let totalValue = 0

    // Process each game
    games.forEach((game: any) => {
      try {
        // Parse result_data (might be string or object)
        const resultData: CaseOpeningResult = 
          typeof game.resultData === 'string' 
            ? JSON.parse(game.resultData) 
            : game.resultData

        if (!resultData || !resultData.item_id) {
          console.warn(`⚠️ Game ${game.$id} has invalid result_data`)
          return
        }

        const itemKey = resultData.item_id
        const itemValue = resultData.item_value || resultData.currency_awarded || 0

        totalValue += itemValue

        // Track item wins
        if (!itemWins.has(itemKey)) {
          itemWins.set(itemKey, {
            item_id: resultData.item_id,
            item_name: resultData.item_name,
            item_rarity: resultData.item_rarity,
            item_category: resultData.item_category,
            wins: []
          })
        }

        itemWins.get(itemKey)!.wins.push({
          value: itemValue,
          timestamp: game.createdAt
        })

        // Track rarity distribution
        const rarity = resultData.item_rarity
        if (!rarityCount.has(rarity)) {
          rarityCount.set(rarity, { count: 0, total_value: 0 })
        }
        const rarityData = rarityCount.get(rarity)!
        rarityData.count++
        rarityData.total_value += itemValue

        // Track category distribution
        const category = resultData.item_category
        categoryCount.set(category, (categoryCount.get(category) || 0) + 1)
      } catch (parseError) {
        console.error(`❌ Error parsing game ${game.$id}:`, parseError)
      }
    })

    // Calculate item statistics
    const itemStats: CaseItemStats[] = Array.from(itemWins.entries()).map(([_, itemData]) => {
      const wins = itemData.wins
      const count = wins.length
      const total_value = wins.reduce((sum, w) => sum + w.value, 0)
      const average_value = total_value / count
      const percentage = (count / games.length) * 100

      // Find first and last won timestamps
      const timestamps = wins.map(w => w.timestamp).sort()
      const first_won = timestamps[0]
      const last_won = timestamps[timestamps.length - 1]

      return {
        item_id: itemData.item_id,
        item_name: itemData.item_name,
        item_rarity: itemData.item_rarity,
        item_category: itemData.item_category,
        count,
        total_value,
        average_value,
        percentage,
        first_won,
        last_won
      }
    })

    // Sort by frequency (most common first)
    const itemsByFrequency = [...itemStats].sort((a, b) => b.count - a.count)

    // Sort by total value
    const itemsByValue = [...itemStats].sort((a, b) => b.total_value - a.total_value)

    // Calculate rarity distribution
    const rarityDistribution = Array.from(rarityCount.entries()).map(([rarity, data]) => ({
      rarity,
      count: data.count,
      percentage: (data.count / games.length) * 100,
      total_value: data.total_value
    })).sort((a, b) => b.count - a.count)

    // Calculate category distribution
    const categoryDistribution = Array.from(categoryCount.entries()).map(([category, count]) => ({
      category,
      count,
      percentage: (count / games.length) * 100
    })).sort((a, b) => b.count - a.count)

    // Find notable items
    const mostCommonItem = itemsByFrequency[0] || null
    const rarestItem = itemsByFrequency[itemsByFrequency.length - 1] || null
    const highestValueItem = itemsByValue[0] || null

    const response: CaseStatisticsResponse = {
      success: true,
      statistics: {
        total_cases_opened: games.length,
        total_items_won: games.length,
        total_value_won: totalValue,
        average_case_value: totalValue / games.length,
        items_by_frequency: itemsByFrequency,
        items_by_value: itemsByValue,
        rarity_distribution: rarityDistribution,
        category_distribution: categoryDistribution,
        most_common_item: mostCommonItem,
        rarest_item: rarestItem,
        highest_value_item: highestValueItem
      },
      generated_at: new Date().toISOString()
    }

    console.log(`✅ Successfully generated case statistics:`, {
      total_cases: games.length,
      unique_items: itemStats.length,
      total_value: totalValue
    })

    return c.json(response)

  } catch (error) {
    console.error('❌ Case statistics error:', error)
    throw new HTTPException(500, { message: 'Failed to generate case opening statistics' })
  }
}))

export default caseStatisticsRoutes

