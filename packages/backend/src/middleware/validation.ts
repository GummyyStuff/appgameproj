import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z, type ZodSchema } from 'zod'
import { logSecurityEvent } from './logger'

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Remove potentially dangerous characters from strings
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return ''
    
    return input
      .trim()
      // Remove null bytes
      .replace(/\0/g, '')
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Limit length to prevent DoS
      .substring(0, 10000)
  }

  /**
   * Sanitize HTML content by escaping dangerous characters
   */
  static escapeHtml(input: string): string {
    if (typeof input !== 'string') return ''
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  /**
   * Validate and sanitize email addresses
   */
  static sanitizeEmail(email: string): string {
    if (typeof email !== 'string') return ''
    
    return email
      .toLowerCase()
      .trim()
      .substring(0, 254) // RFC 5321 limit
  }

  /**
   * Sanitize username by removing dangerous characters
   */
  static sanitizeUsername(username: string): string {
    if (typeof username !== 'string') return ''
    
    return username
      .trim()
      // Only allow alphanumeric, underscore, hyphen
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .substring(0, 50)
  }

  /**
   * Sanitize numeric inputs
   */
  static sanitizeNumber(input: any): number | null {
    if (typeof input === 'number' && !isNaN(input) && isFinite(input)) {
      return input
    }
    
    if (typeof input === 'string') {
      const parsed = parseFloat(input)
      if (!isNaN(parsed) && isFinite(parsed)) {
        return parsed
      }
    }
    
    return null
  }

  /**
   * Deep sanitize an object recursively
   */
  static sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) return obj
    
    if (typeof obj === 'string') {
      return this.sanitizeString(obj)
    }
    
    if (typeof obj === 'number') {
      return this.sanitizeNumber(obj)
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item))
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key)
        if (sanitizedKey) {
          sanitized[sanitizedKey] = this.sanitizeObject(value)
        }
      }
      return sanitized
    }
    
    return obj
  }
}

/**
 * SQL injection detection patterns
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
  /(--|\/\*|\*\/|;|'|"|`)/,
  /(\bOR\b|\bAND\b).*?[=<>]/i,
  /\b(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)\b/i,
  /(CAST|CONVERT|SUBSTRING|CHAR|ASCII)\s*\(/i
]

/**
 * XSS detection patterns
 */
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /<meta\b[^>]*>/gi
]

/**
 * Detect potential security threats in input
 */
export class ThreatDetector {
  static detectSqlInjection(input: string): boolean {
    return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input))
  }

  static detectXss(input: string): boolean {
    return XSS_PATTERNS.some(pattern => pattern.test(input))
  }

  static detectPathTraversal(input: string): boolean {
    return /(\.\.[\/\\]|[\/\\]\.\.)/.test(input)
  }

  static detectCommandInjection(input: string): boolean {
    return /[;&|`$(){}[\]<>]/.test(input)
  }

  static analyzeInput(input: string): string[] {
    const threats: string[] = []
    
    if (this.detectSqlInjection(input)) threats.push('sql_injection')
    if (this.detectXss(input)) threats.push('xss')
    if (this.detectPathTraversal(input)) threats.push('path_traversal')
    if (this.detectCommandInjection(input)) threats.push('command_injection')
    
    return threats
  }
}

/**
 * Enhanced validation middleware with security checks
 */
export function validationMiddleware<T>(schema: ZodSchema<T>, options?: {
  sanitize?: boolean
  detectThreats?: boolean
  logThreats?: boolean
}) {
  const {
    sanitize = true,
    detectThreats = true,
    logThreats = true
  } = options || {}

  return async (c: Context, next: Next) => {
    try {
      let body = await c.req.json().catch(() => ({}))
      
      // Sanitize input if enabled
      if (sanitize) {
        body = InputSanitizer.sanitizeObject(body)
      }
      
      // Detect security threats if enabled
      if (detectThreats) {
        const threats = new Set<string>()
        
        function checkForThreats(obj: any, path = ''): void {
          if (typeof obj === 'string') {
            const detectedThreats = ThreatDetector.analyzeInput(obj)
            detectedThreats.forEach(threat => threats.add(threat))
          } else if (Array.isArray(obj)) {
            obj.forEach((item, index) => checkForThreats(item, `${path}[${index}]`))
          } else if (obj && typeof obj === 'object') {
            Object.entries(obj).forEach(([key, value]) => 
              checkForThreats(value, path ? `${path}.${key}` : key)
            )
          }
        }
        
        checkForThreats(body)
        
        if (threats.size > 0) {
          const user = c.get('user')
          const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')
          
          if (logThreats) {
            logSecurityEvent('security_threat_detected', user?.id, ip, {
              threats: Array.from(threats),
              path: c.req.path,
              method: c.req.method,
              body: sanitize ? '[SANITIZED]' : body
            })
          }
          
          throw new HTTPException(400, { 
            message: 'Invalid input detected',
            cause: { threats: Array.from(threats) }
          })
        }
      }
      
      // Validate with Zod schema
      const validatedData = schema.parse(body)
      
      // Store validated data in context
      c.set('validatedData', validatedData)
      
      await next()
    } catch (error) {
      if (error && typeof error === 'object' && 'errors' in error && Array.isArray(error.errors)) {
        // Skip security logging in test environment to avoid environment access issues
        if (process.env.NODE_ENV !== 'test') {
          const user = c.get('user')
          const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')

          logSecurityEvent('validation_failed', user?.id, ip, {
            path: c.req.path,
            method: c.req.method,
            errors: error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
              code: e.code
            }))
          })
        }

        throw new HTTPException(400, {
          message: 'Validation failed',
          cause: {
            errors: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          }
        })
      }
      
      throw error
    }
  }
}

/**
 * Content Security Policy validation
 */
export function validateContentType(allowedTypes: string[] = ['application/json']) {
  return async (c: Context, next: Next) => {
    const contentType = c.req.header('Content-Type')
    
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        const user = c.get('user')
        const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')
        
        logSecurityEvent('invalid_content_type', user?.id, ip, {
          contentType,
          allowedTypes,
          path: c.req.path,
          method: c.req.method
        })
        
        throw new HTTPException(415, { 
          message: 'Unsupported Media Type',
          cause: { allowedTypes }
        })
      }
    }
    
    await next()
  }
}

/**
 * Request size validation
 */
export function validateRequestSize(maxSize: number = 1024 * 1024) { // 1MB default
  return async (c: Context, next: Next) => {
    const contentLength = c.req.header('Content-Length')
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      const user = c.get('user')
      const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')
      
      logSecurityEvent('request_too_large', user?.id, ip, {
        contentLength: parseInt(contentLength),
        maxSize,
        path: c.req.path,
        method: c.req.method
      })
      
      throw new HTTPException(413, { 
        message: 'Request entity too large',
        cause: { maxSize, actualSize: parseInt(contentLength) }
      })
    }
    
    await next()
  }
}

// Common validation schemas
export const commonSchemas = {
  email: z.string().email().transform(InputSanitizer.sanitizeEmail),
  username: z.string().min(3).max(50).transform(InputSanitizer.sanitizeUsername),
  password: z.string().min(6).max(128),
  betAmount: z.number().min(1).max(100000).int(),
  gameId: z.string().min(10).max(200).regex(/^[a-zA-Z0-9\-_]+$/, 'Invalid game ID format'),
  riskLevel: z.enum(['low', 'medium', 'high']),
  gameType: z.enum(['roulette', 'blackjack', 'case_opening']),
  blackjackAction: z.enum(['hit', 'stand', 'double', 'split'])
}