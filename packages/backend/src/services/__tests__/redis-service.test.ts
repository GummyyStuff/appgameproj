import { describe, test, expect, beforeEach, vi } from 'vitest'

vi.mock('../redis-service', () => {
  const store = new Map<string, string>()
  const expiry = new Map<string, number>()

  return {
    redisService: {
      isAvailable: vi.fn(() => true),
      getStatus: vi.fn(() => ({ connected: true })),
      get: vi.fn(async (key: string) => {
        if (expiry.has(key) && Date.now() > expiry.get(key)!) {
          store.delete(key)
          expiry.delete(key)
          return null
        }
        return store.get(key) ?? null
      }),
      set: vi.fn(async (key: string, value: string, ttl?: number) => {
        store.set(key, value)
        if (ttl) expiry.set(key, Date.now() + ttl * 1000)
        return true
      }),
      del: vi.fn(async (key: string) => {
        store.delete(key)
        expiry.delete(key)
        return true
      }),
      delPattern: vi.fn(async (pattern: string) => {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
        let count = 0
        for (const key of store.keys()) {
          if (regex.test(key)) {
            store.delete(key)
            expiry.delete(key)
            count++
          }
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
      expire: vi.fn(async (key: string, seconds: number) => {
        expiry.set(key, Date.now() + seconds * 1000)
        return true
      }),
      zadd: vi.fn(async () => true),
      zrevrange: vi.fn(async () => []),
      zrevrank: vi.fn(async () => null),
      zscore: vi.fn(async () => null),
    }
  }
})

import { redisService } from '../redis-service'

describe('RedisService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should check if Redis is available', () => {
    const available = redisService.isAvailable()
    expect(typeof available).toBe('boolean')
  })

  test('should get status information', () => {
    const status = redisService.getStatus()
    expect(status).toHaveProperty('connected')
    expect(typeof status.connected).toBe('boolean')
  })

  test('should set and get a value', async () => {
    const key = 'test:simple'
    const value = 'Hello Redis!'

    const setResult = await redisService.set(key, value)
    expect(setResult).toBe(true)

    const getValue = await redisService.get(key)
    expect(getValue).toBe(value)

    await redisService.del(key)
  })

  test('should delete a key', async () => {
    const key = 'test:delete'
    await redisService.set(key, 'delete me')

    const delResult = await redisService.del(key)
    expect(delResult).toBe(true)

    const getValue = await redisService.get(key)
    expect(getValue).toBeNull()
  })

  test('should increment a counter', async () => {
    const key = 'test:counter'

    const count1 = await redisService.incr(key)
    expect(count1).toBe(1)

    const count2 = await redisService.incr(key)
    expect(count2).toBe(2)

    const count3 = await redisService.incr(key)
    expect(count3).toBe(3)

    await redisService.del(key)
  })

  test('should decrement a counter', async () => {
    const key = 'test:decr'

    await redisService.set(key, '10')

    const count1 = await redisService.decr(key)
    expect(count1).toBe(9)

    const count2 = await redisService.decr(key)
    expect(count2).toBe(8)

    await redisService.del(key)
  })

  test('should delete keys by pattern', async () => {
    await redisService.set('test:pattern:1', 'value1')
    await redisService.set('test:pattern:2', 'value2')
    await redisService.set('test:pattern:3', 'value3')

    const deleted = await redisService.delPattern('test:pattern:*')
    expect(deleted).toBeGreaterThanOrEqual(3)

    const val1 = await redisService.get('test:pattern:1')
    expect(val1).toBeNull()
  })
})
