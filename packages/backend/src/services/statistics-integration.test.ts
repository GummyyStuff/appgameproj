/**
 * Integration test for Statistics Service with Database Service
 * Tests the complete statistics workflow
 */

import { describe, test, expect } from 'bun:test'
import { StatisticsService } from './statistics'
import { DatabaseService } from './database'

describe('Statistics Integration Tests', () => {
  describe('Statistics Service Integration', () => {
    test('should have all required methods', () => {
      expect(typeof StatisticsService.calculateOverviewStatistics).toBe('function')
      expect(typeof StatisticsService.calculateGameTypeBreakdown).toBe('function')
      expect(typeof StatisticsService.calculateTimeSeriesData).toBe('function')
      expect(typeof StatisticsService.calculateWinStreaks).toBe('function')
      expect(typeof StatisticsService.calculateBetPatterns).toBe('function')
      expect(typeof StatisticsService.calculatePlayingHabits).toBe('function')
      expect(typeof StatisticsService.calculateSessions).toBe('function')
      expect(typeof StatisticsService.getEmptyStatistics).toBe('function')
      expect(typeof StatisticsService.getEmptyGameStatistics).toBe('function')
    })

    test('should return consistent empty statistics structure', () => {
      const emptyStats = StatisticsService.getEmptyStatistics()
      
      expect(emptyStats).toHaveProperty('overview')
      expect(emptyStats).toHaveProperty('gameBreakdown')
      expect(emptyStats).toHaveProperty('timeSeriesData')
      expect(emptyStats).toHaveProperty('winStreaks')
      expect(emptyStats).toHaveProperty('betPatterns')
      expect(emptyStats).toHaveProperty('playingHabits')
      
      expect(Array.isArray(emptyStats.gameBreakdown)).toBe(true)
      expect(Array.isArray(emptyStats.timeSeriesData)).toBe(true)
      expect(typeof emptyStats.winStreaks.current).toBe('number')
      expect(typeof emptyStats.betPatterns.mostCommonBet).toBe('number')
      expect(Array.isArray(emptyStats.betPatterns.betDistribution)).toBe(true)
    })

    test('should handle edge cases gracefully', () => {
      // Test with empty data
      const emptyOverview = StatisticsService.calculateOverviewStatistics([])
      expect(emptyOverview.totalGames).toBe(0)
      expect(emptyOverview.winRate).toBe(0)
      
      const emptyBreakdown = StatisticsService.calculateGameTypeBreakdown([])
      expect(emptyBreakdown).toHaveLength(3) // Should still return all game types
      
      const emptyTimeSeries = StatisticsService.calculateTimeSeriesData([])
      expect(emptyTimeSeries).toHaveLength(0)
      
      const emptyStreaks = StatisticsService.calculateWinStreaks([])
      expect(emptyStreaks.current).toBe(0)
      expect(emptyStreaks.longest).toBe(0)
      expect(emptyStreaks.longestLoss).toBe(0)
      
      const emptyPatterns = StatisticsService.calculateBetPatterns([])
      expect(emptyPatterns.mostCommonBet).toBe(0)
      expect(emptyPatterns.betDistribution).toHaveLength(0)
      
      const emptyHabits = StatisticsService.calculatePlayingHabits([])
      expect(emptyHabits.mostActiveHour).toBe(0)
      expect(emptyHabits.mostActiveDay).toBe('Monday')
      expect(emptyHabits.averageSessionLength).toBe(0)
      expect(emptyHabits.totalPlayTime).toBe(0)
      
      const emptySessions = StatisticsService.calculateSessions([])
      expect(emptySessions).toHaveLength(0)
    })
  })

  describe('Database Service Integration', () => {
    test('should have all required methods for statistics', () => {
      expect(typeof DatabaseService.getUserStatistics).toBe('function')
      expect(typeof DatabaseService.getGameHistory).toBe('function')
      expect(typeof DatabaseService.getRecentGames).toBe('function')
      expect(typeof DatabaseService.getLeaderboard).toBe('function')
      expect(typeof DatabaseService.getGlobalGameStats).toBe('function')
    })
  })

  describe('Type Safety', () => {
    test('should maintain type safety across all statistics methods', () => {
      const mockGameHistory = [
        {
          id: '1',
          user_id: 'test-user',
          game_type: 'roulette' as const,
          bet_amount: 100,
          win_amount: 200,
          result_data: { bet_type: 'red', bet_value: 'red', winning_number: 7, multiplier: 2 },
          created_at: '2024-01-15T10:00:00Z'
        }
      ]

      // Test that all methods accept the correct types and return expected structures
      const overview = StatisticsService.calculateOverviewStatistics(mockGameHistory)
      expect(typeof overview.totalGames).toBe('number')
      expect(typeof overview.winRate).toBe('number')
      
      const breakdown = StatisticsService.calculateGameTypeBreakdown(mockGameHistory)
      expect(Array.isArray(breakdown)).toBe(true)
      if (breakdown.length > 0) {
        expect(typeof breakdown[0].gameType).toBe('string')
        expect(typeof breakdown[0].popularityRank).toBe('number')
        expect(['up', 'down', 'stable'].includes(breakdown[0].recentTrend)).toBe(true)
      }
      
      const timeSeries = StatisticsService.calculateTimeSeriesData(mockGameHistory)
      expect(Array.isArray(timeSeries)).toBe(true)
      if (timeSeries.length > 0) {
        expect(typeof timeSeries[0].date).toBe('string')
        expect(typeof timeSeries[0].games).toBe('number')
        expect(typeof timeSeries[0].wagered).toBe('number')
        expect(typeof timeSeries[0].won).toBe('number')
        expect(typeof timeSeries[0].profit).toBe('number')
      }
    })
  })

  describe('Data Consistency', () => {
    test('should maintain data consistency across different calculation methods', () => {
      const mockGameHistory = [
        {
          id: '1',
          user_id: 'test-user',
          game_type: 'roulette' as const,
          bet_amount: 100,
          win_amount: 200,
          result_data: { bet_type: 'red', bet_value: 'red', winning_number: 7, multiplier: 2 },
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: '2',
          user_id: 'test-user',
          game_type: 'blackjack' as const,
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

      const overview = StatisticsService.calculateOverviewStatistics(mockGameHistory)
      const breakdown = StatisticsService.calculateGameTypeBreakdown(mockGameHistory)
      const timeSeries = StatisticsService.calculateTimeSeriesData(mockGameHistory)

      // Total games should be consistent
      expect(overview.totalGames).toBe(2)
      
      // Game type breakdown should sum to total
      const totalGamesFromBreakdown = breakdown.reduce((sum, game) => sum + game.statistics.totalGames, 0)
      expect(totalGamesFromBreakdown).toBe(overview.totalGames)
      
      // Time series should sum to total
      const totalGamesFromTimeSeries = timeSeries.reduce((sum, day) => sum + day.games, 0)
      expect(totalGamesFromTimeSeries).toBe(overview.totalGames)
      
      // Wagered amounts should be consistent
      const totalWageredFromBreakdown = breakdown.reduce((sum, game) => sum + game.statistics.totalWagered, 0)
      expect(totalWageredFromBreakdown).toBe(overview.totalWagered)
      
      const totalWageredFromTimeSeries = timeSeries.reduce((sum, day) => sum + day.wagered, 0)
      expect(totalWageredFromTimeSeries).toBe(overview.totalWagered)
    })
  })
})