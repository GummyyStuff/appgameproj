import { describe, test, expect, beforeEach, vi } from 'vitest'

const sortedSets = new Map<string, Map<string, number>>()
const store = new Map<string, string>()

vi.mock('../redis-service', () => ({
  redisService: {
    isAvailable: vi.fn(() => true),
    getStatus: vi.fn(() => ({ connected: true })),
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => { store.set(key, value); return true }),
    del: vi.fn(async (key: string) => { store.delete(key); return true }),
    delPattern: vi.fn(async (pattern: string) => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      let count = 0
      for (const key of store.keys()) {
        if (regex.test(key)) { store.delete(key); count++ }
      }
      return count
    }),
    incr: vi.fn(async (key: string) => {
      const current = parseInt(store.get(key) || '0', 10)
      const next = current + 1
      store.set(key, String(next))
      return next
    }),
    decr: vi.fn(async (key: string) => {
      const current = parseInt(store.get(key) || '0', 10)
      const next = current - 1
      store.set(key, String(next))
      return next
    }),
    expire: vi.fn(async () => true),
    zadd: vi.fn(async (key: string, score: number, member: string) => {
      if (!sortedSets.has(key)) sortedSets.set(key, new Map())
      sortedSets.get(key)!.set(member, score)
      return true
    }),
    zrevrange: vi.fn(async (key: string, start: number, stop: number, withScores: boolean) => {
      const set = sortedSets.get(key)
      if (!set) return []
      const entries = [...set.entries()].sort((a, b) => b[1] - a[1])
      const sliced = entries.slice(start, stop + 1)
      if (withScores) {
        return sliced.flatMap(([member, score]) => [member, String(score)])
      }
      return sliced.map(([member]) => member)
    }),
    zrevrank: vi.fn(async (key: string, member: string) => {
      const set = sortedSets.get(key)
      if (!set || !set.has(member)) return null
      const entries = [...set.entries()].sort((a, b) => b[1] - a[1])
      const idx = entries.findIndex(([m]) => m === member)
      return idx !== -1 ? idx + 1 : null
    }),
    zscore: vi.fn(async (key: string, member: string) => {
      const set = sortedSets.get(key)
      return set?.get(member) ?? null
    }),
  }
}))

vi.mock('../user-service', () => ({
  UserService: {
    getUserProfile: vi.fn().mockResolvedValue({ username: 'testuser', displayName: 'Test User' }),
  }
}))

import { LeaderboardService } from '../leaderboard-service'
import { redisService } from '../redis-service'

describe('LeaderboardService', () => {
  const testUserId1 = 'leaderboard-test-user-1'
  const testUserId2 = 'leaderboard-test-user-2'
  const testUserId3 = 'leaderboard-test-user-3'

  beforeEach(() => {
    vi.clearAllMocks()
    sortedSets.clear()
    store.clear()
  })

  test('should update leaderboard after win', async () => {
    await LeaderboardService.updateAfterWin(testUserId1, 1000)
    await LeaderboardService.updateAfterWin(testUserId2, 2500)
    await LeaderboardService.updateAfterWin(testUserId3, 1500)
  })

  test('should get daily winners', async () => {
    await LeaderboardService.updateAfterWin(testUserId1, 1000)

    const winners = await LeaderboardService.getDailyWinners(10)
    expect(Array.isArray(winners)).toBe(true)
  })

  test('should get user rankings', async () => {
    await LeaderboardService.updateAfterWin(testUserId1, 5000)

    const rankings = await LeaderboardService.getUserRankings(testUserId1)

    expect(rankings).toHaveProperty('dailyRank')
    expect(rankings).toHaveProperty('weeklyRank')
    expect(rankings).toHaveProperty('allTimeRank')
    expect(rankings).toHaveProperty('dailyScore')
  })

  test('should update profit leaderboards', async () => {
    await LeaderboardService.updateProfit(testUserId1, 500)
    await LeaderboardService.updateProfit(testUserId2, 1200)

    const profitLeaders = await LeaderboardService.getDailyProfitLeaders(10)
    expect(Array.isArray(profitLeaders)).toBe(true)
  })

  test('should increment games played', async () => {
    await LeaderboardService.incrementGamesPlayed(testUserId1)
    await LeaderboardService.incrementGamesPlayed(testUserId1)
    await LeaderboardService.incrementGamesPlayed(testUserId1)

    const activeUsers = await LeaderboardService.getMostActiveUsers(10)
    expect(Array.isArray(activeUsers)).toBe(true)
  })
})
