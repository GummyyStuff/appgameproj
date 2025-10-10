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
  const sessionId = getCookie(c, SESSION_COOKIE_NAME)
  const userId = getCookie(c, 'appwrite-user-id')
  
  if (!sessionId) {
    throw new HTTPException(401, { message: 'Missing session. Please log in.' })
  }

  try {
    console.log('🔍 Checking user session...');
    console.log('📱 Found Appwrite client user ID:', userId);
    
    // Validate the session with Appwrite
    const user = await validateSession(sessionId, userId)
    
    if (!user) {
      console.log('❌ No session found');
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

    // Store session ID in context
    c.set('sessionId', sessionId)

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
  const sessionId = getCookie(c, SESSION_COOKIE_NAME)
  
  if (sessionId) {
    try {
      const user = await validateSession(sessionId)
      
      if (user) {
        const profile = await UserService.getUserProfile(user.id)

        c.set('user', {
          id: user.id,
          email: user.email || '',
          name: user.name,
          username: profile?.username
        })
        
        c.set('sessionId', sessionId)
      }
    } catch (error) {
      // Silently fail for optional auth
      console.warn('Optional auth failed:', error)
    }
  }

  await next()
}