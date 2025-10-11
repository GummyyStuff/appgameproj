/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and DDoS attacks
 */

import { rateLimiter } from 'hono-rate-limiter'
import type { Context } from 'hono'

/**
 * General API rate limiter
 * 100 requests per 15 minutes per user/IP
 */
export const apiRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // max requests per window
  standardHeaders: 'draft-6', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  keyGenerator: (c: Context) => {
    // Use user ID if authenticated, otherwise IP
    const userId = c.req.header('X-Appwrite-User-Id')
    if (userId) return `user:${userId}`
    
    // Fallback to IP address
    const ip = c.req.header('x-real-ip') || 
                c.req.header('x-forwarded-for') || 
                'unknown'
    return `ip:${ip}`
  },
  handler: (c: Context) => {
    return c.json(
      {
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: c.res.headers.get('Retry-After'),
      },
      429
    )
  },
})

/**
 * Strict rate limiter for authentication endpoints
 * 10 requests per 15 minutes per IP
 */
export const authRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: 'draft-6',
  keyGenerator: (c: Context) => {
    const ip = c.req.header('x-real-ip') || 
                c.req.header('x-forwarded-for') || 
                'unknown'
    return `auth-ip:${ip}`
  },
  handler: (c: Context) => {
    console.log('🚫 Auth Rate Limit Exceeded:', {
      ip: c.req.header('x-real-ip') || c.req.header('x-forwarded-for'),
      path: c.req.path,
      timestamp: new Date().toISOString(),
    })
    
    return c.json(
      {
        success: false,
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: c.res.headers.get('Retry-After'),
      },
      429
    )
  },
})

/**
 * Strict rate limiter for game betting endpoints
 * 30 requests per minute per user
 */
export const gameBetRateLimit = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 30,
  standardHeaders: 'draft-6',
  keyGenerator: (c: Context) => {
    const userId = c.req.header('X-Appwrite-User-Id')
    if (userId) return `bet:${userId}`
    
    const ip = c.req.header('x-real-ip') || 
                c.req.header('x-forwarded-for') || 
                'unknown'
    return `bet-ip:${ip}`
  },
  handler: (c: Context) => {
    console.log('🚫 Game Bet Rate Limit Exceeded:', {
      userId: c.req.header('X-Appwrite-User-Id'),
      ip: c.req.header('x-real-ip') || c.req.header('x-forwarded-for'),
      path: c.req.path,
      timestamp: new Date().toISOString(),
    })
    
    return c.json(
      {
        success: false,
        error: 'Too many bets placed. Please slow down.',
        retryAfter: c.res.headers.get('Retry-After'),
      },
      429
    )
  },
})

/**
 * Moderate rate limiter for profile and balance queries
 * 60 requests per minute per user
 */
export const profileRateLimit = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 60,
  standardHeaders: 'draft-6',
  keyGenerator: (c: Context) => {
    const userId = c.req.header('X-Appwrite-User-Id')
    if (userId) return `profile:${userId}`
    
    const ip = c.req.header('x-real-ip') || 
                c.req.header('x-forwarded-for') || 
                'unknown'
    return `profile-ip:${ip}`
  },
  handler: (c: Context) => {
    return c.json(
      {
        success: false,
        error: 'Too many requests. Please slow down.',
        retryAfter: c.res.headers.get('Retry-After'),
      },
      429
    )
  },
})

/**
 * Very strict rate limiter for admin operations
 * 5 requests per minute per user
 */
export const adminRateLimit = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 5,
  standardHeaders: 'draft-6',
  keyGenerator: (c: Context) => {
    const userId = c.req.header('X-Appwrite-User-Id')
    if (userId) return `admin:${userId}`
    
    const ip = c.req.header('x-real-ip') || 
                c.req.header('x-forwarded-for') || 
                'unknown'
    return `admin-ip:${ip}`
  },
  handler: (c: Context) => {
    console.log('🚫 Admin Rate Limit Exceeded:', {
      userId: c.req.header('X-Appwrite-User-Id'),
      ip: c.req.header('x-real-ip') || c.req.header('x-forwarded-for'),
      path: c.req.path,
      timestamp: new Date().toISOString(),
    })
    
    return c.json(
      {
        success: false,
        error: 'Admin rate limit exceeded.',
        retryAfter: c.res.headers.get('Retry-After'),
      },
      429
    )
  },
})
