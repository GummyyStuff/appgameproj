import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { config } from '../config/env'
import { logSecurityEvent } from './logger'

interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
  blockUntil?: number
}

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  blockDurationMs?: number
  skipSuccessfulRequests?: boolean
  keyGenerator?: (c: Context) => string
  onLimitReached?: (c: Context, key: string) => void
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: Timer | null = null

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now && (!entry.blockUntil || entry.blockUntil < now)) {
        this.store.delete(key)
      }
    }
  }

  private getKey(c: Context, keyGenerator?: (c: Context) => string): string {
    if (keyGenerator) {
      return keyGenerator(c)
    }
    
    const user = c.get('user')
    const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown'
    
    // Use user ID if authenticated, otherwise use IP
    return user?.id || `ip:${ip}`
  }

  check(c: Context, config: RateLimitConfig): boolean {
    const key = this.getKey(c, config.keyGenerator)
    const now = Date.now()
    
    let entry = this.store.get(key)
    
    // Initialize entry if it doesn't exist
    if (!entry) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
        blocked: false
      }
      this.store.set(key, entry)
    }
    
    // Check if currently blocked
    if (entry.blocked && entry.blockUntil && entry.blockUntil > now) {
      return false
    }
    
    // Reset window if expired
    if (entry.resetTime <= now) {
      entry.count = 0
      entry.resetTime = now + config.windowMs
      entry.blocked = false
      entry.blockUntil = undefined
    }
    
    // Increment counter
    entry.count++
    
    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      entry.blocked = true
      if (config.blockDurationMs) {
        entry.blockUntil = now + config.blockDurationMs
      }
      
      // Log security event
      const user = c.get('user')
      const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')
      logSecurityEvent('rate_limit_exceeded', user?.id, ip, {
        key,
        count: entry.count,
        limit: config.maxRequests,
        path: c.req.path,
        method: c.req.method
      })
      
      if (config.onLimitReached) {
        config.onLimitReached(c, key)
      }
      
      return false
    }
    
    return true
  }

  getStatus(c: Context, config: RateLimitConfig) {
    const key = this.getKey(c, config.keyGenerator)
    const entry = this.store.get(key)
    
    if (!entry) {
      return {
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
        blocked: false
      }
    }
    
    return {
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      blocked: entry.blocked
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.store.clear()
  }
}

// Global rate limiter instance
const globalRateLimiter = new RateLimiter()

/**
 * General rate limiting middleware
 */
export function rateLimitMiddleware(rateLimitConfig?: Partial<RateLimitConfig>) {
  const config: RateLimitConfig = {
    windowMs: rateLimitConfig?.windowMs || 15 * 60 * 1000, // 15 minutes
    maxRequests: rateLimitConfig?.maxRequests || 100,
    blockDurationMs: rateLimitConfig?.blockDurationMs || 5 * 60 * 1000, // 5 minutes
    ...rateLimitConfig
  }

  return async (c: Context, next: Next) => {
    const allowed = globalRateLimiter.check(c, config)
    
    if (!allowed) {
      const status = globalRateLimiter.getStatus(c, config)
      const retryAfter = status.blocked && status.resetTime 
        ? Math.ceil((status.resetTime - Date.now()) / 1000)
        : Math.ceil(config.windowMs / 1000)
      
      c.header('Retry-After', retryAfter.toString())
      c.header('X-RateLimit-Limit', config.maxRequests.toString())
      c.header('X-RateLimit-Remaining', '0')
      c.header('X-RateLimit-Reset', status.resetTime.toString())
      
      throw new HTTPException(429, { 
        message: 'Too many requests. Please try again later.',
        cause: {
          retryAfter,
          limit: config.maxRequests,
          windowMs: config.windowMs
        }
      })
    }
    
    // Add rate limit headers
    const status = globalRateLimiter.getStatus(c, config)
    c.header('X-RateLimit-Limit', config.maxRequests.toString())
    c.header('X-RateLimit-Remaining', status.remaining.toString())
    c.header('X-RateLimit-Reset', status.resetTime.toString())
    
    await next()
  }
}

/**
 * Strict rate limiting for authentication endpoints
 */
export const authRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes after limit exceeded
  keyGenerator: (c) => {
    const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown'
    return `auth:${ip}`
  }
})

/**
 * Game action rate limiting
 */
export const gameRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 game actions per minute
  blockDurationMs: 2 * 60 * 1000, // Block for 2 minutes
  keyGenerator: (c) => {
    const user = c.get('user')
    return user?.id ? `game:${user.id}` : `game:${c.req.header('X-Forwarded-For') || 'unknown'}`
  }
})

/**
 * API rate limiting for general endpoints
 */
export const apiRateLimit = rateLimitMiddleware({
  windowMs: config.rateLimitWindow,
  maxRequests: config.rateLimitMax,
  blockDurationMs: 10 * 60 * 1000 // Block for 10 minutes
})

/**
 * Aggressive rate limiting for sensitive operations
 */
export const sensitiveRateLimit = rateLimitMiddleware({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 attempts per hour
  blockDurationMs: 60 * 60 * 1000, // Block for 1 hour
  keyGenerator: (c) => {
    const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown'
    return `sensitive:${ip}`
  }
})

// Export the rate limiter instance for testing
export { globalRateLimiter }