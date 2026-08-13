import { describe, test, expect, beforeEach, vi } from 'vitest'

const localStorageStore: Record<string, string> = {}

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key] }),
  clear: vi.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]) }),
}

const localStorageProxy = new Proxy(localStorageMock, {
  ownKeys() {
    return Object.keys(localStorageStore)
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true }
  },
  get(target, prop) {
    if (prop in target) return (target as any)[prop]
    return localStorageStore[prop as string] ?? undefined
  },
})

Object.defineProperty(globalThis, 'localStorage', { value: localStorageProxy, writable: true })

import { gameCache, PersistentCache, CACHE_KEYS, CACHE_TTL } from '../cache'

describe('Caching System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorageStore).forEach(k => delete localStorageStore[k])
    gameCache.clear()
  })

  describe('GameDataCache', () => {
    test('should cache and retrieve data correctly', () => {
      const testData = { id: 1, name: 'test' }
      gameCache.set('test_key', testData, 1000)

      const retrieved = gameCache.get('test_key')
      expect(retrieved).toEqual(testData)
    })

    test('should return null for non-existent keys', () => {
      expect(gameCache.get('non_existent_key')).toBeNull()
    })

    test('should expire cache after TTL', async () => {
      const testData = { id: 1, name: 'test' }
      gameCache.set('test_key', testData, 10)

      await new Promise(resolve => setTimeout(resolve, 20))

      expect(gameCache.get('test_key')).toBeNull()
    })

    test('should check if cache has valid item', () => {
      expect(gameCache.has('test_key')).toBe(false)

      gameCache.set('test_key', 'data', 1000)
      expect(gameCache.has('test_key')).toBe(true)
    })

    test('should handle cache cleanup', () => {
      gameCache.set('key1', 'data1', 1000)
      gameCache.set('key2', 'data2', 1000)

      expect(gameCache.size()).toBe(2)

      gameCache.clear()
      expect(gameCache.size()).toBe(0)
    })

    test('should cleanup expired items', async () => {
      gameCache.set('key1', 'data1', 10)
      gameCache.set('key2', 'data2', 1000)

      expect(gameCache.size()).toBe(2)

      await new Promise(resolve => setTimeout(resolve, 20))

      gameCache.cleanup()
      expect(gameCache.size()).toBe(1)
      expect(gameCache.has('key2')).toBe(true)
    })

    test('should deduplicate concurrent fetches with getOrFetch', async () => {
      const fetcher = vi.fn().mockResolvedValue('fetched_data')

      const [result1, result2] = await Promise.all([
        gameCache.getOrFetch('dedup_key', fetcher, 5000),
        gameCache.getOrFetch('dedup_key', fetcher, 5000),
      ])

      expect(result1).toBe('fetched_data')
      expect(result2).toBe('fetched_data')
      expect(fetcher).toHaveBeenCalledTimes(1)
    })

    test('should return cached value from getOrFetch without calling fetcher', async () => {
      gameCache.set('existing_key', 'cached_value', 5000)
      const fetcher = vi.fn()

      const result = await gameCache.getOrFetch('existing_key', fetcher, 5000)

      expect(result).toBe('cached_value')
      expect(fetcher).not.toHaveBeenCalled()
    })

    test('should return stats', () => {
      gameCache.set('key1', 'data1', 1000)
      gameCache.set('key2', 'data2', 1000)

      const stats = gameCache.getStats()
      expect(stats.size).toBe(2)
      expect(stats.keys).toContain('key1')
      expect(stats.keys).toContain('key2')
    })
  })

  describe('PersistentCache', () => {
    test('should store data in localStorage with prefix', () => {
      const testData = { achievements: ['first_win'] }
      PersistentCache.set('user_achievements', testData)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'tarkov_casino_user_achievements',
        expect.stringContaining('"achievements":["first_win"]')
      )
    })

    test('should retrieve data from localStorage', () => {
      const testData = { achievements: ['first_win'] }
      const stored = JSON.stringify({ data: testData, timestamp: Date.now(), ttl: 86400000 })
      localStorageStore['tarkov_casino_user_achievements'] = stored

      const result = PersistentCache.get('user_achievements')
      expect(result).toEqual(testData)
    })

    test('should return null for expired data', () => {
      const stored = JSON.stringify({ data: { x: 1 }, timestamp: Date.now() - 100000, ttl: 1000 })
      localStorageStore['tarkov_casino_expired_key'] = stored

      const result = PersistentCache.get('expired_key')
      expect(result).toBeNull()
    })

    test('should remove items from localStorage', () => {
      PersistentCache.remove('test_key')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('tarkov_casino_test_key')
    })

    test('should clear all prefixed items', () => {
      localStorageStore['tarkov_casino_a'] = '{}'
      localStorageStore['tarkov_casino_b'] = '{}'
      localStorageStore['other_key'] = '{}'

      PersistentCache.clear()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('tarkov_casino_a')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('tarkov_casino_b')
    })

    test('should return null for missing keys', () => {
      const result = PersistentCache.get('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('Cache Constants', () => {
    test('should have defined cache keys', () => {
      expect(CACHE_KEYS.USER_PROFILE).toBe('user_profile')
      expect(CACHE_KEYS.USER_BALANCE).toBe('user_balance')
      expect(CACHE_KEYS.GAME_HISTORY).toBe('game_history')
      expect(CACHE_KEYS.LEADERBOARD).toBe('leaderboard')
      expect(CACHE_KEYS.GAME_STATS).toBe('game_stats')
      expect(CACHE_KEYS.ACHIEVEMENTS).toBe('achievements')
    })

    test('should have defined cache TTL values', () => {
      expect(CACHE_TTL.USER_PROFILE).toBe(10 * 60 * 1000)
      expect(CACHE_TTL.USER_BALANCE).toBe(30 * 1000)
      expect(CACHE_TTL.GAME_HISTORY).toBe(5 * 60 * 1000)
      expect(CACHE_TTL.LEADERBOARD).toBe(2 * 60 * 1000)
      expect(CACHE_TTL.GAME_STATS).toBe(5 * 60 * 1000)
      expect(CACHE_TTL.ACHIEVEMENTS).toBe(15 * 60 * 1000)
    })
  })
})
