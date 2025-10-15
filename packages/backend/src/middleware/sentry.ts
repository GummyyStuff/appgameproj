import type { Context, Next } from 'hono'
import { Sentry, setUserContext } from '../lib/sentry'
import { isProduction } from '../config/env'

/**
 * Sentry middleware for Hono
 * Adds request context and user information to Sentry
 */
export const sentryMiddleware = async (c: Context, next: Next) => {
  if (!isProduction()) {
    return next()
  }

  // Get request information
  const method = c.req.method
  const path = c.req.path
  const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown'
  const userAgent = c.req.header('User-Agent') || 'unknown'

  // Add request context to Sentry
  Sentry.setContext('request', {
    method,
    path,
    ip,
    userAgent
  })

  // Get user from context (if authenticated)
  const user = c.get('user')
  if (user?.id) {
    setUserContext(user.id, {
      email: user.email,
      username: user.username || user.name
    })
  }

  try {
    await next()
  } catch (error) {
    // Error will be caught by the global error handler
    // which will log it to Sentry
    throw error
  }
}

