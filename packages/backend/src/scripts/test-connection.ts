/**
 * Test Supabase connection script
 * Run this to verify your Supabase connection is working
 */

// Load environment variables from root .env file
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

// Load .env file from project root
const rootEnvPath = join(process.cwd(), '../../.env')
if (existsSync(rootEnvPath)) {
  const envContent = readFileSync(rootEnvPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0 && !key.startsWith('#')) {
      const value = valueParts.join('=').trim()
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

import { supabaseAdmin, supabaseConfig } from '../config/supabase'

async function testConnection() {
  console.log('🧪 Testing Supabase Connection')
  console.log('==============================')
  console.log('')
  
  console.log(`📍 Supabase URL: ${supabaseConfig.url}`)
  console.log(`🔑 Anon Key: ${supabaseConfig.anonKey ? '✅ Set' : '❌ Missing'}`)
  console.log(`🔐 Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`)
  console.log('')
  
  try {
    // Test basic connection
    console.log('🔍 Testing basic connection...')
    const { data, error } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .limit(1)
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      console.log('')
      console.log('💡 Troubleshooting:')
      console.log('1. Check if Supabase is running at http://192.168.0.69:8001')
      console.log('2. Verify your SUPABASE_SERVICE_ROLE_KEY in .env file')
      console.log('3. Make sure the IP address is correct')
      return false
    }
    
    console.log('✅ Basic connection successful!')
    console.log('')
    
    // Test if our tables exist
    console.log('🔍 Checking for casino tables...')
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['user_profiles', 'game_history', 'daily_bonuses'])
    
    if (tablesError) {
      console.warn('⚠️  Could not check tables:', tablesError.message)
    } else {
      const tableNames = tables?.map(t => t.table_name) || []
      const expectedTables = ['user_profiles', 'game_history', 'daily_bonuses']
      
      console.log('📊 Table status:')
      expectedTables.forEach(tableName => {
        const exists = tableNames.includes(tableName)
        console.log(`   ${exists ? '✅' : '❌'} ${tableName}`)
      })
      
      if (tableNames.length === 0) {
        console.log('')
        console.log('💡 No casino tables found. Run the database setup:')
        console.log('   bun run db:setup')
      }
    }
    
    console.log('')
    console.log('🎉 Connection test completed!')
    return true
    
  } catch (error) {
    console.error('💥 Connection test failed:', error)
    console.log('')
    console.log('💡 Common issues:')
    console.log('1. Supabase not running - start with: supabase start')
    console.log('2. Wrong URL - check http://192.168.0.69:8001 is accessible')
    console.log('3. Missing environment variables - check .env file')
    console.log('4. Network issues - verify IP and port')
    return false
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testConnection()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Script error:', error)
      process.exit(1)
    })
}

export { testConnection }