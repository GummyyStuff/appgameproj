import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { supabaseAdmin } from '../config/supabase'

export interface AuthUser {
  id: string
  email: string
  username?: string
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
 * Authentication middleware that validates Supabase JWT tokens
 * Extracts user information and adds it to the context
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing or invalid authorization header' })
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix

  try {
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !user) {
      throw new HTTPException(401, { message: 'Invalid or expired token' })
    }

    // Get additional user profile data
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
      username: profile?.username
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
 * Optional authentication middleware - doesn't throw if no token provided
 * Useful for endpoints that work with or without authentication
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      
      if (!error && user) {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('username')
          .eq('id', user.id)
          .single()

        c.set('user', {
          id: user.id,
          email: user.email || '',
          username: profile?.username
        })
      }
    } catch (error) {
      // Silently fail for optional auth
      console.warn('Optional auth failed:', error)
    }
  }

  await next()
}