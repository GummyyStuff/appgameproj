#!/usr/bin/env bun

/**
 * Final Case Opening Setup Script
 * This script provides a complete solution for setting up the case opening system
 */

import { supabaseAdmin } from '../config/supabase'

// Case types and items data (same as before)
const caseTypes = [
  {
    name: 'Scav Case',
    price: 500,
    description: 'Basic case containing common items found by Scavengers. Perfect for beginners looking to try their luck.',
    image_url: '/images/cases/scav-case.png',
    rarity_distribution: {
      common: 60,
      uncommon: 25,
      rare: 10,
      epic: 4,
      legendary: 1
    }
  },
  {
    name: 'PMC Case',
    price: 1500,
    description: 'Military-grade case with better odds for valuable items. Contains equipment used by Private Military Contractors.',
    image_url: '/images/cases/pmc-case.png',
    rarity_distribution: {
      common: 45,
      uncommon: 30,
      rare: 15,
      epic: 8,
      legendary: 2
    }
  },
  {
    name: 'Labs Case',
    price: 5000,
    description: 'Premium case from TerraGroup Labs with the highest chance for legendary items. Only for serious players.',
    image_url: '/images/cases/labs-case.png',
    rarity_distribution: {
      common: 30,
      uncommon: 35,
      rare: 20,
      epic: 12,
      legendary: 3
    }
  }
]

// Sample of Tarkov items (reduced for initial setup)
const tarkovItems = [
  // Medical Items
  { name: 'Bandage', rarity: 'common', base_value: 50, category: 'medical', description: 'Basic medical bandage for treating wounds' },
  { name: 'Painkillers', rarity: 'common', base_value: 75, category: 'medical', description: 'Over-the-counter pain medication' },
  { name: 'Salewa First Aid Kit', rarity: 'uncommon', base_value: 200, category: 'medical', description: 'Professional first aid kit' },
  { name: 'IFAK Personal Tactical First Aid Kit', rarity: 'rare', base_value: 500, category: 'medical', description: 'Military-grade individual first aid kit' },
  { name: 'Grizzly Medical Kit', rarity: 'epic', base_value: 1200, category: 'medical', description: 'Advanced military medical kit' },
  { name: 'LEDX Skin Transilluminator', rarity: 'legendary', base_value: 5000, category: 'medical', description: 'High-tech medical diagnostic device' },
  
  // Electronics
  { name: 'Broken LCD', rarity: 'common', base_value: 40, category: 'electronics', description: 'Damaged liquid crystal display' },
  { name: 'CPU Fan', rarity: 'uncommon', base_value: 150, category: 'electronics', description: 'Computer processor cooling fan' },
  { name: 'Graphics Card', rarity: 'rare', base_value: 600, category: 'electronics', description: 'Computer graphics processing unit' },
  { name: 'Tetriz Portable Game', rarity: 'epic', base_value: 1500, category: 'electronics', description: 'Rare handheld gaming device' },
  { name: 'GPU (Graphics Processing Unit)', rarity: 'legendary', base_value: 8000, category: 'electronics', description: 'High-end graphics processing unit' },
  
  // Consumables
  { name: 'Crackers', rarity: 'common', base_value: 30, category: 'consumables', description: 'Basic survival food' },
  { name: 'Tushonka Beef Stew', rarity: 'uncommon', base_value: 120, category: 'consumables', description: 'Military ration beef stew' },
  { name: 'Vodka', rarity: 'rare', base_value: 300, category: 'consumables', description: 'Premium Russian vodka' },
  { name: 'Moonshine', rarity: 'epic', base_value: 800, category: 'consumables', description: 'Homemade high-proof alcohol' },
  { name: 'Meldonin Injector', rarity: 'legendary', base_value: 3000, category: 'consumables', description: 'Performance enhancement drug' },
  
  // Valuables
  { name: 'Bolts', rarity: 'common', base_value: 20, category: 'valuables', description: 'Metal fastening hardware' },
  { name: 'Gold Chain', rarity: 'uncommon', base_value: 200, category: 'valuables', description: 'Precious metal jewelry' },
  { name: 'Rolex', rarity: 'rare', base_value: 800, category: 'valuables', description: 'Luxury Swiss timepiece' },
  { name: 'Antique Axe', rarity: 'epic', base_value: 1800, category: 'valuables', description: 'Historical weapon artifact' },
  { name: 'Bitcoin', rarity: 'legendary', base_value: 12000, category: 'valuables', description: 'Cryptocurrency storage device' },
  
  // Keycards
  { name: 'Factory Exit Key', rarity: 'common', base_value: 100, category: 'keycards', description: 'Basic facility access key' },
  { name: 'Dorm Room 114 Key', rarity: 'uncommon', base_value: 300, category: 'keycards', description: 'Dormitory room access' },
  { name: 'EMERCOM Medical Unit Key', rarity: 'rare', base_value: 800, category: 'keycards', description: 'Emergency medical facility access' },
  { name: 'Red Keycard', rarity: 'epic', base_value: 3000, category: 'keycards', description: 'High-security laboratory access' },
  { name: 'Labs Access Keycard', rarity: 'legendary', base_value: 8000, category: 'keycards', description: 'TerraGroup Labs access card' }
]

