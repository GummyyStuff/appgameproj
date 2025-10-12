/**
 * Performance monitoring middleware for Bun 1.3
 * Tracks response times and adds performance headers
 */

import { Context, Next } from 'hono'

interface PerformanceMetrics {
  path: string
  method: string
  duration: number
  timestamp: number
  status?: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private readonly MAX_METRICS = 1000 // Keep last 1000 requests
  private slowThreshold = 1000 // 1 second

  addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric)
    
    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift()
    }

    // Warn about slow requests
    if (metric.duration > this.slowThreshold) {
      console.warn(`⚠️  Slow request: ${metric.method} ${metric.path} took ${metric.duration.toFixed(2)}ms`)
    }
  }

  getStats() {
    if (this.metrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        slowRequests: 0,
      }
    }

    const durations = this.metrics.map(m => m.duration)
    const slowRequests = this.metrics.filter(m => m.duration > this.slowThreshold).length

    return {
      count: this.metrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      slowRequests,
      recentMetrics: this.metrics.slice(-10), // Last 10 requests
    }
  }

  getMetricsByPath(path: string) {
    return this.metrics.filter(m => m.path === path)
  }

  clear() {
    this.metrics = []
  }

  setSlowThreshold(ms: number) {
    this.slowThreshold = ms
  }
}

export const performanceMonitor = new PerformanceMonitor()

/**
 * Middleware to track request performance
 */
export const performanceMiddleware = async (c: Context, next: Next) => {
  const start = performance.now()
  const path = c.req.path
  const method = c.req.method

  await next()

  const duration = performance.now() - start
  const status = c.res.status

  // Add performance header
  c.header('X-Response-Time', `${duration.toFixed(2)}ms`)

  // Add to metrics
  performanceMonitor.addMetric({
    path,
    method,
    duration,
    timestamp: Date.now(),
    status,
  })
}

/**
 * Endpoint to get performance statistics
 */
export const getPerformanceStats = (c: Context) => {
  const stats = performanceMonitor.getStats()
  return c.json({
    success: true,
    stats,
  })
}

/**
 * Cache wrapper with performance tracking
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 60000
): Promise<T> {
  const cache = new Map<string, { data: T; expires: number }>()
  
  const cached = cache.get(key)
  if (cached && Date.now() < cached.expires) {
    return cached.data
  }
  
  const data = await fn()
  cache.set(key, { data, expires: Date.now() + ttl })
  
  return data
}

