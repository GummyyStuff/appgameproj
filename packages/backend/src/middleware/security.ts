import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { logSecurityEvent } from './logger'
import { config, isProduction } from '../config/env'

/**
 * Security headers middleware
 * Adds comprehensive security headers to all responses
 */
export function securityHeadersMiddleware() {
  return async (c: Context, next: Next) => {
    await next()

    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com", // Allow inline scripts for React and Cloudflare
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Allow inline styles for Tailwind and Google Fonts
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com", // Allow Google Fonts
      "connect-src 'self' wss: https: https://static.cloudflareinsights.com", // Allow Cloudflare Insights
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ')

    // Set security headers
    c.header('Content-Security-Policy', csp)
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('X-XSS-Protection', '1; mode=block')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    
    // HSTS header for production
    if (isProduction) {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    }

    // Remove server information
    c.header('Server', 'TarkovCasino')
    
    // Prevent caching of sensitive responses
    if (c.req.path.includes('/api/')) {
      c.header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
      c.header('Pragma', 'no-cache')
      c.header('Expires', '0')
    }
  }
}

/**
 * Session timeout configuration
 */
interface SessionConfig {
  maxAge: number // Maximum session age in milliseconds
  idleTimeout: number // Idle timeout in milliseconds
  checkInterval: number // How often to check for expired sessions
}

const defaultSessionConfig: SessionConfig = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  idleTimeout: 2 * 60 * 60 * 1000, // 2 hours
  checkInterval: 5 * 60 * 1000 // 5 minutes
}

/**
 * Session manager for tracking user sessions and timeouts
 */
class SessionManager {
  private sessions = new Map<string, {
    userId: string
    createdAt: number
    lastActivity: number
    ipAddress?: string
    userAgent?: string
  }>()
  
  private cleanupInterval: Timer | null = null
  private config: SessionConfig

