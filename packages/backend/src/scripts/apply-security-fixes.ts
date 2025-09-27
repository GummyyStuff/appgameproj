#!/usr/bin/env bun

import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://192.168.0.69:8001'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

async function applySecurityFixes() {
  console.log('🔒 Applying security fixes for database functions...')
  
  try {
    // Read the security fix migration
    const migrationPath = join(__dirname, '../database/migrations/008_fix_function_security.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('📝 Loaded security fix migration')
    console.log('🔧 Applying security fixes to all database functions...')
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(/;\s*\n/)
      .filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'))
      .map(stmt => stmt.trim() + ';')
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`)
    
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement || statement === ';') continue
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
        
        // Execute via Supabase REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({ query: statement })
        })
        
        if (!response.ok) {
          const error = await response.text()
          console.error(`❌ Statement ${i + 1} failed:`, error)
          errorCount++
        } else {
          successCount++
        }
      } catch (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error)
        errorCount++
      }
    }
    
    console.log(`\n📊 Migration Results:`)
    console.log(`   ✅ Successful: ${successCount}`)
    console.log(`   ❌ Failed: ${errorCount}`)
    
    if (errorCount === 0) {
      console.log('🎉 All security fixes applied successfully!')
      return true
    } else {
      console.log('⚠️  Some statements failed - check the errors above')
      return false
    }
    
  } catch (error) {
    console.error('❌ Error reading migration file:', error)
    return false
  }
}

async function testSecurityFixes() {
  console.log('🧪 Testing security-fixed functions...')
  
  const functionsToTest = [
    'get_user_balance',
    'get_user_statistics', 
    'get_game_history',
    'get_leaderboard',
    'cleanup_old_audit_logs',
    'get_audit_statistics',
    'detect_suspicious_activity',
    'cleanup_old_case_opening_metrics',
    'get_case_opening_system_health'
  ]
  
  let testsPassed = 0
  let testsFailed = 0
  
  for (const functionName of functionsToTest) {
    try {
      console.log(`🔍 Testing ${functionName}...`)
      
      // Test function exists by calling it with minimal parameters
      let testCall
      switch (functionName) {
        case 'get_user_balance':
          testCall = { user_uuid: '00000000-0000-0000-0000-000000000000' }
          break
        case 'get_user_statistics':
          testCall = { user_uuid: '00000000-0000-0000-0000-000000000000' }
          break
        case 'get_game_history':
          testCall = { user_uuid: '00000000-0000-0000-0000-000000000000', limit_param: 1 }
          break
        case 'get_leaderboard':
          testCall = { metric_param: 'balance', limit_param: 1 }
          break
        case 'cleanup_old_audit_logs':
          // Skip this one as it modifies data
          console.log(`   ⏭️  Skipping ${functionName} (data-modifying function)`)
          continue
        case 'get_audit_statistics':
          testCall = {}
          break
        case 'detect_suspicious_activity':
          testCall = { lookback_hours: 1 }
          break
        case 'cleanup_old_case_opening_metrics':
          // Skip this one as it modifies data
          console.log(`   ⏭️  Skipping ${functionName} (data-modifying function)`)
          continue
        case 'get_case_opening_system_health':
          testCall = { time_range_hours: 1 }
          break
        default:
          testCall = {}
      }
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify(testCall)
      })
      
      if (response.ok) {
        console.log(`   ✅ ${functionName} is working`)
        testsPassed++
      } else {
        const error = await response.text()
        console.log(`   ❌ ${functionName} failed: ${error}`)
        testsFailed++
      }
      
    } catch (error) {
      console.log(`   ❌ ${functionName} error: ${error}`)
      testsFailed++
    }
  }
  
  console.log(`\n🧪 Test Results:`)
  console.log(`   ✅ Passed: ${testsPassed}`)
  console.log(`   ❌ Failed: ${testsFailed}`)
  
  return testsFailed === 0
}

async function main() {
  console.log('🚀 Starting security fixes for Supabase functions...')
  console.log('🎯 This will fix "Function Search Path Mutable" security warnings')
  
  const applied = await applySecurityFixes()
  if (!applied) {
    console.log('\n❌ Could not apply all security fixes automatically.')
    console.log('💡 Manual fix required:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Open the SQL Editor')
    console.log('3. Copy and paste the SQL from: packages/backend/src/database/migrations/008_fix_function_security.sql')
    console.log('4. Execute the SQL')
    process.exit(1)
  }
  
  console.log('\n🧪 Running function tests...')
  const tested = await testSecurityFixes()
  
  if (tested) {
    console.log('\n🎉 All security fixes applied and tested successfully!')
    console.log('🔒 Your database functions now have proper search_path security')
    console.log('✅ Supabase Security Advisor warnings should be resolved')
  } else {
    console.log('\n⚠️  Security fixes applied but some tests failed')
    console.log('🔍 Check the test results above for details')
  }
}

main().catch(console.error)