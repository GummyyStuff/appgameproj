import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://192.168.0.69:8001'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'test-key'

// Only throw error in production, not in test environment
if ((!supabaseUrl || !supabaseAnonKey) && import.meta.env.NODE_ENV === 'production') {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

export default supabase