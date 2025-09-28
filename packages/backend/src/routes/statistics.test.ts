/**
 * API endpoint tests for Statistics routes
 * Tests key statistics endpoints with basic functionality
 */

import { describe, test, expect } from 'bun:test'

describe('Statistics API Routes', () => {
  describe('Route Structure', () => {
    test('should have all required statistics routes defined', async () => {
      // Import the routes to check they exist
      const { statisticsRoutes } = await import('./statistics')
      
      expect(statisticsRoutes).toBeDefined()
      expect(typeof statisticsRoutes).toBe('object')
    })
  })

  describe('Route Dependencies', () => {
    test('should import all required services', async () => {
      const { StatisticsService } = await import('../services/statistics')
      const { DatabaseService } = await import('../services/database')
      
      expect(StatisticsService).toBeDefined()
      expect(DatabaseService).toBeDefined()
      
      // Check that key methods exist
      expect(typeof StatisticsService.getAdvancedStatistics).toBe('function')
      expect(typeof StatisticsService.calculateTimeSeriesData).toBe('function')
      expect(typeof StatisticsService.calculateGameTypeBreakdown).toBe('function')
      expect(typeof StatisticsService.calculateWinStreaks).toBe('function')
      expect(typeof StatisticsService.calculateBetPatterns).toBe('function')
      expect(typeof StatisticsService.calculatePlayingHabits).toBe('function')
      expect(typeof StatisticsService.getLeaderboard).toBe('function')
      expect(typeof StatisticsService.getGlobalStatistics).toBe('function')
      
      expect(typeof DatabaseService.getUserStatistics).toBe('function')
      expect(typeof DatabaseService.getGameHistory).toBe('function')
    })
  })

  describe('Validation Schemas', () => {
    test('should validate statistics filters correctly', async () => {
      // Test that the validation schemas work as expected
      const { z } = await import('zod')
      const { isValidGameType } = await import('../types/database')
      
      // Test game type validation
      expect(isValidGameType('roulette')).toBe(true)
      expect(isValidGameType('blackjack')).toBe(true)

      expect(isValidGameType('invalid')).toBe(false)
      
      // Test that zod is available for validation
      expect(z).toBeDefined()
      expect(typeof z.object).toBe('function')
    })
  })

  describe('Error Handling', () => {
    test('should have proper error handling middleware', async () => {
      const { asyncHandler } = await import('../middleware/error')
      const { HTTPException } = await import('hono/http-exception')
      
      expect(asyncHandler).toBeDefined()
      expect(typeof asyncHandler).toBe('function')
      expect(HTTPException).toBeDefined()
    })
  })

  describe('Authentication', () => {
    test('should have authentication middleware', async () => {
      const { authMiddleware } = await import('../middleware/auth')
      
      expect(authMiddleware).toBeDefined()
      expect(typeof authMiddleware).toBe('function')
    })
  })

  describe('Statistics Service Integration', () => {
    test('should handle empty statistics correctly', () => {
      const { StatisticsService } = require('../services/statistics')
      
      const emptyStats = StatisticsService.getEmptyStatistics()
      expect(emptyStats).toBeDefined()
      expect(emptyStats.overview).toBeDefined()
      expect(emptyStats.gameBreakdown).toEqual([])
      expect(emptyStats.timeSeriesData).toEqual([])
      
      const emptyGameStats = StatisticsService.getEmptyGameStatistics()
      expect(emptyGameStats).toBeDefined()
      expect(emptyGameStats.totalGames).toBe(0)
      expect(emptyGameStats.totalWagered).toBe(0)
      expect(emptyGameStats.totalWon).toBe(0)
    })

    test('should calculate statistics with sample data', () => {
      const { StatisticsService } = require('../services/statistics')
      
      const sampleGames = [
        {
          id: '1',
          user_id: 'test-user',
          game_type: 'roulette',
          bet_amount: 100,
          win_amount: 200,
          result_data: { bet_type: 'red', bet_value: 'red', winning_number: 7, multiplier: 2 },
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: '2',
          user_id: 'test-user',
          game_type: 'blackjack',
          bet_amount: 50,
          win_amount: 0,
          result_data: { 
            player_hand: [{ suit: 'hearts', value: 'K' }, { suit: 'spades', value: '7' }],
            dealer_hand: [{ suit: 'diamonds', value: 'A' }, { suit: 'clubs', value: 'K' }],
            result: 'dealer_win'
          },
          created_at: '2024-01-15T11:00:00Z'
        }
      ]

      const overview = StatisticsService.calculateOverviewStatistics(sampleGames)
      expect(overview.totalGames).toBe(2)
      expect(overview.totalWagered).toBe(150)
      expect(overview.totalWon).toBe(200)
      expect(overview.netProfit).toBe(50)
      expect(overview.winRate).toBe(50) // 1 win out of 2 games

      const breakdown = StatisticsService.calculateGameTypeBreakdown(sampleGames)
      expect(breakdown).toHaveLength(3) // All game types should be included
      
      const rouletteBreakdown = breakdown.find(b => b.gameType === 'roulette')
      expect(rouletteBreakdown).toBeDefined()
      expect(rouletteBreakdown!.statistics.totalGames).toBe(1)
      expect(rouletteBreakdown!.statistics.winRate).toBe(100)

      const blackjackBreakdown = breakdown.find(b => b.gameType === 'blackjack')
      expect(blackjackBreakdown).toBeDefined()
      expect(blackjackBreakdown!.statistics.totalGames).toBe(1)
      expect(blackjackBreakdown!.statistics.winRate).toBe(0)

      const timeSeries = StatisticsService.calculateTimeSeriesData(sampleGames)
      expect(timeSeries).toHaveLength(1) // Both games on same date
      expect(timeSeries[0].date).toBe('2024-01-15')
      expect(timeSeries[0].games).toBe(2)
      expect(timeSeries[0].wagered).toBe(150)
      expect(timeSeries[0].won).toBe(200)
      expect(timeSeries[0].profit).toBe(50)

      const streaks = StatisticsService.calculateWinStreaks(sampleGames)
      expect(streaks.longest).toBe(1)
      expect(streaks.longestLoss).toBe(1)
      expect(typeof streaks.current).toBe('number')

      const patterns = StatisticsService.calculateBetPatterns(sampleGames)
      expect(patterns.betDistribution.length).toBeGreaterThan(0)
      expect(typeof patterns.mostCommonBet).toBe('number')

      const habits = StatisticsService.calculatePlayingHabits(sampleGames)
      expect(typeof habits.mostActiveHour).toBe('number')
      expect(typeof habits.mostActiveDay).toBe('string')
      expect(typeof habits.averageSessionLength).toBe('number')
      expect(typeof habits.totalPlayTime).toBe('number')
    })
  })

  describe('Database Service Integration', () => {
    test('should have all required database methods', () => {
      const { DatabaseService } = require('../services/database')
      
      // Check that all required methods exist
      expect(typeof DatabaseService.getUserProfile).toBe('function')
      expect(typeof DatabaseService.getUserBalance).toBe('function')
      expect(typeof DatabaseService.processGameTransaction).toBe('function')
      expect(typeof DatabaseService.claimDailyBonus).toBe('function')
      expect(typeof DatabaseService.getUserStatistics).toBe('function')
      expect(typeof DatabaseService.getGameHistory).toBe('function')
      expect(typeof DatabaseService.getRecentGames).toBe('function')
      expect(typeof DatabaseService.updateUserProfile).toBe('function')
      expect(typeof DatabaseService.isUsernameAvailable).toBe('function')
      expect(typeof DatabaseService.getLeaderboard).toBe('function')
      expect(typeof DatabaseService.getGlobalGameStats).toBe('function')
    })
  })

  describe('Type Safety', () => {
    test('should have proper TypeScript types', async () => {
      const { 
        GameHistory, 
        UserStatistics, 
        GameHistoryResponse,
        TABLE_NAMES,
        RPC_FUNCTIONS,
        GAME_CONFIG
      } = await import('../types/database')
      
      // Check that constants are defined
      expect(TABLE_NAMES).toBeDefined()
      expect(TABLE_NAMES.USER_PROFILES).toBe('user_profiles')
      expect(TABLE_NAMES.GAME_HISTORY).toBe('game_history')
      expect(TABLE_NAMES.DAILY_BONUSES).toBe('daily_bonuses')
      
      expect(RPC_FUNCTIONS).toBeDefined()
      expect(RPC_FUNCTIONS.GET_USER_BALANCE).toBe('get_user_balance')
      expect(RPC_FUNCTIONS.PROCESS_GAME_TRANSACTION).toBe('process_game_transaction')
      expect(RPC_FUNCTIONS.GET_USER_STATISTICS).toBe('get_user_statistics')
      expect(RPC_FUNCTIONS.GET_GAME_HISTORY).toBe('get_game_history')
      
      expect(GAME_CONFIG).toBeDefined()
      expect(GAME_CONFIG.STARTING_BALANCE).toBe(10000)
      expect(GAME_CONFIG.DAILY_BONUS_AMOUNT).toBe(1000)
      expect(GAME_CONFIG.GAME_TYPES).toEqual(['roulette', 'blackjack', 'case_opening'])
    })
  })

  describe('API Route Structure', () => {
    test('should export statistics routes properly', async () => {
      const statisticsModule = await import('./statistics')
      
      expect(statisticsModule.statisticsRoutes).toBeDefined()
      
      // The routes should be a Hono instance
      expect(typeof statisticsModule.statisticsRoutes).toBe('object')
      expect(statisticsModule.statisticsRoutes.constructor.name).toBe('Hono')
    })
  })

  describe('Middleware Integration', () => {
    test('should have proper middleware setup', async () => {
      // Check that all required middleware exists
      const authModule = await import('../middleware/auth')
      const errorModule = await import('../middleware/error')
      
      expect(authModule.authMiddleware).toBeDefined()
      expect(errorModule.asyncHandler).toBeDefined()
      
      expect(typeof authModule.authMiddleware).toBe('function')
      expect(typeof errorModule.asyncHandler).toBe('function')
    })
  })
})