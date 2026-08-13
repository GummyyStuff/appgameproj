/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and DDoS attacks
 */

import { rateLimiter } from 'hono-rate-limiter'
import type { Context } from 'hono'
import { getCookie } from 'hono/cookie'

/**
 * General API rate limiter
 * 100 requests per 15 minutes per user/IP in production;
 * relaxed in development for local E2E testing.
 */
export const apiRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: process.env.NODE_ENV === 'production' ? 100 : 20000, // max requests per window
  standardHeaders: 'draft-6', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  keyGenerator: (c: Context) => {
    // Use validated user ID from auth context (never trust raw header)
    const user = c.get('user')
    if (user?.id) return `user:${user.id}`

    // Use session cookie as key (set by Appwrite, hard to forge)
    const session = getCookie(c, 'session')
    if (session) return `session:${session}`
    
    // Fallback to IP address for unauthenticated requests
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
 * Rate limiter for authentication endpoints
 * 60 requests per 15 minutes per user in production (handles session checks,
 * page reloads, strict mode); relaxed in development for local E2E testing.
 */
export const authRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: process.env.NODE_ENV === 'production' ? 60 : 2000,
  standardHeaders: 'draft-6',
  keyGenerator: (c: Context) => {
    // Auth endpoints run before auth middleware — use validated session token if present
    const user = c.get('user')
    if (user?.id) return `auth-user:${user.id}`

    // For unauthenticated requests, use session token hash (not raw header)
    const session = getCookie(c, 'session')
    if (session) return `auth-session:${Buffer.from(session).toString('base64')}`

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
  limit: process.env.NODE_ENV === 'production' ? 30 : 2000,
  standardHeaders: 'draft-6',
  keyGenerator: (c: Context) => {
    const user = c.get('user')
    if (user?.id) return `bet:${user.id}`
    
    const session = getCookie(c, 'session')
    if (session) return `bet-session:${session}`
    
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
    const user = c.get('user')
    if (user?.id) return `profile:${user.id}`
    
    const session = getCookie(c, 'session')
    if (session) return `profile-session:${session}`
    
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
    const user = c.get('user')
    if (user?.id) return `admin:${user.id}`
    
    const session = getCookie(c, 'session')
    if (session) return `admin-session:${session}`
    
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
