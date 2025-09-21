/**
 * Setup database schema via REST API
 * Since the REST API is working, let's try to create our tables directly
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://192.168.0.69:8001'

async function setupViaRest() {
  console.log('🚀 Setting up Database via REST API')
  console.log('===================================')
  console.log('')

  // First, let's try to create a simple test table
  console.log('🔍 Step 1: Testing table creation...')
  
  try {
    // Try to create a simple table using SQL
    const createTestTable = `
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `

    // Try using the RPC endpoint to execute SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql: createTestTable })
    })

    console.log(`Status: ${response.status}`)
    
    if (response.ok) {
      console.log('✅ SQL execution via RPC works!')
      
      // Now let's try to create our actual casino tables
      console.log('')
      console.log('🔍 Step 2: Creating casino database schema...')
      
      // Read our migration file
      const fs = require('fs')
      const path = require('path')
      const migrationPath = path.join(__dirname, '../database/migrations/001_initial_schema.sql')
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
        
        const migrationResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql: migrationSQL })
        })

        console.log(`Migration Status: ${migrationResponse.status}`)
        
        if (migrationResponse.ok) {
          console.log('✅ Casino schema created successfully!')
          
          // Try the RPC functions migration
          console.log('')
          console.log('🔍 Step 3: Creating RPC functions...')
          
          const rpcPath = path.join(__dirname, '../database/migrations/002_rpc_functions.sql')
          if (fs.existsSync(rpcPath)) {
            const rpcSQL = fs.readFileSync(rpcPath, 'utf8')
            
            const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ sql: rpcSQL })
            })

            console.log(`RPC Functions Status: ${rpcResponse.status}`)
            
            if (rpcResponse.ok) {
              console.log('✅ RPC functions created successfully!')
              
              // Test if we can query our new tables
              console.log('')
              console.log('🔍 Step 4: Testing new tables...')
              
              const testQuery = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?select=*&limit=1`, {
                headers: {
                  'apikey': process.env.SUPABASE_ANON_KEY || '',
                  'Content-Type': 'application/json'
                }
              })

              console.log(`Table query status: ${testQuery.status}`)
              
              if (testQuery.ok) {
                const data = await testQuery.json()
                console.log('✅ Tables are accessible!')
                console.log(`Found ${data.length} user profiles`)
                
                console.log('')
                console.log('🎉 Database setup completed successfully!')
                console.log('✅ Schema created')
                console.log('✅ RPC functions installed')
                console.log('✅ Tables accessible')
                
                return true
              } else {
                const error = await testQuery.text()
                console.log('❌ Table query failed:', error.substring(0, 100))
              }
            } else {
              const error = await rpcResponse.text()
              console.log('❌ RPC functions failed:', error.substring(0, 200))
            }
          }
        } else {
          const error = await migrationResponse.text()
          console.log('❌ Migration failed:', error.substring(0, 200))
        }
      } else {
        console.log('❌ Migration file not found:', migrationPath)
      }
      
    } else {
      const error = await response.text()
      console.log('❌ SQL execution failed:', error.substring(0, 200))
      
      // If RPC doesn't work, let's try a different approach
      console.log('')
      console.log('💡 RPC approach failed, trying alternative methods...')
      
      // Maybe we can create tables by inserting into them (which would auto-create)
      // This is a long shot, but worth trying
      console.log('🔍 Trying to access existing tables...')
      
      const existingTables = ['user_profiles', 'game_history', 'daily_bonuses']
      
      for (const table of existingTables) {
        try {
          const tableResponse = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
            headers: {
              'apikey': process.env.SUPABASE_ANON_KEY || ''
            }
          })
          
          console.log(`${table}: ${tableResponse.status}`)
          
          if (tableResponse.ok) {
            const data = await tableResponse.json()
            console.log(`✅ ${table} exists with ${data.length} records`)
          }
        } catch (error) {
          console.log(`❌ ${table}: ${error.message}`)
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Setup error:', error.message)
  }

  return false
}

setupViaRest()
  .then(success => {
    if (success) {
      console.log('')
      console.log('🎯 Next steps:')
      console.log('1. Test the connection: bun run packages/backend/src/scripts/test-connection.ts')
      console.log('2. Run the backend tests: bun test')
      console.log('3. Start developing the casino games!')
    } else {
      console.log('')
      console.log('💡 Alternative approaches:')
      console.log('1. Try accessing Supabase dashboard directly at http://192.168.0.69:8001')
      console.log('2. Use the SQL editor in the dashboard to run migrations manually')
      console.log('3. Check if there are any firewall or permission issues')
    }
    
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('Script error:', error)
    process.exit(1)
  })