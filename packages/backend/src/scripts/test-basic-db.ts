/**
 * Test basic database operations
 * Try the simplest possible queries first
 */

import { supabaseAdmin } from '../config/supabase'

async function testBasicDB() {
  console.log('🧪 Testing Basic Database Operations')
  console.log('===================================')
  console.log('')

  try {
    // Test 1: Try to get the current time from the database
    console.log('🔍 Test 1: Getting current time from database...')
    const { data: timeData, error: timeError } = await supabaseAdmin
      .rpc('now')
    
    if (timeError) {
      console.log('❌ Time query failed:', timeError.message)
    } else {
      console.log('✅ Database time query works:', timeData)
    }

  } catch (error) {
    console.log('❌ Time query error:', error.message)
  }

  try {
    // Test 2: Try to query auth.users (should exist in Supabase)
    console.log('')
    console.log('🔍 Test 2: Checking auth.users table...')
    const { data: authData, error: authError } = await supabaseAdmin
      .from('auth.users')
      .select('id')
      .limit(1)
    
    if (authError) {
      console.log('❌ Auth users query failed:', authError.message)
    } else {
      console.log('✅ Auth users table accessible, found', authData?.length || 0, 'users')
    }

  } catch (error) {
    console.log('❌ Auth users error:', error.message)
  }

  try {
    // Test 3: Try a simple RPC call that should exist
    console.log('')
    console.log('🔍 Test 3: Testing simple RPC call...')
    const { data: versionData, error: versionError } = await supabaseAdmin
      .rpc('version')
    
    if (versionError) {
      console.log('❌ Version RPC failed:', versionError.message)
    } else {
      console.log('✅ Version RPC works:', versionData)
    }

  } catch (error) {
    console.log('❌ Version RPC error:', error.message)
  }

  try {
    // Test 4: Try to create a simple table
    console.log('')
    console.log('🔍 Test 4: Testing table creation...')
    
    // Use raw SQL query
    const { data: createData, error: createError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(1)
    
    if (createError) {
      console.log('❌ Table query failed:', createError.message)
      
      // Try alternative approach - query pg_tables
      console.log('🔍 Trying alternative table query...')
      const { data: pgData, error: pgError } = await supabaseAdmin
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public')
        .limit(1)
      
      if (pgError) {
        console.log('❌ pg_tables query failed:', pgError.message)
      } else {
        console.log('✅ pg_tables query works, found', pgData?.length || 0, 'tables')
        if (pgData && pgData.length > 0) {
          console.log('Sample tables:', pgData.map(t => t.tablename))
        }
      }
    } else {
      console.log('✅ information_schema query works, found', createData?.length || 0, 'tables')
    }

  } catch (error) {
    console.log('❌ Table query error:', error.message)
  }

  try {
    // Test 5: Check if our casino tables exist
    console.log('')
    console.log('🔍 Test 5: Checking for casino tables...')
    
    const casinoTables = ['user_profiles', 'game_history', 'daily_bonuses']
    
    for (const tableName of casinoTables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`)
        } else {
          console.log(`✅ ${tableName}: exists with ${data?.length || 0} records`)
        }
      } catch (err) {
        console.log(`❌ ${tableName}: ${err.message}`)
      }
    }

  } catch (error) {
    console.log('❌ Casino tables check error:', error.message)
  }

  console.log('')
  console.log('🎯 Summary:')
  console.log('If any tests passed, the database connection is working!')
  console.log('If casino tables don\'t exist, we need to run the migrations.')
}

testBasicDB().catch(console.error)