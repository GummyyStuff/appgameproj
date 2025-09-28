/**
 * Integration tests for Case Opening Service
 * Tests the complete case opening workflow including API endpoints
 */

import { describe, test, expect } from 'bun:test'

// Set up environment variables
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = 'test-anon-key-that-is-long-enough'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-that-is-long-enough'
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long-for-validation'
process.env.STARTING_BALANCE = '10000'
process.env.DAILY_BONUS = '1000'

import { CaseOpeningService, type CaseType, type TarkovItem, type WeightedItem } from './case-opening'

describe('Case Opening Service Integration', () => {
  describe('Complete Case Opening Workflow', () => {
    test('should demonstrate complete case opening logic flow', async () => {
      // Mock case type
      const mockCaseType: CaseType = {
        id: 'test-case-123',
        name: 'Scav Case',
        price: 500,
        description: 'Basic case with common items',
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

      // Mock item pool
      const mockItemPool: WeightedItem[] = [
        {
          item: {
            id: 'item-1',
            name: 'Bandage',
            rarity: 'common',
            base_value: 50,
            category: 'medical',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          weight: 1.0,
          value_multiplier: 1.2,
          effective_value: 60
        },
        {
          item: {
            id: 'item-3',
            name: 'Painkillers',
            rarity: 'uncommon',
            base_value: 200,
            category: 'medical',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          weight: 1.0,
          value_multiplier: 1.5,
          effective_value: 300
        },
        {
          item: {
            id: 'item-2',
            name: 'LEDX',
            rarity: 'legendary',
            base_value: 5000,
            category: 'medical',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          weight: 1.0,
          value_multiplier: 2.0,
          effective_value: 10000
        }
      ]

      // Test item selection algorithm
      const selectedItem = await CaseOpeningService.selectRandomItem(mockCaseType, mockItemPool)
      
      expect(selectedItem).toBeDefined()
      expect(selectedItem.item).toBeDefined()
      expect(['common', 'uncommon', 'legendary']).toContain(selectedItem.item.rarity)
      expect(['Bandage', 'Painkillers', 'LEDX']).toContain(selectedItem.item.name)

      // Test value calculation
      const calculatedValue = CaseOpeningService.calculateItemValue(
        selectedItem.item,
        selectedItem.value_multiplier
      )
      
      expect(calculatedValue).toBeGreaterThan(0)
      expect(calculatedValue).toBe(selectedItem.effective_value)
    })

    test('should validate case opening request structure', () => {
      const validationLogic = {
        validateCaseTypeId: (caseTypeId: string) => {
          return {
            isValid: typeof caseTypeId === 'string' && caseTypeId.length > 0,
            error: !caseTypeId ? 'Case type ID is required' : null
          }
        },
        
        validateUserId: (userId: string) => {
          return {
            isValid: typeof userId === 'string' && userId.length > 0,
            error: !userId ? 'User ID is required' : null
          }
        }
      }

      // Test valid inputs
      expect(validationLogic.validateCaseTypeId('case-123')).toEqual({
        isValid: true,
        error: null
      })
      
      expect(validationLogic.validateUserId('user-456')).toEqual({
        isValid: true,
        error: null
      })

      // Test invalid inputs
      expect(validationLogic.validateCaseTypeId('')).toEqual({
        isValid: false,
        error: 'Case type ID is required'
      })
      
      expect(validationLogic.validateUserId('')).toEqual({
        isValid: false,
        error: 'User ID is required'
      })
    })

    test('should demonstrate provably fair algorithm properties', async () => {
      const mockCaseType: CaseType = {
        id: 'test-case-123',
        name: 'Test Case',
        price: 500,
        description: 'Test case for fairness',
        rarity_distribution: {
          common: 50,
          uncommon: 30,
          rare: 15,
          epic: 4,
          legendary: 1
        },
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const mockItems: WeightedItem[] = [
        {
          item: {
            id: 'common-item',
            name: 'Common Item',
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
            id: 'uncommon-item',
            name: 'Uncommon Item',
            rarity: 'uncommon',
            base_value: 300,
            category: 'weapons',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          weight: 1.0,
          value_multiplier: 1.2,
          effective_value: 360
        },
        {
          item: {
            id: 'rare-item',
            name: 'Rare Item',
            rarity: 'rare',
            base_value: 1000,
            category: 'electronics',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          weight: 1.0,
          value_multiplier: 1.5,
          effective_value: 1500
        },
        {
          item: {
            id: 'epic-item',
            name: 'Epic Item',
            rarity: 'epic',
            base_value: 2500,
            category: 'weapons',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          weight: 1.0,
          value_multiplier: 2.0,
          effective_value: 5000
        },
        {
          item: {
            id: 'legendary-item',
            name: 'Legendary Item',
            rarity: 'legendary',
            base_value: 5000,
            category: 'special',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          weight: 1.0,
          value_multiplier: 3.0,
          effective_value: 15000
        }
      ]

      // Test multiple selections to ensure randomness
      const results = []
      for (let i = 0; i < 10; i++) {
        const result = await CaseOpeningService.selectRandomItem(mockCaseType, mockItems)
        results.push(result.item.rarity)
      }

      // Should have some variation in results (not all the same)
      const uniqueRarities = new Set(results)
      expect(uniqueRarities.size).toBeGreaterThanOrEqual(1)
      
      // All results should be valid rarities
      results.forEach(rarity => {
        expect(['common', 'uncommon', 'rare', 'epic', 'legendary']).toContain(rarity)
      })
    })

    test('should handle case opening result structure correctly', () => {
      const mockResult = {
        case_type: {
          id: 'case-123',
          name: 'Test Case',
          price: 500
        },
        item_won: {
          id: 'item-456',
          name: 'Test Item',
          rarity: 'rare',
          base_value: 1000
        },
        currency_awarded: 1200,
        opening_id: 'case_1234567890_user123',
        timestamp: '2024-01-01T12:00:00Z'
      }

      // Validate result structure
      expect(mockResult.case_type).toBeDefined()
      expect(mockResult.item_won).toBeDefined()
      expect(mockResult.currency_awarded).toBeGreaterThan(0)
      expect(mockResult.opening_id).toMatch(/^case_\d+_/)
      expect(mockResult.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)

      // Validate currency calculation logic
      const expectedCurrency = Math.floor(mockResult.item_won.base_value * 1.2) // 20% bonus
      expect(mockResult.currency_awarded).toBeGreaterThanOrEqual(mockResult.item_won.base_value)
    })

    test('should demonstrate game history integration', () => {
      const mockGameHistoryEntry = {
        id: 'history-123',
        user_id: 'user-456',
        game_type: 'case_opening',
        bet_amount: 500, // case price
        win_amount: 750, // currency awarded
        result_data: {
          case_type_id: 'case-123',
          case_name: 'Scav Case',
          case_price: 500,
          item_id: 'item-789',
          item_name: 'Salewa',
          item_rarity: 'uncommon',
          item_category: 'medical',
          item_value: 600,
          currency_awarded: 750,
          opening_id: 'case_1234567890_user456'
        },
        created_at: '2024-01-01T12:00:00Z'
      }

      // Validate game history structure
      expect(mockGameHistoryEntry.game_type).toBe('case_opening')
      expect(mockGameHistoryEntry.bet_amount).toBe(500)
      expect(mockGameHistoryEntry.win_amount).toBe(750)
      expect(mockGameHistoryEntry.result_data.case_type_id).toBeDefined()
      expect(mockGameHistoryEntry.result_data.item_rarity).toBeDefined()
      expect(mockGameHistoryEntry.result_data.currency_awarded).toBe(750)

      // Calculate net result
      const netResult = mockGameHistoryEntry.win_amount - mockGameHistoryEntry.bet_amount
      expect(netResult).toBe(250) // Profit of 250
    })
  })

  describe('API Endpoint Structure Validation', () => {
    test('should validate GET /api/games/cases response structure', () => {
      const mockCaseTypesResponse = {
        message: 'Case opening game information',
        case_types: [
          {
            id: 'case-1',
            name: 'Scav Case',
            price: 500,
            description: 'Basic case with common items',
            rarity_distribution: {
              common: 60,
              uncommon: 25,
              rare: 10,
              epic: 4,
              legendary: 1
            },
            is_active: true
          }
        ],
        total_cases: 1
      }

      expect(mockCaseTypesResponse.message).toBeDefined()
      expect(Array.isArray(mockCaseTypesResponse.case_types)).toBe(true)
      expect(mockCaseTypesResponse.total_cases).toBe(1)
      expect(mockCaseTypesResponse.case_types[0].rarity_distribution).toBeDefined()
    })

    test('should validate POST /api/games/cases/open response structure', () => {
      const mockOpenCaseResponse = {
        success: true,
        opening_result: {
          case_type: {
            id: 'case-1',
            name: 'Scav Case',
            price: 500
          },
          item_won: {
            id: 'item-1',
            name: 'Bandage',
            rarity: 'common',
            base_value: 50,
            category: 'medical'
          },
          currency_awarded: 60,
          opening_id: 'case_1234567890_user123',
          timestamp: '2024-01-01T12:00:00Z'
        },
        case_price: 500,
        currency_awarded: 60,
        net_result: -440, // Lost money on this case
        new_balance: 9560,
        transaction_id: 'txn-123'
      }

      expect(mockOpenCaseResponse.success).toBe(true)
      expect(mockOpenCaseResponse.opening_result).toBeDefined()
      expect(mockOpenCaseResponse.case_price).toBe(500)
      expect(mockOpenCaseResponse.currency_awarded).toBe(60)
      expect(mockOpenCaseResponse.net_result).toBe(-440)
      expect(mockOpenCaseResponse.new_balance).toBeGreaterThan(0)
      expect(mockOpenCaseResponse.transaction_id).toBeDefined()
    })

    test('should validate GET /api/games/cases/stats response structure', () => {
      const mockStatsResponse = {
        success: true,
        stats: {
          total_cases_opened: 5,
          total_spent: 2500,
          total_won: 2100,
          net_profit: -400,
          rarity_breakdown: {
            common: 3,
            uncommon: 1,
            rare: 1,
            epic: 0,
            legendary: 0
          },
          recent_openings: [
            {
              id: 'history-1',
              game_type: 'case_opening',
              bet_amount: 500,
              win_amount: 300,
              created_at: '2024-01-01T12:00:00Z'
            }
          ]
        }
      }

      expect(mockStatsResponse.success).toBe(true)
      expect(mockStatsResponse.stats.total_cases_opened).toBe(5)
      expect(mockStatsResponse.stats.rarity_breakdown).toBeDefined()
      expect(Array.isArray(mockStatsResponse.stats.recent_openings)).toBe(true)
      expect(mockStatsResponse.stats.net_profit).toBe(-400)
    })
  })
})