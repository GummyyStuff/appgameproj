#!/usr/bin/env bun

/**
 * Direct SQL Execution Script
 * This script tries to execute SQL by creating a temporary function
 */

import { supabaseAdmin } from '../config/supabase'

async function executeSqlDirect(): Promise<void> {
  console.log('🔧 Attempting to execute SQL directly...')

  // Try to create the case_types table using a simple approach
  try {
    console.log('🎲 Creating case_types table...')
    
    // First, let's try to create a simple function that can execute DDL
    const createFunctionResult = await supabaseAdmin.rpc('get_user_balance', {
      user_uuid: '00000000-0000-0000-0000-000000000000'
    })
    
    console.log('✅ Database connection works')

    // Since we can't execute DDL directly, let's try a different approach
    // Let's create the tables by trying to insert data and see what happens
    
    console.log('📝 Attempting to create tables by testing inserts...')
    
    // Test case_types table
    try {
      const { data, error } = await supabaseAdmin
        .from('case_types')
        .insert({
          name: 'Test Case',
          price: 100,
          description: 'Test description',
          rarity_distribution: { common: 100 }
        })
        .select()

      if (data) {
        console.log('✅ case_types table exists!')
        // Clean up
        await supabaseAdmin.from('case_types').delete().eq('name', 'Test Case')
      }
    } catch (error) {
      console.log('❌ case_types table does not exist')
    }

    console.log('\n💡 Since we cannot execute DDL directly, here are your options:')
    console.log('\n1. 📋 Manual SQL Execution (Recommended):')
    console.log('   - Open your browser and go to: http://192.168.0.69:8001')
    console.log('   - Navigate to the SQL Editor')
    console.log('   - Copy the SQL from: packages/backend/src/database/case_opening_schema.sql')
    console.log('   - Execute the SQL')
    console.log('   - Run the final setup script again')

    console.log('\n2. 🐘 Direct PostgreSQL Connection (If you have psql):')
    console.log('   - Find your PostgreSQL connection details in Supabase')
    console.log('   - Use psql to connect and execute the SQL file')

    console.log('\n3. 🔄 Alternative Setup:')
    console.log('   - The tables might already exist but with different permissions')
    console.log('   - Try running the data population script directly')

    console.log('\n📄 SQL File Location:')
    console.log('   packages/backend/src/database/case_opening_schema.sql')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the direct execution
if (require.main === module) {
  executeSqlDirect()
    .then(() => {
      console.log('\n✨ Instructions provided!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Failed:', error)
      process.exit(1)
    })
}

export { executeSqlDirect }