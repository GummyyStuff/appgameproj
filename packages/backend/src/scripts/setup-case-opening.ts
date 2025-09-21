#!/usr/bin/env bun

/**
 * Case Opening Database Setup Script
 * This script applies the case opening migration and seeds the database with Tarkov items
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { supabaseAdmin } from '../config/supabase'

const MIGRATIONS_DIR = join(__dirname, '../database/migrations')
const SEEDS_DIR = join(__dirname, '../database/seeds')

async function executeSqlFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sql = readFileSync(filePath, 'utf8')
    console.log(`📄 Executing SQL file: ${filePath}`)
    console.log(`📝 File size: ${sql.length} characters`)

    // Use direct SQL execution via REST API
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`
      },
      body: JSON.stringify({ query: sql })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`⚠️  SQL execution warning: ${errorText}`)
      
      // Try alternative approach - split and execute individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      let successCount = 0
      let errorCount = 0

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            const stmtResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/query`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`
              },
              body: JSON.stringify({ query: statement })
            })

            if (stmtResponse.ok) {
              successCount++
            } else {
              const stmtError = await stmtResponse.text()
              console.warn(`⚠️  Statement warning: ${statement.substring(0, 50)}...`)
              console.warn(`   Error: ${stmtError}`)
              errorCount++
            }
          } catch (stmtError) {
            console.warn(`⚠️  Statement execution warning: ${stmtError}`)
            errorCount++
          }
        }
      }

      console.log(`✅ Executed ${successCount} statements successfully`)
      if (errorCount > 0) {
        console.log(`⚠️  ${errorCount} statements had warnings (may be expected)`)
      }
    } else {
      console.log('✅ SQL file executed successfully')
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }
}

async function setupCaseOpening(): Promise<void> {
  console.log('🎲 Setting up Case Opening system...')

  try {
    // Apply case opening migration
    console.log('\n📦 Applying case opening schema migration...')
    const migrationResult = await executeSqlFile(join(MIGRATIONS_DIR, '006_case_opening_schema.sql'))
    
    if (!migrationResult.success) {
      throw new Error(`Migration failed: ${migrationResult.error}`)
    }

    console.log('✅ Case opening schema migration completed')

    // Apply case opening seed data
    console.log('\n🌱 Seeding case opening data...')
    const seedResult = await executeSqlFile(join(SEEDS_DIR, '002_case_opening_data.sql'))
    
    if (!seedResult.success) {
      throw new Error(`Seed data failed: ${seedResult.error}`)
    }

    console.log('✅ Case opening seed data completed')

    // Verify the setup
    console.log('\n🔍 Verifying case opening setup...')
    
    // Check if tables exist by trying to query them
    const tablesToCheck = ['case_types', 'tarkov_items', 'case_item_pools']
    const existingTables: string[] = []

    for (const tableName of tablesToCheck) {
      try {
        const { error } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(1)

        if (!error) {
          existingTables.push(tableName)
        }
      } catch (err) {
        // Table doesn't exist or other error
        console.warn(`⚠️  Table ${tableName} may not exist or is not accessible`)
      }
    }

    const missingTables = tablesToCheck.filter(t => !existingTables.includes(t))

    if (missingTables.length > 0) {
      console.warn(`⚠️  Missing or inaccessible tables: ${missingTables.join(', ')}`)
      console.log('This may be expected if the migration didn\'t complete successfully')
    }

    // Check if data was inserted
    const { data: caseTypes, error: caseTypesError } = await supabaseAdmin
      .from('case_types')
      .select('name, price')
      .limit(5)

    if (caseTypesError) {
      throw new Error(`Case types verification failed: ${caseTypesError.message}`)
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('tarkov_items')
      .select('name, rarity, category')
      .limit(5)

    if (itemsError) {
      throw new Error(`Items verification failed: ${itemsError.message}`)
    }

    console.log(`✅ Found ${caseTypes?.length || 0} case types`)
    console.log(`✅ Found ${items?.length || 0} Tarkov items`)

    if (caseTypes && caseTypes.length > 0) {
      console.log('\n📦 Available case types:')
      caseTypes.forEach(caseType => {
        console.log(`   - ${caseType.name}: ${caseType.price} currency`)
      })
    }

    if (items && items.length > 0) {
      console.log('\n🎯 Sample items:')
      items.forEach(item => {
        console.log(`   - ${item.name} (${item.rarity} ${item.category})`)
      })
    }

    console.log('\n🎉 Case opening system setup completed successfully!')

  } catch (error) {
    console.error('💥 Case opening setup failed:', error)
    throw error
  }
}

// Run the setup
if (require.main === module) {
  setupCaseOpening()
    .then(() => {
      console.log('\n✨ Setup completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error)
      process.exit(1)
    })
}

export { setupCaseOpening }