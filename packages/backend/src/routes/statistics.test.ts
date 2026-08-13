import { describe, test, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'

const mockGetAdvancedStatistics = vi.fn()
const mockGetUserStatistics = vi.fn()
const mockGetGameHistory = vi.fn()
const mockGetFilteredGameHistory = vi.fn()
const mockCalculateTimeSeriesData = vi.fn()
const mockCalculateGameTypeBreakdown = vi.fn()
const mockCalculateWinStreaks = vi.fn()
const mockGetLeaderboard = vi.fn()
const mockCalculateBetPatterns = vi.fn()
const mockCalculatePlayingHabits = vi.fn()

vi.mock('../middleware/auth', () => ({
  criticalAuthMiddleware: async (c: any, next: any) => {
    c.set('user', { id: 'test-user-123', email: 'test@example.com' })
    await next()
  },
}))

vi.mock('../services/statistics-appwrite', () => ({
  StatisticsServiceAppwrite: {
    getAdvancedStatistics: (...args: any[]) => mockGetAdvancedStatistics(...args),
    getFilteredGameHistory: (...args: any[]) => mockGetFilteredGameHistory(...args),
    calculateTimeSeriesData: (...args: any[]) => mockCalculateTimeSeriesData(...args),
    calculateGameTypeBreakdown: (...args: any[]) => mockCalculateGameTypeBreakdown(...args),
    calculateWinStreaks: (...args: any[]) => mockCalculateWinStreaks(...args),
    getLeaderboard: (...args: any[]) => mockGetLeaderboard(...args),
    calculateBetPatterns: (...args: any[]) => mockCalculateBetPatterns(...args),
    calculatePlayingHabits: (...args: any[]) => mockCalculatePlayingHabits(...args),
  },
}))

vi.mock('../services/user-service', () => ({
  UserService: {
    getUserStatistics: (...args: any[]) => mockGetUserStatistics(...args),
  },
}))

vi.mock('../services/game-service', () => ({
  GameService: {
    getGameHistory: (...args: any[]) => mockGetGameHistory(...args),
  },
}))

import { statisticsRoutes } from './statistics'
import { HTTPException } from 'hono/http-exception'

function createApp() {
  const app = new Hono()
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status)
    }
    return c.json({ error: 'Internal server error' }, 500)
  })
  app.route('/', statisticsRoutes)
  return app
}

