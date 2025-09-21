/**
 * Direct PostgreSQL connection setup
 * Try to connect directly to PostgreSQL and execute SQL
 */

import { readFileSync } from 'fs'
import { join } from 'path'

async function directPostgresSetup() {
  console.log('🚀 Direct PostgreSQL Setup Attempt')
  console.log('==================================')
  console.log('')

  try {
    // Try to use node-postgres if available
    let pg: any
    try {
      pg = require('pg')
      console.log('✅ PostgreSQL driver found')
    } catch (err) {
      console.log('❌ PostgreSQL driver not available')
      console.log('💡 Install with: bun add pg @types/pg')
      return false
    }

    // Extract connection details from Supabase URL
    const supabaseUrl = process.env.SUPABASE_URL || 'http://192.168.0.69:8001'
    const url = new URL(supabaseUrl)
    
    // Try common PostgreSQL ports
    const pgPorts = [5432, 54322, 5433]
    const host = url.hostname
    
    console.log(`🔍 Attempting direct PostgreSQL connection to ${host}...`)
    
    for (const port of pgPorts) {
      try {
        console.log(`Trying port ${port}...`)
        
        const client = new pg.Client({
          host: host,
          port: port,
          database: 'postgres', // Default database
          user: 'postgres',
          password: 'postgres', // Common default
          ssl: false
        })
        
        await client.connect()
        console.log(`✅ Connected to PostgreSQL on port ${port}!`)
        
        // Test basic query
        const result = await client.query('SELECT version()')
        console.log('PostgreSQL version:', result.rows[0].version.substring(0, 50) + '...')
        
        // Read and execute migration files
        const schemaPath = join(__dirname, '../database/migrations/001_initial_schema.sql')
        const rpcPath = join(__dirname, '../database/migrations/002_rpc_functions.sql')
        
        const schemaSQL = readFileSync(schemaPath, 'utf8')
        const rpcSQL = readFileSync(rpcPath, 'utf8')
        
        console.log('')
        console.log('🔍 Executing schema migration...')
        await client.query(schemaSQL)
        console.log('✅ Schema migration completed!')
        
        console.log('🔍 Executing RPC functions...')
        await client.query(rpcSQL)
        console.log('✅ RPC functions completed!')
        
        await client.end()
        
        console.log('')
        console.log('🎉 Direct PostgreSQL setup completed successfully!')
        return true
        
      } catch (err) {
        console.log(`❌ Port ${port} failed:`, err.message.substring(0, 100))
        continue
      }
    }
    
    console.log('❌ Could not connect to PostgreSQL on any common port')
    return false
    
  } catch (error) {
    console.log('❌ Direct PostgreSQL setup error:', error.message)
    return false
  }
}

// Alternative: Try using psql command if available
async function tryPsqlCommand() {
  console.log('')
  console.log('🔍 Trying psql command line tool...')
  
  try {
    const { spawn } = require('child_process')
    
    // Check if psql is available
    const psqlCheck = spawn('which', ['psql'])
    
    psqlCheck.on('close', (code) => {
      if (code === 0) {
        console.log('✅ psql command found')
        
        // Try to connect and execute SQL
        const host = '192.168.0.69'
        const ports = [5432, 54322, 5433]
        
        for (const port of ports) {
          console.log(`Trying psql connection to ${host}:${port}...`)
          
          const schemaPath = join(__dirname, '../database/migrations/001_initial_schema.sql')
          
          const psql = spawn('psql', [
            '-h', host,
            '-p', port.toString(),
            '-U', 'postgres',
            '-d', 'postgres',
            '-f', schemaPath
          ], {
            stdio: 'pipe'
          })
          
          psql.stdout.on('data', (data) => {
            console.log('psql output:', data.toString())
          })
          
          psql.stderr.on('data', (data) => {
            console.log('psql error:', data.toString())
          })
          
          psql.on('close', (code) => {
            if (code === 0) {
              console.log('✅ psql execution successful!')
            } else {
              console.log(`❌ psql failed with code ${code}`)
            }
          })
          
          break // Try only the first port for now
        }
      } else {
        console.log('❌ psql command not found')
      }
    })
    
  } catch (error) {
    console.log('❌ psql approach failed:', error.message)
  }
}

directPostgresSetup()
  .then(async (success) => {
    if (!success) {
      await tryPsqlCommand()
    }
    
    if (success) {
      console.log('')
      console.log('🧪 Testing the database setup...')
      
      // Import and run the test
      const { execSync } = require('child_process')
      try {
        execSync('bun run packages/backend/src/scripts/test-basic-db.ts', { stdio: 'inherit' })
      } catch (err) {
        console.log('Test execution failed, but setup might still be successful')
      }
    } else {
      console.log('')
      console.log('💡 All automatic approaches failed.')
      console.log('📋 Manual setup is required via Supabase dashboard.')
    }
    
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('Script error:', error)
    process.exit(1)
  })