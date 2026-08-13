import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { logSecurityEvent } from './logger'
import { config, isProduction, env } from '../config/env'

/**
 * Build the connect-src CSP directive from environment configuration.
 * Derives allowed origins from Appwrite endpoint, Sentry DSN, and user-provided extras.
 */
function buildConnectSrc(): string {
  const sources: string[] = ["'self'"]

  // Local dev
  sources.push('http://localhost:3000', 'http://127.0.0.1:3000')

  // Helper: add both HTTPS and WSS origins for a URL (Appwrite realtime needs WSS)
  const addEndpointOrigins = (url: string) => {
    try {
      const parsed = new URL(url)
      sources.push(parsed.origin) // https://...
      if (parsed.protocol === 'https:') {
        sources.push('wss://' + parsed.host) // wss://...
      } else if (parsed.protocol === 'http:') {
        sources.push('ws://' + parsed.host) // ws://...
      }
    } catch { /* ignore invalid URLs */ }
  }

  // Frontend Appwrite endpoint (browser calls this directly)
  const fwEndpoint = process.env.VITE_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT
  if (fwEndpoint) {
    addEndpointOrigins(fwEndpoint)
  }

  // Backend Appwrite endpoint
  if (process.env.APPWRITE_ENDPOINT) {
    addEndpointOrigins(process.env.APPWRITE_ENDPOINT)
  }

  // Appwrite cloud fallbacks (realtime WS + EU region)
  sources.push('wss://cloud.appwrite.io', 'https://eu.cloud.appwrite.io')

  // Sentry ingest origin (derived from DSN)
  if (env.SENTRY_DSN) {
    try {
      sources.push(new URL(env.SENTRY_DSN).origin)
    } catch { /* ignore */ }
  }

  // Cloudflare Insights (only if SENTRY_DSN is set, as it indicates monitoring is active)
  if (env.SENTRY_DSN) {
    sources.push('https://static.cloudflareinsights.com')
  }

  // User-provided extra origins (comma-separated)
  if (env.CSP_CONNECT_EXTRA) {
    for (const s of env.CSP_CONNECT_EXTRA.split(',').map(s => s.trim())) {
      if (s) sources.push(s)
    }
  }

  // Deduplicate while preserving order
  return 'connect-src ' + [...new Set(sources)].join(' ')
}

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
      "script-src 'self' https://static.cloudflareinsights.com",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      buildConnectSrc(),
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
    if (isProduction()) {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    }

    // Remove server information
    c.header('Server', 'TarkovCasino')
    
    // Prevent caching of sensitive responses (only if not explicitly set)
    // Check if Cache-Control header is already set by the route handler
    const existingCacheControl = c.res.headers.get('Cache-Control')
    
    if (c.req.path.includes('/api/') && !existingCacheControl) {
      // Only set no-cache headers if the route hasn't set custom cache headers
      c.header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
      c.header('Pragma', 'no-cache')
      c.header('Expires', '0')
    }
  }
}

/**
 * NOTE: Session Management
 * 
 * Session management has been migrated to Appwrite and is handled by:
 * - authMiddleware() in middleware/auth.ts for standard authentication
 * - criticalAuthMiddleware() in middleware/auth.ts for sensitive operations
 * 
 * Appwrite manages sessions client-side with secure cookies and server-side validation.
 * The old SessionManager class has been removed as it's no longer needed.
 */

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

// Export IP security manager for external use
export { ipSecurityManager }