import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { getCookie } from 'hono/cookie'
import { validateSession, SESSION_COOKIE_NAME } from '../config/appwrite'
import { UserService } from '../services/user-service'

export interface AuthUser {
  id: string
  email: string
  username?: string
  name?: string
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
    validatedData: any
    sessionId: string
    sessionManager: any
    ipSecurityManager: any
  }
}

/**
 * Authentication middleware that validates Appwrite sessions
 * Extracts user information from session cookie and adds it to the context
 */
export async function authMiddleware(c: Context, next: Next) {
  const sessionSecret = getCookie(c, SESSION_COOKIE_NAME)
  
  if (!sessionSecret) {
    throw new HTTPException(401, { message: 'Missing session. Please log in.' })
  }

  try {
    console.log('🔍 Validating session...');
    
    // Validate the session with Appwrite (using session secret)
    const user = await validateSession(sessionSecret)
    
    if (!user) {
      console.log('❌ Invalid session');
      throw new HTTPException(401, { message: 'Invalid or expired session' })
    }

    console.log('✅ Session validated for user:', user.id);

    // Get additional user profile data from Appwrite database if needed
    const profile = await UserService.getUserProfile(user.id)
    
    if (!profile) {
      console.log('📝 No profile found, creating new user profile...');
      // Create profile on first login
      await UserService.createUserProfile(user.id, {
        username: user.name || user.email.split('@')[0],
        displayName: user.name,
        email: user.email
      });
    }

    // Add user to context
    c.set('user', {
      id: user.id,
      email: user.email || '',
      name: user.name,
      username: profile?.username || user.name
    })

    // Store session secret in context
    c.set('sessionId', sessionSecret)

    await next()
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    
    console.error('Auth middleware error:', error)
    throw new HTTPException(401, { message: 'Authentication failed' })
  }
}

/**
 * Optional authentication middleware - doesn't throw if no session provided
 * Useful for endpoints that work with or without authentication
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const sessionSecret = getCookie(c, SESSION_COOKIE_NAME)
  
  if (sessionSecret) {
    try {
      const user = await validateSession(sessionSecret)
      
      if (user) {
        const profile = await UserService.getUserProfile(user.id)

        c.set('user', {
          id: user.id,
          email: user.email || '',
          name: user.name,
          username: profile?.username
        })
        
        c.set('sessionId', sessionSecret)
      }
    } catch (error) {
      // Silently fail for optional auth
      console.warn('Optional auth failed:', error)
    }
  }

  await next()
}