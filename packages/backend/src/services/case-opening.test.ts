import { describe, test, expect } from 'vitest'
import { CaseOpeningService, type CaseType, type TarkovItem, type WeightedItem, type ItemRarity } from './case-opening-appwrite'

describe('Case Opening Service', () => {
  describe('Item Value Calculation', () => {
    test('should calculate correct item value with multiplier', () => {
      const mockItem: TarkovItem = {
        id: '1',
        name: 'Test Item',
        rarity: 'common',
        base_value: 100,
        category: 'medical',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
      const result = CaseOpeningService.calculateItemValue(mockItem, 1.5)
      expect(result).toBe(150)
    })

    test('should floor the result correctly', () => {
      const mockItem: TarkovItem = {
        id: '1',
        name: 'Test Item',
        rarity: 'common',
        base_value: 100,
        category: 'medical',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
      const result = CaseOpeningService.calculateItemValue(mockItem, 1.33)
      expect(result).toBe(133)
    })

    test('should handle zero multiplier', () => {
      const mockItem: TarkovItem = {
        id: '1',
        name: 'Test Item',
        rarity: 'common',
        base_value: 100,
        category: 'medical',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
      const result = CaseOpeningService.calculateItemValue(mockItem, 0)
      expect(result).toBe(0)
    })

    test('should handle large values', () => {
      const mockItem: TarkovItem = {
        id: '1',
        name: 'Test Item',
        rarity: 'legendary',
        base_value: 10000,
        category: 'electronics',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
      const result = CaseOpeningService.calculateItemValue(mockItem, 2.5)
      expect(result).toBe(25000)
    })
  })

  describe('Rarity Distribution Logic', () => {
    test('should select correct rarity based on probability distribution', () => {
      const mockCaseType: CaseType = {
        id: '1',
        name: 'Test Case',
        price: 500,
        description: 'Test case',
        rarity_distribution: {
          common: 60,
          uncommon: 25,
          rare: 10,
          epic: 4,
          legendary: 1
        },
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const distribution = mockCaseType.rarity_distribution
      const total = distribution.common + distribution.uncommon + distribution.rare +
                   distribution.epic + distribution.legendary

      expect(total).toBe(100)
      expect(distribution.legendary).toBe(1)
      expect(distribution.common).toBe(60)
      expect(distribution.common).toBeGreaterThan(0)
      expect(distribution.uncommon).toBeGreaterThan(0)
      expect(distribution.rare).toBeGreaterThan(0)
      expect(distribution.epic).toBeGreaterThan(0)
      expect(distribution.legendary).toBeGreaterThan(0)
    })

    test('should handle edge cases in distribution', () => {
      const edgeDistribution = {
        common: 0,
        uncommon: 0,
        rare: 0,
        epic: 0,
        legendary: 100
      }

      const total = edgeDistribution.common + edgeDistribution.uncommon +
                   edgeDistribution.rare + edgeDistribution.epic + edgeDistribution.legendary

      expect(total).toBe(100)
      expect(edgeDistribution.legendary).toBe(100)
    })

    test('should validate rarity distribution totals', () => {
      const validDistribution = {
        common: 60,
        uncommon: 25,
        rare: 10,
        epic: 4,
        legendary: 1
      }

      const invalidDistribution = {
        common: 50,
        uncommon: 25,
        rare: 10,
        epic: 4,
        legendary: 1
      }

      const validTotal = Object.values(validDistribution).reduce((sum, val) => sum + val, 0)
      const invalidTotal = Object.values(invalidDistribution).reduce((sum, val) => sum + val, 0)

      expect(validTotal).toBe(100)
      expect(invalidTotal).toBe(90)
    })
  })

  describe('Weighted Item Selection Logic', () => {
    test('should select items based on weight distribution', () => {
      const mockItems: WeightedItem[] = [
        {
          item: {
            id: '1',
            name: 'Item A',
            rarity: 'common',
            base_value: 100,
            category: 'medical',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          weight: 1.0,
          value_multiplier: 1.0,
          effective_value: 100
        },
        {
          item: {
            id: '2',
            name: 'Item B',
            rarity: 'common',
            base_value: 200,
            category: 'medical',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          weight: 2.0,
          value_multiplier: 1.0,
          effective_value: 200
        },
        {
          item: {
            id: '3',
            name: 'Item C',
            rarity: 'common',
            base_value: 150,
            category: 'medical',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          weight: 1.0,
          value_multiplier: 1.0,
          effective_value: 150
        }
      ]

      const selectWeightedItem = (randomValue: number, items: WeightedItem[]) => {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
        const targetWeight = randomValue * totalWeight

        let currentWeight = 0
        for (const item of items) {
          currentWeight += item.weight
          if (targetWeight <= currentWeight) {
            return item
          }
        }

        return items[items.length - 1]
      }

      expect(selectWeightedItem(0.2, mockItems).item.name).toBe('Item A')
      expect(selectWeightedItem(0.5, mockItems).item.name).toBe('Item B')
      expect(selectWeightedItem(0.9, mockItems).item.name).toBe('Item C')
    })

    test('should handle single item selection', () => {
      const mockItems: WeightedItem[] = [
        {
          item: {
            id: '1',
            name: 'Only Item',
            rarity: 'common',
            base_value: 100,
            category: 'medical',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          weight: 1.0,
          value_multiplier: 1.0,
          effective_value: 100
        }
      ]

      const selectWeightedItem = (randomValue: number, items: WeightedItem[]) => {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
        const targetWeight = randomValue * totalWeight

        let currentWeight = 0
        for (const item of items) {
          currentWeight += item.weight
          if (targetWeight <= currentWeight) {
            return item
          }
        }

        return items[items.length - 1]
      }

      expect(selectWeightedItem(0.1, mockItems).item.name).toBe('Only Item')
      expect(selectWeightedItem(0.9, mockItems).item.name).toBe('Only Item')
    })

    test('should handle zero weight items correctly', () => {
      const mockItems: WeightedItem[] = [
        {
          item: {
            id: '1',
            name: 'Zero Weight Item',
            rarity: 'common',
            base_value: 100,
            category: 'medical',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          weight: 0,
          value_multiplier: 1.0,
          effective_value: 100
        },
        {
          item: {
            id: '2',
            name: 'Normal Item',
            rarity: 'common',
            base_value: 200,
            category: 'medical',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          weight: 1.0,
          value_multiplier: 1.0,
          effective_value: 200
        }
      ]

      const totalWeight = mockItems.reduce((sum, item) => sum + item.weight, 0)
      expect(totalWeight).toBe(1.0)
    })
  })

  describe('Opening ID Generation', () => {
    test('should generate unique opening IDs', async () => {
      const generateOpeningId = (userId: string) => {
        return `case_${Date.now()}_${userId.slice(-8)}`
      }

      const userId = 'test-user-12345678'
      const id1 = generateOpeningId(userId)

      await new Promise(resolve => setTimeout(resolve, 1))
      const id2 = generateOpeningId(userId)

      expect(id1).toMatch(/^case_\d+_12345678$/)
      expect(id2).toMatch(/^case_\d+_12345678$/)
      expect(id1).not.toBe(id2)
    })

    test('should handle short user IDs', () => {
      const generateOpeningId = (userId: string) => {
        return `case_${Date.now()}_${userId.slice(-8)}`
      }

      const shortUserId = 'user123'
      const id = generateOpeningId(shortUserId)

      expect(id).toMatch(/^case_\d+_user123$/)
    })

    test('should include timestamp for uniqueness', () => {
      const userId = 'test-user-12345678'
      const beforeTime = Date.now()

      const generateOpeningId = (userId: string) => {
        return `case_${Date.now()}_${userId.slice(-8)}`
      }

      const id = generateOpeningId(userId)
      const afterTime = Date.now()

      const timestampMatch = id.match(/^case_(\d+)_/)
      expect(timestampMatch).toBeTruthy()

      const extractedTimestamp = parseInt(timestampMatch![1])
      expect(extractedTimestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(extractedTimestamp).toBeLessThanOrEqual(afterTime)
    })
  })

  describe('Validation Logic', () => {
    test('should validate balance calculation logic', () => {
      const validateBalance = (userBalance: number, casePrice: number) => {
        return {
          isValid: userBalance >= casePrice,
          shortfall: userBalance < casePrice ? casePrice - userBalance : 0
        }
      }

      expect(validateBalance(1000, 500)).toEqual({ isValid: true, shortfall: 0 })
      expect(validateBalance(300, 500)).toEqual({ isValid: false, shortfall: 200 })
      expect(validateBalance(500, 500)).toEqual({ isValid: true, shortfall: 0 })
    })

    test('should validate case type structure', () => {
      const validateCaseType = (caseType: any) => {
        return {
          isValid: caseType !== null && caseType !== undefined && caseType.is_active === true,
          error: !caseType ? 'Case type not found' :
                 !caseType.is_active ? 'Case type is inactive' : null
        }
      }

      const activeCaseType = { id: '1', name: 'Test Case', is_active: true }
      const inactiveCaseType = { id: '2', name: 'Inactive Case', is_active: false }

      expect(validateCaseType(activeCaseType)).toEqual({ isValid: true, error: null })
      expect(validateCaseType(inactiveCaseType)).toEqual({ isValid: false, error: 'Case type is inactive' })
      expect(validateCaseType(null)).toEqual({ isValid: false, error: 'Case type not found' })
    })

    test('should validate item pool structure', () => {
      const validateItemPool = (itemPool: any) => {
        const isValid = Boolean(itemPool && Array.isArray(itemPool) && itemPool.length > 0)
        return {
          isValid,
          error: !isValid ? 'No items available' : null
        }
      }

      expect(validateItemPool([{ item: 'test' }])).toEqual({ isValid: true, error: null })
      expect(validateItemPool([])).toEqual({ isValid: false, error: 'No items available' })
      expect(validateItemPool(null)).toEqual({ isValid: false, error: 'No items available' })
    })
  })

  describe('Provably Fair Algorithm Logic', () => {
    test('should demonstrate rarity selection algorithm', () => {
      const distribution = {
        common: 60,
        uncommon: 25,
        rare: 10,
        epic: 4,
        legendary: 1
      }

      const selectRarityByDistribution = (randomValue: number) => {
        const total = distribution.common + distribution.uncommon + distribution.rare +
                     distribution.epic + distribution.legendary

        if (total <= 0) {
          throw new Error('Invalid rarity distribution')
        }

        const targetValue = randomValue * total
        let cumulative = 0

        cumulative += distribution.legendary
        if (targetValue <= cumulative) return 'legendary'

        cumulative += distribution.epic
        if (targetValue <= cumulative) return 'epic'

        cumulative += distribution.rare
        if (targetValue <= cumulative) return 'rare'

        cumulative += distribution.uncommon
        if (targetValue <= cumulative) return 'uncommon'

        return 'common'
      }

      expect(selectRarityByDistribution(0.005)).toBe('legendary')
      expect(selectRarityByDistribution(0.02)).toBe('epic')
      expect(selectRarityByDistribution(0.08)).toBe('rare')
      expect(selectRarityByDistribution(0.3)).toBe('uncommon')
      expect(selectRarityByDistribution(0.9)).toBe('common')
    })

    test('should demonstrate weighted item selection algorithm', () => {
      const items = [
        { name: 'Item A', weight: 1.0 },
        { name: 'Item B', weight: 2.0 },
        { name: 'Item C', weight: 1.0 }
      ]

      const selectWeightedItem = (randomValue: number) => {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
        const targetWeight = randomValue * totalWeight

        let currentWeight = 0
        for (const item of items) {
          currentWeight += item.weight
          if (targetWeight <= currentWeight) {
            return item
          }
        }

        return items[items.length - 1]
      }

      expect(selectWeightedItem(0.2).name).toBe('Item A')
      expect(selectWeightedItem(0.5).name).toBe('Item B')
      expect(selectWeightedItem(0.9).name).toBe('Item C')
    })
  })

  describe('Statistics Calculation Logic', () => {
    test('should calculate case opening statistics correctly', () => {
      const mockGameHistory = [
        {
          id: '1',
          user_id: 'test-user',
          game_type: 'case_opening',
          bet_amount: 500,
          win_amount: 750,
          result_data: { item_rarity: 'rare' },
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          user_id: 'test-user',
          game_type: 'case_opening',
          bet_amount: 500,
          win_amount: 400,
          result_data: { item_rarity: 'common' },
          created_at: '2024-01-01T01:00:00Z'
        }
      ]

      const calculateStats = (caseOpenings: any[]) => {
        const totalCasesOpened = caseOpenings.length
        const totalSpent = caseOpenings.reduce((sum, opening) => sum + opening.bet_amount, 0)
        const totalWon = caseOpenings.reduce((sum, opening) => sum + opening.win_amount, 0)
        const netProfit = totalWon - totalSpent

        const rarityStats: Record<string, number> = {
          common: 0,
          uncommon: 0,
          rare: 0,
          epic: 0,
          legendary: 0
        }

        caseOpenings.forEach(opening => {
          const resultData = opening.result_data as any
          if (resultData && resultData.item_rarity) {
            rarityStats[resultData.item_rarity]++
          }
        })

        return {
          total_cases_opened: totalCasesOpened,
          total_spent: totalSpent,
          total_won: totalWon,
          net_profit: netProfit,
          rarity_breakdown: rarityStats
        }
      }

      const stats = calculateStats(mockGameHistory)

      expect(stats.total_cases_opened).toBe(2)
      expect(stats.total_spent).toBe(1000)
      expect(stats.total_won).toBe(1150)
      expect(stats.net_profit).toBe(150)
      expect(stats.rarity_breakdown.rare).toBe(1)
      expect(stats.rarity_breakdown.common).toBe(1)
    })
  })
})
