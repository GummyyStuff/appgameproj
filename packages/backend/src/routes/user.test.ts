import { describe, test, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'

const mockGetUserProfile = vi.fn()
const mockUpdateUserProfile = vi.fn()
const mockGetUserStatistics = vi.fn()
const mockGetBalance = vi.fn()
const mockCheckDailyBonusStatus = vi.fn()
const mockGetCurrencyStats = vi.fn()
const mockValidateBalance = vi.fn()
const mockClaimDailyBonus = vi.fn()
const mockGetGameHistory = vi.fn()
const mockListDocuments = vi.fn()

vi.mock('../middleware/auth', () => ({
  criticalAuthMiddleware: async (c: any, next: any) => {
    c.set('user', { id: 'test-user-123', email: 'test@example.com' })
    await next()
  },
}))

vi.mock('../services/user-service', () => ({
  UserService: {
    getUserProfile: (...args: any[]) => mockGetUserProfile(...args),
    updateUserProfile: (...args: any[]) => mockUpdateUserProfile(...args),
    getUserStatistics: (...args: any[]) => mockGetUserStatistics(...args),
  },
}))

vi.mock('../services/currency', () => ({
  CurrencyService: {
    getBalance: (...args: any[]) => mockGetBalance(...args),
    checkDailyBonusStatus: (...args: any[]) => mockCheckDailyBonusStatus(...args),
    getCurrencyStats: (...args: any[]) => mockGetCurrencyStats(...args),
    validateBalance: (...args: any[]) => mockValidateBalance(...args),
    claimDailyBonus: (...args: any[]) => mockClaimDailyBonus(...args),
    formatCurrency: (amount: number) => `₽${amount}`,
  },
}))

vi.mock('../services/game-service', () => ({
  GameService: {
    getGameHistory: (...args: any[]) => mockGetGameHistory(...args),
  },
}))

vi.mock('../services/appwrite-database', () => ({
  appwriteDb: {
    listDocuments: (...args: any[]) => mockListDocuments(...args),
    equal: vi.fn(),
  },
}))

vi.mock('../config/collections', () => ({
  COLLECTION_IDS: {
    USERS: 'users_collection',
  },
}))

import { userRoutes } from './user'
import { HTTPException } from 'hono/http-exception'

function createApp() {
  const app = new Hono()
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status)
    }
    return c.json({ error: 'Internal server error' }, 500)
  })
  app.route('/', userRoutes)
  return app
}

