import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = []
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL')
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY')
  
  console.error('Supabase configuration error:', {
    supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
    supabaseAnonKey: supabaseAnonKey ? 'SET' : 'MISSING',
    env: import.meta.env.MODE
  })
  
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
}

// Validate HTTPS in production
if (import.meta.env.PROD && !supabaseUrl.startsWith('https://')) {
  throw new Error('VITE_SUPABASE_URL must use HTTPS in production')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Additional security settings for production
    ...(import.meta.env.PROD && {
      flowType: 'pkce',
      storage: window.localStorage,
    })
  },
  // Global configuration
  global: {
    headers: {
      'X-Client-Info': 'tarkov-casino-frontend',
    },
  },
})

// Debug: Log auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state change:', { event, session: session ? 'authenticated' : 'not authenticated' });
});

export default supabase