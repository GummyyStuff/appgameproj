import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { getCookie } from 'hono/cookie'
import { validateSession, SESSION_COOKIE_NAME } from '../config/appwrite'
import { supabaseAdmin } from '../config/supabase'

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
  
  if (!sessionId) {
    throw new HTTPException(401, { message: 'Missing session. Please log in.' })
  }

  try {
    // Validate the session with Appwrite
    const user = await validateSession(sessionId)
    
    if (!user) {
      throw new HTTPException(401, { message: 'Invalid or expired session' })
    }

    // Get additional user profile data from database if needed
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user profile:', profileError)
    }

    // Add user to context
    c.set('user', {
      id: user.id,
      email: user.email || '',
      name: user.name,
      username: profile?.username
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
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('username')
          .eq('id', user.id)
          .single()

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