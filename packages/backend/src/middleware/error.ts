import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { env, isDevelopment, isTest } from '../config/env'
import { logger } from './logger'

export interface ErrorResponse {
  error: {
    message: string
    code?: string
    details?: any
    requestId?: string
  }
  timestamp: string
  path: string
  method: string
}

/**
 * Generate a unique request ID for error tracking
 */
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

/**
 * Global error handler for the Hono application
 * Provides consistent error responses and logging
 */
export function errorHandler(err: Error, c: Context): Response {
  const timestamp = new Date().toISOString()
  const path = c.req.path
  const method = c.req.method
  const requestId = generateRequestId()
  const userAgent = c.req.header('User-Agent')
  const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown'
  const user = c.get('user')
  const userId = user?.id

  // Log error with context
  logger.error({
    type: 'request',
    method,
    path,
    userId,
    ip,
    userAgent,
    message: `Request error: ${err.message}`,
    error: err.stack || err.message,
    details: {
      requestId,
      errorName: err.name,
      ...(isDevelopment && { stack: err.stack })
    }
  })

  // Handle HTTP exceptions (thrown by middleware or route handlers)
  if (err instanceof HTTPException) {
    const response: ErrorResponse = {
      error: {
        message: err.message,
        code: `HTTP_${err.status}`,
        requestId,
        ...(isDevelopment && { details: err.cause })
      },
      timestamp,
      path,
      method
    }

    return c.json(response, err.status)
  }

  // Handle validation errors (Zod errors)
  if (err.name === 'ZodError') {
    const response: ErrorResponse = {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        requestId,
        details: isDevelopment() && !isTest ? err : undefined
      },
      timestamp,
      path,
      method
    }

    return c.json(response, 400)
  }

  // Handle timeout errors
  if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
    const response: ErrorResponse = {
      error: {
        message: 'Request timeout',
        code: 'TIMEOUT_ERROR',
        requestId
      },
      timestamp,
      path,
      method
    }

    return c.json(response, 408)
  }

  // Handle Supabase/Database errors
  if (err.message.includes('supabase') || err.message.includes('postgres') || err.message.includes('database')) {
    const response: ErrorResponse = {
      error: {
        message: 'Database operation failed',
        code: 'DATABASE_ERROR',
        requestId,
        details: isDevelopment ? err.message : undefined
      },
      timestamp,
      path,
      method
    }

    return c.json(response, 500)
  }

  // Handle rate limiting errors
  if (err.message.includes('rate limit') || err.message.includes('too many requests')) {
    const response: ErrorResponse = {
      error: {
        message: 'Too many requests',
        code: 'RATE_LIMIT_ERROR',
        requestId
      },
      timestamp,
      path,
      method
    }

    return c.json(response, 429)
  }

  // Handle generic errors
  const response: ErrorResponse = {
    error: {
      message: isDevelopment ? err.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId,
      details: isDevelopment ? err.stack : undefined
    },
    timestamp,
    path,
    method
  }

  return c.json(response, 500)
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to the global error handler
 */
export function asyncHandler(fn: Function) {
  return async (c: Context, next?: any) => {
    try {
      return await fn(c, next)
    } catch (error) {
      throw error // Let the global error handler deal with it
    }
  }
}