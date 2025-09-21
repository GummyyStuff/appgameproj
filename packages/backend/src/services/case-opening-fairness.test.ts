/**
 * Comprehensive Fairness and Rarity Distribution Tests for Case Opening
 * Tests statistical distribution, provably fair algorithms, and edge cases
 */

import { describe, it, expect } from 'bun:test'

// Set up environment variables
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = 'test-anon-key-that-is-long-enough'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-that-is-long-enough'
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long-for-validation'
process.env.STARTING_BALANCE = '10000'
process.env.DAILY_BONUS = '1000'

import { CaseOpeningService, type CaseType, type TarkovItem, type WeightedItem, type ItemRarity } from './case-opening'

describe('Case Opening Fairness and Distribution Tests', () => {
  
  describe('Statistical Rarity Distribution Tests', () => {
    const mockCaseType: CaseType = {
      id: 'fairness-test-case',
      name: 'Fairness Test Case',
      price: 500,
      description: 'Case for testing fairness',
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

    const createMockItemPool = (): WeightedItem[] => [
      {
        item: {
          id: 'common-1',
          name: 'Bandage',
          rarity: 'common',
          base_value: 50,
          category: 'medical',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        weight: 1.0,
        value_multiplier: 1.0,
        effective_value: 50
      },
      {
        item: {
          id: 'uncommon-1',
          name: 'Salewa',
          rarity: 'uncommon',
          base_value: 200,
          category: 'medical',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        weight: 1.0,
        value_multiplier: 1.2,
        effective_value: 240
      },
      {
        item: {
          id: 'rare-1',
          name: 'IFAK',
          rarity: 'rare',
          base_value: 800,
          category: 'medical',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        weight: 1.0,
        value_multiplier: 1.5,
        effective_value: 1200
      },
      {
        item: {
          id: 'epic-1',
          name: 'GPU',
          rarity: 'epic',
          base_value: 3000,
          category: 'electronics',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        weight: 1.0,
        value_multiplier: 2.0,
        effective_value: 6000
      },
      {
        item: {
          id: 'legendary-1',
          name: 'LEDX',
          rarity: 'legendary',
          base_value: 10000,
          category: 'medical',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        weight: 1.0,
        value_multiplier: 2.5,
        effective_value: 25000
      }
    ]

    it('should maintain statistical distribution over large sample size', async () => {
      const sampleSize = 10000
      const itemPool = createMockItemPool()
      const results: ItemRarity[] = []

      // Collect large sample of results
      for (let i = 0; i < sampleSize; i++) {
        const selectedItem = await CaseOpeningService.selectRandomItem(mockCaseType, itemPool)
        results.push(selectedItem.item.rarity)
      }

      // Count occurrences of each rarity
      const counts = {
        common: results.filter(r => r === 'common').length,
        uncommon: results.filter(r => r === 'uncommon').length,
        rare: results.filter(r => r === 'rare').length,
        epic: results.filter(r => r === 'epic').length,
        legendary: results.filter(r => r === 'legendary').length
      }

      // Calculate percentages
      const percentages = {
        common: (counts.common / sampleSize) * 100,
        uncommon: (counts.uncommon / sampleSize) * 100,
        rare: (counts.rare / sampleSize) * 100,
        epic: (counts.epic / sampleSize) * 100,
        legendary: (counts.legendary / sampleSize) * 100
      }

      // Expected percentages from case distribution
      const expected = mockCaseType.rarity_distribution

      // Allow for statistical variance (±3% for large sample)
      const tolerance = 3.0

      // Allow for statistical variance (±3% tolerance for large sample)
      expect(Math.abs(percentages.common - expected.common)).toBeLessThan(tolerance)
      expect(Math.abs(percentages.uncommon - expected.uncommon)).toBeLessThan(tolerance)
      expect(Math.abs(percentages.rare - expected.rare)).toBeLessThan(tolerance)
      expect(Math.abs(percentages.epic - expected.epic)).toBeLessThan(tolerance)
      expect(Math.abs(percentages.legendary - expected.legendary)).toBeLessThan(tolerance)

      console.log('Distribution Test Results:')
      console.log(`Common: ${percentages.common.toFixed(2)}% (expected: ${expected.common}%)`)
      console.log(`Uncommon: ${percentages.uncommon.toFixed(2)}% (expected: ${expected.uncommon}%)`)
      console.log(`Rare: ${percentages.rare.toFixed(2)}% (expected: ${expected.rare}%)`)
      console.log(`Epic: ${percentages.epic.toFixed(2)}% (expected: ${expected.epic}%)`)
      console.log(`Legendary: ${percentages.legendary.toFixed(2)}% (expected: ${expected.legendary}%)`)
    }, 30000) // 30 second timeout for large sample

    it('should ensure no bias in consecutive selections', async () => {
      const itemPool = createMockItemPool()
      const consecutiveTests = 1000
      const results: ItemRarity[] = []

      // Test consecutive selections
      for (let i = 0; i < consecutiveTests; i++) {
        const selectedItem = await CaseOpeningService.selectRandomItem(mockCaseType, itemPool)
        results.push(selectedItem.item.rarity)
      }

      // Check for patterns that might indicate bias
      let consecutiveCommon = 0
      let maxConsecutiveCommon = 0
      let consecutiveLegendary = 0
      let maxConsecutiveLegendary = 0

      for (let i = 0; i < results.length; i++) {
        if (results[i] === 'common') {
          consecutiveCommon++
          maxConsecutiveCommon = Math.max(maxConsecutiveCommon, consecutiveCommon)
        } else {
          consecutiveCommon = 0
        }

        if (results[i] === 'legendary') {
          consecutiveLegendary++
          maxConsecutiveLegendary = Math.max(maxConsecutiveLegendary, consecutiveLegendary)
        } else {
          consecutiveLegendary = 0
        }
      }

      // With 60% common rate, we shouldn't see extremely long streaks
      // Statistical analysis: probability of 50+ consecutive commons is extremely low
      expect(maxConsecutiveCommon).toBeLessThan(50)
      
      // With 1% legendary rate, consecutive legendaries should be very rare
      expect(maxConsecutiveLegendary).toBeLessThan(5)

      console.log(`Max consecutive common items: ${maxConsecutiveCommon}`)
      console.log(`Max consecutive legendary items: ${maxConsecutiveLegendary}`)
    })

    it('should validate chi-square goodness of fit test', async () => {
      const sampleSize = 5000
      const itemPool = createMockItemPool()
      const results: ItemRarity[] = []

      // Collect sample
      for (let i = 0; i < sampleSize; i++) {
        const selectedItem = await CaseOpeningService.selectRandomItem(mockCaseType, itemPool)
        results.push(selectedItem.item.rarity)
      }

      // Count observed frequencies
      const observed = {
        common: results.filter(r => r === 'common').length,
        uncommon: results.filter(r => r === 'uncommon').length,
        rare: results.filter(r => r === 'rare').length,
        epic: results.filter(r => r === 'epic').length,
        legendary: results.filter(r => r === 'legendary').length
      }

      // Calculate expected frequencies
      const expected = {
        common: (mockCaseType.rarity_distribution.common / 100) * sampleSize,
        uncommon: (mockCaseType.rarity_distribution.uncommon / 100) * sampleSize,
        rare: (mockCaseType.rarity_distribution.rare / 100) * sampleSize,
        epic: (mockCaseType.rarity_distribution.epic / 100) * sampleSize,
        legendary: (mockCaseType.rarity_distribution.legendary / 100) * sampleSize
      }

      // Calculate chi-square statistic
      let chiSquare = 0
      const rarities: ItemRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
      
      for (const rarity of rarities) {
        const obs = observed[rarity]
        const exp = expected[rarity]
        if (exp > 0) {
          chiSquare += Math.pow(obs - exp, 2) / exp
        }
      }

      // Degrees of freedom = categories - 1 = 4
      // Critical value for α = 0.05 and df = 4 is approximately 9.488
      const criticalValue = 9.488
      
      expect(chiSquare).toBeLessThan(criticalValue)
      
      console.log(`Chi-square statistic: ${chiSquare.toFixed(4)}`)
      console.log(`Critical value (α=0.05): ${criticalValue}`)
      console.log(`Test result: ${chiSquare < criticalValue ? 'PASS' : 'FAIL'}`)
    }, 20000)
  })

  describe('Weighted Item Selection Fairness', () => {
    it('should respect item weights within same rarity', async () => {
      const mockCaseType: CaseType = {
        id: 'weight-test-case',
        name: 'Weight Test Case',
        price: 500,
        description: 'Case for testing item weights',
        rarity_distribution: {
          common: 100, // Only common items for this test
          uncommon: 0,
          rare: 0,
          epic: 0,
          legendary: 0
        },
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      // Create items with different weights
      const itemPool: WeightedItem[] = [
        {
          item: {
            id: 'common-light',
            name: 'Light Item',
            rarity: 'common',
            base_value: 50,
            category: 'medical',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          weight: 1.0, // 25% chance (1/4)
          value_multiplier: 1.0,
          effective_value: 50
        },
        {
          item: {
            id: 'common-heavy',
            name: 'Heavy Item',
            rarity: 'common',
            base_value: 100,
            category: 'medical',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          weight: 3.0, // 75% chance (3/4)
          value_multiplier: 1.0,
          effective_value: 100
        }
      ]

      const sampleSize = 4000
      const results: string[] = []

      for (let i = 0; i < sampleSize; i++) {
        const selectedItem = await CaseOpeningService.selectRandomItem(mockCaseType, itemPool)
        results.push(selectedItem.item.name)
      }

      const lightCount = results.filter(r => r === 'Light Item').length
      const heavyCount = results.filter(r => r === 'Heavy Item').length

      const lightPercentage = (lightCount / sampleSize) * 100
      const heavyPercentage = (heavyCount / sampleSize) * 100

      // Expected: Light 25%, Heavy 75%
      // Allow for statistical variance (±3%)
      expect(Math.abs(lightPercentage - 25)).toBeLessThan(3)
      expect(Math.abs(heavyPercentage - 75)).toBeLessThan(3)

      console.log(`Light Item: ${lightPercentage.toFixed(2)}% (expected: 25%)`)
      console.log(`Heavy Item: ${heavyPercentage.toFixed(2)}% (expected: 75%)`)
    })
  })

  describe('Edge Case Fairness Tests', () => {
    it('should handle extreme rarity distributions correctly', async () => {
      const extremeCaseType: CaseType = {
        id: 'extreme-case',
        name: 'Extreme Case',
        price: 1000,
        description: 'Case with extreme distribution',
        rarity_distribution: {
          common: 99,
          uncommon: 0,
          rare: 0,
          epic: 0,
          legendary: 1
        },
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const itemPool: WeightedItem[] = [
        {
          item: {
            id: 'common-extreme',
            name: 'Common Item',
            rarity: 'common',
            base_value: 50,
            category: 'medical',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          weight: 1.0,
          value_multiplier: 1.0,
          effective_value: 50
        },
        {
          item: {
            id: 'legendary-extreme',
            name: 'Legendary Item',
            rarity: 'legendary',
            base_value: 50000,
            category: 'electronics',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          weight: 1.0,
          value_multiplier: 3.0,
          effective_value: 150000
        }
      ]

      const sampleSize = 10000
      const results: ItemRarity[] = []

      for (let i = 0; i < sampleSize; i++) {
        const selectedItem = await CaseOpeningService.selectRandomItem(extremeCaseType, itemPool)
        results.push(selectedItem.item.rarity)
      }

      const commonCount = results.filter(r => r === 'common').length
      const legendaryCount = results.filter(r => r === 'legendary').length

      const commonPercentage = (commonCount / sampleSize) * 100
      const legendaryPercentage = (legendaryCount / sampleSize) * 100

      // Should be close to 99% common, 1% legendary
      expect(commonPercentage).toBeCloseTo(99, 0)
      expect(legendaryPercentage).toBeCloseTo(1, 0)
      
      // Ensure we got at least some legendary items (statistical significance)
      expect(legendaryCount).toBeGreaterThan(50) // At least 0.5% legendary
      expect(legendaryCount).toBeLessThan(200) // At most 2% legendary

      console.log(`Common: ${commonPercentage.toFixed(2)}% (expected: 99%)`)
      console.log(`Legendary: ${legendaryPercentage.toFixed(2)}% (expected: 1%)`)
    }, 15000)

    it('should handle single item pools correctly', async () => {
      const singleItemCase: CaseType = {
        id: 'single-item-case',
        name: 'Single Item Case',
        price: 100,
        description: 'Case with only one item',
        rarity_distribution: {
          common: 100,
          uncommon: 0,
          rare: 0,
          epic: 0,
          legendary: 0
        },
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const singleItemPool: WeightedItem[] = [
        {
          item: {
            id: 'only-item',
            name: 'Only Item',
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

      // Test multiple selections
      for (let i = 0; i < 100; i++) {
        const selectedItem = await CaseOpeningService.selectRandomItem(singleItemCase, singleItemPool)
        expect(selectedItem.item.name).toBe('Only Item')
        expect(selectedItem.item.rarity).toBe('common')
      }
    })
  })

  describe('Value Calculation Fairness', () => {
    it('should apply value multipliers consistently', () => {
      const testCases = [
        { baseValue: 100, multiplier: 1.0, expected: 100 },
        { baseValue: 100, multiplier: 1.5, expected: 150 },
        { baseValue: 100, multiplier: 2.0, expected: 200 },
        { baseValue: 100, multiplier: 0.5, expected: 50 },
        { baseValue: 1337, multiplier: 1.337, expected: 1787 }, // Math.floor(1337 * 1.337)
        { baseValue: 999, multiplier: 2.999, expected: 2996 }, // Math.floor(999 * 2.999)
      ]

      testCases.forEach(({ baseValue, multiplier, expected }) => {
        const mockItem: TarkovItem = {
          id: 'test-item',
          name: 'Test Item',
          rarity: 'common',
          base_value: baseValue,
          category: 'medical',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }

        const result = CaseOpeningService.calculateItemValue(mockItem, multiplier)
        expect(result).toBe(expected)
      })
    })

    it('should ensure value calculations are deterministic', () => {
      const mockItem: TarkovItem = {
        id: 'deterministic-item',
        name: 'Deterministic Item',
        rarity: 'rare',
        base_value: 1234,
        category: 'electronics',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const multiplier = 1.618 // Golden ratio
      const expectedValue = Math.floor(1234 * 1.618) // 1996

      // Calculate multiple times to ensure consistency
      for (let i = 0; i < 1000; i++) {
        const result = CaseOpeningService.calculateItemValue(mockItem, multiplier)
        expect(result).toBe(expectedValue)
      }
    })
  })

  describe('Randomness Quality Tests', () => {
    it('should pass basic randomness tests', async () => {
      const sampleSize = 1000
      const mockCaseType: CaseType = {
        id: 'randomness-test',
        name: 'Randomness Test',
        price: 500,
        description: 'Testing randomness quality',
        rarity_distribution: {
          common: 50,
          uncommon: 50,
          rare: 0,
          epic: 0,
          legendary: 0
        },
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const itemPool: WeightedItem[] = [
        {
          item: {
            id: 'item-a',
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
            id: 'item-b',
            name: 'Item B',
            rarity: 'uncommon',
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

      const results: string[] = []
      for (let i = 0; i < sampleSize; i++) {
        const selectedItem = await CaseOpeningService.selectRandomItem(mockCaseType, itemPool)
        results.push(selectedItem.item.name)
      }

      // Test for runs (consecutive identical results)
      let runs = 1
      for (let i = 1; i < results.length; i++) {
        if (results[i] !== results[i - 1]) {
          runs++
        }
      }

      // Expected runs for random sequence ≈ (2 * n * p * (1-p)) + 1
      // where n = sample size, p = probability of each outcome (0.5)
      const expectedRuns = (2 * sampleSize * 0.5 * 0.5) + 1 // 501
      const tolerance = 50 // Allow ±50 runs

      expect(runs).toBeGreaterThan(expectedRuns - tolerance)
      expect(runs).toBeLessThan(expectedRuns + tolerance)

      console.log(`Runs test: ${runs} runs (expected: ~${expectedRuns})`)
    })
  })
})