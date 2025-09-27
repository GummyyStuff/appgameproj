import { Context, Next } from 'hono'
import { env, config, isDevelopment, isProduction, isTest } from '../config/env'

export interface RequestLog {
  level: 'info' | 'warn' | 'error'
  type: 'request' | 'game_action' | 'security_event' | 'system'
  method?: string
  path?: string
  userAgent?: string
  ip?: string
  userId?: string
  duration?: number
  status?: number
  timestamp: string
  message?: string
  details?: any
  error?: string
}

/**
 * Enhanced logging utility
 */
class Logger {
  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(env.LOG_LEVEL)
    const messageLevelIndex = levels.indexOf(level)
    return messageLevelIndex >= currentLevelIndex
  }

  private formatLog(logData: RequestLog): string {
    if (isDevelopment) {
      // Human-readable format for development
      const { level, type, method, path, status, duration, message, userId } = logData
      const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅'
      const userInfo = userId ? ` [User: ${userId.substring(0, 8)}...]` : ''
      
      if (type === 'request' && method && path) {
        return `${emoji} ${method} ${path} - ${status} (${duration}ms)${userInfo}`
      }
      
      return `${emoji} [${type.toUpperCase()}] ${message}${userInfo}`
    } else {
      // Structured JSON for production
      return JSON.stringify(logData)
    }
  }

  log(level: 'info' | 'warn' | 'error', logData: Partial<RequestLog>) {
    if (!this.shouldLog(level)) return

    const fullLogData: RequestLog = {
      level,
      timestamp: new Date().toISOString(),
      ...logData
    } as RequestLog

    const formattedLog = this.formatLog(fullLogData)

    switch (level) {
      case 'error':
        console.error(formattedLog)
        break
      case 'warn':
        console.warn(formattedLog)
        break
      default:
        console.log(formattedLog)
    }
  }

  info(data: Partial<RequestLog>) {
    this.log('info', data)
  }

  warn(data: Partial<RequestLog>) {
    this.log('warn', data)
  }

  error(data: Partial<RequestLog>) {
    this.log('error', data)
  }
}

export const logger = new Logger()

/**
 * Custom request logging middleware
 * Logs request details and performance metrics
 */
export async function requestLogger(c: Context, next: Next) {
  if (!config.enableRequestLogging) {
    await next()
    return
  }

  const start = Date.now()
  
  // Extract request information
  const method = c.req.method
  const path = c.req.path
  const userAgent = c.req.header('User-Agent')
  const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown'

  await next()

  // Calculate request duration
  const duration = Date.now() - start
  const status = c.res.status

  // Get user ID if available (set by auth middleware)
  const user = c.get('user')
  const userId = user?.id

  // Skip health check logging in production to reduce noise
  if (isProduction && (path.includes('/health') || path.includes('/metrics'))) {
    return
  }

  const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'

  logger.log(logLevel, {
    type: 'request',
    method,
    path,
    userAgent,
    ip,
    userId,
    duration,
    status,
    message: `${method} ${path} - ${status} (${duration}ms)`
  })

  // Log slow requests
  if (duration > 1000) {
    logger.warn({
      type: 'system',
      message: `Slow request detected: ${method} ${path} took ${duration}ms`,
      details: { method, path, duration, status }
    })
  }
}

/**
 * Game action logger for tracking game-specific events
 */
export function logGameAction(
  userId: string,
  gameType: string,
  action: string,
  details?: any
) {
  if (!config.enableGameLogging) return

  logger.info({
    type: 'game_action',
    userId: userId.substring(0, 8) + '...',
    message: `Game action: ${gameType} - ${action}`,
    details: {
      gameType,
      action,
      ...(isDevelopment ? details : {})
    }
  })
}

/**
 * Security event logger for tracking authentication and authorization events
 */
export function logSecurityEvent(
  event: string,
  userId?: string,
  ip?: string,
  details?: any
) {
  try {
    if (!config.enableSecurityLogging) return

    logger.warn({
      type: 'security_event',
      userId: userId ? userId.substring(0, 8) + '...' : undefined,
      ip,
      message: `Security event: ${event}`,
      details: isDevelopment() ? details : undefined
    })
  } catch (error) {
    // In test environment or when config is not initialized, silently fail
    if (isTest()) {
      console.log('Security event logging skipped in test mode')
      return
    }

    // In production/development, log the error
    console.warn('Failed to log security event:', error)
    throw error // Re-throw in production
  }
}

/**
 * System event logger for application-level events
 */
export function logSystemEvent(
  event: string,
  level: 'info' | 'warn' | 'error' = 'info',
  details?: any
) {
  logger.log(level, {
    type: 'system',
    message: `System event: ${event}`,
    details: isDevelopment ? details : undefined
  })
}