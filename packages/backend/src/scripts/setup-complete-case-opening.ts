#!/usr/bin/env bun

/**
 * Complete Case Opening Setup Script
 * This script creates tables and populates data for the case opening system
 */

import { supabaseAdmin } from '../config/supabase'

// First, let's create a simple RPC function to execute SQL
async function createExecuteSqlFunction(): Promise<void> {
  console.log('🔧 Creating SQL execution function...')
  
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION execute_sql(sql_text TEXT)
    RETURNS TEXT
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        EXECUTE sql_text;
        RETURN 'SUCCESS';
    EXCEPTION
        WHEN OTHERS THEN
            RETURN 'ERROR: ' || SQLERRM;
    END;
    $$;
  `

  try {
    // Try to create the function using a direct approach
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`
      },
      body: JSON.stringify({ query: createFunctionSQL })
    })

    if (response.ok) {
      console.log('✅ SQL execution function created successfully')
      return
    } else {
      const error = await response.text()
      console.log('⚠️  Could not create SQL execution function via API:', error)
    }
  } catch (error) {
    console.log('⚠️  Could not create SQL execution function:', error)
  }

  // Try alternative approach using RPC
  try {
    const { data, error } = await supabaseAdmin.rpc('execute_sql', {
      sql_text: 'SELECT 1 as test'
    })

    if (!error) {
      console.log('✅ SQL execution function already exists')
    }
  } catch (error) {
    console.log('⚠️  SQL execution function not available')
  }
}

async function executeSqlCommand(sql: string, description: string): Promise<boolean> {
  console.log(`📄 ${description}...`)
  
  try {
    // Try using our custom RPC function
    const { data, error } = await supabaseAdmin.rpc('execute_sql', {
      sql_text: sql
    })

    if (error) {
      console.log(`⚠️  RPC execution failed for ${description}:`, error.message)
      return false
    }

    if (data && data.startsWith('ERROR:')) {
      console.log(`⚠️  SQL execution failed for ${description}:`, data)
      return false
    }

    console.log(`✅ ${description} completed`)
    return true
  } catch (error) {
    console.log(`⚠️  Error executing ${description}:`, error)
    return false
  }
}

async function createCaseOpeningTables(): Promise<boolean> {
  console.log('🎲 Creating case opening tables...')

  const tableCreationSQLs = [
    {
      sql: `CREATE TABLE IF NOT EXISTS case_types (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        price DECIMAL(15,2) NOT NULL CHECK (price > 0),
        description TEXT NOT NULL,
        image_url TEXT,
        rarity_distribution JSONB NOT NULL DEFAULT '{
            "common": 60,
            "uncommon": 25,
            "rare": 10,
            "epic": 4,
            "legendary": 1
        }'::jsonb,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )`,
      description: 'Creating case_types table'
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS tarkov_items (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
        base_value DECIMAL(15,2) NOT NULL CHECK (base_value > 0),
        category TEXT NOT NULL CHECK (category IN ('medical', 'electronics', 'consumables', 'valuables', 'keycards')),
        image_url TEXT,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )`,
      description: 'Creating tarkov_items table'
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS case_item_pools (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        case_type_id UUID REFERENCES case_types(id) ON DELETE CASCADE NOT NULL,
        item_id UUID REFERENCES tarkov_items(id) ON DELETE CASCADE NOT NULL,
        weight DECIMAL(5,2) DEFAULT 1.00 NOT NULL CHECK (weight > 0),
        value_multiplier DECIMAL(5,2) DEFAULT 1.00 NOT NULL CHECK (value_multiplier > 0),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        UNIQUE(case_type_id, item_id)
      )`,
      description: 'Creating case_item_pools table'
    },
    {
      sql: `ALTER TABLE game_history DROP CONSTRAINT IF EXISTS game_history_game_type_check`,
      description: 'Dropping old game_history constraint'
    },
    {
      sql: `ALTER TABLE game_history ADD CONSTRAINT game_history_game_type_check CHECK (game_type IN ('roulette', 'blackjack', 'case_opening'))`,
      description: 'Adding updated game_history constraint'
    },
    {
      sql: `ALTER TABLE case_types ENABLE ROW LEVEL SECURITY`,
      description: 'Enabling RLS on case_types'
    },
    {
      sql: `ALTER TABLE tarkov_items ENABLE ROW LEVEL SECURITY`,
      description: 'Enabling RLS on tarkov_items'
    },
    {
      sql: `ALTER TABLE case_item_pools ENABLE ROW LEVEL SECURITY`,
      description: 'Enabling RLS on case_item_pools'
    },
    {
      sql: `CREATE POLICY IF NOT EXISTS "Anyone can view active case types" ON case_types FOR SELECT USING (is_active = true)`,
      description: 'Creating RLS policy for case_types'
    },
    {
      sql: `CREATE POLICY IF NOT EXISTS "Anyone can view active items" ON tarkov_items FOR SELECT USING (is_active = true)`,
      description: 'Creating RLS policy for tarkov_items'
    },
    {
      sql: `CREATE POLICY IF NOT EXISTS "Anyone can view case item pools" ON case_item_pools FOR SELECT USING (true)`,
      description: 'Creating RLS policy for case_item_pools'
    }
  ]

  let successCount = 0
  for (const { sql, description } of tableCreationSQLs) {
    const success = await executeSqlCommand(sql, description)
    if (success) successCount++
  }

  console.log(`✅ Completed ${successCount}/${tableCreationSQLs.length} table creation steps`)
  return successCount > 0
}

async function setupCaseOpeningComplete(): Promise<void> {
  console.log('🎲 Setting up Case Opening system completely...')

  try {
    // Step 1: Create the SQL execution function
    await createExecuteSqlFunction()

    // Step 2: Create the tables
    const tablesCreated = await createCaseOpeningTables()

    if (!tablesCreated) {
      console.log('\n❌ Could not create tables automatically.')
      console.log('💡 Please run the manual table creation script first:')
      console.log('   bun run src/scripts/create-tables-manual.ts')
      console.log('   Then follow the instructions to create tables in Supabase dashboard')
      return
    }

    // Step 3: Verify tables exist
    console.log('\n🔍 Verifying table creation...')
    const tables = ['case_types', 'tarkov_items', 'case_item_pools']
    let allTablesExist = true

    for (const tableName of tables) {
      try {
        const { error } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(1)

        if (error) {
          console.log(`❌ Table ${tableName} verification failed:`, error.message)
          allTablesExist = false
        } else {
          console.log(`✅ Table ${tableName} exists and is accessible`)
        }
      } catch (err) {
        console.log(`❌ Error verifying table ${tableName}:`, err)
        allTablesExist = false
      }
    }

    if (!allTablesExist) {
      console.log('\n❌ Some tables are not accessible. Please check the table creation.')
      return
    }

    // Step 4: Populate data using the direct setup script
    console.log('\n🌱 Populating case opening data...')
    const { setupCaseOpening } = await import('./setup-case-opening-direct')
    await setupCaseOpening()

    console.log('\n🎉 Complete case opening system setup finished!')

  } catch (error) {
    console.error('💥 Complete setup failed:', error)
    throw error
  }
}

// Run the complete setup
if (require.main === module) {
  setupCaseOpeningComplete()
    .then(() => {
      console.log('\n✨ Complete setup finished successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Complete setup failed:', error)
      process.exit(1)
    })
}

export { setupCaseOpeningComplete }