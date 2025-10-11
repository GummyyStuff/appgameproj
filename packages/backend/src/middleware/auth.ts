import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { getCookie } from 'hono/cookie'
import { UserService } from '../services/user-service'
import { validateSession } from '../config/appwrite'

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
 * Authentication middleware for client-side OAuth
 * Validates that user is authenticated via Appwrite client SDK
 * and exists in our database
 */
export async function authMiddleware(c: Context, next: Next) {
  // Get Appwrite user ID from header (sent by frontend after Appwrite session check)
  const appwriteUserId = c.req.header('X-Appwrite-User-Id')
  
  if (!appwriteUserId) {
    console.log('🔍 Auth Debug: Missing X-Appwrite-User-Id header', {
      headers: Object.fromEntries(
        Object.entries(c.req.header()).filter(([k]) => k.toLowerCase().includes('auth') || k.toLowerCase().includes('appwrite'))
      ),
      origin: c.req.header('Origin'),
      path: c.req.path
    })
    throw new HTTPException(401, { message: 'Missing session. Please log in.' })
  }

  try {
    console.log('🔍 Validating user:', appwriteUserId);
    
    // Validate user exists in our database
    const profile = await UserService.getUserProfile(appwriteUserId)
    
    if (!profile) {
      console.log('❌ User profile not found');
      throw new HTTPException(401, { message: 'User profile not found. Please log in again.' })
    }

    console.log('✅ User validated:', profile.username);

    // Add user to context
    c.set('user', {
      id: appwriteUserId,
      email: profile.email || '',
      name: profile.displayName || profile.username,
      username: profile.username
    })

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
  // Get Appwrite user ID from header (sent by frontend after Appwrite session check)
  const appwriteUserId = c.req.header('X-Appwrite-User-Id')
  
  if (appwriteUserId) {
    try {
      const profile = await UserService.getUserProfile(appwriteUserId)
      
      if (profile) {
        c.set('user', {
          id: appwriteUserId,
          email: profile.email || '',
          name: profile.displayName || profile.username,
          username: profile.username
        })
      }
    } catch (error) {
      // Silently fail for optional auth
      console.warn('Optional auth failed:', error)
    }
  }

  await next()
}

/**
 * Critical authentication middleware for sensitive operations
 * Validates both the user header AND the Appwrite session cookie
 * Use for: money operations, balance updates, game bets, profile changes
 */
export async function criticalAuthMiddleware(c: Context, next: Next) {
  // Get user ID from header
  const appwriteUserId = c.req.header('X-Appwrite-User-Id')
  
  // Get session cookie
  const sessionCookie = getCookie(c, `a_session_${process.env.APPWRITE_PROJECT_ID}`)
  
  // Security event logging
  console.log('🔐 Critical Auth Check:', {
    userId: appwriteUserId || 'none',
    hasSessionCookie: !!sessionCookie,
    path: c.req.path,
    method: c.req.method,
    ip: c.req.header('x-real-ip') || c.req.header('x-forwarded-for') || 'unknown',
    timestamp: new Date().toISOString(),
  })
  
  if (!appwriteUserId || !sessionCookie) {
    console.log('❌ Critical Auth Failed: Missing credentials')
    throw new HTTPException(401, { 
      message: 'Authentication required for this operation' 
    })
  }

  try {
    // Validate session with Appwrite
    const validatedUser = await validateSession(sessionCookie)
    
    if (!validatedUser) {
      console.log('❌ Critical Auth Failed: Invalid session')
      throw new HTTPException(401, { message: 'Invalid or expired session' })
    }
    
    // Verify user ID matches
    if (validatedUser.id !== appwriteUserId) {
      console.log('❌ Critical Auth Failed: User ID mismatch', {
        headerUserId: appwriteUserId,
        sessionUserId: validatedUser.id
      })
      throw new HTTPException(403, { 
        message: 'User identity verification failed. Please log in again.' 
      })
    }
    
    // Validate user exists in our database
    const profile = await UserService.getUserProfile(appwriteUserId)
    
    if (!profile) {
      console.log('❌ Critical Auth Failed: Profile not found')
      throw new HTTPException(401, { 
        message: 'User profile not found. Please log in again.' 
      })
    }

    console.log('✅ Critical Auth Success:', {
      userId: appwriteUserId,
      username: profile.username,
      path: c.req.path
    })

    // Add validated user to context
    c.set('user', {
      id: appwriteUserId,
      email: profile.email || validatedUser.email || '',
      name: profile.displayName || profile.username,
      username: profile.username
    })

    await next()
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    
    console.error('❌ Critical Auth Error:', error)
    throw new HTTPException(401, { message: 'Authentication verification failed' })
  }
}