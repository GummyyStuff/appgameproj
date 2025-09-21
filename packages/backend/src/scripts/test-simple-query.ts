/**
 * Test simple database queries
 * Try different authentication approaches
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://192.168.0.69:8001'

async function testSimpleQuery() {
  console.log('🧪 Testing Simple Database Queries')
  console.log('==================================')
  console.log('')

  // Test 1: Try without authentication
  console.log('🔍 Test 1: Query without authentication...')
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/information_schema.tables?select=table_name&limit=1`)
    console.log(`Status: ${response.status}`)
    if (response.ok) {
      const data = await response.json()
      console.log('✅ No auth query worked:', data)
    } else {
      const error = await response.text()
      console.log('❌ No auth failed:', error.substring(0, 100))
    }
  } catch (error) {
    console.log('❌ No auth error:', error.message)
  }

  console.log('')

  // Test 2: Try with anon key in header only
  console.log('🔍 Test 2: Query with anon key in apikey header...')
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/information_schema.tables?select=table_name&limit=1`, {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY || ''
      }
    })
    console.log(`Status: ${response.status}`)
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Apikey header query worked:', data)
    } else {
      const error = await response.text()
      console.log('❌ Apikey header failed:', error.substring(0, 100))
    }
  } catch (error) {
    console.log('❌ Apikey header error:', error.message)
  }

  console.log('')

  // Test 3: Try with service role key
  console.log('🔍 Test 3: Query with service role key...')
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/information_schema.tables?select=table_name&limit=1`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`
      }
    })
    console.log(`Status: ${response.status}`)
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Service role query worked:', data)
    } else {
      const error = await response.text()
      console.log('❌ Service role failed:', error.substring(0, 100))
    }
  } catch (error) {
    console.log('❌ Service role error:', error.message)
  }

  console.log('')

  // Test 4: Try to create a simple table to test permissions
  console.log('🔍 Test 4: Try to create a test table...')
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS test_connection (
        id SERIAL PRIMARY KEY,
        message TEXT DEFAULT 'Hello from Tarkov Casino!'
      );
    `
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql: createTableSQL })
    })
    
    console.log(`Status: ${response.status}`)
    if (response.ok) {
      console.log('✅ Table creation worked')
    } else {
      const error = await response.text()
      console.log('❌ Table creation failed:', error.substring(0, 200))
    }
  } catch (error) {
    console.log('❌ Table creation error:', error.message)
  }

  console.log('')
  console.log('🎯 Summary:')
  console.log('If any test worked, we can proceed with database setup!')
}

testSimpleQuery().catch(console.error)