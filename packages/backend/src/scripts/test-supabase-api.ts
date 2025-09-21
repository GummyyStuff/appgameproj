/**
 * Simple Supabase API test
 * Tests basic API endpoints without authentication
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://192.168.0.69:8001'

async function testSupabaseAPI() {
  console.log('🧪 Testing Supabase API Endpoints')
  console.log('=================================')
  console.log('')
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`)
  console.log('')

  // Test 1: Health check
  console.log('🔍 Testing health endpoint...')
  try {
    const healthResponse = await fetch(`${SUPABASE_URL}/health`)
    if (healthResponse.ok) {
      console.log('✅ Health endpoint accessible')
    } else {
      console.log(`⚠️  Health endpoint returned: ${healthResponse.status}`)
    }
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message)
  }

  // Test 2: REST API endpoint
  console.log('🔍 Testing REST API endpoint...')
  try {
    const restResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || ''}`
      }
    })
    
    if (restResponse.ok) {
      console.log('✅ REST API endpoint accessible')
    } else {
      console.log(`⚠️  REST API returned: ${restResponse.status} - ${restResponse.statusText}`)
      const text = await restResponse.text()
      console.log('Response:', text.substring(0, 200))
    }
  } catch (error) {
    console.log('❌ REST API failed:', error.message)
  }

  // Test 3: Auth endpoint
  console.log('🔍 Testing Auth endpoint...')
  try {
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || ''}`
      }
    })
    
    if (authResponse.ok) {
      console.log('✅ Auth endpoint accessible')
      const settings = await authResponse.json()
      console.log('Auth settings:', JSON.stringify(settings, null, 2))
    } else {
      console.log(`⚠️  Auth endpoint returned: ${authResponse.status}`)
    }
  } catch (error) {
    console.log('❌ Auth endpoint failed:', error.message)
  }

  // Test 4: Check if we can list tables (with service role)
  console.log('🔍 Testing database access with service role...')
  try {
    const tablesResponse = await fetch(`${SUPABASE_URL}/rest/v1/information_schema.tables?select=table_name&table_schema=eq.public`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (tablesResponse.ok) {
      console.log('✅ Database access with service role works')
      const tables = await tablesResponse.json()
      console.log(`Found ${tables.length} tables in public schema`)
      if (tables.length > 0) {
        console.log('Tables:', tables.map(t => t.table_name).join(', '))
      }
    } else {
      console.log(`❌ Database access failed: ${tablesResponse.status} - ${tablesResponse.statusText}`)
      const errorText = await tablesResponse.text()
      console.log('Error response:', errorText.substring(0, 300))
    }
  } catch (error) {
    console.log('❌ Database access failed:', error.message)
  }

  console.log('')
  console.log('🎯 Summary:')
  console.log('If all tests pass, your Supabase connection is working!')
  console.log('If some fail, check your Supabase configuration and keys.')
}

// Run the test
testSupabaseAPI().catch(console.error)