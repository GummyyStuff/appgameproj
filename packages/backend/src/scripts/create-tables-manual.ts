#!/usr/bin/env bun

/**
 * Manual Table Creation Script
 * This script creates the case opening tables by inserting dummy data and letting Supabase infer the schema
 */

import { supabaseAdmin } from '../config/supabase'

async function createTablesManually(): Promise<void> {
  console.log('🔧 Creating case opening tables manually...')

  try {
    // First, let's try to create a simple RPC function to execute SQL
    console.log('📝 Attempting to create tables using direct operations...')

    // Try to create case_types table by inserting a dummy record
    // This will fail but might give us information about the table structure
    console.log('🎲 Attempting to create case_types table...')
    
    try {
      const { data, error } = await supabaseAdmin
        .from('case_types')
        .insert({
          name: 'Test Case',
          price: 100,
          description: 'Test case description',
          image_url: '/test.png',
          rarity_distribution: { common: 100 },
          is_active: true
        })
        .select()

      if (data) {
        console.log('✅ case_types table already exists!')
        // Clean up test data
        await supabaseAdmin
          .from('case_types')
          .delete()
          .eq('name', 'Test Case')
      }
    } catch (error) {
      console.log('❌ case_types table does not exist, will need to create it')
    }

    // Try tarkov_items table
    console.log('🎯 Attempting to create tarkov_items table...')
    
    try {
      const { data, error } = await supabaseAdmin
        .from('tarkov_items')
        .insert({
          name: 'Test Item',
          rarity: 'common',
          base_value: 50,
          category: 'medical',
          description: 'Test item',
          is_active: true
        })
        .select()

      if (data) {
        console.log('✅ tarkov_items table already exists!')
        // Clean up test data
        await supabaseAdmin
          .from('tarkov_items')
          .delete()
          .eq('name', 'Test Item')
      }
    } catch (error) {
      console.log('❌ tarkov_items table does not exist, will need to create it')
    }

    // Try case_item_pools table
    console.log('🔗 Attempting to create case_item_pools table...')
    
    try {
      const { data, error } = await supabaseAdmin
        .from('case_item_pools')
        .select('*')
        .limit(1)

      if (!error) {
        console.log('✅ case_item_pools table already exists!')
      }
    } catch (error) {
      console.log('❌ case_item_pools table does not exist, will need to create it')
    }

    console.log('\n💡 Since the tables don\'t exist, we need to create them first.')
    console.log('📋 Here are the SQL commands you can run in the Supabase dashboard:')
    
    console.log('\n-- Create case_types table')
    console.log(`CREATE TABLE IF NOT EXISTS case_types (
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
);`)

    console.log('\n-- Create tarkov_items table')
    console.log(`CREATE TABLE IF NOT EXISTS tarkov_items (
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
);`)

    console.log('\n-- Create case_item_pools table')
    console.log(`CREATE TABLE IF NOT EXISTS case_item_pools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_type_id UUID REFERENCES case_types(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES tarkov_items(id) ON DELETE CASCADE NOT NULL,
    weight DECIMAL(5,2) DEFAULT 1.00 NOT NULL CHECK (weight > 0),
    value_multiplier DECIMAL(5,2) DEFAULT 1.00 NOT NULL CHECK (value_multiplier > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(case_type_id, item_id)
);`)

    console.log('\n-- Update game_history constraint')
    console.log(`ALTER TABLE game_history 
DROP CONSTRAINT IF EXISTS game_history_game_type_check;

ALTER TABLE game_history 
ADD CONSTRAINT game_history_game_type_check 
CHECK (game_type IN ('roulette', 'blackjack', 'case_opening'));`)

    console.log('\n-- Enable Row Level Security')
    console.log(`ALTER TABLE case_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarkov_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_item_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can view active case types" ON case_types
    FOR SELECT USING (is_active = true);

CREATE POLICY IF NOT EXISTS "Anyone can view active items" ON tarkov_items
    FOR SELECT USING (is_active = true);

CREATE POLICY IF NOT EXISTS "Anyone can view case item pools" ON case_item_pools
    FOR SELECT USING (true);`)

    console.log('\n📝 Instructions:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to the SQL Editor')
    console.log('3. Copy and paste the SQL commands above')
    console.log('4. Execute them one by one')
    console.log('5. Then run this script again to populate the data')

  } catch (error) {
    console.error('💥 Error during manual table creation:', error)
    throw error
  }
}

// Run the manual creation
if (require.main === module) {
  createTablesManually()
    .then(() => {
      console.log('\n✨ Manual table creation instructions provided!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Manual creation failed:', error)
      process.exit(1)
    })
}

export { createTablesManually }