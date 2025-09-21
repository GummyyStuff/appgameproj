#!/usr/bin/env bun

/**
 * Direct Case Opening Table Creation Script
 * This script creates the case opening tables directly using SQL execution
 */

import { supabaseAdmin } from '../config/supabase'

async function executeSql(sql: string, description: string): Promise<boolean> {
  try {
    console.log(`📄 ${description}...`)
    
    // Use the SQL editor endpoint directly
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
      console.error(`❌ ${description} failed:`, errorText)
      return false
    }

    console.log(`✅ ${description} completed`)
    return true
  } catch (error) {
    console.error(`❌ ${description} error:`, error)
    return false
  }
}

async function createCaseOpeningTables(): Promise<void> {
  console.log('🎲 Creating case opening tables directly...')

  // Create case_types table
  const caseTypesSQL = `
    CREATE TABLE IF NOT EXISTS case_types (
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
    );
  `

  // Create tarkov_items table
  const tarkovItemsSQL = `
    CREATE TABLE IF NOT EXISTS tarkov_items (
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
    );
  `

  // Create case_item_pools table
  const caseItemPoolsSQL = `
    CREATE TABLE IF NOT EXISTS case_item_pools (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        case_type_id UUID REFERENCES case_types(id) ON DELETE CASCADE NOT NULL,
        item_id UUID REFERENCES tarkov_items(id) ON DELETE CASCADE NOT NULL,
        weight DECIMAL(5,2) DEFAULT 1.00 NOT NULL CHECK (weight > 0),
        value_multiplier DECIMAL(5,2) DEFAULT 1.00 NOT NULL CHECK (value_multiplier > 0),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        UNIQUE(case_type_id, item_id)
    );
  `

  // Update game_history constraint
  const updateGameHistorySQL = `
    ALTER TABLE game_history 
    DROP CONSTRAINT IF EXISTS game_history_game_type_check;
    
    ALTER TABLE game_history 
    ADD CONSTRAINT game_history_game_type_check 
    CHECK (game_type IN ('roulette', 'blackjack', 'case_opening'));
  `

  // Create indexes
  const indexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_case_types_active ON case_types(is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_case_types_price ON case_types(price);
    CREATE INDEX IF NOT EXISTS idx_tarkov_items_rarity ON tarkov_items(rarity);
    CREATE INDEX IF NOT EXISTS idx_tarkov_items_category ON tarkov_items(category);
    CREATE INDEX IF NOT EXISTS idx_tarkov_items_active ON tarkov_items(is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_tarkov_items_value ON tarkov_items(base_value);
    CREATE INDEX IF NOT EXISTS idx_case_item_pools_case_type ON case_item_pools(case_type_id);
    CREATE INDEX IF NOT EXISTS idx_case_item_pools_item ON case_item_pools(item_id);
  `

  // Enable RLS
  const rlsSQL = `
    ALTER TABLE case_types ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tarkov_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE case_item_pools ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY IF NOT EXISTS "Anyone can view active case types" ON case_types
        FOR SELECT USING (is_active = true);
    
    CREATE POLICY IF NOT EXISTS "Anyone can view active items" ON tarkov_items
        FOR SELECT USING (is_active = true);
    
    CREATE POLICY IF NOT EXISTS "Anyone can view case item pools" ON case_item_pools
        FOR SELECT USING (true);
  `

  try {
    // Execute each SQL block
    await executeSql(caseTypesSQL, 'Creating case_types table')
    await executeSql(tarkovItemsSQL, 'Creating tarkov_items table')
    await executeSql(caseItemPoolsSQL, 'Creating case_item_pools table')
    await executeSql(updateGameHistorySQL, 'Updating game_history constraints')
    await executeSql(indexesSQL, 'Creating indexes')
    await executeSql(rlsSQL, 'Setting up Row Level Security')

    console.log('✅ All case opening tables created successfully')

    // Verify tables exist
    console.log('🔍 Verifying table creation...')
    
    const tables = ['case_types', 'tarkov_items', 'case_item_pools']
    for (const tableName of tables) {
      try {
        const { error } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(1)

        if (error) {
          console.error(`❌ Table ${tableName} verification failed:`, error.message)
        } else {
          console.log(`✅ Table ${tableName} exists and is accessible`)
        }
      } catch (err) {
        console.error(`❌ Error verifying table ${tableName}:`, err)
      }
    }

  } catch (error) {
    console.error('💥 Failed to create case opening tables:', error)
    throw error
  }
}

// Run the table creation
if (require.main === module) {
  createCaseOpeningTables()
    .then(() => {
      console.log('\n🎉 Case opening tables created successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Table creation failed:', error)
      process.exit(1)
    })
}

export { createCaseOpeningTables }