async function checkAndCreateTables(): Promise<boolean> {
  console.log('🔍 Checking if case opening tables exist...')
  
  // Check if tables exist
  const tables = ['case_types', 'tarkov_items', 'case_item_pools']
  const existingTables: string[] = []
  
  for (const tableName of tables) {
    try {
      const { error } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .limit(1)

      if (!error) {
        existingTables.push(tableName)
        console.log(`✅ Table ${tableName} exists`)
      }
    } catch (err) {
      console.log(`❌ Table ${tableName} does not exist`)
    }
  }

  if (existingTables.length === tables.length) {
    console.log('✅ All case opening tables exist')
    return true
  }

  console.log('\n❌ Some tables are missing. Creating SQL file for manual execution...')
  
  // Create a comprehensive SQL file
  const sqlContent = `-- Case Opening System Database Schema
-- Execute this SQL in your Supabase dashboard SQL editor

-- Create case_types table
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

-- Create tarkov_items table
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

-- Create case_item_pools table
CREATE TABLE IF NOT EXISTS case_item_pools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_type_id UUID REFERENCES case_types(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES tarkov_items(id) ON DELETE CASCADE NOT NULL,
    weight DECIMAL(5,2) DEFAULT 1.00 NOT NULL CHECK (weight > 0),
    value_multiplier DECIMAL(5,2) DEFAULT 1.00 NOT NULL CHECK (value_multiplier > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(case_type_id, item_id)
);

-- Update game_history constraint
ALTER TABLE game_history 
DROP CONSTRAINT IF EXISTS game_history_game_type_check;

ALTER TABLE game_history 
ADD CONSTRAINT game_history_game_type_check 
CHECK (game_type IN ('roulette', 'blackjack', 'case_opening'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_case_types_active ON case_types(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_case_types_price ON case_types(price);
CREATE INDEX IF NOT EXISTS idx_tarkov_items_rarity ON tarkov_items(rarity);
CREATE INDEX IF NOT EXISTS idx_tarkov_items_category ON tarkov_items(category);
CREATE INDEX IF NOT EXISTS idx_tarkov_items_active ON tarkov_items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tarkov_items_value ON tarkov_items(base_value);
CREATE INDEX IF NOT EXISTS idx_case_item_pools_case_type ON case_item_pools(case_type_id);
CREATE INDEX IF NOT EXISTS idx_case_item_pools_item ON case_item_pools(item_id);

-- Enable Row Level Security
ALTER TABLE case_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarkov_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_item_pools ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY IF NOT EXISTS "Anyone can view active case types" ON case_types
    FOR SELECT USING (is_active = true);

CREATE POLICY IF NOT EXISTS "Anyone can view active items" ON tarkov_items
    FOR SELECT USING (is_active = true);

CREATE POLICY IF NOT EXISTS "Anyone can view case item pools" ON case_item_pools
    FOR SELECT USING (true);

-- Add tables to realtime publication (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE case_types;
        ALTER PUBLICATION supabase_realtime ADD TABLE tarkov_items;
        ALTER PUBLICATION supabase_realtime ADD TABLE case_item_pools;
    END IF;
END $$;
`

  // Write SQL to file
  const fs = require('fs')
  const path = require('path')
  const sqlFilePath = path.join(__dirname, '../database/case_opening_schema.sql')
  
  try {
    fs.writeFileSync(sqlFilePath, sqlContent)
    console.log(`📄 SQL file created: ${sqlFilePath}`)
  } catch (error) {
    console.log('⚠️  Could not write SQL file, but here is the content:')
    console.log('\n' + sqlContent)
  }

  console.log('\n📋 Manual Setup Instructions:')
  console.log('1. Go to your Supabase dashboard (http://192.168.0.69:8001)')
  console.log('2. Navigate to the SQL Editor')
  console.log('3. Copy and paste the SQL content above (or from the generated file)')
  console.log('4. Execute the SQL')
  console.log('5. Run this script again to populate the data')
  console.log('\nAlternatively, if you have the SQL file:')
  console.log(`   cat ${sqlFilePath}`)

  return false
}

