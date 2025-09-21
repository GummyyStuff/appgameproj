/**
 * Test PostgreSQL schema queries
 * Try different schema approaches
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://192.168.0.69:8001'

async function testPostgresSchema() {
  console.log('🧪 Testing PostgreSQL Schema Access')
  console.log('===================================')
  console.log('')

  const queries = [
    {
      name: 'List all schemas',
      query: 'pg_namespace?select=nspname'
    },
    {
      name: 'List tables in public schema',
      query: 'pg_tables?select=tablename&schemaname=eq.public'
    },
    {
      name: 'List all tables',
      query: 'pg_tables?select=tablename,schemaname'
    },
    {
      name: 'Check if auth schema exists',
      query: 'pg_namespace?select=nspname&nspname=eq.auth'
    }
  ]

  for (const { name, query } of queries) {
    console.log(`🔍 ${name}...`)
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY || '',
          'Content-Type': 'application/json'
        }
      })
      
      console.log(`   Status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`   ✅ Success: Found ${data.length} results`)
        if (data.length > 0 && data.length <= 5) {
          console.log(`   Data: ${JSON.stringify(data, null, 2)}`)
        } else if (data.length > 5) {
          console.log(`   Sample: ${JSON.stringify(data.slice(0, 3), null, 2)}...`)
        }
      } else {
        const error = await response.text()
        console.log(`   ❌ Failed: ${error.substring(0, 100)}`)
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
    }
    
    console.log('')
  }

  // Try to access a simple endpoint that should work
  console.log('🔍 Testing basic REST API functionality...')
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY || ''
      }
    })
    
    console.log(`Status: ${response.status}`)
    if (response.ok) {
      const data = await response.text()
      console.log('✅ REST API root accessible')
      console.log(`Response: ${data.substring(0, 200)}`)
    }
  } catch (error) {
    console.log('❌ REST API error:', error.message)
  }
}

testPostgresSchema().catch(console.error)