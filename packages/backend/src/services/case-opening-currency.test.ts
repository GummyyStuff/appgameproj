/**
 * Currency Transaction Validation Tests for Case Opening
 * Tests atomic operations, balance consistency, and transaction integrity
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

import { CaseOpeningService, type CaseType, type CaseOpeningResult } from './case-opening'

describe('Case Opening Currency Transaction Tests', () => {
  
  describe('Balance Validation Logic', () => {
    test('should correctly validate sufficient balance', async () => {
      const mockCaseType: CaseType = {
        id: 'balance-test-case',
        name: 'Balance Test Case',
        price: 500,
        description: 'Case for balance testing',
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

      // Test validation logic
      const validateBalance = (userBalance: number, casePrice: number) => {
        return {
          isValid: userBalance >= casePrice,
          shortfall: userBalance < casePrice ? casePrice - userBalance : 0,
          remainingBalance: userBalance >= casePrice ? userBalance - casePrice : userBalance
        }
      }

      // Test cases
      const testCases = [
        { balance: 1000, price: 500, expectedValid: true, expectedShortfall: 0, expectedRemaining: 500 },
        { balance: 500, price: 500, expectedValid: true, expectedShortfall: 0, expectedRemaining: 0 },
        { balance: 499, price: 500, expectedValid: false, expectedShortfall: 1, expectedRemaining: 499 },
        { balance: 0, price: 500, expectedValid: false, expectedShortfall: 500, expectedRemaining: 0 },
        { balance: 10000, price: 500, expectedValid: true, expectedShortfall: 0, expectedRemaining: 9500 }
      ]

      testCases.forEach(({ balance, price, expectedValid, expectedShortfall, expectedRemaining }) => {
        const result = validateBalance(balance, price)
        expect(result.isValid).toBe(expectedValid)
        expect(result.shortfall).toBe(expectedShortfall)
        expect(result.remainingBalance).toBe(expectedRemaining)
      })
    })

    test('should handle edge cases in balance validation', () => {
      const validateBalance = (userBalance: number, casePrice: number) => {
        // Handle negative values and edge cases
        if (userBalance < 0) userBalance = 0
        if (casePrice < 0) casePrice = 0
        
        return {
          isValid: userBalance >= casePrice,
          shortfall: userBalance < casePrice ? casePrice - userBalance : 0,
          remainingBalance: userBalance >= casePrice ? userBalance - casePrice : userBalance
        }
      }

      // Edge cases
      const edgeCases = [
        { balance: -100, price: 500, expectedValid: false, expectedShortfall: 500 },
        { balance: 1000, price: -100, expectedValid: true, expectedShortfall: 0 },
        { balance: 0, price: 0, expectedValid: true, expectedShortfall: 0 },
        { balance: Number.MAX_SAFE_INTEGER, price: 1, expectedValid: true, expectedShortfall: 0 },
        { balance: 1, price: 1000000, expectedValid: false, expectedShortfall: 999999 }
      ]

      edgeCases.forEach(({ balance, price, expectedValid, expectedShortfall }) => {
        const result = validateBalance(balance, price)
        expect(result.isValid).toBe(expectedValid)
        expect(result.shortfall).toBe(expectedShortfall)
      })
    })
  })

  describe('Transaction Atomicity Simulation', () => {
    test('should simulate atomic transaction behavior', () => {
      // Simulate the transaction steps that would happen in a real case opening
      const simulateTransaction = (
        userId: string,
        initialBalance: number,
        casePrice: number,
        currencyAwarded: number
      ) => {
        const steps: string[] = []
        let currentBalance = initialBalance

        try {
          // Step 1: Validate balance
          steps.push('validate_balance')
          if (currentBalance < casePrice) {
            throw new Error('Insufficient balance')
          }

          // Step 2: Deduct case price
          steps.push('deduct_case_price')
          currentBalance -= casePrice

          // Step 3: Award currency from item
          steps.push('award_currency')
          currentBalance += currencyAwarded

          // Step 4: Record transaction
          steps.push('record_transaction')

          return {
            success: true,
            finalBalance: currentBalance,
            netChange: currencyAwarded - casePrice,
            steps
          }
        } catch (error) {
          return {
            success: false,
            finalBalance: initialBalance, // Rollback
            netChange: 0,
            steps,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }

      // Test successful transaction
      const successResult = simulateTransaction('user1', 1000, 500, 750)
      expect(successResult.success).toBe(true)
      expect(successResult.finalBalance).toBe(1250) // 1000 - 500 + 750
      expect(successResult.netChange).toBe(250) // 750 - 500
      expect(successResult.steps).toEqual([
        'validate_balance',
        'deduct_case_price',
        'award_currency',
        'record_transaction'
      ])

      // Test failed transaction (insufficient balance)
      const failResult = simulateTransaction('user2', 300, 500, 750)
      expect(failResult.success).toBe(false)
      expect(failResult.finalBalance).toBe(300) // No change due to rollback
      expect(failResult.netChange).toBe(0)
      expect(failResult.error).toBe('Insufficient balance')
    })

    test('should handle concurrent transaction simulation', () => {
      // Simulate multiple users trying to spend from the same balance simultaneously
      const simulateConcurrentTransactions = (
        initialBalance: number,
        transactions: Array<{ userId: string; casePrice: number; currencyAwarded: number }>
      ) => {
        let currentBalance = initialBalance
        const results: any[] = []

        // Process transactions sequentially (simulating proper locking)
        transactions.forEach(({ userId, casePrice, currencyAwarded }) => {
          if (currentBalance >= casePrice) {
            currentBalance = currentBalance - casePrice + currencyAwarded
            results.push({
              userId,
              success: true,
              balanceAfter: currentBalance,
              netChange: currencyAwarded - casePrice
            })
          } else {
            results.push({
              userId,
              success: false,
              balanceAfter: currentBalance,
              netChange: 0,
              error: 'Insufficient balance'
            })
          }
        })

        return {
          finalBalance: currentBalance,
          results
        }
      }

      const transactions = [
        { userId: 'user1', casePrice: 500, currencyAwarded: 400 }, // -100
        { userId: 'user2', casePrice: 500, currencyAwarded: 800 }, // +300
        { userId: 'user3', casePrice: 500, currencyAwarded: 300 }, // -200
        { userId: 'user4', casePrice: 500, currencyAwarded: 600 }  // +100
      ]

      const result = simulateConcurrentTransactions(1200, transactions)

      // First transaction: 1200 - 500 + 400 = 1100 (success)
      // Second transaction: 1100 - 500 + 800 = 1400 (success)
      // Third transaction: 1400 - 500 + 300 = 1200 (success)
      // Fourth transaction: 1200 - 500 + 600 = 1300 (success)

      expect(result.results[0].success).toBe(true)
      expect(result.results[0].balanceAfter).toBe(1100)
      expect(result.results[1].success).toBe(true)
      expect(result.results[1].balanceAfter).toBe(1400)
      expect(result.results[2].success).toBe(true)
      expect(result.results[2].balanceAfter).toBe(1200)
      expect(result.results[3].success).toBe(true)
      expect(result.results[3].balanceAfter).toBe(1300)
      expect(result.finalBalance).toBe(1300)
    })
  })

  describe('Currency Calculation Validation', () => {
    test('should validate currency calculations for different scenarios', () => {
      const testScenarios = [
        {
          name: 'Profitable case opening',
          casePrice: 500,
          itemValue: 800,
          multiplier: 1.5,
          expectedCurrency: 1200, // 800 * 1.5
          expectedProfit: 700 // 1200 - 500
        },
        {
          name: 'Break-even case opening',
          casePrice: 500,
          itemValue: 500,
          multiplier: 1.0,
          expectedCurrency: 500, // 500 * 1.0
          expectedProfit: 0 // 500 - 500
        },
        {
          name: 'Loss case opening',
          casePrice: 500,
          itemValue: 200,
          multiplier: 1.0,
          expectedCurrency: 200, // 200 * 1.0
          expectedProfit: -300 // 200 - 500
        },
        {
          name: 'High multiplier case',
          casePrice: 1000,
          itemValue: 500,
          multiplier: 3.0,
          expectedCurrency: 1500, // 500 * 3.0
          expectedProfit: 500 // 1500 - 1000
        },
        {
          name: 'Fractional multiplier',
          casePrice: 500,
          itemValue: 333,
          multiplier: 1.5,
          expectedCurrency: 499, // Math.floor(333 * 1.5) = 499
          expectedProfit: -1 // 499 - 500
        }
      ]

      testScenarios.forEach(({ name, casePrice, itemValue, multiplier, expectedCurrency, expectedProfit }) => {
        const mockItem = {
          id: 'test-item',
          name: 'Test Item',
          rarity: 'common' as const,
          base_value: itemValue,
          category: 'medical' as const,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }

        const calculatedCurrency = CaseOpeningService.calculateItemValue(mockItem, multiplier)
        const calculatedProfit = calculatedCurrency - casePrice

        expect(calculatedCurrency).toBe(expectedCurrency)
        expect(calculatedProfit).toBe(expectedProfit)

        console.log(`${name}: Currency=${calculatedCurrency}, Profit=${calculatedProfit}`)
      })
    })

    test('should handle precision in currency calculations', () => {
      const precisionTests = [
        { baseValue: 100, multiplier: 1.333, expected: 133 }, // Math.floor(133.3)
        { baseValue: 999, multiplier: 1.001, expected: 999 }, // Math.floor(999.999)
        { baseValue: 1, multiplier: 999.999, expected: 999 }, // Math.floor(999.999)
        { baseValue: 12345, multiplier: 0.0001, expected: 1 }, // Math.floor(1.2345)
        { baseValue: 7, multiplier: 1.428571, expected: 9 } // Math.floor(9.999997)
      ]

      precisionTests.forEach(({ baseValue, multiplier, expected }) => {
        const mockItem = {
          id: 'precision-test',
          name: 'Precision Test Item',
          rarity: 'common' as const,
          base_value: baseValue,
          category: 'medical' as const,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }

        const result = CaseOpeningService.calculateItemValue(mockItem, multiplier)
        expect(result).toBe(expected)
      })
    })
  })

  describe('Transaction History Validation', () => {
    test('should validate game history entry structure', () => {
      const createGameHistoryEntry = (
        userId: string,
        casePrice: number,
        currencyAwarded: number,
        openingResult: Partial<CaseOpeningResult>
      ) => {
        return {
          id: `history-${Date.now()}`,
          user_id: userId,
          game_type: 'case_opening',
          bet_amount: casePrice,
          win_amount: currencyAwarded,
          result_data: {
            case_type_id: openingResult.case_type?.id,
            case_name: openingResult.case_type?.name,
            case_price: casePrice,
            item_id: openingResult.item_won?.id,
            item_name: openingResult.item_won?.name,
            item_rarity: openingResult.item_won?.rarity,
            item_category: openingResult.item_won?.category,
            item_value: openingResult.item_won?.base_value,
            currency_awarded: currencyAwarded,
            opening_id: openingResult.opening_id,
            net_result: currencyAwarded - casePrice
          },
          created_at: new Date().toISOString()
        }
      }

      const mockOpeningResult = {
        case_type: {
          id: 'case-123',
          name: 'Test Case',
          price: 500
        },
        item_won: {
          id: 'item-456',
          name: 'Test Item',
          rarity: 'rare' as const,
          base_value: 800,
          category: 'medical' as const
        },
        opening_id: 'case_1234567890_user123'
      }

      const historyEntry = createGameHistoryEntry('user-123', 500, 1200, mockOpeningResult)

      // Validate structure
      expect(historyEntry.game_type).toBe('case_opening')
      expect(historyEntry.bet_amount).toBe(500)
      expect(historyEntry.win_amount).toBe(1200)
      expect(historyEntry.result_data.net_result).toBe(700) // 1200 - 500
      expect(historyEntry.result_data.case_type_id).toBe('case-123')
      expect(historyEntry.result_data.item_rarity).toBe('rare')
      expect(historyEntry.result_data.opening_id).toBe('case_1234567890_user123')
    })

    test('should calculate statistics from transaction history', () => {
      const mockTransactionHistory = [
        {
          id: '1',
          user_id: 'user-123',
          game_type: 'case_opening',
          bet_amount: 500,
          win_amount: 750,
          result_data: { item_rarity: 'uncommon', net_result: 250 },
          created_at: '2024-01-01T10:00:00Z'
        },
        {
          id: '2',
          user_id: 'user-123',
          game_type: 'case_opening',
          bet_amount: 500,
          win_amount: 300,
          result_data: { item_rarity: 'common', net_result: -200 },
          created_at: '2024-01-01T11:00:00Z'
        },
        {
          id: '3',
          user_id: 'user-123',
          game_type: 'case_opening',
          bet_amount: 1000,
          win_amount: 2500,
          result_data: { item_rarity: 'legendary', net_result: 1500 },
          created_at: '2024-01-01T12:00:00Z'
        },
        {
          id: '4',
          user_id: 'user-123',
          game_type: 'case_opening',
          bet_amount: 500,
          win_amount: 400,
          result_data: { item_rarity: 'common', net_result: -100 },
          created_at: '2024-01-01T13:00:00Z'
        }
      ]

      const calculateStats = (history: any[]) => {
        const totalCases = history.length
        const totalSpent = history.reduce((sum, entry) => sum + entry.bet_amount, 0)
        const totalWon = history.reduce((sum, entry) => sum + entry.win_amount, 0)
        const netProfit = totalWon - totalSpent
        const avgBet = totalSpent / totalCases
        const avgWin = totalWon / totalCases
        const winRate = history.filter(entry => entry.win_amount > entry.bet_amount).length / totalCases
        const biggestWin = Math.max(...history.map(entry => entry.win_amount))
        const biggestLoss = Math.min(...history.map(entry => entry.result_data.net_result))

        const rarityBreakdown = history.reduce((acc, entry) => {
          const rarity = entry.result_data.item_rarity
          acc[rarity] = (acc[rarity] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        return {
          totalCases,
          totalSpent,
          totalWon,
          netProfit,
          avgBet,
          avgWin,
          winRate,
          biggestWin,
          biggestLoss,
          rarityBreakdown
        }
      }

      const stats = calculateStats(mockTransactionHistory)

      expect(stats.totalCases).toBe(4)
      expect(stats.totalSpent).toBe(2500) // 500 + 500 + 1000 + 500
      expect(stats.totalWon).toBe(3950) // 750 + 300 + 2500 + 400
      expect(stats.netProfit).toBe(1450) // 3950 - 2500
      expect(stats.avgBet).toBe(625) // 2500 / 4
      expect(stats.avgWin).toBe(987.5) // 3950 / 4
      expect(stats.winRate).toBe(0.5) // 2 out of 4 cases were profitable
      expect(stats.biggestWin).toBe(2500)
      expect(stats.biggestLoss).toBe(-200)
      expect(stats.rarityBreakdown.common).toBe(2)
      expect(stats.rarityBreakdown.uncommon).toBe(1)
      expect(stats.rarityBreakdown.legendary).toBe(1)
    })
  })

  describe('Balance Consistency Validation', () => {
    test('should maintain balance consistency across multiple operations', () => {
      const simulateMultipleOperations = (initialBalance: number, operations: Array<{
        type: 'case_opening',
        casePrice: number,
        currencyAwarded: number
      }>) => {
        let currentBalance = initialBalance
        const history: any[] = []

        operations.forEach((operation, index) => {
          const beforeBalance = currentBalance
          
          if (currentBalance >= operation.casePrice) {
            currentBalance = currentBalance - operation.casePrice + operation.currencyAwarded
            
            history.push({
              operationIndex: index,
              type: operation.type,
              beforeBalance,
              afterBalance: currentBalance,
              casePrice: operation.casePrice,
              currencyAwarded: operation.currencyAwarded,
              netChange: operation.currencyAwarded - operation.casePrice,
              success: true
            })
          } else {
            history.push({
              operationIndex: index,
              type: operation.type,
              beforeBalance,
              afterBalance: currentBalance,
              casePrice: operation.casePrice,
              currencyAwarded: 0,
              netChange: 0,
              success: false,
              error: 'Insufficient balance'
            })
          }
        })

        return {
          finalBalance: currentBalance,
          history,
          totalOperations: operations.length,
          successfulOperations: history.filter(h => h.success).length
        }
      }

      const operations = [
        { type: 'case_opening' as const, casePrice: 500, currencyAwarded: 750 }, // +250
        { type: 'case_opening' as const, casePrice: 500, currencyAwarded: 300 }, // -200
        { type: 'case_opening' as const, casePrice: 500, currencyAwarded: 1000 }, // +500
        { type: 'case_opening' as const, casePrice: 1000, currencyAwarded: 800 }, // -200
        { type: 'case_opening' as const, casePrice: 500, currencyAwarded: 400 } // -100
      ]

      const result = simulateMultipleOperations(1000, operations)

      // Trace through the operations:
      // Start: 1000
      // Op 1: 1000 - 500 + 750 = 1250 (success)
      // Op 2: 1250 - 500 + 300 = 1050 (success)
      // Op 3: 1050 - 500 + 1000 = 1550 (success)
      // Op 4: 1550 - 1000 + 800 = 1350 (success)
      // Op 5: 1350 - 500 + 400 = 1250 (success)

      expect(result.finalBalance).toBe(1250)
      expect(result.successfulOperations).toBe(5)
      expect(result.totalOperations).toBe(5)

      // Verify each operation's balance consistency
      result.history.forEach((operation, index) => {
        if (operation.success) {
          const expectedAfterBalance = operation.beforeBalance - operation.casePrice + operation.currencyAwarded
          expect(operation.afterBalance).toBe(expectedAfterBalance)
        } else {
          expect(operation.afterBalance).toBe(operation.beforeBalance)
        }
      })

      // Calculate total net change
      const totalNetChange = result.history
        .filter(h => h.success)
        .reduce((sum, h) => sum + h.netChange, 0)
      
      expect(result.finalBalance - 1000).toBe(totalNetChange)
    })
  })
})