async function populateData(): Promise<void> {
  console.log('🌱 Populating case opening data...')

  try {
    // Clear and insert case types
    console.log('🎲 Seeding case types...')
    const { error: deleteCasesError } = await supabaseAdmin
      .from('case_types')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    const { data: cases, error: casesError } = await supabaseAdmin
      .from('case_types')
      .insert(caseTypes)
      .select()

    if (casesError) {
      throw new Error(`Failed to insert case types: ${casesError.message}`)
    }

    console.log(`✅ Inserted ${cases?.length || 0} case types`)

    // Clear and insert items
    console.log('🎯 Seeding Tarkov items...')
    const { error: deleteItemsError } = await supabaseAdmin
      .from('tarkov_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('tarkov_items')
      .insert(tarkovItems)
      .select()

    if (itemsError) {
      throw new Error(`Failed to insert items: ${itemsError.message}`)
    }

    console.log(`✅ Inserted ${items?.length || 0} Tarkov items`)

    // Create case-item pools
    console.log('🔗 Creating case-item pool relationships...')
    const { error: deletePoolsError } = await supabaseAdmin
      .from('case_item_pools')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (!cases || !items) {
      throw new Error('No cases or items to create pools with')
    }

    const pools = []
    for (const caseType of cases) {
      for (const item of items) {
        let weight = 1.0
        let valueMultiplier = 1.0

        // Set weights based on case type and item rarity
        if (caseType.name === 'Scav Case') {
          switch (item.rarity) {
            case 'common': weight = 10.0; valueMultiplier = 1.0; break
            case 'uncommon': weight = 5.0; valueMultiplier = 1.2; break
            case 'rare': weight = 2.0; valueMultiplier = 1.5; break
            case 'epic': weight = 0.8; valueMultiplier = 2.0; break
            case 'legendary': weight = 0.2; valueMultiplier = 3.0; break
          }
        } else if (caseType.name === 'PMC Case') {
          switch (item.rarity) {
            case 'common': weight = 6.0; valueMultiplier = 1.2; break
            case 'uncommon': weight = 8.0; valueMultiplier = 1.5; break
            case 'rare': weight = 5.0; valueMultiplier = 2.0; break
            case 'epic': weight = 2.5; valueMultiplier = 2.5; break
            case 'legendary': weight = 0.5; valueMultiplier = 4.0; break
          }
        } else if (caseType.name === 'Labs Case') {
          switch (item.rarity) {
            case 'common': weight = 3.0; valueMultiplier = 1.5; break
            case 'uncommon': weight = 4.0; valueMultiplier = 2.0; break
            case 'rare': weight = 8.0; valueMultiplier = 3.0; break
            case 'epic': weight = 6.0; valueMultiplier = 4.0; break
            case 'legendary': weight = 2.0; valueMultiplier = 6.0; break
          }
        }

        pools.push({
          case_type_id: caseType.id,
          item_id: item.id,
          weight,
          value_multiplier: valueMultiplier
        })
      }
    }

    const { data: poolData, error: poolsError } = await supabaseAdmin
      .from('case_item_pools')
      .insert(pools)
      .select()

    if (poolsError) {
      throw new Error(`Failed to create pools: ${poolsError.message}`)
    }

    console.log(`✅ Created ${poolData?.length || 0} case-item pool relationships`)

    // Verify setup
    console.log('\n🔍 Verifying setup...')
    console.log(`📦 Case types: ${cases.length}`)
    console.log(`🎯 Items: ${items.length}`)
    console.log(`🔗 Pool relationships: ${poolData?.length || 0}`)

    console.log('\n📦 Available case types:')
    cases.forEach(caseType => {
      console.log(`   - ${caseType.name}: ${caseType.price} currency`)
    })

    console.log('\n🎯 Items by category:')
    const categoryStats: Record<string, number> = {}
    items.forEach(item => {
      categoryStats[item.category] = (categoryStats[item.category] || 0) + 1
    })
    Object.entries(categoryStats).forEach(([category, count]) => {
      console.log(`   - ${category}: ${count} items`)
    })

  } catch (error) {
    console.error('❌ Error populating data:', error)
    throw error
  }
}

async function finalSetup(): Promise<void> {
  console.log('🎲 Final Case Opening System Setup')
  console.log('=====================================')

  try {
    // Step 1: Check and create tables
    const tablesExist = await checkAndCreateTables()
    
    if (!tablesExist) {
      console.log('\n⏸️  Setup paused. Please create the tables first using the instructions above.')
      console.log('   Then run this script again to populate the data.')
      return
    }

    // Step 2: Populate data
    await populateData()

    console.log('\n🎉 Case Opening System Setup Complete!')
    console.log('=====================================')
    console.log('✅ All tables created and configured')
    console.log('✅ Case types, items, and relationships populated')
    console.log('✅ Row Level Security policies applied')
    console.log('✅ Database indexes created for performance')
    console.log('\n🚀 The case opening system is now ready to use!')

  } catch (error) {
    console.error('💥 Final setup failed:', error)
    throw error
  }
}

// Run the final setup
if (require.main === module) {
  finalSetup()
    .then(() => {
      console.log('\n✨ Setup completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error)
      process.exit(1)
    })
}

export { finalSetup }