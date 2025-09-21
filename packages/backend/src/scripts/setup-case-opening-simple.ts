#!/usr/bin/env bun

/**
 * Simple Case Opening Database Setup Script
 * This script creates the case opening tables and data using direct Supabase client calls
 */

import { supabaseAdmin } from '../config/supabase'

// Case types data
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

// Tarkov items data (sample - we'll add more programmatically)
const tarkovItems = [
  // Medical Items - Common
  { name: 'Bandage', rarity: 'common', base_value: 50, category: 'medical', description: 'Basic medical bandage for treating wounds' },
  { name: 'Painkillers', rarity: 'common', base_value: 75, category: 'medical', description: 'Over-the-counter pain medication' },
  { name: 'AI-2 Medkit', rarity: 'common', base_value: 100, category: 'medical', description: 'Basic first aid kit from the Soviet era' },
  
  // Medical Items - Uncommon
  { name: 'Salewa First Aid Kit', rarity: 'uncommon', base_value: 200, category: 'medical', description: 'Professional first aid kit' },
  { name: 'Car First Aid Kit', rarity: 'uncommon', base_value: 180, category: 'medical', description: 'Automotive emergency medical kit' },
  
  // Medical Items - Rare
  { name: 'IFAK Personal Tactical First Aid Kit', rarity: 'rare', base_value: 500, category: 'medical', description: 'Military-grade individual first aid kit' },
  { name: 'Vaseline Balm', rarity: 'rare', base_value: 450, category: 'medical', description: 'Medical petroleum jelly for various treatments' },
  
  // Medical Items - Epic
  { name: 'Grizzly Medical Kit', rarity: 'epic', base_value: 1200, category: 'medical', description: 'Advanced military medical kit' },
  { name: 'Propital Injector', rarity: 'epic', base_value: 1000, category: 'medical', description: 'Combat stimulant injector' },
  
  // Medical Items - Legendary
  { name: 'LEDX Skin Transilluminator', rarity: 'legendary', base_value: 5000, category: 'medical', description: 'High-tech medical diagnostic device' },
  
  // Electronics - Common
  { name: 'Broken LCD', rarity: 'common', base_value: 40, category: 'electronics', description: 'Damaged liquid crystal display' },
  { name: 'Damaged Hard Drive', rarity: 'common', base_value: 60, category: 'electronics', description: 'Corrupted computer storage device' },
  
  // Electronics - Uncommon
  { name: 'CPU Fan', rarity: 'uncommon', base_value: 150, category: 'electronics', description: 'Computer processor cooling fan' },
  { name: 'RAM', rarity: 'uncommon', base_value: 200, category: 'electronics', description: 'Computer memory module' },
  
  // Electronics - Rare
  { name: 'SSD Drive', rarity: 'rare', base_value: 500, category: 'electronics', description: 'Solid state storage device' },
  { name: 'Graphics Card', rarity: 'rare', base_value: 600, category: 'electronics', description: 'Computer graphics processing unit' },
  
  // Electronics - Epic
  { name: 'Tetriz Portable Game', rarity: 'epic', base_value: 1500, category: 'electronics', description: 'Rare handheld gaming device' },
  { name: 'GreenBat Lithium Battery', rarity: 'epic', base_value: 1200, category: 'electronics', description: 'High-capacity rechargeable battery' },
  
  // Electronics - Legendary
  { name: 'GPU (Graphics Processing Unit)', rarity: 'legendary', base_value: 8000, category: 'electronics', description: 'High-end graphics processing unit' },
  
  // Consumables - Common
  { name: 'Crackers', rarity: 'common', base_value: 30, category: 'consumables', description: 'Basic survival food' },
  { name: 'Water Bottle', rarity: 'common', base_value: 25, category: 'consumables', description: 'Basic hydration supply' },
  
  // Consumables - Uncommon
  { name: 'Tushonka Beef Stew', rarity: 'uncommon', base_value: 120, category: 'consumables', description: 'Military ration beef stew' },
  { name: 'Energy Drink', rarity: 'uncommon', base_value: 100, category: 'consumables', description: 'Caffeinated beverage' },
  
  // Consumables - Rare
  { name: 'Vodka', rarity: 'rare', base_value: 300, category: 'consumables', description: 'Premium Russian vodka' },
  { name: 'Whiskey', rarity: 'rare', base_value: 350, category: 'consumables', description: 'High-quality whiskey' },
  
  // Consumables - Epic
  { name: 'Moonshine', rarity: 'epic', base_value: 800, category: 'consumables', description: 'Homemade high-proof alcohol' },
  { name: 'Superwater', rarity: 'epic', base_value: 600, category: 'consumables', description: 'Enhanced hydration drink' },
  
  // Consumables - Legendary
  { name: 'Meldonin Injector', rarity: 'legendary', base_value: 3000, category: 'consumables', description: 'Performance enhancement drug' },
  
  // Valuables - Common
  { name: 'Bolts', rarity: 'common', base_value: 20, category: 'valuables', description: 'Metal fastening hardware' },
  { name: 'Screws', rarity: 'common', base_value: 25, category: 'valuables', description: 'Small metal fasteners' },
  
  // Valuables - Uncommon
  { name: 'Gold Chain', rarity: 'uncommon', base_value: 200, category: 'valuables', description: 'Precious metal jewelry' },
  { name: 'Silver Badge', rarity: 'uncommon', base_value: 150, category: 'valuables', description: 'Military or police insignia' },
  
  // Valuables - Rare
  { name: 'Rolex', rarity: 'rare', base_value: 800, category: 'valuables', description: 'Luxury Swiss timepiece' },
  { name: 'Prokill Medallion', rarity: 'rare', base_value: 600, category: 'valuables', description: 'Commemorative medal' },
  
  // Valuables - Epic
  { name: 'Antique Axe', rarity: 'epic', base_value: 1800, category: 'valuables', description: 'Historical weapon artifact' },
  { name: 'Golden Rooster', rarity: 'epic', base_value: 2000, category: 'valuables', description: 'Ornate golden figurine' },
  
  // Valuables - Legendary
  { name: 'Intelligence Folder', rarity: 'legendary', base_value: 10000, category: 'valuables', description: 'Classified military documents' },
  { name: 'Bitcoin', rarity: 'legendary', base_value: 12000, category: 'valuables', description: 'Cryptocurrency storage device' },
  
  // Keycards - Common
  { name: 'Factory Exit Key', rarity: 'common', base_value: 100, category: 'keycards', description: 'Basic facility access key' },
  { name: 'Customs Office Key', rarity: 'common', base_value: 120, category: 'keycards', description: 'Administrative building access' },
  
  // Keycards - Uncommon
  { name: 'Dorm Room 114 Key', rarity: 'uncommon', base_value: 300, category: 'keycards', description: 'Dormitory room access' },
  { name: 'Dorm Room 203 Key', rarity: 'uncommon', base_value: 350, category: 'keycards', description: 'Second floor dorm access' },
  
  // Keycards - Rare
  { name: 'EMERCOM Medical Unit Key', rarity: 'rare', base_value: 800, category: 'keycards', description: 'Emergency medical facility access' },
  { name: 'Sanitär Key', rarity: 'rare', base_value: 700, category: 'keycards', description: 'Sanitation facility access' },
  
  // Keycards - Epic
  { name: 'Red Keycard', rarity: 'epic', base_value: 3000, category: 'keycards', description: 'High-security laboratory access' },
  { name: 'Violet Keycard', rarity: 'epic', base_value: 2800, category: 'keycards', description: 'Restricted research facility access' },
  
  // Keycards - Legendary
  { name: 'Labs Access Keycard', rarity: 'legendary', base_value: 8000, category: 'keycards', description: 'TerraGroup Labs access card' },
  { name: 'Marked Room Key', rarity: 'legendary', base_value: 10000, category: 'keycards', description: 'Special marked room access' }
]

