import { describe, test, expect, beforeEach, vi } from 'vitest'
import { measurePerformance, performanceMonitor } from '../performance'
import { gameCache, CACHE_KEYS } from '../cache'

describe('Performance Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gameCache.clear()
    performanceMonitor.clearMetrics()
  })

  describe('measurePerformance', () => {
    test('should return the result of a synchronous function', () => {
      const result = measurePerformance('test_fn', () => 'result')
      expect(result).toBe('result')
    })

    test('should return the result of an async function', async () => {
      const result = await measurePerformance('async_fn', async () => {
        return 'async_result'
      })
      expect(result).toBe('async_result')
    })

    test('should record metric for synchronous function', () => {
      measurePerformance('sync_metric', () => 42)

      const summary = performanceMonitor.getPerformanceSummary()
      const metric = summary.metrics.find(m => m.name === 'sync_metric')
      expect(metric).toBeDefined()
      expect(metric!.value).toBeGreaterThanOrEqual(0)
    })

    test('should record metric for async function', async () => {
      await measurePerformance('async_metric', async () => {
        await new Promise(resolve => setTimeout(resolve, 5))
        return 'done'
      })

      const summary = performanceMonitor.getPerformanceSummary()
      const metric = summary.metrics.find(m => m.name === 'async_metric')
      expect(metric).toBeDefined()
      expect(metric!.value).toBeGreaterThan(0)
    })

    test('should propagate errors from synchronous functions', () => {
      expect(() => {
        measurePerformance('error_fn', () => { throw new Error('boom') })
      }).toThrow('boom')
    })

    test('should propagate errors from async functions', async () => {
      await expect(
        measurePerformance('async_error_fn', async () => { throw new Error('async boom') })
      ).rejects.toThrow('async boom')
    })
  })

  describe('performanceMonitor', () => {
    test('should record and retrieve metrics', () => {
      performanceMonitor.recordMetric('test_metric', 123.45, { source: 'test' })

      const summary = performanceMonitor.getPerformanceSummary()
      expect(summary.metrics.length).toBeGreaterThan(0)
      const metric = summary.metrics.find(m => m.name === 'test_metric')
      expect(metric).toBeDefined()
      expect(metric!.value).toBe(123.45)
      expect(metric!.metadata).toEqual({ source: 'test' })
    })

    test('should track game performance data', () => {
      performanceMonitor.trackGamePerformance('roulette', {
        loadTime: 500,
        renderTime: 50,
        interactionDelay: 10,
      })

      const summary = performanceMonitor.getPerformanceSummary()
      const gameData = summary.gameMetrics.get('roulette')
      expect(gameData).toBeDefined()
      expect(gameData!.loadTime).toBe(500)
      expect(gameData!.renderTime).toBe(50)
      expect(gameData!.interactionDelay).toBe(10)
    })

    test('should clear all metrics', () => {
      performanceMonitor.recordMetric('m1', 100)
      performanceMonitor.recordMetric('m2', 200)

      performanceMonitor.clearMetrics()

      const summary = performanceMonitor.getPerformanceSummary()
      expect(summary.metrics).toHaveLength(0)
    })

    test('should export metrics as JSON string', () => {
      performanceMonitor.recordMetric('export_test', 42)

      const exported = performanceMonitor.exportMetrics()
      const parsed = JSON.parse(exported)
      expect(parsed).toHaveProperty('timestamp')
      expect(parsed).toHaveProperty('metrics')
      expect(parsed).toHaveProperty('gameMetrics')
    })
  })

  describe('Cache integration', () => {
    test('should cache and retrieve game data', () => {
      gameCache.set(CACHE_KEYS.USER_BALANCE, { balance: 1000 })
      expect(gameCache.get(CACHE_KEYS.USER_BALANCE)).toEqual({ balance: 1000 })
    })
  })
})
