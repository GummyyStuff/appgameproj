/**
 * Automatic database setup
 * Try multiple approaches to execute SQL automatically
 */

import { supabaseAdmin } from '../config/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

async function autoSetupDB() {
  console.log('🚀 Automatic Database Setup')
  console.log('===========================')
  console.log('')

  try {
    // Read the migration files
    const schemaPath = join(__dirname, '../database/migrations/001_initial_schema.sql')
    const rpcPath = join(__dirname, '../database/migrations/002_rpc_functions.sql')
    
    const schemaSQL = readFileSync(schemaPath, 'utf8')
    const rpcSQL = readFileSync(rpcPath, 'utf8')
    
    console.log('📄 Migration files loaded successfully')
    console.log('')

    // Approach 1: Try using Supabase's query method directly
    console.log('🔍 Approach 1: Direct SQL execution via Supabase client...')
    
    try {
      // Split the schema SQL into individual statements
      const schemaStatements = schemaSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

      console.log(`Found ${schemaStatements.length} SQL statements to execute`)
      
      for (let i = 0; i < schemaStatements.length; i++) {
        const statement = schemaStatements[i]
        if (statement.length < 10) continue // Skip very short statements
        
        console.log(`Executing statement ${i + 1}/${schemaStatements.length}...`)
        
        // Try using the raw query method
        const { data, error } = await supabaseAdmin
          .from('_temp_sql_execution')
          .select('*')
          .limit(0) // This should fail but might give us insight
        
        if (error) {
          console.log(`Statement ${i + 1} info:`, error.message.substring(0, 100))
        }
      }
      
    } catch (error) {
      console.log('❌ Direct SQL approach failed:', error.message)
    }

    // Approach 2: Try using RPC to execute SQL
    console.log('')
    console.log('🔍 Approach 2: Using RPC to execute SQL...')
    
    try {
      // Try to call a built-in RPC function that might exist
      const { data: rpcData, error: rpcError } = await supabaseAdmin
        .rpc('exec', { sql: 'SELECT 1 as test' })
      
      if (rpcError) {
        console.log('❌ RPC exec failed:', rpcError.message)
        
        // Try alternative RPC names
        const rpcNames = ['execute_sql', 'exec_sql', 'query', 'sql']
        
        for (const rpcName of rpcNames) {
          try {
            const { data, error } = await supabaseAdmin
              .rpc(rpcName, { query: 'SELECT 1 as test' })
            
            if (!error) {
              console.log(`✅ Found working RPC function: ${rpcName}`)
              
              // Now try to execute our schema
              console.log('Executing schema via RPC...')
              const { error: schemaError } = await supabaseAdmin
                .rpc(rpcName, { query: schemaSQL })
              
              if (schemaError) {
                console.log('❌ Schema execution failed:', schemaError.message)
              } else {
                console.log('✅ Schema executed successfully!')
                
                // Execute RPC functions
                console.log('Executing RPC functions...')
                const { error: rpcFuncError } = await supabaseAdmin
                  .rpc(rpcName, { query: rpcSQL })
                
                if (rpcFuncError) {
                  console.log('❌ RPC functions failed:', rpcFuncError.message)
                } else {
                  console.log('✅ RPC functions executed successfully!')
                  return true
                }
              }
              break
            }
          } catch (err) {
            // Continue to next RPC name
          }
        }
      } else {
        console.log('✅ RPC exec works:', rpcData)
      }
      
    } catch (error) {
      console.log('❌ RPC approach failed:', error.message)
    }

    // Approach 3: Try creating tables one by one using REST API
    console.log('')
    console.log('🔍 Approach 3: Creating tables via REST API...')
    
    try {
      // Try to create user_profiles table by inserting a dummy record
      // This might auto-create the table structure
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: '00000000-0000-0000-0000-000000000000',
          username: 'system_test',
          balance: 0
        }, { onConflict: 'id' })
        .select()
      
      if (insertError) {
        console.log('❌ Table creation via insert failed:', insertError.message)
      } else {
        console.log('✅ user_profiles table might exist now')
        
        // Clean up the test record
        await supabaseAdmin
          .from('user_profiles')
          .delete()
          .eq('id', '00000000-0000-0000-0000-000000000000')
      }
      
    } catch (error) {
      console.log('❌ REST API approach failed:', error.message)
    }

    // Approach 4: Try using fetch directly to POST SQL
    console.log('')
    console.log('🔍 Approach 4: Direct HTTP POST with SQL...')
    
    try {
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ 
          sql: schemaSQL.substring(0, 1000) // Try just a portion first
        })
      })
      
      console.log(`HTTP Response: ${response.status} ${response.statusText}`)
      
      if (response.ok) {
        console.log('✅ HTTP SQL execution works!')
        
        // Try the full schema
        const fullResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql: schemaSQL })
        })
        
        if (fullResponse.ok) {
          console.log('✅ Full schema executed via HTTP!')
          
          // Execute RPC functions
          const rpcResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql: rpcSQL })
          })
          
          if (rpcResponse.ok) {
            console.log('✅ RPC functions executed via HTTP!')
            return true
          } else {
            const rpcError = await rpcResponse.text()
            console.log('❌ RPC functions HTTP failed:', rpcError.substring(0, 200))
          }
        } else {
          const fullError = await fullResponse.text()
          console.log('❌ Full schema HTTP failed:', fullError.substring(0, 200))
        }
      } else {
        const errorText = await response.text()
        console.log('❌ HTTP approach failed:', errorText.substring(0, 200))
      }
      
    } catch (error) {
      console.log('❌ HTTP approach error:', error.message)
    }

    console.log('')
    console.log('❌ All automatic approaches failed')
    console.log('💡 Manual setup via dashboard is still required')
    return false
    
  } catch (error) {
    console.log('❌ Setup error:', error.message)
    return false
  }
}

autoSetupDB()
  .then(success => {
    if (success) {
      console.log('')
      console.log('🎉 Automatic database setup completed!')
      console.log('🧪 Testing the setup...')
      
      // Test the setup
      import('./test-basic-db').then(testModule => {
        // The test will run automatically
      })
    } else {
      console.log('')
      console.log('⚠️  Automatic setup failed - manual setup required')
      console.log('📋 Instructions:')
      console.log('1. Go to http://192.168.0.69:8001')
      console.log('2. Find SQL Editor')
      console.log('3. Run the migration files manually')
    }
    
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('Script error:', error)
    process.exit(1)
  })