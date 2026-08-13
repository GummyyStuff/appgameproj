import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { getCookie } from 'hono/cookie'
import { UserService } from '../services/user-service'
import { validateSession, SESSION_COOKIE_NAME } from '../config/appwrite'

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
 * CSRF protection middleware
 * Validates X-Requested-With header on mutating requests
 * (Cross-origin form submissions cannot set custom headers)
 */
export async function csrfMiddleware(c: Context, next: Next) {
  const method = c.req.method.toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const xrw = c.req.header('X-Requested-With')
    if (xrw !== 'XMLHttpRequest') {
      throw new HTTPException(403, { message: 'CSRF validation failed' })
    }
  }
  await next()
}

/**
 * Authentication middleware for client-side OAuth
 * Validates user session via Appwrite session cookie, then verifies
 * the user exists in our database. Never trusts X-Appwrite-User-Id alone.
 */
export async function authMiddleware(c: Context, next: Next) {
  let sessionSecret = getCookie(c, SESSION_COOKIE_NAME);
  
  if (!sessionSecret) {
    sessionSecret = getCookie(c, `${SESSION_COOKIE_NAME}_legacy`);
  }

  if (!sessionSecret) {
    throw new HTTPException(401, { message: 'Missing session. Please log in.' })
  }

  // Normalize legacy JSON format
  try {
    const parsed = JSON.parse(sessionSecret);
    if (parsed.secret) {
      sessionSecret = parsed.secret;
    }
  } catch {
    // Not JSON, use as-is
  }

  try {
    // Validate session against Appwrite — this is the source of truth
    const sessionData = await validateSession(sessionSecret);

    if (!sessionData) {
      throw new HTTPException(401, { message: 'Session invalid or expired. Please log in again.' })
    }

    // If header is present, it MUST match the session user — reject mismatch
    const headerUserId = c.req.header('X-Appwrite-User-Id');
    if (headerUserId && headerUserId !== sessionData.id) {
      console.warn('Auth rejected: X-Appwrite-User-Id mismatch', {
        header: headerUserId,
        session: sessionData.id,
        path: c.req.path,
      });
      throw new HTTPException(403, { message: 'User identity verification failed. Please log in again.' })
    }

    // Validate user exists in our database
    const profile = await UserService.getUserProfile(sessionData.id)
    
    if (!profile) {
      throw new HTTPException(401, { message: 'User profile not found. Please log in again.' })
    }

    // Add user to context
    c.set('user', {
      id: sessionData.id,
      email: profile.email || sessionData.email || '',
      name: profile.displayName || profile.username || sessionData.name,
      username: profile.username
    })
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
 * Validates session cookie if present. Never trusts X-Appwrite-User-Id alone.
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const sessionSecret = getCookie(c, SESSION_COOKIE_NAME)

  if (sessionSecret) {
    try {
      const sessionData = await validateSession(sessionSecret)

      if (sessionData) {
        const profile = await UserService.getUserProfile(sessionData.id)
        
        if (profile) {
          c.set('user', {
            id: sessionData.id,
            email: profile.email || sessionData.email || '',
            name: profile.displayName || profile.username || sessionData.name,
            username: profile.username
          })
          c.set('sessionId', sessionSecret)
        }
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
 * Requires proof of identity via Appwrite session or JWT. Never falls back
 * to DB-only validation — a valid database record does not prove auth.
 *
 * Validation strategy:
 * 1. Prefer session cookie validation (same-domain deployments)
 * 2. Fallback to Appwrite JWT validation (cross-domain setups)
 * 3. If neither validates, reject with 401
 * 4. If header X-Appwrite-User-Id is present, it MUST match session user
 *
 * Use for: money operations, balance updates, game bets, profile changes
 */
export async function criticalAuthMiddleware(c: Context, next: Next) {
  // Get user ID from header (never trusted alone)
  const headerUserId = c.req.header('X-Appwrite-User-Id')
  
  // Get session cookie (works in same-domain setups)
  const sessionCookie = getCookie(c, SESSION_COOKIE_NAME)
  
  // Get JWT from Authorization header (works in cross-domain setups)
  const authHeader = c.req.header('Authorization')
  const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
  
  console.log('🔐 Critical Auth Check:', {
    hasHeaderUserId: !!headerUserId,
    hasSessionCookie: !!sessionCookie,
    hasJWT: !!jwtToken,
    path: c.req.path,
    method: c.req.method,
    ip: c.req.header('x-real-ip') || c.req.header('x-forwarded-for') || 'unknown',
  })
  
  try {
    let validatedUser = null
    let validationMethod: 'session' | 'jwt' | null = null
    
    // Try session cookie validation first (preferred for same-domain)
    if (sessionCookie) {
      try {
        validatedUser = await validateSession(sessionCookie)
        validationMethod = 'session'
        console.log('✅ Validated via session cookie')
      } catch (error) {
        console.warn('⚠️ Session cookie validation failed:', error)
      }
    }
    
    // Fallback to JWT validation (for cross-domain setups)
    if (!validatedUser && jwtToken) {
      try {
        validatedUser = await validateSession(jwtToken)
        validationMethod = 'jwt'
        console.log('✅ Validated via JWT token')
      } catch (error) {
        console.warn('⚠️ JWT validation failed:', error)
      }
    }
    
    // REJECT if neither session nor JWT validated — no DB-only fallback
    if (!validatedUser) {
      console.log('❌ Critical Auth Failed: No valid session or JWT')
      throw new HTTPException(401, {
        message: 'Authentication required. Please log in again.'
      })
    }
    
    // If header was sent, it MUST match the validated user
    if (headerUserId && headerUserId !== validatedUser.id) {
      console.log('❌ Critical Auth Failed: User ID mismatch', {
        headerUserId,
        sessionUserId: validatedUser.id
      })
      throw new HTTPException(403, { 
        message: 'User identity verification failed. Please log in again.' 
      })
    }

    // Always validate user exists in our database
    let profile = await UserService.getUserProfile(validatedUser.id)

    // Auto-create profile if it doesn't exist yet
    if (!profile) {
      console.log('⚠️ Profile not found, auto-creating...')
      try {
        profile = await UserService.createUserProfile(validatedUser.id, {
          username: validatedUser.name || validatedUser.email || `user_${validatedUser.id.substring(0, 8)}`,
          displayName: validatedUser.name,
          email: validatedUser.email,
        })
        console.log('✅ Auto-created profile for user:', validatedUser.id)
      } catch (createError) {
        console.error('❌ Failed to auto-create profile:', createError)
      }
    }

    if (!profile) {
      console.log('❌ Critical Auth Failed: Profile not found')
      throw new HTTPException(401, {
        message: 'User profile not found. Please log in again.'
      })
    }

    console.log('✅ Critical Auth Success:', {
      userId: validatedUser.id,
      username: profile.username,
      validationMethod,
      path: c.req.path
    })

    // Add validated user to context
    c.set('user', {
      id: validatedUser.id,
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