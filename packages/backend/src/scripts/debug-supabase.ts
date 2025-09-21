/**
 * Debug Supabase connection issues
 * Helps identify JWT signature problems
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://192.168.0.69:8001'

async function debugSupabase() {
  console.log('🔍 Debugging Supabase Connection Issues')
  console.log('=======================================')
  console.log('')

  // Test different endpoints to understand what's working
  const endpoints = [
    { name: 'Root', url: `${SUPABASE_URL}` },
    { name: 'Health', url: `${SUPABASE_URL}/health` },
    { name: 'Auth Settings', url: `${SUPABASE_URL}/auth/v1/settings` },
    { name: 'REST API Root', url: `${SUPABASE_URL}/rest/v1/` },
    { name: 'Storage', url: `${SUPABASE_URL}/storage/v1/` },
  ]

  for (const endpoint of endpoints) {
    console.log(`🔍 Testing ${endpoint.name}: ${endpoint.url}`)
    
    try {
      const response = await fetch(endpoint.url, {
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY || '',
        }
      })
      
      console.log(`   Status: ${response.status} ${response.statusText}`)
      
      if (response.status === 200) {
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          try {
            const data = await response.json()
            console.log(`   Response: ${JSON.stringify(data).substring(0, 100)}...`)
          } catch {
            console.log('   Response: JSON parse failed')
          }
        }
      } else if (response.status === 401) {
        const errorText = await response.text()
        console.log(`   Error: ${errorText.substring(0, 100)}`)
      }
      
    } catch (error) {
      console.log(`   Error: ${error.message}`)
    }
    
    console.log('')
  }

  // Check if this might be a local Supabase instance
  console.log('🔍 Checking if this is a local Supabase instance...')
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'OPTIONS'
    })
    
    const corsHeaders = response.headers.get('access-control-allow-origin')
    console.log(`CORS headers: ${corsHeaders}`)
    
    if (corsHeaders === '*' || corsHeaders?.includes('localhost')) {
      console.log('✅ This appears to be a local development instance')
      console.log('')
      console.log('💡 For local Supabase instances, try:')
      console.log('1. Check if you started Supabase with: supabase start')
      console.log('2. Get fresh keys with: supabase status')
      console.log('3. The keys should match your local instance')
    }
    
  } catch (error) {
    console.log('Could not determine instance type')
  }

  console.log('')
  console.log('🎯 Possible Solutions:')
  console.log('1. If this is a local Supabase: run "supabase status" to get correct keys')
  console.log('2. If this is a hosted Supabase: verify you copied keys from the right project')
  console.log('3. Try restarting your Supabase instance')
  console.log('4. Check if the JWT_SECRET environment variable matches')
}

debugSupabase().catch(console.error)