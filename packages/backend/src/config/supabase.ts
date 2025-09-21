import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

// Server-side client with service role key for admin operations
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
)

// Client-side compatible configuration for frontend
export const supabaseConfig = {
  url: env.SUPABASE_URL,
  anonKey: env.SUPABASE_ANON_KEY,
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('count')
      .limit(1)

    if (error) {
      console.error('Database connection test failed:', error.message)
      return false
    }

    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('Database connection test error:', error)
    return false
  }
}

/**
 * Health check for Supabase services
 */
export async function getSupabaseHealth() {
  try {
    const startTime = Date.now()
    
    // Test database connection
    const { error: dbError } = await supabaseAdmin
      .from('user_profiles')
      .select('count')
      .limit(1)

    const dbLatency = Date.now() - startTime

    // Test auth service
    const authStartTime = Date.now()
    const { error: authError } = await supabaseAdmin.auth.getSession()
    const authLatency = Date.now() - authStartTime

    return {
      database: {
        status: dbError ? 'error' : 'healthy',
        latency: dbLatency,
        error: dbError?.message
      },
      auth: {
        status: authError ? 'error' : 'healthy',
        latency: authLatency,
        error: authError?.message
      },
      overall: !dbError && !authError ? 'healthy' : 'degraded'
    }
  } catch (error) {
    return {
      database: { status: 'error', latency: -1, error: 'Connection failed' },
      auth: { status: 'error', latency: -1, error: 'Connection failed' },
      overall: 'error'
    }
  }
}

export default supabaseAdmin