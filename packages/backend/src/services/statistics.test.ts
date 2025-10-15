/**
 * Unit tests for Statistics Service
 * Tests all statistics calculation methods with comprehensive test cases
 */

import { describe, test, expect, beforeEach } from 'bun:test'
import { StatisticsServiceAppwrite as StatisticsService } from './statistics-appwrite'

// Update GameHistory interface to match Appwrite structure
interface GameHistory {
  $id: string;
  userId: string;
  gameType: 'roulette' | 'stock_market' | 'case_opening';
  betAmount: number;
  winAmount: number;
  resultData: string; // JSON string in Appwrite
  gameDuration?: number;
  createdAt: string;
}

describe('StatisticsService', () => {
  let mockGameHistory: GameHistory[]

  beforeEach(() => {
    // Reset mock data before each test - updated for Appwrite format
    mockGameHistory = [
      {
        $id: '1',
        userId: 'test-user',
        gameType: 'roulette',
        betAmount: 100,
        winAmount: 200,
        resultData: JSON.stringify({ bet_type: 'red', bet_value: 'red', winning_number: 7, multiplier: 2 }),
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        $id: '2',
        userId: 'test-user',
        gameType: 'stock_market',
        betAmount: 50,
        winAmount: 0,
        resultData: JSON.stringify({ 
          action: 'sell',
          shares: 10,
          price: 5,
          result: 'loss'
        }),
        createdAt: '2024-01-15T11:00:00Z'
      },

      {
        $id: '3',
        userId: 'test-user',
        gameType: 'roulette',
        betAmount: 25,
        winAmount: 75,
        resultData: JSON.stringify({ bet_type: 'dozen', bet_value: 1, winning_number: 5, multiplier: 3 }),
        createdAt: '2024-01-15T12:00:00Z'
      },

      {
        $id: '4',
        userId: 'test-user',
        gameType: 'roulette',
        betAmount: 200,
        winAmount: 0,
        resultData: JSON.stringify({ bet_type: 'number', bet_value: 13, winning_number: 7, multiplier: 0 }),
        createdAt: '2024-01-16T10:00:00Z'
      }
    ]
  })

  describe('calculateOverviewStatistics', () => {
    test('should calculate correct overview statistics', () => {
      const stats = StatisticsService.calculateOverviewStatistics(mockGameHistory)

      expect(stats.totalGames).toBe(4)
      expect(stats.totalWagered).toBe(375) // 100 + 50 + 25 + 200
      expect(stats.totalWon).toBe(275) // 200 + 0 + 75 + 0
      expect(stats.netProfit).toBe(-100) // 275 - 375
      expect(stats.winRate).toBe(50) // 2 wins out of 4 games
      expect(stats.biggestWin).toBe(200)
      expect(stats.biggestLoss).toBe(200) // bet_amount - win_amount for game 4
      expect(stats.averageBet).toBe(93.75) // 375 / 4
      expect(stats.averageWin).toBe(68.75) // 275 / 4
      expect(stats.profitMargin).toBeCloseTo(-26.67, 2) // (-100 / 375) * 100
    })

    test('should handle empty game history', () => {
      const stats = StatisticsService.calculateOverviewStatistics([])

      expect(stats.totalGames).toBe(0)
      expect(stats.totalWagered).toBe(0)
      expect(stats.totalWon).toBe(0)
      expect(stats.netProfit).toBe(0)
      expect(stats.winRate).toBe(0)
      expect(stats.biggestWin).toBe(0) // Empty statistics return 0
      expect(stats.biggestLoss).toBe(0) // Empty statistics return 0
      expect(stats.averageBet).toBe(0) // Empty statistics return 0
      expect(stats.averageWin).toBe(0)
      expect(stats.profitMargin).toBe(0)
    })

    test('should handle single game correctly', () => {
      const singleGame = [mockGameHistory[0]]
      const stats = StatisticsService.calculateOverviewStatistics(singleGame)

      expect(stats.totalGames).toBe(1)
      expect(stats.totalWagered).toBe(100)
      expect(stats.totalWon).toBe(200)
      expect(stats.netProfit).toBe(100)
      expect(stats.winRate).toBe(100) // 1 win out of 1 game
      expect(stats.biggestWin).toBe(200)
      expect(stats.biggestLoss).toBe(-100) // bet_amount - win_amount = 100 - 200 = -100 (negative because it's a win)
      expect(stats.averageBet).toBe(100)
      expect(stats.averageWin).toBe(200)
      expect(stats.profitMargin).toBe(100)
    })
  })

  describe('calculateGameTypeBreakdown', () => {
    test('should calculate breakdown for all game types', () => {
      const breakdown = StatisticsService.calculateGameTypeBreakdown(mockGameHistory)

      expect(breakdown).toHaveLength(3) // roulette, stock_market, case_opening
      expect(breakdown.map(b => b.gameType)).toEqual(expect.arrayContaining(['roulette', 'stock_market']))

      // Find roulette breakdown
      const rouletteBreakdown = breakdown.find(b => b.gameType === 'roulette')
      expect(rouletteBreakdown).toBeDefined()
      expect(rouletteBreakdown!.statistics.totalGames).toBe(3) // Games 1, 3, 4
      expect(rouletteBreakdown!.statistics.totalWagered).toBe(325) // 100 + 25 + 200
      expect(rouletteBreakdown!.statistics.totalWon).toBe(275) // 200 + 75 + 0
      expect(rouletteBreakdown!.statistics.winRate).toBeCloseTo(66.67, 1) // 2 wins out of 3 games

      // Find stock_market breakdown
      const stockMarketBreakdown = breakdown.find(b => b.gameType === 'stock_market')
      expect(stockMarketBreakdown).toBeDefined()
      expect(stockMarketBreakdown!.statistics.totalGames).toBe(1)
      expect(stockMarketBreakdown!.statistics.totalWagered).toBe(50)
      expect(stockMarketBreakdown!.statistics.totalWon).toBe(0)
      expect(stockMarketBreakdown!.statistics.winRate).toBe(0)


    })

    test('should assign popularity ranks correctly', () => {
      const breakdown = StatisticsService.calculateGameTypeBreakdown(mockGameHistory)

      // Roulette should be most popular (2 games)
      const rouletteBreakdown = breakdown.find(b => b.gameType === 'roulette')
      expect(rouletteBreakdown!.popularityRank).toBe(1)

      // Stock market should be second (1 game)
      const stockMarketBreakdown = breakdown.find(b => b.gameType === 'stock_market')
      expect(stockMarketBreakdown!.popularityRank).toBe(2)
    })

    test('should handle empty game history', () => {
      const breakdown = StatisticsService.calculateGameTypeBreakdown([])

      expect(breakdown).toHaveLength(3)
      breakdown.forEach(gameBreakdown => {
        expect(gameBreakdown.statistics.totalGames).toBe(0)
        expect(gameBreakdown.statistics.totalWagered).toBe(0)
        expect(gameBreakdown.statistics.totalWon).toBe(0)
        expect(gameBreakdown.statistics.winRate).toBe(0)
      })
    })
  })

  describe('calculateTimeSeriesData', () => {
    test('should group games by date correctly', () => {
      const timeSeries = StatisticsService.calculateTimeSeriesData(mockGameHistory)

      expect(timeSeries).toHaveLength(2) // 2 different dates

      // Check first date (2024-01-15)
      const day1 = timeSeries.find(d => d.date === '2024-01-15')
      expect(day1).toBeDefined()
      expect(day1!.games).toBe(3) // 3 games on this date
      expect(day1!.wagered).toBe(175) // 100 + 50 + 25
      expect(day1!.won).toBe(275) // 200 + 0 + 75
      expect(day1!.profit).toBe(100) // 275 - 175

      // Check second date (2024-01-16)
      const day2 = timeSeries.find(d => d.date === '2024-01-16')
      expect(day2).toBeDefined()
      expect(day2!.games).toBe(1)
      expect(day2!.wagered).toBe(200)
      expect(day2!.won).toBe(0)
      expect(day2!.profit).toBe(-200)
    })

    test('should sort dates chronologically', () => {
      const timeSeries = StatisticsService.calculateTimeSeriesData(mockGameHistory)

      for (let i = 1; i < timeSeries.length; i++) {
        const prevDate = new Date(timeSeries[i - 1].date)
        const currDate = new Date(timeSeries[i].date)
        expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime())
      }
    })

    test('should handle empty game history', () => {
      const timeSeries = StatisticsService.calculateTimeSeriesData([])
      expect(timeSeries).toHaveLength(0)
    })
  })

  describe('calculateWinStreaks', () => {
    test('should calculate win streaks correctly', () => {
      // Create a specific sequence for streak testing
      // Array is in DESC order (most recent first) - this is how games come from the database
      const streakTestGames: GameHistory[] = [
        { ...mockGameHistory[0], winAmount: 200, betAmount: 100, createdAt: '2024-01-15T13:00:00Z' }, // Win (most recent)
        { ...mockGameHistory[1], winAmount: 100, betAmount: 50, createdAt: '2024-01-15T12:00:00Z' }, // Win
        { ...mockGameHistory[2], winAmount: 0, betAmount: 25, createdAt: '2024-01-15T11:00:00Z' }, // Loss
        { ...mockGameHistory[3], winAmount: 0, betAmount: 200, createdAt: '2024-01-15T10:00:00Z' }, // Loss (oldest)
      ]

      const streaks = StatisticsService.calculateWinStreaks(streakTestGames)

      expect(streaks.longest).toBe(2) // 2 consecutive wins when sorted chronologically
      expect(streaks.longestLoss).toBe(2) // 2 consecutive losses when sorted chronologically  
      expect(streaks.current).toBe(2) // Currently on a 2-game winning streak (first two games in DESC array)
    })

    test('should handle all wins correctly', () => {
      const allWins = mockGameHistory.map(game => ({
        ...game,
        winAmount: game.betAmount * 2 // All games are wins
      }))

      const streaks = StatisticsService.calculateWinStreaks(allWins)

      expect(streaks.longest).toBe(4)
      expect(streaks.longestLoss).toBe(0)
      expect(streaks.current).toBe(4)
    })

    test('should handle all losses correctly', () => {
      const allLosses = mockGameHistory.map(game => ({
        ...game,
        winAmount: 0 // All games are losses
      }))

      const streaks = StatisticsService.calculateWinStreaks(allLosses)

      expect(streaks.longest).toBe(0)
      expect(streaks.longestLoss).toBe(4)
      expect(streaks.current).toBe(-4)
    })

    test('should handle empty game history', () => {
      const streaks = StatisticsService.calculateWinStreaks([])

      expect(streaks.current).toBe(0)
      expect(streaks.longest).toBe(0)
      expect(streaks.longestLoss).toBe(0)
    })
  })

  describe('calculateBetPatterns', () => {
    test('should identify most common bet amount', () => {
      // Add more games with repeated bet amounts
      const extendedHistory = [
        ...mockGameHistory,
        { ...mockGameHistory[0], id: '5', bet_amount: 100 }, // Another 100 bet
        { ...mockGameHistory[0], id: '6', bet_amount: 100 }, // Another 100 bet
      ]

      const patterns = StatisticsService.calculateBetPatterns(extendedHistory)

      expect(patterns.mostCommonBet).toBe(100) // 100 appears 3 times
    })

    test('should create correct bet distribution', () => {
      const patterns = StatisticsService.calculateBetPatterns(mockGameHistory)

      expect(patterns.betDistribution).toEqual(expect.arrayContaining([
        expect.objectContaining({ range: '11-50', count: 2, percentage: 50 }), // 50 and 25
        expect.objectContaining({ range: '51-100', count: 1, percentage: 25 }), // 100
        expect.objectContaining({ range: '101-500', count: 1, percentage: 25 }) // 200
      ]))
    })

    test('should handle empty game history', () => {
      const patterns = StatisticsService.calculateBetPatterns([])

      expect(patterns.mostCommonBet).toBe(0)
      expect(patterns.betDistribution).toHaveLength(0)
    })
  })

  describe('calculatePlayingHabits', () => {
    test('should identify most active hour and day', () => {
      const habits = StatisticsService.calculatePlayingHabits(mockGameHistory)

      expect(typeof habits.mostActiveHour).toBe('number')
      expect(habits.mostActiveHour).toBeGreaterThanOrEqual(0)
      expect(habits.mostActiveHour).toBeLessThan(24)

      expect(typeof habits.mostActiveDay).toBe('string')
      expect(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
        .toContain(habits.mostActiveDay)

      expect(typeof habits.averageSessionLength).toBe('number')
      expect(habits.averageSessionLength).toBeGreaterThanOrEqual(0)

      expect(typeof habits.totalPlayTime).toBe('number')
      expect(habits.totalPlayTime).toBeGreaterThanOrEqual(0)
    })

    test('should handle empty game history', () => {
      const habits = StatisticsService.calculatePlayingHabits([])

      expect(habits.mostActiveHour).toBe(0)
      expect(habits.mostActiveDay).toBe('Monday')
      expect(habits.averageSessionLength).toBe(0)
      expect(habits.totalPlayTime).toBe(0)
    })
  })

  describe('calculateSessions', () => {
    test('should group games into sessions correctly', () => {
      // Create games with specific timing for session testing
      const sessionTestGames: GameHistory[] = [
        { ...mockGameHistory[0], createdAt: '2024-01-15T10:00:00Z' },
        { ...mockGameHistory[1], createdAt: '2024-01-15T10:30:00Z' }, // Same session (30 min gap)
        { ...mockGameHistory[2], createdAt: '2024-01-15T12:00:00Z' }, // New session (1.5 hour gap)
        { ...mockGameHistory[3], createdAt: '2024-01-15T12:15:00Z' }, // Same session (15 min gap)
      ]

      const sessions = StatisticsService.calculateSessions(sessionTestGames)

      expect(sessions).toHaveLength(2) // Should create 2 sessions

      // First session should have 2 games and 30 minutes duration
      expect(sessions[0].games).toBe(2)
      expect(sessions[0].duration).toBe(30)

      // Second session should have 2 games and 15 minutes duration
      expect(sessions[1].games).toBe(2)
      expect(sessions[1].duration).toBe(15)
    })

    test('should handle single game as single session', () => {
      const singleGame = [mockGameHistory[0]]
      const sessions = StatisticsService.calculateSessions(singleGame)

      expect(sessions).toHaveLength(1)
      expect(sessions[0].games).toBe(1)
      expect(sessions[0].duration).toBe(0) // Single game has 0 duration
    })

    test('should handle empty game history', () => {
      const sessions = StatisticsService.calculateSessions([])
      expect(sessions).toHaveLength(0)
    })
  })

  describe('getEmptyStatistics', () => {
    test('should return properly structured empty statistics', () => {
      const emptyStats = StatisticsService.getEmptyStatistics()

      expect(emptyStats).toHaveProperty('overview')
      expect(emptyStats).toHaveProperty('gameBreakdown')
      expect(emptyStats).toHaveProperty('timeSeriesData')
      expect(emptyStats).toHaveProperty('winStreaks')
      expect(emptyStats).toHaveProperty('betPatterns')
      expect(emptyStats).toHaveProperty('playingHabits')

      expect(emptyStats.overview.totalGames).toBe(0)
      expect(emptyStats.gameBreakdown).toHaveLength(0)
      expect(emptyStats.timeSeriesData).toHaveLength(0)
      expect(emptyStats.winStreaks.current).toBe(0)
      expect(emptyStats.betPatterns.mostCommonBet).toBe(0)
      expect(emptyStats.playingHabits.mostActiveHour).toBe(0)
    })
  })

  describe('getEmptyGameStatistics', () => {
    test('should return properly structured empty game statistics', () => {
      const emptyGameStats = StatisticsService.getEmptyGameStatistics()

      expect(emptyGameStats.totalGames).toBe(0)
      expect(emptyGameStats.totalWagered).toBe(0)
      expect(emptyGameStats.totalWon).toBe(0)
      expect(emptyGameStats.netProfit).toBe(0)
      expect(emptyGameStats.winRate).toBe(0)
      expect(emptyGameStats.biggestWin).toBe(0)
      expect(emptyGameStats.biggestLoss).toBe(0)
      expect(emptyGameStats.averageBet).toBe(0)
      expect(emptyGameStats.averageWin).toBe(0)
      expect(emptyGameStats.profitMargin).toBe(0)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle games with zero bet amounts', () => {
      const zeroBetGames = [
        { ...mockGameHistory[0], betAmount: 0, winAmount: 0 }
      ]

      const stats = StatisticsService.calculateOverviewStatistics(zeroBetGames)
      expect(stats.totalGames).toBe(1)
      expect(stats.totalWagered).toBe(0)
      expect(stats.profitMargin).toBe(0) // Should handle division by zero
    })

    test('should handle games with negative win amounts', () => {
      const negativeWinGames = [
        { ...mockGameHistory[0], betAmount: 100, winAmount: -50 }
      ]

      const stats = StatisticsService.calculateOverviewStatistics(negativeWinGames)
      expect(stats.totalWon).toBe(-50)
      expect(stats.netProfit).toBe(-150) // -50 - 100
    })

    test('should handle very large numbers correctly', () => {
      const largeNumberGames = [
        { ...mockGameHistory[0], betAmount: 1000000, winAmount: 2000000 }
      ]

      const stats = StatisticsService.calculateOverviewStatistics(largeNumberGames)
      expect(stats.totalWagered).toBe(1000000)
      expect(stats.totalWon).toBe(2000000)
      expect(stats.netProfit).toBe(1000000)
      expect(stats.profitMargin).toBe(100)
    })

    test('should handle games with same timestamps', () => {
      const sameTimeGames = mockGameHistory.map(game => ({
        ...game,
        createdAt: '2024-01-15T10:00:00Z'
      }))

      const timeSeries = StatisticsService.calculateTimeSeriesData(sameTimeGames)
      expect(timeSeries).toHaveLength(1)
      expect(timeSeries[0].games).toBe(4)
    })
  })
})