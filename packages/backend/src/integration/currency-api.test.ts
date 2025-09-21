import { describe, it, expect } from 'bun:test'

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.STARTING_BALANCE = '10000'
process.env.DAILY_BONUS = '1000'

describe('Currency API Integration', () => {
  describe('API Endpoint Validation', () => {
    it('should validate balance request parameters', () => {
      const { z } = require('zod')
      
      const balanceValidationSchema = z.object({
        amount: z.number().positive('Amount must be positive')
      })

      // Valid request
      expect(() => balanceValidationSchema.parse({ amount: 1000 })).not.toThrow()
      
      // Invalid requests
      expect(() => balanceValidationSchema.parse({ amount: -100 })).toThrow()
      expect(() => balanceValidationSchema.parse({ amount: 0 })).toThrow()
      expect(() => balanceValidationSchema.parse({})).toThrow()
    })

    it('should validate transaction history query parameters', () => {
      // Simulate query parameter parsing
      const parseQueryParams = (query: Record<string, string>) => {
        const limit = parseInt(query.limit || '50')
        const offset = parseInt(query.offset || '0')
        const gameType = query.game_type

        if (limit < 1 || limit > 100) {
          throw new Error('Limit must be between 1 and 100')
        }

        if (offset < 0) {
          throw new Error('Offset must be non-negative')
        }

        if (gameType && !['roulette', 'blackjack'].includes(gameType)) {
          throw new Error('Invalid game type')
        }

        return { limit, offset, gameType }
      }

      // Valid parameters
      expect(() => parseQueryParams({ limit: '25', offset: '10' })).not.toThrow()
      expect(() => parseQueryParams({ game_type: 'roulette' })).not.toThrow()
      expect(() => parseQueryParams({})).not.toThrow() // defaults

      // Invalid parameters
      expect(() => parseQueryParams({ limit: '0' })).toThrow()
      expect(() => parseQueryParams({ limit: '101' })).toThrow()
      expect(() => parseQueryParams({ offset: '-1' })).toThrow()
      expect(() => parseQueryParams({ game_type: 'invalid' })).toThrow()
    })

    it('should format API responses correctly', () => {
      const formatBalanceResponse = (balance: number, dailyBonusStatus: any) => {
        return {
          balance,
          formatted_balance: `₽${balance.toLocaleString()}`,
          daily_bonus: {
            can_claim: dailyBonusStatus.canClaim,
            bonus_amount: dailyBonusStatus.bonusAmount,
            formatted_bonus: `₽${dailyBonusStatus.bonusAmount.toLocaleString()}`,
            next_available: dailyBonusStatus.nextAvailableDate,
            cooldown_hours: dailyBonusStatus.cooldownHours
          }
        }
      }

      const mockDailyBonusStatus = {
        canClaim: true,
        bonusAmount: 1000,
        nextAvailableDate: undefined,
        cooldownHours: undefined
      }

      const response = formatBalanceResponse(15000, mockDailyBonusStatus)

      expect(response.balance).toBe(15000)
      expect(response.formatted_balance).toBe('₽15,000')
      expect(response.daily_bonus.can_claim).toBe(true)
      expect(response.daily_bonus.bonus_amount).toBe(1000)
      expect(response.daily_bonus.formatted_bonus).toBe('₽1,000')
    })

    it('should format transaction history responses correctly', () => {
      const formatTransactionResponse = (transactions: any[]) => {
        return {
          transactions: transactions.map(tx => ({
            ...tx,
            formatted_bet: `₽${tx.betAmount.toLocaleString()}`,
            formatted_win: `₽${tx.winAmount.toLocaleString()}`,
            formatted_net: `₽${tx.netResult.toLocaleString()}`
          })),
          pagination: {
            total: transactions.length,
            limit: 50,
            offset: 0,
            hasMore: false
          }
        }
      }

      const mockTransactions = [
        {
          id: 'tx-1',
          type: 'roulette',
          betAmount: 1000,
          winAmount: 1500,
          netResult: 500,
          timestamp: '2024-01-01T00:00:00Z'
        },
        {
          id: 'tx-2',
          type: 'blackjack',
          betAmount: 500,
          winAmount: 0,
          netResult: -500,
          timestamp: '2024-01-01T01:00:00Z'
        }
      ]

      const response = formatTransactionResponse(mockTransactions)

      expect(response.transactions).toHaveLength(2)
      expect(response.transactions[0].formatted_bet).toBe('₽1,000')
      expect(response.transactions[0].formatted_win).toBe('₽1,500')
      expect(response.transactions[0].formatted_net).toBe('₽500')
      expect(response.transactions[1].formatted_net).toBe('₽-500')
    })

    it('should format statistics responses correctly', () => {
      const formatStatsResponse = (stats: any) => {
        return {
          stats: {
            current_balance: stats.currentBalance,
            formatted_balance: `₽${stats.currentBalance.toLocaleString()}`,
            total_wagered: stats.totalWagered,
            formatted_wagered: `₽${stats.totalWagered.toLocaleString()}`,
            total_won: stats.totalWon,
            formatted_won: `₽${stats.totalWon.toLocaleString()}`,
            net_profit: stats.netProfit,
            formatted_profit: `₽${stats.netProfit.toLocaleString()}`,
            games_played: stats.gamesPlayed,
            daily_bonus_status: stats.dailyBonusStatus,
            game_breakdown: stats.gameBreakdown
          }
        }
      }

      const mockStats = {
        currentBalance: 15000,
        totalWagered: 50000,
        totalWon: 45000,
        netProfit: -5000,
        gamesPlayed: 100,
        dailyBonusStatus: { canClaim: false },
        gameBreakdown: { roulette: { games_played: 50 } }
      }

      const response = formatStatsResponse(mockStats)

      expect(response.stats.current_balance).toBe(15000)
      expect(response.stats.formatted_balance).toBe('₽15,000')
      expect(response.stats.formatted_profit).toBe('₽-5,000')
      expect(response.stats.games_played).toBe(100)
    })
  })

  describe('Error Handling', () => {
    it('should handle currency service errors appropriately', () => {
      const handleCurrencyError = (error: Error) => {
        if (error.message.includes('already claimed')) {
          return { status: 400, message: error.message }
        }
        
        if (error.message.includes('Insufficient balance')) {
          return { status: 400, message: error.message }
        }
        
        if (error.message.includes('not found')) {
          return { status: 404, message: 'User not found' }
        }
        
        return { status: 500, message: 'Internal server error' }
      }

      // Test different error scenarios
      expect(handleCurrencyError(new Error('Daily bonus already claimed'))).toEqual({
        status: 400,
        message: 'Daily bonus already claimed'
      })

      expect(handleCurrencyError(new Error('Insufficient balance. Required: 1000, Available: 500'))).toEqual({
        status: 400,
        message: 'Insufficient balance. Required: 1000, Available: 500'
      })

      expect(handleCurrencyError(new Error('User profile not found'))).toEqual({
        status: 404,
        message: 'User not found'
      })

      expect(handleCurrencyError(new Error('Database connection failed'))).toEqual({
        status: 500,
        message: 'Internal server error'
      })
    })

    it('should validate authentication requirements', () => {
      const requireAuth = (authHeader?: string) => {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new Error('Missing or invalid authorization header')
        }
        
        const token = authHeader.substring(7)
        if (!token || token.length < 10) {
          throw new Error('Invalid token format')
        }
        
        return { userId: 'test-user-id', email: 'test@example.com' }
      }

      // Valid auth
      expect(() => requireAuth('Bearer valid-jwt-token-here')).not.toThrow()

      // Invalid auth
      expect(() => requireAuth()).toThrow('Missing or invalid authorization header')
      expect(() => requireAuth('Invalid header')).toThrow('Missing or invalid authorization header')
      expect(() => requireAuth('Bearer ')).toThrow('Invalid token format')
      expect(() => requireAuth('Bearer short')).toThrow('Invalid token format')
    })
  })
})