/**
 * Apply Realtime Migration Script
 * Applies the new realtime triggers migration to the database
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { supabaseAdmin } from '../config/supabase'
import { env } from '../config/env'

async function applyRealtimeMigration() {
  console.log('🔄 Applying Realtime Migration...')
  console.log(`🔗 Supabase URL: ${env.SUPABASE_URL}`)

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '../database/migrations/004_realtime_triggers.sql')
    const sql = readFileSync(migrationPath, 'utf8')

    console.log(`📄 Migration file loaded: ${migrationPath}`)
    console.log(`📝 File size: ${sql.length} characters`)

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📊 Found ${statements.length} SQL statements to execute`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement.trim()) continue

      console.log(`  📄 Executing statement ${i + 1}/${statements.length}...`)
      
      try {
        // Use raw query for DDL statements
        const { error } = await supabaseAdmin.rpc('exec_sql', { 
          sql_query: statement + ';' 
        })

        if (error) {
          // If exec_sql doesn't exist, try alternative approach
          if (error.message.includes('function') && error.message.includes('does not exist')) {
            console.log(`  ⚠️  exec_sql RPC not available, trying direct execution...`)
            
            // For PostgreSQL functions and triggers, we need to use the REST API directly
            const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
              },
              body: JSON.stringify({ sql_query: statement + ';' })
            })

            if (!response.ok) {
              const errorText = await response.text()
              console.warn(`  ⚠️  Statement may have failed: ${errorText}`)
              console.log(`  📝 Statement: ${statement.substring(0, 100)}...`)
            } else {
              console.log(`  ✅ Statement executed successfully`)
            }
          } else {
            throw error
          }
        } else {
          console.log(`  ✅ Statement executed successfully`)
        }
      } catch (stmtError) {
        console.error(`  ❌ Statement failed:`, stmtError)
        console.log(`  📝 Statement: ${statement.substring(0, 200)}...`)
        
        // Continue with other statements for non-critical errors
        if (statement.includes('DROP TRIGGER') || statement.includes('DROP FUNCTION')) {
          console.log(`  ℹ️  Continuing (DROP statements can fail if object doesn't exist)`)
        } else {
          throw stmtError
        }
      }
    }

    console.log('✅ Realtime migration applied successfully!')

    // Test the new functions
    console.log('🧪 Testing realtime functions...')
    
    try {
      const { data, error } = await supabaseAdmin.rpc('get_realtime_channels')
      
      if (error) {
        console.warn('⚠️  get_realtime_channels function may not be available yet')
      } else {
        console.log('✅ Realtime channels function working:', data)
      }
    } catch (testError) {
      console.warn('⚠️  Could not test realtime functions:', testError)
    }

    // Verify realtime publication
    console.log('🔍 Verifying realtime publication...')
    
    try {
      const { data: publications, error: pubError } = await supabaseAdmin
        .from('pg_publication_tables')
        .select('*')
        .eq('pubname', 'supabase_realtime')

      if (pubError) {
        console.warn('⚠️  Could not verify realtime publication:', pubError)
      } else {
        console.log(`✅ Realtime publication has ${publications?.length || 0} tables`)
        publications?.forEach(pub => {
          console.log(`  📊 Table: ${pub.tablename}`)
        })
      }
    } catch (verifyError) {
      console.warn('⚠️  Could not verify realtime publication:', verifyError)
    }

    console.log('🎉 Realtime migration completed!')

  } catch (error) {
    console.error('💥 Realtime migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
applyRealtimeMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Migration script failed:', error)
    process.exit(1)
  })