  constructor(config: SessionConfig = defaultSessionConfig) {
    this.config = config
    this.startCleanup()
  }

  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions()
    }, this.config.checkInterval)
  }

  private cleanupExpiredSessions() {
    const now = Date.now()
    const expiredSessions: string[] = []

    for (const [sessionId, session] of this.sessions.entries()) {
      const isExpiredByAge = (now - session.createdAt) > this.config.maxAge
      const isExpiredByIdle = (now - session.lastActivity) > this.config.idleTimeout

      if (isExpiredByAge || isExpiredByIdle) {
        expiredSessions.push(sessionId)
        
        // Log session expiration
        logSecurityEvent('session_expired', session.userId, session.ipAddress, {
          sessionId,
          reason: isExpiredByAge ? 'max_age' : 'idle_timeout',
          duration: now - session.createdAt,
          idleTime: now - session.lastActivity
        })
      }
    }

    // Remove expired sessions
    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId)
    })

    if (expiredSessions.length > 0) {
      console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`)
    }
  }

  /**
   * Register a new session
   */
  registerSession(sessionId: string, userId: string, ipAddress?: string, userAgent?: string) {
    const now = Date.now()
    this.sessions.set(sessionId, {
      userId,
      createdAt: now,
      lastActivity: now,
      ipAddress,
      userAgent
    })
  }

  /**
   * Update session activity
   */
  updateActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastActivity = Date.now()
      return true
    }
    return false
  }

  /**
   * Check if session is valid
   */
  isSessionValid(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    const now = Date.now()
    const isExpiredByAge = (now - session.createdAt) > this.config.maxAge
    const isExpiredByIdle = (now - session.lastActivity) > this.config.idleTimeout

    if (isExpiredByAge || isExpiredByIdle) {
      this.sessions.delete(sessionId)
      return false
    }

    return true
  }

  /**
   * Remove a session
   */
  removeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId)
  }

  /**
   * Get session info
   */
  getSession(sessionId: string) {
    return this.sessions.get(sessionId)
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string) {
    const userSessions: Array<{ sessionId: string; createdAt: number; lastActivity: number }> = []
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        userSessions.push({
          sessionId,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity
        })
      }
    }
    
    return userSessions
  }

  /**
   * Revoke all sessions for a user
   */
  revokeUserSessions(userId: string): number {
    let revokedCount = 0
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId)
        revokedCount++
      }
    }
    
    return revokedCount
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.sessions.clear()
  }
}

// Global session manager instance
const sessionManager = new SessionManager()

/**
 * Session timeout middleware
 * Validates and manages user session timeouts
 */
export function sessionTimeoutMiddleware() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')
      const userAgent = c.req.header('User-Agent')
      
      try {
        // Verify token with Supabase
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
        
        if (error || !user) {
          throw new HTTPException(401, { message: 'Invalid or expired token' })
        }

        // Use token as session ID (or extract session ID from token)
        const sessionId = token.substring(0, 32) // Use first 32 chars as session ID
        
        // Check if session exists and is valid
        if (!sessionManager.isSessionValid(sessionId)) {
          // Register new session
          sessionManager.registerSession(sessionId, user.id, ip, userAgent)
          
          logSecurityEvent('session_created', user.id, ip, {
            sessionId,
            userAgent
          })
        } else {
          // Update activity for existing session
          sessionManager.updateActivity(sessionId)
        }
        
        // Add session info to context
        c.set('sessionId', sessionId)
        c.set('sessionManager', sessionManager)
        
      } catch (error) {
        if (error instanceof HTTPException) {
          throw error
        }
        
        console.error('Session validation error:', error)
        throw new HTTPException(401, { message: 'Session validation failed' })
      }
    }
    
    await next()
  }
}

/**
 * Request timeout middleware
 * Prevents long-running requests from consuming resources
 */
export function requestTimeoutMiddleware(timeoutMs: number = config.requestTimeout) {
  return async (c: Context, next: Next) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new HTTPException(408, { message: 'Request timeout' }))
      }, timeoutMs)
    })

    try {
      await Promise.race([next(), timeoutPromise])
    } catch (error) {
      if (error instanceof HTTPException && error.status === 408) {
        const user = c.get('user')
        const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')
        
        logSecurityEvent('request_timeout', user?.id, ip, {
          path: c.req.path,
          method: c.req.method,
          timeout: timeoutMs
        })
      }
      
      throw error
    }
  }
}

/**
 * IP-based security middleware
 * Tracks and blocks suspicious IP addresses
 */
class IPSecurityManager {
  private suspiciousIPs = new Map<string, {
    violations: number
    lastViolation: number
    blocked: boolean
    blockUntil?: number
  }>()

  private cleanupInterval: Timer | null = null

  constructor() {
    // Clean up old entries every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60 * 60 * 1000)
  }

  private cleanup() {
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000

    for (const [ip, data] of this.suspiciousIPs.entries()) {
      // Remove entries older than 24 hours that aren't blocked
      if (!data.blocked && (now - data.lastViolation) > oneDay) {
        this.suspiciousIPs.delete(ip)
      }
      // Remove expired blocks
      else if (data.blocked && data.blockUntil && data.blockUntil < now) {
        data.blocked = false
        data.blockUntil = undefined
      }
    }
  }

  recordViolation(ip: string, violationType: string) {
    const now = Date.now()
    const entry = this.suspiciousIPs.get(ip) || {
      violations: 0,
      lastViolation: now,
      blocked: false
    }

    entry.violations++
    entry.lastViolation = now

    // Block IP after 10 violations within 24 hours
    if (entry.violations >= 10) {
      entry.blocked = true
      entry.blockUntil = now + (24 * 60 * 60 * 1000) // Block for 24 hours
      
      logSecurityEvent('ip_blocked', undefined, ip, {
        violations: entry.violations,
        violationType,
        blockDuration: 24 * 60 * 60 * 1000
      })
    }

    this.suspiciousIPs.set(ip, entry)
  }

  isBlocked(ip: string): boolean {
    const entry = this.suspiciousIPs.get(ip)
    if (!entry || !entry.blocked) return false

    const now = Date.now()
    if (entry.blockUntil && entry.blockUntil < now) {
      entry.blocked = false
      entry.blockUntil = undefined
      return false
    }

    return true
  }

  getViolationCount(ip: string): number {
    return this.suspiciousIPs.get(ip)?.violations || 0
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.suspiciousIPs.clear()
  }
}

const ipSecurityManager = new IPSecurityManager()

/**
 * IP security middleware
 */
export function ipSecurityMiddleware() {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown'
    
    if (ipSecurityManager.isBlocked(ip)) {
      logSecurityEvent('blocked_ip_attempt', undefined, ip, {
        path: c.req.path,
        method: c.req.method
      })
      
      throw new HTTPException(403, { message: 'Access denied' })
    }
    
    // Add IP security manager to context for other middleware to use
    c.set('ipSecurityManager', ipSecurityManager)
    
    await next()
  }
}

// Export instances for external use
export { sessionManager, ipSecurityManager }