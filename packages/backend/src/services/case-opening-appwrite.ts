/**
 * Case Opening Service (Appwrite version)
 * Handles case opening logic with provably fair item selection
 */

import { appwriteDb } from './appwrite-database';
import { COLLECTION_IDS, CaseType as AppwriteCaseType, TarkovItem as AppwriteTarkovItem, CaseItemPool, GameHistory } from '../config/collections';
import { SecureRandomGenerator } from './game-engine/random-generator';

export interface CaseType {
  id: string;
  name: string;
  price: number;
  description: string;
  image_url?: string;
  rarity_distribution: RarityDistribution;
  value_multiplier: number; // Default reward multiplier for this case
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TarkovItem {
  id: string;
  name: string;
  rarity: ItemRarity;
  base_value: number;
  category: ItemCategory;
  image_url?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RarityDistribution {
  common: number; // 60%
  uncommon: number; // 25%
  rare: number; // 10%
  epic: number; // 4%
  legendary: number; // 1%
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemCategory = 'medical' | 'electronics' | 'consumables' | 'valuables' | 'keycards';

export interface WeightedItem {
  item: TarkovItem;
  weight: number;
  value_multiplier: number;
  effective_value: number;
}

export interface CaseOpeningResult {
  case_type: CaseType;
  item_won: TarkovItem;
  currency_awarded: number;
  opening_id: string;
  timestamp: string;
}

export class CaseOpeningService {
  private static randomGenerator = new SecureRandomGenerator();

  /**
   * Get all available case types (cached for 5 minutes)
   */
  static async getCaseTypes(): Promise<CaseType[]> {
    const { withCache } = await import('../utils/cache');
    
    return withCache(
      'case_types_active',
      async () => {
        try {
          const { data, error } = await appwriteDb.listDocuments<AppwriteCaseType>(
            COLLECTION_IDS.CASE_TYPES,
            [appwriteDb.equal('isActive', true)]
          );

          if (error) {
            console.error('Error fetching case types:', error);
            throw new Error('Failed to fetch case types');
          }

          // Transform Appwrite format to expected format
          return (data || []).map(this.transformCaseType);
        } catch (error) {
          console.error('Error in getCaseTypes:', error);
          throw new Error('Failed to retrieve case types');
        }
      },
      5 * 60 * 1000 // Cache for 5 minutes
    );
  }

  /**
   * Get a specific case type by ID
   */
  static async getCaseType(caseTypeId: string): Promise<CaseType | null> {
    try {
      const { data, error } = await appwriteDb.getDocument<AppwriteCaseType>(
        COLLECTION_IDS.CASE_TYPES,
        caseTypeId
      );

      if (error || !data) {
        return null;
      }

      if (!data.isActive) {
        return null;
      }

      return this.transformCaseType(data);
    } catch (error) {
      console.error('Error in getCaseType:', error);
      return null;
    }
  }

  /**
   * Get item pool for a specific case type (with caching)
   * 
   * Strategy:
   * 1. Check if case has exclusive items in case_item_pools
   * 2. If YES: Use only those specific items (case-exclusive)
   * 3. If NO: Use ALL active items from tarkov_items (global pool)
   */
  static async getItemPool(caseTypeId: string): Promise<WeightedItem[]> {
    const { withCache } = await import('../utils/cache');
    
    return withCache(
      `case_item_pool_${caseTypeId}`,
      async () => {
        try {
          // Get the case to access its value_multiplier
          const caseType = await this.getCaseType(caseTypeId);
          if (!caseType) {
            throw new Error('Case type not found');
          }

          // Check if this case has exclusive items defined in case_item_pools
          const { data: poolEntries, error: poolError } = await appwriteDb.listDocuments<CaseItemPool>(
            COLLECTION_IDS.CASE_ITEM_POOLS,
            [appwriteDb.equal('caseTypeId', caseTypeId)]
          );

          // If case has exclusive items, use only those
          if (!poolError && poolEntries && poolEntries.length > 0) {
            console.log(`Using ${poolEntries.length} case-exclusive items for ${caseType.name}`);
            
            // Fetch the specific items
            const itemIds = poolEntries.map(p => p.itemId);
            const items: Map<string, TarkovItem> = new Map();

            const itemPromises = itemIds.map(itemId =>
              appwriteDb.getDocument<AppwriteTarkovItem>(
                COLLECTION_IDS.TARKOV_ITEMS,
                itemId
              )
            );

            const itemResults = await Promise.all(itemPromises);
            itemResults.forEach(({ data: item, error: itemError }) => {
              if (!itemError && item && item.isActive) {
                items.set(item.$id!, this.transformTarkovItem(item));
              }
            });

            // Create weighted items (value_multiplier from pool entry, or 1.0 if not specified)
            const weightedItems: WeightedItem[] = [];
            for (const poolEntry of poolEntries) {
              const item = items.get(poolEntry.itemId);
              if (item) {
                const valueMultiplier = poolEntry.valueMultiplier || 1.0;
                weightedItems.push({
                  item,
                  weight: 1.0, // Weight not used in rarity-based selection
                  value_multiplier: valueMultiplier,
                  effective_value: item.base_value * valueMultiplier,
                });
              }
            }

            return weightedItems;
          }

          // Otherwise, use ALL active items (global pool)
          console.log(`Using global item pool for ${caseType.name}`);
          const { data: allItems, error: itemsError } = await appwriteDb.listDocuments<AppwriteTarkovItem>(
            COLLECTION_IDS.TARKOV_ITEMS,
            [appwriteDb.equal('isActive', true)]
          );

          if (itemsError || !allItems || allItems.length === 0) {
            throw new Error('No active items found in global pool');
          }

          // Transform all items to weighted items (no multiplier - values are boosted in base_value)
          const weightedItems: WeightedItem[] = allItems.map(appwriteItem => {
            const item = this.transformTarkovItem(appwriteItem);
            return {
              item,
              weight: 1.0, // Weight not used in rarity-based selection
              value_multiplier: 1.0, // Always 1.0 - item values are pre-boosted
              effective_value: item.base_value, // Direct value, no multiplication needed
            };
          });

          if (weightedItems.length === 0) {
            throw new Error('No active items found');
          }

          return weightedItems;
        } catch (error) {
          console.error('Error in getItemPool:', error);
          throw new Error('Failed to retrieve item pool');
        }
      },
      3 * 60 * 1000 // Cache for 3 minutes
    );
  }

  /**
   * Select a random item from the pool using rarity-based algorithm
   * First selects a rarity tier based on case's rarity_distribution,
   * then randomly picks an item of that rarity from the global pool
   */
  static async selectRandomItem(
    caseType: CaseType,
    itemPool: WeightedItem[]
  ): Promise<WeightedItem> {
    // Step 1: Select rarity tier based on case's rarity distribution
    const rarityDistribution = caseType.rarity_distribution;
    const totalPercentage = 
      rarityDistribution.common + 
      rarityDistribution.uncommon + 
      rarityDistribution.rare + 
      rarityDistribution.epic + 
      rarityDistribution.legendary;

    // Generate secure random number between 0 and total percentage
    const random = await this.randomGenerator.generateSecureRandom();
    const selectedValue = random * totalPercentage;

    // Determine which rarity tier was selected
    let selectedRarity: ItemRarity;
    let cumulativePercentage = 0;

    cumulativePercentage += rarityDistribution.common;
    if (selectedValue <= cumulativePercentage) {
      selectedRarity = 'common';
    } else {
      cumulativePercentage += rarityDistribution.uncommon;
      if (selectedValue <= cumulativePercentage) {
        selectedRarity = 'uncommon';
      } else {
        cumulativePercentage += rarityDistribution.rare;
        if (selectedValue <= cumulativePercentage) {
          selectedRarity = 'rare';
        } else {
          cumulativePercentage += rarityDistribution.epic;
          if (selectedValue <= cumulativePercentage) {
            selectedRarity = 'epic';
          } else {
            selectedRarity = 'legendary';
          }
        }
      }
    }

    // Step 2: Filter items by selected rarity
    const itemsOfRarity = itemPool.filter(wi => wi.item.rarity === selectedRarity);

    if (itemsOfRarity.length === 0) {
      // Fallback: if no items of selected rarity, try to find any item
      console.warn(`No items of rarity ${selectedRarity} found in pool, using fallback`);
      if (itemPool.length > 0) {
        // Use secure random for fallback selection
        const secureRandom = await this.randomGenerator.generateSecureRandom();
        const fallbackIndex = Math.floor(secureRandom * itemPool.length);
        return itemPool[fallbackIndex];
      }
      throw new Error('No items available in pool');
    }

    // Step 3: Randomly select one item from the filtered rarity tier using SECURE random
    const secureRandom = await this.randomGenerator.generateSecureRandom();
    const randomItemIndex = Math.floor(secureRandom * itemsOfRarity.length);
    return itemsOfRarity[randomItemIndex];
  }

  /**
   * Calculate currency awarded for an item
   */
  static calculateItemValue(item: TarkovItem, valueMultiplier: number): number {
    return Math.round(item.base_value * valueMultiplier);
  }

  /**
   * Validate case opening request
   */
  static async validateCaseOpening(
    userId: string,
    caseTypeId: string
  ): Promise<{
    isValid: boolean;
    error?: string;
    caseType?: CaseType;
  }> {
    // Get case type
    const caseType = await this.getCaseType(caseTypeId);
    if (!caseType) {
      return {
        isValid: false,
        error: 'Case type not found or inactive',
      };
    }

    // Validate case has items
    try {
      const itemPool = await this.getItemPool(caseTypeId);
      if (itemPool.length === 0) {
        return {
          isValid: false,
          error: 'No items available for this case type',
        };
      }
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid case configuration',
      };
    }

    return {
      isValid: true,
      caseType,
    };
  }

  /**
   * Preview a case opening (no transaction)
   */
  static async previewCase(userId: string, caseTypeId: string): Promise<CaseOpeningResult> {
    return await this.openCase(userId, caseTypeId);
  }

  /**
   * Open a case and return the result
   */
  static async openCase(userId: string, caseTypeId: string): Promise<CaseOpeningResult> {
    try {
      // Get case type
      const caseType = await this.getCaseType(caseTypeId);
      if (!caseType) {
        throw new Error('Case type not found or inactive');
      }

      // Get item pool for the case
      const itemPool = await this.getItemPool(caseTypeId);
      if (itemPool.length === 0) {
        throw new Error('No items available for this case type');
      }

      // Select random item using provably fair algorithm
      const selectedWeightedItem = await this.selectRandomItem(caseType, itemPool);

      // Calculate currency awarded
      const currencyAwarded = this.calculateItemValue(
        selectedWeightedItem.item,
        selectedWeightedItem.value_multiplier
      );

      // Generate unique opening ID
      const openingId = `case_${Date.now()}_${userId.slice(-8)}`;

      // Create result object
      const result: CaseOpeningResult = {
        case_type: caseType,
        item_won: selectedWeightedItem.item,
        currency_awarded: currencyAwarded,
        opening_id: openingId,
        timestamp: new Date().toISOString(),
      };

      return result;
    } catch (error) {
      console.error('Error in openCase:', error);
      throw new Error('Failed to open case');
    }
  }

  /**
   * Get case opening statistics for a user
   */
  static async getCaseOpeningStats(userId: string) {
    try {
      // Get all case opening games for user
      const { data: gamesData, error } = await appwriteDb.listDocuments(
        COLLECTION_IDS.GAME_HISTORY,
        [appwriteDb.equal('userId', userId), appwriteDb.equal('gameType', 'case_opening')]
      );

      if (error || !gamesData) {
        return {
          total_opened: 0,
          total_spent: 0,
          total_won: 0,
          net_result: 0,
          favorite_case: null,
          best_opening: null,
        };
      }

      // Type cast to GameHistory[]
      const games = gamesData as GameHistory[];

      const totalOpened = games.length;
      const totalSpent = games.reduce((sum: number, g) => sum + g.betAmount, 0);
      const totalWon = games.reduce((sum: number, g) => sum + g.winAmount, 0);
      const netResult = totalWon - totalSpent;

      // Parse result data to find favorite case and best opening
      const caseStats: Record<string, number> = {};
      let bestOpening: any = null;
      let bestProfit = -Infinity;

      for (const game of games) {
        try {
          const resultData = JSON.parse(game.resultData);
          const caseName = resultData.case_name || resultData.case_type?.name;
          
          if (caseName) {
            caseStats[caseName] = (caseStats[caseName] || 0) + 1;
          }

          const profit = game.winAmount - game.betAmount;
          if (profit > bestProfit) {
            bestProfit = profit;
            bestOpening = {
              case_name: caseName,
              item_name: resultData.item_name,
              profit,
              timestamp: game.createdAt,
            };
          }
        } catch (e) {
          // Skip invalid result data
        }
      }

      const favoriteCase = Object.entries(caseStats).sort((a, b) => b[1] - a[1])[0];

      return {
        total_opened: totalOpened,
        total_spent: totalSpent,
        total_won: totalWon,
        net_result: netResult,
        favorite_case: favoriteCase ? favoriteCase[0] : null,
        best_opening: bestOpening,
      };
    } catch (error) {
      console.error('Error in getCaseOpeningStats:', error);
      throw new Error('Failed to retrieve case opening statistics');
    }
  }

  /**
   * Transform Appwrite CaseType to expected format
   */
  private static transformCaseType(appwriteCase: AppwriteCaseType & { $id: string }): CaseType {
    return {
      id: appwriteCase.$id,
      name: appwriteCase.name,
      price: appwriteCase.price,
      description: appwriteCase.description,
      image_url: appwriteCase.imageUrl,
      rarity_distribution: JSON.parse(appwriteCase.rarityDistribution),
      value_multiplier: 1.0, // Fixed value - item boosts are applied via base_value, not multipliers
      is_active: appwriteCase.isActive,
      created_at: appwriteCase.createdAt,
      updated_at: appwriteCase.updatedAt,
    };
  }

  /**
   * Transform Appwrite TarkovItem to expected format
   */
  private static transformTarkovItem(appwriteItem: AppwriteTarkovItem & { $id: string }): TarkovItem {
    return {
      id: appwriteItem.$id,
      name: appwriteItem.name,
      rarity: appwriteItem.rarity,
      base_value: appwriteItem.baseValue,
      category: appwriteItem.category,
      image_url: appwriteItem.imageUrl,
      description: appwriteItem.description,
      is_active: appwriteItem.isActive,
      created_at: appwriteItem.createdAt,
      updated_at: appwriteItem.createdAt, // Use createdAt as Appwrite doesn't have updatedAt for items
    };
  }
}

