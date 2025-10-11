import type { Context, Next } from 'hono'
import { logSecurityEvent } from './logger'
import { isTest } from '../config/env'
import { AuditService } from '../services/audit-service'

export interface AuditLogEntry {
  id?: string
  user_id?: string
  action: string
  resource_type: string
  resource_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
  timestamp: string
  success: boolean
  error_message?: string
  metadata?: Record<string, any>
}

export interface AuditConfig {
  action: string
  resourceType: string
  resourceId?: string | ((c: Context) => string)
  captureRequest?: boolean
  captureResponse?: boolean
  logLevel?: 'info' | 'warn' | 'error'
}

/**
 * Audit logging service for tracking administrative and sensitive actions
 */
export class AuditLogger {
  /**
   * Log an audit event to the database
   */
  static async logEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        ...entry,
        timestamp: new Date().toISOString()
      }

      // Skip database operations in test environment
      if (!isTest()) {
        // Store in Appwrite database using AuditService
        try {
          await AuditService.log({
            userId: entry.user_id,
            action: entry.action,
            resourceType: entry.resource_type,
            resourceId: entry.resource_id,
            oldValues: entry.old_values,
            newValues: entry.new_values,
            ipAddress: entry.ip_address,
            userAgent: entry.user_agent,
            success: entry.success,
            errorMessage: entry.error_message,
            metadata: entry.metadata
          })
        } catch (error) {
          console.error('Failed to store audit log:', error)
          // Fallback to console logging
          console.log('AUDIT:', JSON.stringify(auditEntry, null, 2))
        }
      }

      // Also log as security event for immediate monitoring
      console.log('About to call logSecurityEvent')
      logSecurityEvent('audit_log', entry.user_id, entry.ip_address, {
        action: entry.action,
        resourceType: entry.resource_type,
        resourceId: entry.resource_id,
        success: entry.success,
        metadata: entry.metadata
      })
      console.log('logSecurityEvent completed')
    } catch (error) {
      console.error('Audit logging failed:', error)
      // Ensure audit events are never lost - fallback to console
      console.log('AUDIT_FALLBACK:', JSON.stringify(entry, null, 2))
      throw error // Re-throw to see what the test catches
    }
  }

  /**
   * Log a successful action
   */
  static async logSuccess(
    action: string,
    resourceType: string,
    context: {
      userId?: string
      resourceId?: string
      oldValues?: Record<string, any>
      newValues?: Record<string, any>
      ipAddress?: string
      userAgent?: string
      metadata?: Record<string, any>
    }
  ): Promise<void> {
    await this.logEvent({
      user_id: context.userId,
      action,
      resource_type: resourceType,
      resource_id: context.resourceId,
      old_values: context.oldValues,
      new_values: context.newValues,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      success: true,
      metadata: context.metadata
    })
  }

  /**
   * Log a failed action
   */
  static async logFailure(
    action: string,
    resourceType: string,
    errorMessage: string,
    context: {
      userId?: string
      resourceId?: string
      ipAddress?: string
      userAgent?: string
      metadata?: Record<string, any>
    }
  ): Promise<void> {
    await this.logEvent({
      user_id: context.userId,
      action,
      resource_type: resourceType,
      resource_id: context.resourceId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      success: false,
      error_message: errorMessage,
      metadata: context.metadata
    })
  }
}

/**
 * Middleware for automatic audit logging of requests
 */
export function auditMiddleware(config: AuditConfig) {
  return async (c: Context, next: Next) => {
    const startTime = Date.now()
    const user = c.get('user')
    const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')
    const userAgent = c.req.header('User-Agent')
    
    let resourceId: string | undefined
    if (typeof config.resourceId === 'function') {
      resourceId = config.resourceId(c)
    } else if (typeof config.resourceId === 'string') {
      resourceId = config.resourceId
    }

    let requestData: any = undefined
    let responseData: any = undefined
    let success = true
    let errorMessage: string | undefined

    // Capture request data if configured
    if (config.captureRequest && c.req.method !== 'GET') {
      try {
        // Only capture basic request info to avoid consuming the body
        requestData = {
          method: c.req.method,
          path: c.req.path,
          headers: Object.fromEntries(c.req.headers.entries()),
          // Don't consume the body here as it will be consumed by validation middleware
        }
      } catch (error) {
        // Ignore request capture errors
        console.warn('Failed to capture request data for audit:', error)
      }
    }

    try {
      await next()
      
      // Capture response data if configured
      if (config.captureResponse) {
        // Note: This is complex with Hono, so we'll capture basic success info
        responseData = { status: 'success' }
      }
    } catch (error) {
      success = false
      errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw error // Re-throw to maintain error handling
    } finally {
      // Log the audit event
      const duration = Date.now() - startTime
      
      try {
        await AuditLogger.logEvent({
          user_id: user?.id,
          action: config.action,
          resource_type: config.resourceType,
          resource_id: resourceId,
          new_values: requestData,
          ip_address: ip,
          user_agent: userAgent,
          success,
          error_message: errorMessage,
          metadata: {
            method: c.req.method,
            path: c.req.path,
            duration,
            ...(responseData && { response: responseData })
          }
        })
      } catch (auditError) {
        console.error('Failed to log audit event:', auditError)
      }
    }
  }
}