describe('User API', () => {
  let app: Hono

  beforeEach(() => {
    vi.clearAllMocks()
    app = createApp()
  })

  describe('GET /profile', () => {
    test('should return user profile', async () => {
      mockGetUserProfile.mockResolvedValue({
        username: 'testuser',
        displayName: 'Test User',
        balance: 10000,
        $createdAt: '2024-01-01T00:00:00Z',
        isModerator: false,
        avatarPath: 'defaults/default-avatar.svg',
        totalWagered: 5000,
        totalWon: 7000,
        gamesPlayed: 50,
      })

      const res = await app.request('/profile')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user.id).toBe('test-user-123')
      expect(data.user.username).toBe('testuser')
      expect(data.user.balance).toBe(10000)
      expect(data.user.totalWagered).toBe(5000)
    })

    test('should return 404 when profile not found', async () => {
      mockGetUserProfile.mockResolvedValue(null)

      const res = await app.request('/profile')
      expect(res.status).toBe(404)
    })

    test('should return 500 when service throws', async () => {
      mockGetUserProfile.mockRejectedValue(new Error('DB error'))

      const res = await app.request('/profile')
      expect(res.status).toBe(500)
    })
  })

  describe('GET /balance', () => {
    test('should return balance and daily bonus status', async () => {
      mockGetBalance.mockResolvedValue(10000)
      mockCheckDailyBonusStatus.mockResolvedValue({
        canClaim: true,
        bonusAmount: 1000,
        nextAvailableDate: '2024-01-16',
        cooldownHours: 24,
      })

      const res = await app.request('/balance')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.balance).toBe(10000)
      expect(data.formatted_balance).toBe('₽10000')
      expect(data.daily_bonus.can_claim).toBe(true)
      expect(data.daily_bonus.bonus_amount).toBe(1000)
    })

    test('should return 500 when balance fetch fails', async () => {
      mockGetBalance.mockRejectedValue(new Error('DB error'))

      const res = await app.request('/balance')
      expect(res.status).toBe(500)
    })
  })

  describe('GET /history', () => {
    test('should return game history with pagination', async () => {
      mockGetGameHistory.mockResolvedValue({
        success: true,
        games: [
          { id: '1', betAmount: 100, winAmount: 200, game_type: 'roulette' },
        ],
        total: 1,
      })

      const res = await app.request('/history?limit=10&offset=0')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.history).toHaveLength(1)
      expect(data.pagination.limit).toBe(10)
      expect(data.pagination.offset).toBe(0)
      expect(data.pagination.total).toBe(1)
    })

    test('should return 500 when history fetch fails', async () => {
      mockGetGameHistory.mockResolvedValue({
        success: false,
        error: 'Database error',
      })

      const res = await app.request('/history')
      expect(res.status).toBe(500)
    })
  })

  describe('GET /stats', () => {
    test('should return user statistics', async () => {
      mockGetCurrencyStats.mockResolvedValue({
        currentBalance: 10000,
        totalWagered: 5000,
        totalWon: 7000,
        netProfit: 2000,
        gamesPlayed: 50,
        dailyBonusStatus: 'claimed',
        gameBreakdown: {},
      })

      const res = await app.request('/stats')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.stats.current_balance).toBe(10000)
      expect(data.stats.total_wagered).toBe(5000)
      expect(data.stats.net_profit).toBe(2000)
    })
  })

  describe('POST /validate-balance', () => {
    test('should return validation result for sufficient balance', async () => {
      mockValidateBalance.mockResolvedValue({
        isValid: true,
        currentBalance: 10000,
        requiredAmount: 100,
        shortfall: 0,
      })

      const res = await app.request('/validate-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100 }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.is_valid).toBe(true)
      expect(data.current_balance).toBe(10000)
    })

    test('should return validation result for insufficient balance', async () => {
      mockValidateBalance.mockResolvedValue({
        isValid: false,
        currentBalance: 50,
        requiredAmount: 100,
        shortfall: 50,
      })

      const res = await app.request('/validate-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100 }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.is_valid).toBe(false)
      expect(data.shortfall).toBe(50)
    })
  })

  describe('GET /transactions', () => {
    test('should return formatted transactions', async () => {
      mockGetGameHistory.mockResolvedValue({
        success: true,
        games: [
          { id: '1', betAmount: 100, winAmount: 200, game_type: 'roulette' },
        ],
        total: 1,
      })

      const res = await app.request('/transactions')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.transactions).toHaveLength(1)
      expect(data.transactions[0].formatted_bet).toBe('₽100')
      expect(data.transactions[0].formatted_win).toBe('₽200')
      expect(data.pagination.total).toBe(1)
    })
  })

  describe('PUT /profile', () => {
    test('should update username successfully', async () => {
      mockListDocuments.mockResolvedValue({ data: [] })
      mockUpdateUserProfile.mockResolvedValue({
        success: true,
        profile: {
          username: 'newname',
          displayName: 'newname',
          balance: 10000,
          $createdAt: '2024-01-01T00:00:00Z',
        },
      })

      const res = await app.request('/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'newname' }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.message).toBe('Profile updated successfully')
      expect(data.user.username).toBe('newname')
    })

    test('should return 400 when username is taken', async () => {
      mockListDocuments.mockResolvedValue({
        data: [{ userId: 'other-user', username: 'taken' }],
      })

      const res = await app.request('/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'taken' }),
      })

      expect(res.status).toBe(400)
    })

    test('should return error when no updates provided', async () => {
      const res = await app.request('/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(500)
    })
  })

  describe('POST /daily-bonus', () => {
    test('should claim daily bonus successfully', async () => {
      mockClaimDailyBonus.mockResolvedValue({
        success: true,
        bonusAmount: 1000,
        newBalance: 11000,
        nextAvailableDate: '2024-01-16',
      })

      const res = await app.request('/daily-bonus', {
        method: 'POST',
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.message).toBe('Daily bonus claimed successfully')
      expect(data.bonus_amount).toBe(1000)
      expect(data.new_balance).toBe(11000)
    })

    test('should return 400 when bonus already claimed', async () => {
      mockClaimDailyBonus.mockResolvedValue({
        success: false,
        error: 'Daily bonus already claimed today',
      })

      const res = await app.request('/daily-bonus', {
        method: 'POST',
      })

      expect(res.status).toBe(400)
    })
  })
})