async function createCaseOpeningTables(): Promise<void> {
  console.log('📦 Creating case opening tables...')

  // First, let's check if tables already exist and create them if they don't
  try {
    // Test if case_types table exists
    const { error: caseTypesError } = await supabaseAdmin
      .from('case_types')
      .select('*')
      .limit(1)

    if (caseTypesError && caseTypesError.message.includes('does not exist')) {
      console.log('⚠️  Tables do not exist. Please run the migration first.')
      console.log('💡 Run: bun run src/database/setup.ts --seed')
      throw new Error('Case opening tables do not exist. Run migration first.')
    }

    console.log('✅ Case opening tables exist')
  } catch (error) {
    console.error('❌ Error checking tables:', error)
    throw error
  }
}

async function seedCaseTypes(): Promise<void> {
  console.log('🎲 Seeding case types...')

  try {
    // Clear existing case types
    const { error: deleteError } = await supabaseAdmin
      .from('case_types')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (deleteError) {
      console.warn('⚠️  Could not clear existing case types:', deleteError.message)
    }

    // Insert new case types
    const { data, error } = await supabaseAdmin
      .from('case_types')
      .insert(caseTypes)
      .select()

    if (error) {
      throw new Error(`Failed to insert case types: ${error.message}`)
    }

    console.log(`✅ Inserted ${data?.length || 0} case types`)
    return data
  } catch (error) {
    console.error('❌ Error seeding case types:', error)
    throw error
  }
}

