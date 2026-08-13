import { describe, test, expect, beforeEach, vi } from 'vitest'

const cacheStore = new Map<string, string>()
const cacheExpiry = new Map<string, number>()

vi.mock('../redis-service', () => ({
  redisService: {
    isAvailable: vi.fn(() => true),
    getStatus: vi.fn(() => ({ connected: true })),
    get: vi.fn(async (key: string) => {
      if (cacheExpiry.has(key) && Date.now() > cacheExpiry.get(key)!) {
        cacheStore.delete(key)
        cacheExpiry.delete(key)
        return null
      }
      return cacheStore.get(key) ?? null
    }),
    set: vi.fn(async (key: string, value: string, ttl?: number) => {
      cacheStore.set(key, value)
      if (ttl) cacheExpiry.set(key, Date.now() + ttl * 1000)
      return true
    }),
    del: vi.fn(async (key: string) => {
      cacheStore.delete(key)
      cacheExpiry.delete(key)
      return true
    }),
    delPattern: vi.fn(async (pattern: string) => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      let count = 0
      for (const key of cacheStore.keys()) {
        if (regex.test(key)) {
          cacheStore.delete(key)
          cacheExpiry.delete(key)
          count++
        }
      }
      return count
    }),
    incr: vi.fn(async (key: string) => {
      const current = parseInt(cacheStore.get(key) || '0', 10)
      const next = current + 1
      cacheStore.set(key, String(next))
      return next
    }),
    decr: vi.fn(async (key: string) => {
      const current = parseInt(cacheStore.get(key) || '0', 10)
      const next = current - 1
      cacheStore.set(key, String(next))
      return next
    }),
    expire: vi.fn(async (key: string, seconds: number) => {
      cacheExpiry.set(key, Date.now() + seconds * 1000)
      return true
    }),
  }
}))

import { CacheService } from '../cache-service'
import type { UserProfile } from '../../config/collections'

describe('CacheService', () => {
  const testUserId = 'test-user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    cacheStore.clear()
    cacheExpiry.clear()
  })

  test('should check if cache is available', () => {
    const available = CacheService.isAvailable()
    expect(typeof available).toBe('boolean')
  })

  test('should get cache statistics', async () => {
    const stats = await CacheService.getStats()

    expect(stats).toHaveProperty('available')
    expect(stats).toHaveProperty('connected')
    expect(stats).toHaveProperty('onlinePlayers')
    expect(stats).toHaveProperty('activeGames')
  })

  test('should cache and retrieve user profile', async () => {
    const mockProfile: UserProfile = {
      $id: 'profile-id-123',
      userId: testUserId,
      username: 'testplayer',
      displayName: 'Test Player',
      balance: 5000,
      totalWagered: 1000,
      totalWon: 1200,
      gamesPlayed: 50,
      isModerator: false,
      avatarPath: 'default.png',
      chatRulesVersion: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await CacheService.setUserProfile(testUserId, mockProfile)

    const cached = await CacheService.getUserProfile(testUserId)
    expect(cached).not.toBeNull()
    expect(cached?.username).toBe('testplayer')
    expect(cached?.balance).toBe(5000)
  })

  test('should cache and retrieve user balance', async () => {
    const balance = 12500

    await CacheService.setUserBalance(testUserId, balance)

    const cached = await CacheService.getUserBalance(testUserId)
    expect(cached).toBe(balance)
  })

  test('should invalidate user profile cache', async () => {
    const mockProfile: Partial<UserProfile> = {
      userId: testUserId,
      username: 'testuser',
      balance: 1000,
    }

    await CacheService.setUserProfile(testUserId, mockProfile as UserProfile)

    let cached = await CacheService.getUserProfile(testUserId)
    expect(cached).not.toBeNull()

    await CacheService.invalidateUserProfile(testUserId)

    cached = await CacheService.getUserProfile(testUserId)
    expect(cached).toBeNull()
  })

  test('should track online players counter', async () => {
    const initial = await CacheService.getOnlinePlayers()

    await CacheService.incrementOnlinePlayers()
    await CacheService.incrementOnlinePlayers()

    const afterInc = await CacheService.getOnlinePlayers()
    expect(afterInc).toBe(initial + 2)

    await CacheService.decrementOnlinePlayers()

    const afterDec = await CacheService.getOnlinePlayers()
    expect(afterDec).toBe(initial + 1)
  })

  test('should track active games counter', async () => {
    const initial = await CacheService.getActiveGames()

    await CacheService.incrementActiveGames()
    const after = await CacheService.getActiveGames()

    expect(after).toBe(initial + 1)
  })

  test('should handle rate limiting', async () => {
    const userId = 'rate-limit-test-user'
    const action = 'test-action'
    const limit = 3
    const window = 60

    const req1 = await CacheService.checkRateLimit(userId, action, limit, window)
    expect(req1).toBe(true)

    const req2 = await CacheService.checkRateLimit(userId, action, limit, window)
    expect(req2).toBe(true)

    const req3 = await CacheService.checkRateLimit(userId, action, limit, window)
    expect(req3).toBe(true)

    const req4 = await CacheService.checkRateLimit(userId, action, limit, window)
    expect(req4).toBe(false)

    const remaining = await CacheService.getRateLimitRemaining(userId, action, limit)
    expect(remaining).toBe(0)
  })

  test('should cache user statistics', async () => {
    const stats = {
      total_wagered: 5000,
      total_won: 6000,
      games_played: 100,
      net_profit: 1000,
    }

    await CacheService.setUserStats(testUserId, stats)

    const cached = await CacheService.getUserStats(testUserId)
    expect(cached).not.toBeNull()
    expect(cached.total_wagered).toBe(5000)
    expect(cached.net_profit).toBe(1000)
  })

  test('should invalidate all user cache entries', async () => {
    const userId = 'bulk-invalidate-test'

    await CacheService.setUserBalance(userId, 1000)
    await CacheService.setUserStats(userId, { games: 10 })

    await CacheService.invalidateUser(userId)

    const balance = await CacheService.getUserBalance(userId)
    const stats = await CacheService.getUserStats(userId)

    expect(balance).toBeNull()
    expect(stats).toBeNull()
  })
})
