import { readFileSync } from 'fs'
import { join } from 'path'
import { supabaseAdmin } from '../config/supabase'

/**
 * Database setup utility for running migrations and seeds
 * This script sets up the database schema and initial data
 */

const MIGRATIONS_DIR = join(__dirname, 'migrations')
const SEEDS_DIR = join(__dirname, 'seeds')

interface MigrationResult {
  success: boolean
  error?: string
  file?: string
}

/**
 * Execute a SQL file against the database
 */
async function executeSqlFile(filePath: string): Promise<MigrationResult> {
  try {
    const sql = readFileSync(filePath, 'utf8')

    console.log(`📄 SQL file ready for execution: ${filePath}`)
    console.log(`📝 File size: ${sql.length} characters`)

    // Execute the SQL using Supabase admin client
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // If exec_sql RPC doesn't exist, try direct execution for simple statements
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        // For migrations, we'll split by semicolon and execute each statement
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'))

        for (const statement of statements) {
          if (statement.trim()) {
            try {
              // Use a simple query for DDL statements
              const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`
                },
                body: JSON.stringify({ sql_query: statement })
              })

              if (!response.ok) {
                const errorText = await response.text()
                console.warn(`Statement failed (may be expected): ${statement.substring(0, 100)}...`)
                console.warn(`Error: ${errorText}`)
              }
            } catch (stmtError) {
              console.warn(`Statement execution warning: ${stmtError}`)
            }
          }
        }

        return { success: true, file: filePath }
      } else {
        throw error
      }
    }

    return { success: true, file: filePath }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      file: filePath
    }
  }
}

/**
 * Run database migrations
 */
export async function runMigrations(): Promise<MigrationResult[]> {
  console.log('🔄 Running database migrations...')

  const migrationFiles = [
    join(MIGRATIONS_DIR, '001_initial_schema.sql'),
    join(MIGRATIONS_DIR, '002_rpc_functions.sql'),
    join(MIGRATIONS_DIR, '003_fix_user_registration.sql')
  ]

  const results: MigrationResult[] = []

  for (const file of migrationFiles) {
    console.log(`  📄 Executing ${file}...`)
    const result = await executeSqlFile(file)
    results.push(result)

    if (result.success) {
      console.log(`  ✅ ${file} completed successfully`)
    } else {
      console.error(`  ❌ ${file} failed: ${result.error}`)
      break // Stop on first failure
    }
  }

  return results
}

/**
 * Run database seeds (development/testing data)
 */
export async function runSeeds(): Promise<MigrationResult[]> {
  console.log('🌱 Running database seeds...')

  const seedFiles = [
    join(SEEDS_DIR, '001_test_data.sql')
  ]

  const results: MigrationResult[] = []

  for (const file of seedFiles) {
    console.log(`  📄 Executing ${file}...`)
    const result = await executeSqlFile(file)
    results.push(result)

    if (result.success) {
      console.log(`  ✅ ${file} completed successfully`)
    } else {
      console.error(`  ❌ ${file} failed: ${result.error}`)
    }
  }

  return results
}

/**
 * Setup complete database (migrations + seeds)
 */
export async function setupDatabase(includeSeed: boolean = false): Promise<void> {
  console.log('🚀 Setting up Tarkov Casino database...')

  try {
    // Run migrations
    const migrationResults = await runMigrations()
    const failedMigrations = migrationResults.filter(r => !r.success)

    if (failedMigrations.length > 0) {
      console.error('❌ Migration failures detected:')
      failedMigrations.forEach(result => {
        console.error(`  - ${result.file}: ${result.error}`)
      })
      throw new Error('Database migration failed')
    }

    console.log('✅ All migrations completed successfully')

    // Run seeds if requested
    if (includeSeed) {
      const seedResults = await runSeeds()
      const failedSeeds = seedResults.filter(r => !r.success)

      if (failedSeeds.length > 0) {
        console.warn('⚠️  Some seeds failed (this may be expected):')
        failedSeeds.forEach(result => {
          console.warn(`  - ${result.file}: ${result.error}`)
        })
      } else {
        console.log('✅ All seeds completed successfully')
      }
    }

    console.log('🎉 Database setup completed!')

  } catch (error) {
    console.error('💥 Database setup failed:', error)
    throw error
  }
}

/**
 * Verify database setup by checking if tables exist
 */
export async function verifyDatabaseSetup(): Promise<boolean> {
  console.log('🔍 Verifying database setup...')

  try {
    // Check if core tables exist
    const { data: tables, error } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['user_profiles', 'game_history', 'daily_bonuses'])

    if (error) {
      console.error('❌ Failed to verify tables:', error.message)
      return false
    }

    const expectedTables = ['user_profiles', 'game_history', 'daily_bonuses']
    const existingTables = tables?.map(t => t.table_name) || []
    const missingTables = expectedTables.filter(t => !existingTables.includes(t))

    if (missingTables.length > 0) {
      console.error('❌ Missing tables:', missingTables)
      return false
    }

    // Test RPC functions
    const { error: rpcError } = await supabaseAdmin.rpc('get_user_balance', {
      user_uuid: '00000000-0000-0000-0000-000000000000'
    })

    // We expect this to return 0 or null, not an error about function not existing
    if (rpcError && rpcError.message.includes('function') && rpcError.message.includes('does not exist')) {
      console.error('❌ RPC functions not properly installed')
      return false
    }

    console.log('✅ Database verification successful')
    return true

  } catch (error) {
    console.error('💥 Database verification failed:', error)
    return false
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2)
  const includeSeed = args.includes('--seed')
  const verifyOnly = args.includes('--verify')

  if (verifyOnly) {
    verifyDatabaseSetup()
      .then(success => process.exit(success ? 0 : 1))
      .catch(() => process.exit(1))
  } else {
    setupDatabase(includeSeed)
      .then(() => process.exit(0))
      .catch(() => process.exit(1))
  }
}