/**
 * Specific audit middleware for authentication actions
 */
export const auditAuth = (action: string) => auditMiddleware({
  action,
  resourceType: 'user_auth',
  resourceId: (c) => c.get('user')?.id || 'anonymous',
  captureRequest: true
})

/**
 * Specific audit middleware for game actions
 */
export const auditGame = (action: string) => auditMiddleware({
  action,
  resourceType: 'game_action',
  resourceId: (c) => c.get('user')?.id || 'anonymous',
  captureRequest: true
})

/**
 * Specific audit middleware for currency operations
 */
export const auditCurrency = (action: string) => auditMiddleware({
  action,
  resourceType: 'currency_operation',
  resourceId: (c) => c.get('user')?.id || 'anonymous',
  captureRequest: true
})

/**
 * Specific audit middleware for user profile changes
 */
export const auditProfile = (action: string) => auditMiddleware({
  action,
  resourceType: 'user_profile',
  resourceId: (c) => c.get('user')?.id || 'anonymous',
  captureRequest: true,
  captureResponse: true
})

/**
 * Administrative action audit middleware
 */
export const auditAdmin = (action: string, resourceType: string) => auditMiddleware({
  action,
  resourceType,
  resourceId: (c) => {
    const params = c.req.param()
    return params.id || params.userId || 'unknown'
  },
  captureRequest: true,
  captureResponse: true
})

/**
 * High-level audit logging functions for manual use
 */
export const auditLog = {
  /**
   * Log user registration
   */
  userRegistered: (userId: string, email: string, ip?: string) =>
    AuditLogger.logSuccess('user_register', 'user_auth', {
      userId,
      newValues: { email },
      ipAddress: ip,
      metadata: { action_type: 'registration' }
    }),

  /**
   * Log user login
   */
  userLoggedIn: (userId: string, email: string, ip?: string) =>
    AuditLogger.logSuccess('user_login', 'user_auth', {
      userId,
      newValues: { email },
      ipAddress: ip,
      metadata: { action_type: 'login' }
    }),

  /**
   * Log user logout
   */
  userLoggedOut: (userId: string, ip?: string) =>
    AuditLogger.logSuccess('user_logout', 'user_auth', {
      userId,
      ipAddress: ip,
      metadata: { action_type: 'logout' }
    }),

  /**
   * Log password change
   */
  passwordChanged: (userId: string, ip?: string) =>
    AuditLogger.logSuccess('password_change', 'user_auth', {
      userId,
      ipAddress: ip,
      metadata: { action_type: 'password_change' }
    }),

  /**
   * Log game play
   */
  gamePlayStarted: (userId: string, gameType: string, betAmount: number, ip?: string) =>
    AuditLogger.logSuccess('game_play_start', 'game_action', {
      userId,
      newValues: { gameType, betAmount },
      ipAddress: ip,
      metadata: { action_type: 'game_start' }
    }),

  /**
   * Log game completion
   */
  gameCompleted: (userId: string, gameType: string, betAmount: number, winAmount: number, ip?: string) =>
    AuditLogger.logSuccess('game_play_complete', 'game_action', {
      userId,
      newValues: { gameType, betAmount, winAmount, netResult: winAmount - betAmount },
      ipAddress: ip,
      metadata: { action_type: 'game_complete' }
    }),

  /**
   * Log currency transaction
   */
  currencyTransaction: (userId: string, type: string, amount: number, newBalance: number, ip?: string) =>
    AuditLogger.logSuccess('currency_transaction', 'currency_operation', {
      userId,
      newValues: { type, amount, newBalance },
      ipAddress: ip,
      metadata: { action_type: 'currency_change' }
    }),

  /**
   * Log security event
   */
  securityEvent: (userId: string | undefined, eventType: string, details: any, ip?: string) =>
    AuditLogger.logSuccess('security_event', 'security', {
      userId,
      newValues: { eventType, details },
      ipAddress: ip,
      metadata: { action_type: 'security_alert' }
    })
}