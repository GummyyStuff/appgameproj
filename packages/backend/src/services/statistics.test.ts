import { describe, test, expect, beforeEach } from 'vitest'
import { StatisticsServiceAppwrite as StatisticsService } from './statistics-appwrite'

interface GameHistory {
  $id: string;
  $createdAt: string;
  userId: string;
  gameType: 'wheel_of_chance' | 'case_opening';
  betAmount: number;
  winAmount: number;
  resultData: string;
  gameDuration?: number;
}

describe('StatisticsService', () => {
  let mockGameHistory: GameHistory[]

  beforeEach(() => {
    mockGameHistory = [
      {
        $id: '1',
        userId: 'test-user',
        gameType: 'wheel_of_chance',
        betAmount: 100,
        winAmount: 200,
        resultData: JSON.stringify({ bet_type: 'red', bet_value: 'red', winning_number: 7, multiplier: 2 }),
        $createdAt: '2024-01-15T10:00:00Z'
      },
      {
        $id: '2',
        userId: 'test-user',
        gameType: 'case_opening',
        betAmount: 50,
        winAmount: 0,
        resultData: JSON.stringify({
          case_type_id: 'test-case',
          case_name: 'Test Case',
          case_price: 50,
          item_id: 'test-item',
          item_name: 'Test Item',
          item_rarity: 'common',
          item_category: 'valuables',
          item_value: 0,
          currency_awarded: 0,
          opening_id: 'test-opening'
        }),
        $createdAt: '2024-01-15T11:00:00Z'
      },
      {
        $id: '3',
        userId: 'test-user',
        gameType: 'wheel_of_chance',
        betAmount: 25,
        winAmount: 75,
        resultData: JSON.stringify({ bet_type: 'dozen', bet_value: 1, winning_number: 5, multiplier: 3 }),
        $createdAt: '2024-01-15T12:00:00Z'
      },
      {
        $id: '4',
        userId: 'test-user',
        gameType: 'wheel_of_chance',
        betAmount: 200,
        winAmount: 0,
        resultData: JSON.stringify({ bet_type: 'number', bet_value: 13, winning_number: 7, multiplier: 0 }),
        $createdAt: '2024-01-16T10:00:00Z'
      }
    ]
  })

  describe('calculateOverviewStatistics', () => {
    test('should calculate correct overview statistics', () => {
      const stats = StatisticsService.calculateOverviewStatistics(mockGameHistory)

      expect(stats.totalGames).toBe(4)
      expect(stats.totalWagered).toBe(375)
      expect(stats.totalWon).toBe(275)
      expect(stats.netProfit).toBe(-100)
      expect(stats.winRate).toBe(50)
      expect(stats.biggestWin).toBe(200)
      expect(stats.biggestLoss).toBe(200)
      expect(stats.averageBet).toBe(93.75)
      expect(stats.averageWin).toBe(68.75)
      expect(stats.profitMargin).toBeCloseTo(-26.67, 2)
    })

    test('should handle empty game history', () => {
      const stats = StatisticsService.calculateOverviewStatistics([])

      expect(stats.totalGames).toBe(0)
      expect(stats.totalWagered).toBe(0)
      expect(stats.totalWon).toBe(0)
      expect(stats.netProfit).toBe(0)
      expect(stats.winRate).toBe(0)
      expect(stats.biggestWin).toBe(0)
      expect(stats.biggestLoss).toBe(0)
      expect(stats.averageBet).toBe(0)
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
      expect(stats.winRate).toBe(100)
      expect(stats.biggestWin).toBe(200)
      expect(stats.biggestLoss).toBe(-100)
      expect(stats.averageBet).toBe(100)
      expect(stats.averageWin).toBe(200)
      expect(stats.profitMargin).toBe(100)
    })
  })

  describe('calculateGameTypeBreakdown', () => {
    test('should calculate breakdown for all game types', () => {
      const breakdown = StatisticsService.calculateGameTypeBreakdown(mockGameHistory)

      expect(breakdown).toHaveLength(2)
      expect(breakdown.map(b => b.gameType)).toEqual(expect.arrayContaining(['wheel_of_chance', 'case_opening']))

      const rouletteBreakdown = breakdown.find(b => b.gameType === 'wheel_of_chance')
      expect(rouletteBreakdown).toBeDefined()
      expect(rouletteBreakdown!.statistics.totalGames).toBe(3)
      expect(rouletteBreakdown!.statistics.totalWagered).toBe(325)
      expect(rouletteBreakdown!.statistics.totalWon).toBe(275)
      expect(rouletteBreakdown!.statistics.winRate).toBeCloseTo(66.67, 1)

      const caseOpeningBreakdown = breakdown.find(b => b.gameType === 'case_opening')
      expect(caseOpeningBreakdown).toBeDefined()
      expect(caseOpeningBreakdown!.statistics.totalGames).toBe(1)
      expect(caseOpeningBreakdown!.statistics.totalWagered).toBe(50)
      expect(caseOpeningBreakdown!.statistics.totalWon).toBe(0)
      expect(caseOpeningBreakdown!.statistics.winRate).toBe(0)
    })

    test('should assign popularity ranks correctly', () => {
      const breakdown = StatisticsService.calculateGameTypeBreakdown(mockGameHistory)

      const rouletteBreakdown = breakdown.find(b => b.gameType === 'wheel_of_chance')
      expect(rouletteBreakdown!.popularityRank).toBe(1)

      const caseOpeningBreakdown = breakdown.find(b => b.gameType === 'case_opening')
      expect(caseOpeningBreakdown!.popularityRank).toBe(2)
    })

    test('should handle empty game history', () => {
      const breakdown = StatisticsService.calculateGameTypeBreakdown([])

      expect(breakdown.length).toBeGreaterThanOrEqual(2)
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

      expect(timeSeries).toHaveLength(2)

      const day1 = timeSeries.find(d => d.date === '2024-01-15')
      expect(day1).toBeDefined()
      expect(day1!.games).toBe(3)
      expect(day1!.wagered).toBe(175)
      expect(day1!.won).toBe(275)
      expect(day1!.profit).toBe(100)

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
      const streakTestGames: GameHistory[] = [
        { ...mockGameHistory[0], winAmount: 200, betAmount: 100, $createdAt: '2024-01-15T13:00:00Z' },
        { ...mockGameHistory[1], winAmount: 100, betAmount: 50, $createdAt: '2024-01-15T12:00:00Z' },
        { ...mockGameHistory[2], winAmount: 0, betAmount: 25, $createdAt: '2024-01-15T11:00:00Z' },
        { ...mockGameHistory[3], winAmount: 0, betAmount: 200, $createdAt: '2024-01-15T10:00:00Z' },
      ]

      const streaks = StatisticsService.calculateWinStreaks(streakTestGames)

      expect(streaks.longest).toBe(2)
      expect(streaks.longestLoss).toBe(2)
      expect(streaks.current).toBe(2)
    })

    test('should handle all wins correctly', () => {
      const allWins = mockGameHistory.map(game => ({
        ...game,
        winAmount: game.betAmount * 2
      }))

      const streaks = StatisticsService.calculateWinStreaks(allWins)

      expect(streaks.longest).toBe(4)
      expect(streaks.longestLoss).toBe(0)
      expect(streaks.current).toBe(4)
    })

    test('should handle all losses correctly', () => {
      const allLosses = mockGameHistory.map(game => ({
        ...game,
        winAmount: 0
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
      const extendedHistory = [
        ...mockGameHistory,
        { ...mockGameHistory[0], $id: '5', betAmount: 100 },
        { ...mockGameHistory[0], $id: '6', betAmount: 100 },
      ]

      const patterns = StatisticsService.calculateBetPatterns(extendedHistory)

      expect(patterns.mostCommonBet).toBe(100)
    })

    test('should create correct bet distribution', () => {
      const patterns = StatisticsService.calculateBetPatterns(mockGameHistory)

      expect(patterns.betDistribution).toEqual(expect.arrayContaining([
        expect.objectContaining({ range: '11-50', count: 2, percentage: 50 }),
        expect.objectContaining({ range: '51-100', count: 1, percentage: 25 }),
        expect.objectContaining({ range: '101-500', count: 1, percentage: 25 })
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
      const sessionTestGames: GameHistory[] = [
        { ...mockGameHistory[0], $createdAt: '2024-01-15T10:00:00Z' },
        { ...mockGameHistory[1], $createdAt: '2024-01-15T10:30:00Z' },
        { ...mockGameHistory[2], $createdAt: '2024-01-15T12:00:00Z' },
        { ...mockGameHistory[3], $createdAt: '2024-01-15T12:15:00Z' },
      ]

      const sessions = StatisticsService.calculateSessions(sessionTestGames)

      expect(sessions).toHaveLength(2)

      expect(sessions[0].games).toBe(2)
      expect(sessions[0].duration).toBe(30)

      expect(sessions[1].games).toBe(2)
      expect(sessions[1].duration).toBe(15)
    })

    test('should handle single game as single session', () => {
      const singleGame = [mockGameHistory[0]]
      const sessions = StatisticsService.calculateSessions(singleGame)

      expect(sessions).toHaveLength(1)
      expect(sessions[0].games).toBe(1)
      expect(sessions[0].duration).toBe(0)
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
      expect(stats.profitMargin).toBe(0)
    })

    test('should handle games with negative win amounts', () => {
      const negativeWinGames = [
        { ...mockGameHistory[0], betAmount: 100, winAmount: -50 }
      ]

      const stats = StatisticsService.calculateOverviewStatistics(negativeWinGames)
      expect(stats.totalWon).toBe(-50)
      expect(stats.netProfit).toBe(-150)
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
        $createdAt: '2024-01-15T10:00:00Z'
      }))

      const timeSeries = StatisticsService.calculateTimeSeriesData(sameTimeGames)
      expect(timeSeries).toHaveLength(1)
      expect(timeSeries[0].games).toBe(4)
    })
  })
})
