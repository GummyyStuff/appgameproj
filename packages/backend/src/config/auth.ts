/**
 * Authentication configuration for Tarkov Casino Website
 * 
 * ⚠️ MIGRATION NOTE: This file has been partially migrated from Supabase to Appwrite
 * - Utility functions (validation, config) are still valid
 * - Functions that depend on Supabase have been deprecated
 * - For authentication, use:
 *   - config/appwrite.ts for Appwrite client setup
 *   - middleware/auth.ts for authentication middleware
 */

// DEPRECATED: Supabase has been replaced with Appwrite
// import { supabaseAdmin } from './supabase'

/**
 * Supabase Auth configuration settings
 * These should be applied via Supabase Dashboard or CLI
 */
export const AUTH_CONFIG = {
  // Site URL for redirects
  SITE_URL: process.env.SITE_URL || 'http://localhost:3000',
  
  // JWT settings
  JWT_EXPIRY: 3600, // 1 hour
  REFRESH_TOKEN_EXPIRY: 604800, // 7 days
  
  // Password requirements
  PASSWORD_MIN_LENGTH: 8,
  
  // Email settings
  ENABLE_EMAIL_CONFIRMATIONS: false, // Set to true in production
  ENABLE_EMAIL_CHANGE_CONFIRMATIONS: true,
  
  // Security settings
  ENABLE_PHONE_CONFIRMATIONS: false,
  ENABLE_PHONE_CHANGE_CONFIRMATIONS: false,
  
  // Session settings
  SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION: true,
  
  // Rate limiting
  RATE_LIMIT_EMAIL_SENT: 60, // seconds between emails
  RATE_LIMIT_SMS_SENT: 60, // seconds between SMS
  
  // OAuth providers (can be enabled later)
  OAUTH_PROVIDERS: {
    google: false,
    github: false,
    discord: false
  }
}

/**
 * User metadata schema for registration
 */
export interface UserRegistrationData {
  username: string
  display_name?: string
}

/**
 * Validate user registration data
 */
export function validateRegistrationData(data: UserRegistrationData): string[] {
  const errors: string[] = []
  
  // Username validation
  if (!data.username) {
    errors.push('Username is required')
  } else if (data.username.length < 3) {
    errors.push('Username must be at least 3 characters long')
  } else if (data.username.length > 50) {
    errors.push('Username must be less than 50 characters')
  } else if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens')
  }
  
  // Display name validation (optional)
  if (data.display_name && data.display_name.length > 100) {
    errors.push('Display name must be less than 100 characters')
  }
  
  return errors
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): string[] {
  const errors: string[] = []
  
  if (!password) {
    errors.push('Password is required')
    return errors
  }
  
  if (password.length < AUTH_CONFIG.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${AUTH_CONFIG.PASSWORD_MIN_LENGTH} characters long`)
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  return errors
}

/**
 * Extract user ID from JWT token
 */
export function extractUserIdFromToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.substring(7)
  
  try {
    // Supabase JWT tokens contain the user ID in the 'sub' claim
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    return payload.sub || null
  } catch (error) {
    console.error('Error extracting user ID from token:', error)
    return null
  }
}


/**
 * Auth middleware configuration for different routes
 */
export const AUTH_ROUTES = {
  // Public routes (no auth required)
  PUBLIC: [
    '/api/health',
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/reset-password'
  ],
  
  // Protected routes (auth required)
  PROTECTED: [
    '/api/user/*',
    '/api/games/*'
  ],
  
  // Admin routes (admin role required)
  ADMIN: [
    '/api/admin/*'
  ]
}

/**
 * Check if route requires authentication
 */
export function requiresAuth(path: string): boolean {
  // Check if it's a public route
  if (AUTH_ROUTES.PUBLIC.some(route => {
    if (route.endsWith('*')) {
      return path.startsWith(route.slice(0, -1))
    }
    return path === route
  })) {
    return false
  }
  
  // Check if it's a protected route
  return AUTH_ROUTES.PROTECTED.some(route => {
    if (route.endsWith('*')) {
      return path.startsWith(route.slice(0, -1))
    }
    return path === route
  })
}

/**
 * Supabase Auth configuration SQL
 * This should be executed in Supabase Dashboard SQL Editor
 */
export const AUTH_CONFIGURATION_SQL = `
-- Configure Supabase Auth settings
-- Execute this in Supabase Dashboard > SQL Editor

-- Update auth configuration
UPDATE auth.config SET
  site_url = '${AUTH_CONFIG.SITE_URL}',
  jwt_exp = ${AUTH_CONFIG.JWT_EXPIRY},
  refresh_token_rotation_enabled = true,
  security_update_password_require_reauthentication = ${AUTH_CONFIG.SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION};

-- Set password requirements (if supported)
-- Note: Some settings may need to be configured via Supabase Dashboard

-- Enable email templates customization
-- This would typically be done via Supabase Dashboard > Authentication > Email Templates
`