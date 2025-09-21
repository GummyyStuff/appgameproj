/**
 * Test the new migration files
 * Verify they work with our Supabase connection
 */

import { supabaseAdmin } from '../config/supabase'

async function testNewMigrations() {
  console.log('🧪 Testing New Migration Files')
  console.log('==============================')
  console.log('')

  try {
    // Test if we can access our new tables
    console.log('🔍 Testing table access...')
    
    const tables = ['user_profiles', 'game_history', 'daily_bonuses']
    
    for (const tableName of tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`)
        } else {
          console.log(`✅ ${tableName}: accessible (${data?.length || 0} records)`)
        }
      } catch (err) {
        console.log(`❌ ${tableName}: ${err.message}`)
      }
    }

    console.log('')
    console.log('🔍 Testing RPC functions...')
    
    // Test RPC functions
    const rpcFunctions = [
      'get_user_balance',
      'get_user_statistics', 
      'get_leaderboard'
    ]
    
    for (const funcName of rpcFunctions) {
      try {
        // Test with a dummy UUID
        const testUuid = '00000000-0000-0000-0000-000000000000'
        
        let result
        if (funcName === 'get_leaderboard') {
          result = await supabaseAdmin.rpc(funcName, { 
            metric_param: 'balance',
            limit_param: 5 
          })
        } else {
          result = await supabaseAdmin.rpc(funcName, { user_uuid: testUuid })
        }
        
        if (result.error) {
          console.log(`❌ ${funcName}: ${result.error.message}`)
        } else {
          console.log(`✅ ${funcName}: working`)
        }
      } catch (err) {
        console.log(`❌ ${funcName}: ${err.message}`)
      }
    }

    console.log('')
    console.log('🎯 Migration Test Summary:')
    console.log('If all tests show ✅, your database is properly set up!')
    console.log('If some show ❌, you may need to run the migration files manually.')
    
  } catch (error) {
    console.log('❌ Test error:', error.message)
  }
}

testNewMigrations().catch(console.error)