import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { supabaseAdmin } from '../config/supabase'
import { asyncHandler } from '../middleware/error'
import { logSecurityEvent } from '../middleware/logger'
import { env } from '../config/env'
import { authRateLimit, sensitiveRateLimit } from '../middleware/rate-limit'
import { validationMiddleware, commonSchemas } from '../middleware/validation'
import { auditAuth, auditLog } from '../middleware/audit'

export const authRoutes = new Hono()

// Enhanced validation schemas with security
const registerSchema = z.object({
  email: commonSchemas.email,
  password: commonSchemas.password,
  username: commonSchemas.username
})

const loginSchema = z.object({
  email: commonSchemas.email,
  password: z.string().min(1, 'Password is required').max(128)
})

const resetPasswordSchema = z.object({
  email: commonSchemas.email
})

// Register new user
authRoutes.post('/register', 
  authRateLimit,
  validationMiddleware(registerSchema),
  auditAuth('user_register'),
  asyncHandler(async (c) => {
  const { email, password, username } = c.get('validatedData')
  
  const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')

  try {
    // Check if username is already taken
    const { data: existingUser } = await supabaseAdmin
      .from('user_profiles')
      .select('username')
      .eq('username', username)
      .single()

    if (existingUser) {
      throw new HTTPException(400, { message: 'Username already taken' })
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for development
      user_metadata: {
        username
      }
    })

    if (authError) {
      logSecurityEvent('registration_failed', undefined, ip, { email, error: authError.message })
      throw new HTTPException(400, { message: authError.message })
    }

    if (!authData.user) {
      throw new HTTPException(500, { message: 'Failed to create user' })
    }

    // Create user profile with starting balance
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        username,
        balance: parseInt(env.STARTING_BALANCE),
        created_at: new Date().toISOString()
      })

    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new HTTPException(500, { message: 'Failed to create user profile' })
    }

    logSecurityEvent('user_registered', authData.user.id, ip, { email, username })
    await auditLog.userRegistered(authData.user.id, email, ip)

    return c.json({
      message: 'User registered successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        username
      }
    }, 201)

  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Registration error:', error)
    throw new HTTPException(500, { message: 'Registration failed' })
  }
}))

// Login user
authRoutes.post('/login',
  authRateLimit,
  validationMiddleware(loginSchema),
  auditAuth('user_login'),
  asyncHandler(async (c) => {
  const { email, password } = c.get('validatedData')
  
  const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')

  try {
    // Sign in with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    })

    if (error || !data.user) {
      logSecurityEvent('login_failed', undefined, ip, { email, error: error?.message })
      throw new HTTPException(401, { message: 'Invalid credentials' })
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('username, balance')
      .eq('id', data.user.id)
      .single()

    logSecurityEvent('user_logged_in', data.user.id, ip, { email })
    await auditLog.userLoggedIn(data.user.id, email, ip)

    return c.json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        username: profile?.username,
        balance: profile?.balance || 0
      },
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_at: data.session?.expires_at
      }
    })

  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Login error:', error)
    throw new HTTPException(500, { message: 'Login failed' })
  }
}))

// Logout user
authRoutes.post('/logout', 
  auditAuth('user_logout'),
  asyncHandler(async (c) => {
  const authHeader = c.req.header('Authorization')
  const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    
    try {
      // Get user info before logout
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      
      // Sign out the user
      await supabaseAdmin.auth.admin.signOut(token)
      
      if (user) {
        logSecurityEvent('user_logged_out', user.id, ip)
        await auditLog.userLoggedOut(user.id, ip)
      }
    } catch (error) {
      console.warn('Logout error:', error)
    }
  }

  return c.json({ message: 'Logout successful' })
}))

// Reset password
authRoutes.post('/reset-password',
  sensitiveRateLimit,
  validationMiddleware(resetPasswordSchema),
  auditAuth('password_reset_request'),
  asyncHandler(async (c) => {
  const { email } = c.get('validatedData')
  
  const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')

  try {
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${c.req.header('Origin')}/reset-password`
    })

    if (error) {
      throw new HTTPException(400, { message: error.message })
    }

    logSecurityEvent('password_reset_requested', undefined, ip, { email })

    return c.json({ message: 'Password reset email sent' })

  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Password reset error:', error)
    throw new HTTPException(500, { message: 'Password reset failed' })
  }
}))

// Refresh token
authRoutes.post('/refresh', asyncHandler(async (c) => {
  const body = await c.req.json()
  const { refresh_token } = z.object({
    refresh_token: z.string()
  }).parse(body)

  try {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token
    })

    if (error || !data.session) {
      throw new HTTPException(401, { message: 'Invalid refresh token' })
    }

    return c.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    })

  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Token refresh error:', error)
    throw new HTTPException(500, { message: 'Token refresh failed' })
  }
}))