async function seedTarkovItems(): Promise<void> {
  console.log('🎯 Seeding Tarkov items...')

  try {
    // Clear existing items
    const { error: deleteError } = await supabaseAdmin
      .from('tarkov_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (deleteError) {
      console.warn('⚠️  Could not clear existing items:', deleteError.message)
    }

    // Insert items in batches to avoid timeout
    const batchSize = 20
    let totalInserted = 0

    for (let i = 0; i < tarkovItems.length; i += batchSize) {
      const batch = tarkovItems.slice(i, i + batchSize)
      
      const { data, error } = await supabaseAdmin
        .from('tarkov_items')
        .insert(batch)
        .select()

      if (error) {
        console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error.message)
        continue
      }

      totalInserted += data?.length || 0
      console.log(`   Inserted batch ${i / batchSize + 1}: ${data?.length || 0} items`)
    }

    console.log(`✅ Inserted ${totalInserted} Tarkov items total`)
  } catch (error) {
    console.error('❌ Error seeding Tarkov items:', error)
    throw error
  }
}

async function createCaseItemPools(): Promise<void> {
  console.log('🔗 Creating case-item pool relationships...')

  try {
    // Clear existing pools
    const { error: deleteError } = await supabaseAdmin
      .from('case_item_pools')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (deleteError) {
      console.warn('⚠️  Could not clear existing pools:', deleteError.message)
    }

    // Get all case types and items
    const { data: cases, error: casesError } = await supabaseAdmin
      .from('case_types')
      .select('id, name')

    if (casesError) {
      throw new Error(`Failed to get case types: ${casesError.message}`)
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('tarkov_items')
      .select('id, rarity')

    if (itemsError) {
      throw new Error(`Failed to get items: ${itemsError.message}`)
    }

    if (!cases || !items) {
      throw new Error('No cases or items found')
    }

    // Create pools for each case type
    const pools = []

    for (const caseType of cases) {
      for (const item of items) {
        let weight = 1.0
        let valueMultiplier = 1.0

        // Set weights and multipliers based on case type and item rarity
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

    // Insert pools in batches
    const batchSize = 50
    let totalInserted = 0

    for (let i = 0; i < pools.length; i += batchSize) {
      const batch = pools.slice(i, i + batchSize)
      
      const { data, error } = await supabaseAdmin
        .from('case_item_pools')
        .insert(batch)
        .select()

      if (error) {
        console.error(`❌ Error inserting pool batch ${i / batchSize + 1}:`, error.message)
        continue
      }

      totalInserted += data?.length || 0
      console.log(`   Inserted pool batch ${i / batchSize + 1}: ${data?.length || 0} relationships`)
    }

    console.log(`✅ Created ${totalInserted} case-item pool relationships`)
  } catch (error) {
    console.error('❌ Error creating case-item pools:', error)
    throw error
  }
}

async function verifySetup(): Promise<void> {
  console.log('🔍 Verifying case opening setup...')

  try {
    // Check case types
    const { data: cases, error: casesError } = await supabaseAdmin
      .from('case_types')
      .select('name, price')

    if (casesError) {
      throw new Error(`Case types verification failed: ${casesError.message}`)
    }

    // Check items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('tarkov_items')
      .select('name, rarity, category')
      .limit(10)

    if (itemsError) {
      throw new Error(`Items verification failed: ${itemsError.message}`)
    }

    // Check pools
    const { data: pools, error: poolsError } = await supabaseAdmin
      .from('case_item_pools')
      .select('*')
      .limit(5)

    if (poolsError) {
      throw new Error(`Pools verification failed: ${poolsError.message}`)
    }

    console.log(`✅ Found ${cases?.length || 0} case types`)
    console.log(`✅ Found ${items?.length || 0} Tarkov items (showing first 10)`)
    console.log(`✅ Found ${pools?.length || 0} case-item relationships (showing first 5)`)

    if (cases && cases.length > 0) {
      console.log('\n📦 Available case types:')
      cases.forEach(caseType => {
        console.log(`   - ${caseType.name}: ${caseType.price} currency`)
      })
    }

    if (items && items.length > 0) {
      console.log('\n🎯 Sample items:')
      items.forEach(item => {
        console.log(`   - ${item.name} (${item.rarity} ${item.category})`)
      })
    }
  } catch (error) {
    console.error('❌ Verification failed:', error)
    throw error
  }
}

async function setupCaseOpening(): Promise<void> {
  console.log('🎲 Setting up Case Opening system...')

  try {
    await createCaseOpeningTables()
    await seedCaseTypes()
    await seedTarkovItems()
    await createCaseItemPools()
    await verifySetup()

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