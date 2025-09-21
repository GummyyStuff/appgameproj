#!/usr/bin/env bun

import { readFileSync } from 'fs'

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://192.168.0.69:8001'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

async function executeSQL(sql: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify({ sql })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SQL execution failed: ${response.status} ${error}`)
  }
  
  return response.json()
}

async function checkIfFunctionExists() {
  console.log('🔍 Checking if get_user_statistics function exists...')
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_user_statistics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ user_uuid: '00000000-0000-0000-0000-000000000000' })
    })
    
    if (response.status === 404) {
      console.log('❌ Function does not exist')
      return false
    } else {
      console.log('✅ Function exists (got status:', response.status, ')')
      return true
    }
  } catch (error) {
    console.log('❌ Function does not exist or error occurred:', error)
    return false
  }
}

async function testWithRealUser() {
  console.log('🧪 Testing get_user_statistics with real user...')
  
  try {
    // First get a real user
    const usersResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?select=id&limit=1`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    })
    
    if (!usersResponse.ok) {
      console.error('❌ Failed to get users:', await usersResponse.text())
      return false
    }
    
    const users = await usersResponse.json()
    if (!users || users.length === 0) {
      console.log('⚠️  No users found to test with')
      return true
    }
    
    const testUserId = users[0].id
    console.log(`🔍 Testing with user ID: ${testUserId}`)
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_user_statistics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ user_uuid: testUserId })
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Function test failed:', response.status, error)
      return false
    }
    
    const data = await response.json()
    console.log('✅ Function test successful:', data)
    return true
  } catch (error) {
    console.error('❌ Error testing function:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Checking get_user_statistics RPC function...')
  
  const exists = await checkIfFunctionExists()
  
  if (exists) {
    console.log('✅ Function exists, testing with real user...')
    await testWithRealUser()
  } else {
    console.log('❌ Function does not exist. You need to run the database migrations.')
    console.log('💡 Try running: bun run db:setup')
    console.log('💡 Or manually execute the SQL from: packages/backend/src/database/migrations/002_rpc_functions_v2.sql')
  }
}

main().catch(console.error)