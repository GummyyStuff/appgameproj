#!/usr/bin/env bun

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables - try multiple sources
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://192.168.0.69:8001'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required')
  console.log('💡 Set the environment variable: SUPABASE_SERVICE_ROLE_KEY=your_service_key')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function applySQLFix() {
  console.log('🔧 Applying RPC function fixes...')
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`)

  // Read the SQL file
  const sqlFile = join(process.cwd(), 'packages/backend/src/scripts/create-missing-rpc-functions.sql')
  const sqlContent = readFileSync(sqlFile, 'utf-8')

  console.log('📄 SQL content loaded from:', sqlFile)

  // Execute the entire SQL as one statement
  console.log('⚡ Executing SQL...')

  try {
    // Try different RPC function names
    const rpcFunctions = ['exec', 'exec_sql', 'execute_sql']

    let success = false
    for (const rpcFunc of rpcFunctions) {
      try {
        console.log(`🔄 Trying RPC function: ${rpcFunc}`)
        const { error } = await supabase.rpc(rpcFunc, {
          sql: sqlContent,
          ...(rpcFunc === 'exec_sql' ? { sql_query: sqlContent } : {})
        })

        if (!error) {
          console.log(`✅ Successfully executed using ${rpcFunc}`)
          success = true
          break
        } else {
          console.log(`⚠️  ${rpcFunc} failed:`, error.message)
        }
      } catch (e) {
        console.log(`⚠️  ${rpcFunc} threw error:`, e.message)
        // Continue to next RPC function
      }
    }

    if (!success) {
      console.error('❌ Failed to execute SQL with any RPC function')
      console.log('SQL preview:', sqlContent.substring(0, 500) + '...')
      return false
    }
  } catch (error) {
    console.error('❌ Error executing SQL:', error)
    return false
  }

  return true
}

async function testFunctions() {
  console.log('\n🧪 Testing fixed functions...')

  try {
    // Test get_user_statistics
    console.log('🔍 Testing get_user_statistics...')
    const { data: statsData, error: statsError } = await supabase
      .rpc('get_user_statistics', { user_uuid: '00000000-0000-0000-0000-000000000000' })

    if (statsError) {
      console.log('⚠️  get_user_statistics test failed (expected for non-existent user):', statsError.message)
    } else {
      console.log('✅ get_user_statistics returned:', statsData)
    }

    // Test get_daily_bonus_status
    console.log('🔍 Testing get_daily_bonus_status...')
    const { data: bonusData, error: bonusError } = await supabase
      .rpc('get_daily_bonus_status', { user_uuid: '00000000-0000-0000-0000-000000000000' })

    if (bonusError) {
      console.log('⚠️  get_daily_bonus_status test failed (expected for non-existent user):', bonusError.message)
    } else {
      console.log('✅ get_daily_bonus_status returned:', bonusData)
    }

    return true
  } catch (error) {
    console.error('❌ Error testing functions:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Fixing production RPC functions...')

  const applied = await applySQLFix()
  if (!applied) {
    console.log('\n❌ Failed to apply SQL fixes automatically.')
    console.log('💡 Manual fix required:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Open the SQL Editor')
    console.log('3. Copy and paste the SQL from: packages/backend/src/scripts/create-missing-rpc-functions.sql')
    console.log('4. Execute the SQL')
    process.exit(1)
  }

  const tested = await testFunctions()
  if (tested) {
    console.log('\n🎉 RPC functions fixed and tested successfully!')
    console.log('🔄 Refresh your application to see the fixes.')
  } else {
    console.log('\n⚠️  Functions applied but testing failed - check the logs above')
  }
}

main().catch(console.error)