describe('Statistics API', () => {
  let app: Hono

  beforeEach(() => {
    vi.clearAllMocks()
    app = createApp()
  })

  describe('GET /advanced', () => {
    test('should return advanced statistics', async () => {
      mockGetAdvancedStatistics.mockResolvedValue({
        overview: { totalGames: 50, totalWagered: 5000 },
      })

      const res = await app.request('/advanced')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.statistics).toBeDefined()
      expect(data.generated_at).toBeDefined()
    })

    test('should accept filter query parameters', async () => {
      mockGetAdvancedStatistics.mockResolvedValue({})

      const res = await app.request('/advanced?gameType=wheel_of_chance&winOnly=true')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.filters.gameType).toBe('wheel_of_chance')
      expect(data.filters.winOnly).toBe(true)
    })

    test('should return 400 for invalid game type', async () => {
      const res = await app.request('/advanced?gameType=invalid')
      expect(res.status).toBe(400)
    })

    test('should return 400 when both winOnly and lossOnly are set', async () => {
      const res = await app.request('/advanced?winOnly=true&lossOnly=true')
      expect(res.status).toBe(400)
    })

    test('should return 500 when service throws', async () => {
      mockGetAdvancedStatistics.mockRejectedValue(new Error('DB error'))

      const res = await app.request('/advanced')
      expect(res.status).toBe(500)
    })
  })

  describe('GET /basic', () => {
    test('should return basic user statistics', async () => {
      mockGetUserStatistics.mockResolvedValue({
        totalGames: 50,
        totalWagered: 5000,
        totalWon: 7000,
      })

      const res = await app.request('/basic')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.statistics).toBeDefined()
      expect(data.generated_at).toBeDefined()
    })

    test('should return 500 when service throws', async () => {
      mockGetUserStatistics.mockRejectedValue(new Error('DB error'))

      const res = await app.request('/basic')
      expect(res.status).toBe(500)
    })
  })

  describe('GET /history', () => {
    test('should return paginated game history', async () => {
      mockGetGameHistory.mockResolvedValue({
        games: [{ id: '1', game_type: 'roulette' }],
        total: 1,
      })

      const res = await app.request('/history?limit=10&offset=0')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.generated_at).toBeDefined()
    })

    test('should return 400 for invalid limit', async () => {
      const res = await app.request('/history?limit=999')
      expect(res.status).toBe(400)
    })

    test('should return 400 for invalid game type', async () => {
      const res = await app.request('/history?gameType=invalid')
      expect(res.status).toBe(400)
    })
  })

  describe('GET /time-series', () => {
    test('should return time series data', async () => {
      mockGetFilteredGameHistory.mockResolvedValue([])
      mockCalculateTimeSeriesData.mockReturnValue([
        { date: '2024-01-15', games: 5, wagered: 500, won: 700, profit: 200 },
      ])

      const res = await app.request('/time-series')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.time_series).toBeDefined()
    })

    test('should accept date filter parameters', async () => {
      mockGetFilteredGameHistory.mockResolvedValue([])
      mockCalculateTimeSeriesData.mockReturnValue([])

      const res = await app.request('/time-series?dateFrom=2024-01-01T00:00:00Z&dateTo=2024-01-31T23:59:59Z')
      expect(res.status).toBe(200)
    })
  })

  describe('GET /game-breakdown', () => {
    test('should return game type breakdown', async () => {
      mockGetFilteredGameHistory.mockResolvedValue([])
      mockCalculateGameTypeBreakdown.mockReturnValue([
        { gameType: 'roulette', totalGames: 30 },
        { gameType: 'case_opening', totalGames: 20 },
      ])

      const res = await app.request('/game-breakdown')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.game_breakdown).toHaveLength(2)
    })
  })

  describe('GET /streaks', () => {
    test('should return win/loss streaks', async () => {
      mockGetFilteredGameHistory.mockResolvedValue([])
      mockCalculateWinStreaks.mockReturnValue({
        longest: 5,
        longestLoss: 3,
        current: 2,
      })

      const res = await app.request('/streaks')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.streaks.longest).toBe(5)
    })
  })

  describe('GET /leaderboard', () => {
    test('should return leaderboard data', async () => {
      mockGetLeaderboard.mockResolvedValue([
        { userId: 'user-1', value: 50000 },
        { userId: 'user-2', value: 40000 },
      ])

      const res = await app.request('/leaderboard?metric=balance&limit=10')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.leaderboard).toHaveLength(2)
      expect(data.metric).toBe('balance')
      expect(data.limit).toBe(10)
    })

    test('should return 400 for invalid metric', async () => {
      const res = await app.request('/leaderboard?metric=invalid')
      expect(res.status).toBe(400)
    })

    test('should return 400 for limit over 100', async () => {
      const res = await app.request('/leaderboard?limit=200')
      expect(res.status).toBe(400)
    })

    test('should use default values when params not provided', async () => {
      mockGetLeaderboard.mockResolvedValue([])

      const res = await app.request('/leaderboard')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.metric).toBe('balance')
      expect(data.limit).toBe(10)
    })
  })

  describe('GET /betting-patterns', () => {
    test('should return betting patterns analysis', async () => {
      mockGetFilteredGameHistory.mockResolvedValue([])
      mockCalculateBetPatterns.mockReturnValue({
        betDistribution: [100, 200, 300],
        mostCommonBet: 100,
      })

      const res = await app.request('/betting-patterns')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.betting_patterns).toBeDefined()
    })
  })

  describe('GET /playing-habits', () => {
    test('should return playing habits analysis', async () => {
      mockGetFilteredGameHistory.mockResolvedValue([])
      mockCalculatePlayingHabits.mockReturnValue({
        mostActiveHour: 20,
        mostActiveDay: 'Saturday',
        averageSessionLength: 45,
        totalPlayTime: 500,
      })

      const res = await app.request('/playing-habits')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.playing_habits).toBeDefined()
    })
  })

  describe('GET /export', () => {
    test('should return export data', async () => {
      mockGetFilteredGameHistory.mockResolvedValue([
        {
          created_at: '2024-01-15T10:00:00Z',
          game_type: 'roulette',
          bet_amount: 100,
          win_amount: 200,
          game_duration: 30,
          result_data: { winning_number: 7 },
        },
      ])

      const res = await app.request('/export')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.export_data).toHaveLength(1)
      expect(data.total_records).toBe(1)
      expect(data.export_data[0].date).toBe('2024-01-15')
      expect(data.export_data[0].game_type).toBe('roulette')
    })

    test('should return empty export when no games', async () => {
      mockGetFilteredGameHistory.mockResolvedValue([])

      const res = await app.request('/export')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.export_data).toHaveLength(0)
      expect(data.total_records).toBe(0)
    })
  })
})
