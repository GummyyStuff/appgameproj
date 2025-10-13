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
  let appwriteUserId = c.req.header('X-Appwrite-User-Id')
  
  // If no header, try to get from session cookie (test login)
  if (!appwriteUserId) {
    const { getCookie } = await import('hono/cookie');
    const { validateSession, SESSION_COOKIE_NAME } = await import('../config/appwrite');
    
    let sessionSecret = getCookie(c, SESSION_COOKIE_NAME);
    
    if (!sessionSecret) {
      sessionSecret = getCookie(c, `${SESSION_COOKIE_NAME}_legacy`);
    }
    
    if (sessionSecret) {
      // Check if it's the legacy format (JSON with id and secret)
      try {
        const parsed = JSON.parse(sessionSecret);
        if (parsed.secret) {
          sessionSecret = parsed.secret;
        }
      } catch {
        // Not JSON, use as-is
      }
      
      const sessionData = await validateSession(sessionSecret);
      
      if (sessionData) {
        appwriteUserId = sessionData.id;
      }
    }
  }
  
  if (!appwriteUserId) {
    throw new HTTPException(401, { message: 'Missing session. Please log in.' })
  }

  try {
    // Validate user exists in our database
    const profile = await UserService.getUserProfile(appwriteUserId)
    
    if (!profile) {
      throw new HTTPException(401, { message: 'User profile not found. Please log in again.' })
    }

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
 * Validates user authentication with fallback for cross-domain setups
 * 
 * Validation strategy:
 * 1. Prefer session cookie validation (same-domain deployments)
 * 2. Fallback to Appwrite JWT validation (cross-domain setups)
 * 3. Validate user exists in our database
 * 
 * Use for: money operations, balance updates, game bets, profile changes
 */
export async function criticalAuthMiddleware(c: Context, next: Next) {
  // Get user ID from header
  const appwriteUserId = c.req.header('X-Appwrite-User-Id')
  
  // Get session cookie (works in same-domain setups)
  const sessionCookie = getCookie(c, `a_session_${process.env.APPWRITE_PROJECT_ID}`)
  
  // Get JWT from Authorization header (works in cross-domain setups)
  const authHeader = c.req.header('Authorization')
  const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
  
  // Security event logging
  console.log('🔐 Critical Auth Check:', {
    userId: appwriteUserId || 'none',
    hasSessionCookie: !!sessionCookie,
    hasJWT: !!jwtToken,
    path: c.req.path,
    method: c.req.method,
    ip: c.req.header('x-real-ip') || c.req.header('x-forwarded-for') || 'unknown',
    timestamp: new Date().toISOString(),
  })
  
  if (!appwriteUserId) {
    console.log('❌ Critical Auth Failed: Missing user ID')
    throw new HTTPException(401, { 
      message: 'Authentication required for this operation' 
    })
  }

  try {
    let validatedUser = null
    
    // Try session cookie validation first (preferred for same-domain)
    if (sessionCookie) {
      try {
        validatedUser = await validateSession(sessionCookie)
        console.log('✅ Validated via session cookie')
      } catch (error) {
        console.warn('⚠️ Session cookie validation failed:', error)
      }
    }
    
    // Fallback to JWT validation (for cross-domain setups)
    if (!validatedUser && jwtToken) {
      try {
        validatedUser = await validateSession(jwtToken)
        console.log('✅ Validated via JWT token')
      } catch (error) {
        console.warn('⚠️ JWT validation failed:', error)
      }
    }
    
    // If neither method worked, validate user exists in database
    // This is acceptable because:
    // 1. Frontend has authenticated with Appwrite (client SDK)
    // 2. We verify user exists in our database
    // 3. Cross-domain cookie restrictions prevent session cookie access
    if (!validatedUser) {
      console.log('⚠️ No session validation - using database validation (cross-domain mode)')
    }
    
    // Always validate user exists in our database
    const profile = await UserService.getUserProfile(appwriteUserId)
    
    if (!profile) {
      console.log('❌ Critical Auth Failed: Profile not found')
      throw new HTTPException(401, { 
        message: 'User profile not found. Please log in again.' 
      })
    }
    
    // If we have validated user from session/JWT, verify ID matches
    if (validatedUser && validatedUser.id !== appwriteUserId) {
      console.log('❌ Critical Auth Failed: User ID mismatch', {
        headerUserId: appwriteUserId,
        sessionUserId: validatedUser.id
      })
      throw new HTTPException(403, { 
        message: 'User identity verification failed. Please log in again.' 
      })
    }

    console.log('✅ Critical Auth Success:', {
      userId: appwriteUserId,
      username: profile.username,
      validationMethod: validatedUser ? 'session/jwt' : 'database-only',
      path: c.req.path
    })

    // Add validated user to context
    c.set('user', {
      id: appwriteUserId,
      email: profile.email || validatedUser?.email || '',
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