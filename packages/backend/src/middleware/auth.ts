import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
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