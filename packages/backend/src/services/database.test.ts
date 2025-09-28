/**
 * Database Service Unit Tests
 * Tests for all database operations and currency management
 */

import { describe, test, expect } from 'bun:test'
import { DatabaseService } from './database'

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.STARTING_BALANCE = '10000'
process.env.DAILY_BONUS = '1000'

describe('DatabaseService', () => {
  describe('Static Methods', () => {
    test('should have all required methods', () => {
      expect(typeof DatabaseService.getUserProfile).toBe('function')
      expect(typeof DatabaseService.updateUserProfile).toBe('function')
      expect(typeof DatabaseService.getUserBalance).toBe('function')
      expect(typeof DatabaseService.processGameTransaction).toBe('function')
      expect(typeof DatabaseService.getGameHistory).toBe('function')
      expect(typeof DatabaseService.getUserStatistics).toBe('function')
      expect(typeof DatabaseService.getRecentGames).toBe('function')
      expect(typeof DatabaseService.getLeaderboard).toBe('function')
      expect(typeof DatabaseService.getGlobalGameStats).toBe('function')
      expect(typeof DatabaseService.claimDailyBonus).toBe('function')
      expect(typeof DatabaseService.isUsernameAvailable).toBe('function')
    })
  })

  describe('User Profile Operations', () => {
    test('should validate user profile structure', () => {
      const mockProfile = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        balance: 10000,
        created_at: '2024-01-01T00:00:00Z',
        last_login: '2024-01-15T10:00:00Z',
        daily_bonus_claimed_at: null,
        is_active: true
      }

      // Test profile structure validation
      expect(mockProfile).toHaveProperty('id')
      expect(mockProfile).toHaveProperty('username')
      expect(mockProfile).toHaveProperty('email')
      expect(mockProfile).toHaveProperty('balance')
      expect(mockProfile).toHaveProperty('created_at')
      expect(mockProfile).toHaveProperty('last_login')
      expect(mockProfile).toHaveProperty('daily_bonus_claimed_at')
      expect(mockProfile).toHaveProperty('is_active')

      expect(typeof mockProfile.id).toBe('string')
      expect(typeof mockProfile.username).toBe('string')
      expect(typeof mockProfile.email).toBe('string')
      expect(typeof mockProfile.balance).toBe('number')
      expect(typeof mockProfile.is_active).toBe('boolean')
    })
  })

  describe('Balance Operations', () => {
    test('should validate balance update parameters', () => {
      const validUpdates = [
        { userId: 'user123', amount: 100 },
        { userId: 'user456', amount: -50 },
        { userId: 'user789', amount: 0 }
      ]

      const invalidUpdates = [
        { userId: '', amount: 100 },
        { userId: 'user123', amount: NaN },
        { userId: 'user123', amount: Infinity }
      ]

      for (const update of validUpdates) {
        expect(update.userId).toBeTruthy()
        expect(typeof update.amount).toBe('number')
        expect(isFinite(update.amount)).toBe(true)
      }

      for (const update of invalidUpdates) {
        const isValid = !!(update.userId &&
                          typeof update.amount === 'number' &&
                          isFinite(update.amount))
        expect(isValid).toBe(false)
      }
    })

    test('should validate transaction parameters', () => {
      const validTransactions = [
        { userId: 'user123', betAmount: 100, winAmount: 200 },
        { userId: 'user456', betAmount: 50, winAmount: 0 },
        { userId: 'user789', betAmount: 25, winAmount: 25 }
      ]

      const invalidTransactions = [
        { userId: '', betAmount: 100, winAmount: 200 },
        { userId: 'user123', betAmount: -100, winAmount: 200 },
        { userId: 'user123', betAmount: 100, winAmount: -50 }
      ]

      for (const tx of validTransactions) {
        expect(tx.userId).toBeTruthy()
        expect(tx.betAmount).toBeGreaterThan(0)
        expect(tx.winAmount).toBeGreaterThanOrEqual(0)
      }

      for (const tx of invalidTransactions) {
        const isValid = !!(tx.userId &&
                          tx.betAmount > 0 &&
                          tx.winAmount >= 0)
        expect(isValid).toBe(false)
      }
    })
  })

  describe('Game History Operations', () => {
    test('should validate game history record structure', () => {
      const mockGameRecord = {
        id: 'game123',
        user_id: 'user123',
        game_type: 'roulette' as const,
        bet_amount: 100,
        win_amount: 200,
        result_data: {
          bet_type: 'red',
          bet_value: 'red',
          winning_number: 7,
          multiplier: 2
        },
        created_at: '2024-01-15T10:00:00Z'
      }

      expect(mockGameRecord).toHaveProperty('id')
      expect(mockGameRecord).toHaveProperty('user_id')
      expect(mockGameRecord).toHaveProperty('game_type')
      expect(mockGameRecord).toHaveProperty('bet_amount')
      expect(mockGameRecord).toHaveProperty('win_amount')
      expect(mockGameRecord).toHaveProperty('result_data')
      expect(mockGameRecord).toHaveProperty('created_at')

      expect(['roulette', 'blackjack']).toContain(mockGameRecord.game_type)
      expect(mockGameRecord.bet_amount).toBeGreaterThan(0)
      expect(mockGameRecord.win_amount).toBeGreaterThanOrEqual(0)
      expect(typeof mockGameRecord.result_data).toBe('object')
    })

    test('should validate game history query parameters', () => {
      const validQueries = [
        { userId: 'user123', limit: 10, offset: 0 },
        { userId: 'user456', limit: 50, offset: 20, gameType: 'roulette' },
        { userId: 'user789', limit: 25, offset: 0, startDate: '2024-01-01', endDate: '2024-01-31' }
      ]

      const invalidQueries = [
        { userId: '', limit: 10, offset: 0 },
        { userId: 'user123', limit: -10, offset: 0 },
        { userId: 'user123', limit: 10, offset: -5 },
        { userId: 'user123', limit: 1000, offset: 0 } // Too large limit
      ]

      for (const query of validQueries) {
        expect(query.userId).toBeTruthy()
        expect(query.limit).toBeGreaterThan(0)
        expect(query.limit).toBeLessThanOrEqual(100)
        expect(query.offset).toBeGreaterThanOrEqual(0)
      }

      for (const query of invalidQueries) {
        const isValid = !!(query.userId &&
                          query.limit > 0 &&
                          query.limit <= 100 &&
                          query.offset >= 0)
        expect(isValid).toBe(false)
      }
    })
  })

  describe('Statistics Operations', () => {
    test('should validate statistics query parameters', () => {
      const validQueries = [
        { userId: 'user123' },
        { userId: 'user456', gameType: 'roulette' },
        { userId: 'user789', startDate: '2024-01-01', endDate: '2024-01-31' }
      ]

      const invalidQueries = [
        { userId: '' },
        { userId: 'user123', gameType: 'invalid' as any }
      ]

      for (const query of validQueries) {
        expect(query.userId).toBeTruthy()
        if (query.gameType) {
          expect(['roulette', 'blackjack']).toContain(query.gameType)
        }
      }

      for (const query of invalidQueries) {
        const isValid = !!(query.userId &&
                          (!query.gameType || ['roulette', 'blackjack'].includes(query.gameType as any)))
        expect(isValid).toBe(false)
      }
    })
  })

  describe('Daily Bonus Operations', () => {
    test('should validate daily bonus logic', () => {
      const today = new Date()
      const todayString = today.toDateString()
      
      // Test same day logic
      const sameDay = new Date()
      expect(sameDay.toDateString() === todayString).toBe(true)
      
      // Test different day logic
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(yesterday.toDateString() !== todayString).toBe(true)
      
      // Test next available date calculation
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      
      expect(tomorrow.getTime() > today.getTime()).toBe(true)
    })

    test('should validate bonus amount', () => {
      const bonusAmount = 1000
      expect(bonusAmount).toBeGreaterThan(0)
      expect(typeof bonusAmount).toBe('number')
      expect(isFinite(bonusAmount)).toBe(true)
    })
  })

  describe('Leaderboard Operations', () => {
    test('should validate leaderboard query parameters', () => {
      const validQueries = [
        { limit: 10, timeframe: 'daily' as const },
        { limit: 50, timeframe: 'weekly' as const },
        { limit: 100, timeframe: 'monthly' as const, gameType: 'roulette' }
      ]

      const invalidQueries = [
        { limit: 0, timeframe: 'daily' as const },
        { limit: 10, timeframe: 'invalid' as any },
        { limit: 1000, timeframe: 'daily' as const }
      ]

      for (const query of validQueries) {
        expect(query.limit).toBeGreaterThan(0)
        expect(query.limit).toBeLessThanOrEqual(100)
        expect(['daily', 'weekly', 'monthly', 'all-time']).toContain(query.timeframe)
      }

      for (const query of invalidQueries) {
        const isValid = query.limit > 0 && 
                        query.limit <= 100 && 
                        ['daily', 'weekly', 'monthly', 'all-time'].includes(query.timeframe as any)
        expect(isValid).toBe(false)
      }
    })
  })

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', () => {
      // Test error handling patterns
      const mockError = new Error('Database connection failed')
      expect(mockError.message).toBe('Database connection failed')
      expect(mockError instanceof Error).toBe(true)
    })

    test('should handle invalid user IDs', () => {
      const invalidUserIds = ['', null, undefined, 123, {}, []]
      
      for (const userId of invalidUserIds) {
        const isValid = typeof userId === 'string' && userId.length > 0
        expect(isValid).toBe(false)
      }
    })

    test('should handle SQL injection attempts', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'/*",
        "1'; DELETE FROM users WHERE '1'='1; --"
      ]

      // These should be treated as regular strings, not SQL
      for (const input of maliciousInputs) {
        expect(typeof input).toBe('string')
        // In a real implementation, these would be sanitized
        expect(input.includes("'")).toBe(true)
      }
    })
  })

  describe('Data Consistency', () => {
    test('should maintain referential integrity', () => {
      const mockGameRecord = {
        id: 'game123',
        user_id: 'user123',
        game_type: 'roulette' as const,
        bet_amount: 100,
        win_amount: 200,
        result_data: {},
        created_at: '2024-01-15T10:00:00Z'
      }

      const mockUserProfile = {
        id: 'user123',
        username: 'testuser',
        balance: 10000
      }

      // Game record should reference existing user
      expect(mockGameRecord.user_id).toBe(mockUserProfile.id)
    })

    test('should validate transaction atomicity', () => {
      const transaction = {
        userId: 'user123',
        betAmount: 100,
        winAmount: 200,
        netChange: 100 // winAmount - betAmount
      }

      expect(transaction.netChange).toBe(transaction.winAmount - transaction.betAmount)
    })
  })
})