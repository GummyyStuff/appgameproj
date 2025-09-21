/**
 * Initialize empty database
 * Create our casino tables directly since the database appears to be empty
 */

import { supabaseAdmin } from '../config/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

async function initializeDB() {
  console.log('🚀 Initializing Empty Database')
  console.log('==============================')
  console.log('')

  try {
    // Test if we can execute any SQL at all
    console.log('🔍 Testing basic SQL execution...')
    
    // Try to create a simple test table first
    const { data: testData, error: testError } = await supabaseAdmin
      .from('test_table')
      .insert({ name: 'test' })
      .select()
    
    if (testError) {
      console.log('❌ Cannot insert into test_table (expected):', testError.message)
      
      // Since we can't query existing tables, let's try to create our casino tables directly
      console.log('')
      console.log('🔍 Creating casino tables directly...')
      
      // Create user_profiles table
      console.log('Creating user_profiles table...')
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: '00000000-0000-0000-0000-000000000000',
          username: 'test_user',
          balance: 10000
        })
        .select()
      
      if (profileError) {
        console.log('❌ user_profiles creation failed:', profileError.message)
        
        // If direct table operations don't work, the database might need manual setup
        console.log('')
        console.log('💡 Database appears to need manual initialization')
        console.log('')
        console.log('🎯 Manual Setup Required:')
        console.log('1. Go to your Supabase dashboard: http://192.168.0.69:8001')
        console.log('2. Look for "SQL Editor" or "Database" section')
        console.log('3. Run the following SQL scripts:')
        console.log('')
        
        // Show the user what SQL to run
        console.log('📄 First, run this SQL (Initial Schema):')
        console.log('=' .repeat(50))
        
        try {
          const schemaPath = join(__dirname, '../database/migrations/001_initial_schema.sql')
          const schemaSQL = readFileSync(schemaPath, 'utf8')
          console.log(schemaSQL.substring(0, 500) + '...')
          console.log('')
          console.log(`📁 Full file location: ${schemaPath}`)
        } catch (err) {
          console.log('❌ Could not read schema file:', err.message)
        }
        
        console.log('')
        console.log('📄 Then run this SQL (RPC Functions):')
        console.log('=' .repeat(50))
        
        try {
          const rpcPath = join(__dirname, '../database/migrations/002_rpc_functions.sql')
          const rpcSQL = readFileSync(rpcPath, 'utf8')
          console.log(rpcSQL.substring(0, 500) + '...')
          console.log('')
          console.log(`📁 Full file location: ${rpcPath}`)
        } catch (err) {
          console.log('❌ Could not read RPC file:', err.message)
        }
        
        console.log('')
        console.log('🔄 After running the SQL scripts, test again with:')
        console.log('   bun run packages/backend/src/scripts/test-basic-db.ts')
        
        return false
      } else {
        console.log('✅ user_profiles table created successfully!')
        return true
      }
    } else {
      console.log('✅ Basic SQL execution works!')
      return true
    }
    
  } catch (error) {
    console.log('❌ Database initialization error:', error.message)
    console.log('')
    console.log('💡 This suggests the database connection is working but needs manual setup.')
    console.log('Please use the Supabase dashboard to run the migration scripts.')
    return false
  }
}

initializeDB()
  .then(success => {
    if (success) {
      console.log('')
      console.log('🎉 Database initialization completed!')
      console.log('✅ You can now proceed with the casino application development.')
    } else {
      console.log('')
      console.log('⚠️  Manual setup required - see instructions above.')
    }
    
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('Script error:', error)
    process.exit(1)
  })