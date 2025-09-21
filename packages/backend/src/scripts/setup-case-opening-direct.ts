#!/usr/bin/env bun

/**
 * Direct Case Opening Setup Script
 * This script creates the case opening system using direct Supabase operations
 * without relying on SQL execution or migrations
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

// Tarkov items data
const tarkovItems = [
  // Medical Items - Common
  { name: 'Bandage', rarity: 'common', base_value: 50, category: 'medical', description: 'Basic medical bandage for treating wounds' },
  { name: 'Painkillers', rarity: 'common', base_value: 75, category: 'medical', description: 'Over-the-counter pain medication' },
  { name: 'AI-2 Medkit', rarity: 'common', base_value: 100, category: 'medical', description: 'Basic first aid kit from the Soviet era' },
  { name: 'Splint', rarity: 'common', base_value: 80, category: 'medical', description: 'Medical splint for treating fractures' },
  { name: 'Aseptic Bandage', rarity: 'common', base_value: 60, category: 'medical', description: 'Sterile bandage for wound treatment' },
  
  // Medical Items - Uncommon
  { name: 'Salewa First Aid Kit', rarity: 'uncommon', base_value: 200, category: 'medical', description: 'Professional first aid kit' },
  { name: 'Car First Aid Kit', rarity: 'uncommon', base_value: 180, category: 'medical', description: 'Automotive emergency medical kit' },
  { name: 'Esmarch Tourniquet', rarity: 'uncommon', base_value: 150, category: 'medical', description: 'Medical tourniquet for stopping bleeding' },
  { name: 'Hemostatic Drug', rarity: 'uncommon', base_value: 220, category: 'medical', description: 'Advanced bleeding control medication' },
  { name: 'Analgin Painkillers', rarity: 'uncommon', base_value: 160, category: 'medical', description: 'Prescription strength pain medication' },
  
  // Medical Items - Rare
  { name: 'IFAK Personal Tactical First Aid Kit', rarity: 'rare', base_value: 500, category: 'medical', description: 'Military-grade individual first aid kit' },
  { name: 'Augmentin Antibiotic', rarity: 'rare', base_value: 400, category: 'medical', description: 'Powerful antibiotic medication' },
  { name: 'Vaseline Balm', rarity: 'rare', base_value: 450, category: 'medical', description: 'Medical petroleum jelly for various treatments' },
  { name: 'Golden Star Balm', rarity: 'rare', base_value: 380, category: 'medical', description: 'Traditional healing balm' },
  { name: 'Ibuprofen Painkillers', rarity: 'rare', base_value: 420, category: 'medical', description: 'High-strength anti-inflammatory medication' },
  
  // Medical Items - Epic
  { name: 'Grizzly Medical Kit', rarity: 'epic', base_value: 1200, category: 'medical', description: 'Advanced military medical kit' },
  { name: 'Surv12 Field Surgical Kit', rarity: 'epic', base_value: 1500, category: 'medical', description: 'Portable surgical equipment' },
  { name: 'CMS Surgical Kit', rarity: 'epic', base_value: 1300, category: 'medical', description: 'Compact medical surgery kit' },
  { name: 'Propital Injector', rarity: 'epic', base_value: 1000, category: 'medical', description: 'Combat stimulant injector' },
  { name: 'Morphine Injector', rarity: 'epic', base_value: 1100, category: 'medical', description: 'Emergency pain relief injector' },
  
  // Medical Items - Legendary
  { name: 'LEDX Skin Transilluminator', rarity: 'legendary', base_value: 5000, category: 'medical', description: 'High-tech medical diagnostic device' },
  { name: 'Ophthalmoscope', rarity: 'legendary', base_value: 4500, category: 'medical', description: 'Professional eye examination instrument' },
  { name: 'Defibrillator', rarity: 'legendary', base_value: 6000, category: 'medical', description: 'Emergency cardiac resuscitation device' },
  
  // Electronics - Common
  { name: 'Broken LCD', rarity: 'common', base_value: 40, category: 'electronics', description: 'Damaged liquid crystal display' },
  { name: 'Damaged Hard Drive', rarity: 'common', base_value: 60, category: 'electronics', description: 'Corrupted computer storage device' },
  { name: 'Old Phone', rarity: 'common', base_value: 80, category: 'electronics', description: 'Obsolete mobile phone' },
  { name: 'Broken Lamp', rarity: 'common', base_value: 45, category: 'electronics', description: 'Non-functional electric lamp' },
  { name: 'Used Battery', rarity: 'common', base_value: 35, category: 'electronics', description: 'Depleted electrical battery' },
  
  // Electronics - Uncommon
  { name: 'CPU Fan', rarity: 'uncommon', base_value: 150, category: 'electronics', description: 'Computer processor cooling fan' },
  { name: 'RAM', rarity: 'uncommon', base_value: 200, category: 'electronics', description: 'Computer memory module' },
  { name: 'Power Supply Unit', rarity: 'uncommon', base_value: 180, category: 'electronics', description: 'Computer power supply' },
  { name: 'Motherboard', rarity: 'uncommon', base_value: 220, category: 'electronics', description: 'Computer main circuit board' },
  { name: 'Network Card', rarity: 'uncommon', base_value: 160, category: 'electronics', description: 'Computer networking component' },
  
  // Electronics - Rare
  { name: 'SSD Drive', rarity: 'rare', base_value: 500, category: 'electronics', description: 'Solid state storage device' },
  { name: 'Graphics Card', rarity: 'rare', base_value: 600, category: 'electronics', description: 'Computer graphics processing unit' },
  { name: 'Processor', rarity: 'rare', base_value: 550, category: 'electronics', description: 'Computer central processing unit' },
  { name: 'Webcam', rarity: 'rare', base_value: 400, category: 'electronics', description: 'Digital camera for video communication' },
  { name: 'Smartphone', rarity: 'rare', base_value: 480, category: 'electronics', description: 'Modern mobile communication device' },
  
  // Electronics - Epic
  { name: 'Tetriz Portable Game', rarity: 'epic', base_value: 1500, category: 'electronics', description: 'Rare handheld gaming device' },
  { name: 'GreenBat Lithium Battery', rarity: 'epic', base_value: 1200, category: 'electronics', description: 'High-capacity rechargeable battery' },
  { name: 'VPX Flash Storage Module', rarity: 'epic', base_value: 1300, category: 'electronics', description: 'Military-grade storage device' },
  { name: 'Military Circuit Board', rarity: 'epic', base_value: 1100, category: 'electronics', description: 'Specialized electronic component' },
  { name: 'Tactical Display Unit', rarity: 'epic', base_value: 1400, category: 'electronics', description: 'Military heads-up display' },
  
  // Electronics - Legendary
  { name: 'GPU (Graphics Processing Unit)', rarity: 'legendary', base_value: 8000, category: 'electronics', description: 'High-end graphics processing unit' },
  { name: 'Military Power Filter', rarity: 'legendary', base_value: 6500, category: 'electronics', description: 'Advanced electrical filtering system' },
  { name: 'AESA Radar Module', rarity: 'legendary', base_value: 7500, category: 'electronics', description: 'Advanced radar technology component' },
  
  // Consumables - Common
  { name: 'Crackers', rarity: 'common', base_value: 30, category: 'consumables', description: 'Basic survival food' },
  { name: 'Condensed Milk', rarity: 'common', base_value: 40, category: 'consumables', description: 'Preserved dairy product' },
  { name: 'Water Bottle', rarity: 'common', base_value: 25, category: 'consumables', description: 'Basic hydration supply' },
  { name: 'Canned Beef Stew', rarity: 'common', base_value: 50, category: 'consumables', description: 'Preserved meat meal' },
  { name: 'Pack of Sugar', rarity: 'common', base_value: 35, category: 'consumables', description: 'Basic cooking ingredient' },
  
  // Consumables - Uncommon
  { name: 'Tushonka Beef Stew', rarity: 'uncommon', base_value: 120, category: 'consumables', description: 'Military ration beef stew' },
  { name: 'MRE (Meal Ready to Eat)', rarity: 'uncommon', base_value: 150, category: 'consumables', description: 'Complete military meal' },
  { name: 'Energy Drink', rarity: 'uncommon', base_value: 100, category: 'consumables', description: 'Caffeinated beverage' },
  { name: 'Herring', rarity: 'uncommon', base_value: 80, category: 'consumables', description: 'Preserved fish' },
  { name: 'Oat Flakes', rarity: 'uncommon', base_value: 90, category: 'consumables', description: 'Nutritious breakfast cereal' },
  
  // Consumables - Rare
  { name: 'Vodka', rarity: 'rare', base_value: 300, category: 'consumables', description: 'Premium Russian vodka' },
  { name: 'Whiskey', rarity: 'rare', base_value: 350, category: 'consumables', description: 'High-quality whiskey' },
  { name: 'Aquamari Water', rarity: 'rare', base_value: 250, category: 'consumables', description: 'Premium bottled water' },
  { name: 'Slickers Chocolate Bar', rarity: 'rare', base_value: 200, category: 'consumables', description: 'Luxury chocolate treat' },
  { name: 'Emelya Rye Croutons', rarity: 'rare', base_value: 180, category: 'consumables', description: 'Gourmet bread snack' },
  
  // Consumables - Epic
  { name: 'Moonshine', rarity: 'epic', base_value: 800, category: 'consumables', description: 'Homemade high-proof alcohol' },
  { name: 'Superwater', rarity: 'epic', base_value: 600, category: 'consumables', description: 'Enhanced hydration drink' },
  { name: 'Premium Vodka', rarity: 'epic', base_value: 900, category: 'consumables', description: 'Top-shelf Russian vodka' },
  { name: 'Luxury Chocolate', rarity: 'epic', base_value: 500, category: 'consumables', description: 'Artisanal chocolate bar' },
  { name: 'Gourmet Coffee', rarity: 'epic', base_value: 400, category: 'consumables', description: 'Premium coffee beans' },
  
  // Consumables - Legendary
  { name: 'Meldonin Injector', rarity: 'legendary', base_value: 3000, category: 'consumables', description: 'Performance enhancement drug' },
  { name: 'SJ1 TGLabs Combat Stimulant', rarity: 'legendary', base_value: 3500, category: 'consumables', description: 'Military combat enhancement' },
  { name: 'SJ6 TGLabs Combat Stimulant', rarity: 'legendary', base_value: 4000, category: 'consumables', description: 'Advanced combat stimulant' },
  
  // Valuables - Common
  { name: 'Bolts', rarity: 'common', base_value: 20, category: 'valuables', description: 'Metal fastening hardware' },
  { name: 'Screws', rarity: 'common', base_value: 25, category: 'valuables', description: 'Small metal fasteners' },
  { name: 'Matches', rarity: 'common', base_value: 15, category: 'valuables', description: 'Fire-starting implements' },
  { name: 'Duct Tape', rarity: 'common', base_value: 40, category: 'valuables', description: 'Adhesive repair tape' },
  { name: 'Nails', rarity: 'common', base_value: 30, category: 'valuables', description: 'Construction fasteners' },
  
  // Valuables - Uncommon
  { name: 'Gold Chain', rarity: 'uncommon', base_value: 200, category: 'valuables', description: 'Precious metal jewelry' },
  { name: 'Silver Badge', rarity: 'uncommon', base_value: 150, category: 'valuables', description: 'Military or police insignia' },
  { name: 'Chainlet', rarity: 'uncommon', base_value: 180, category: 'valuables', description: 'Small decorative chain' },
  { name: 'Brass Knuckles', rarity: 'uncommon', base_value: 120, category: 'valuables', description: 'Metal hand weapon' },
  { name: 'Cigarettes', rarity: 'uncommon', base_value: 100, category: 'valuables', description: 'Tobacco products' },
  
  // Valuables - Rare
  { name: 'Rolex', rarity: 'rare', base_value: 800, category: 'valuables', description: 'Luxury Swiss timepiece' },
  { name: 'Prokill Medallion', rarity: 'rare', base_value: 600, category: 'valuables', description: 'Commemorative medal' },
  { name: 'Gold Skull Ring', rarity: 'rare', base_value: 700, category: 'valuables', description: 'Ornate gold jewelry' },
  { name: 'Silver Lion', rarity: 'rare', base_value: 500, category: 'valuables', description: 'Decorative silver figurine' },
  { name: 'Antique Book', rarity: 'rare', base_value: 450, category: 'valuables', description: 'Rare literary work' },
  
  // Valuables - Epic
  { name: 'Antique Axe', rarity: 'epic', base_value: 1800, category: 'valuables', description: 'Historical weapon artifact' },
  { name: 'Golden Rooster', rarity: 'epic', base_value: 2000, category: 'valuables', description: 'Ornate golden figurine' },
  { name: 'Skull Ring', rarity: 'epic', base_value: 1500, category: 'valuables', description: 'Elaborate skull-themed jewelry' },
  { name: 'Rare Painting', rarity: 'epic', base_value: 2200, category: 'valuables', description: 'Valuable artwork' },
  { name: 'Antique Vase', rarity: 'epic', base_value: 1600, category: 'valuables', description: 'Historical ceramic piece' },
  
  // Valuables - Legendary
  { name: 'Intelligence Folder', rarity: 'legendary', base_value: 10000, category: 'valuables', description: 'Classified military documents' },
  { name: 'Bitcoin', rarity: 'legendary', base_value: 12000, category: 'valuables', description: 'Cryptocurrency storage device' },
  { name: 'Rare Artifact', rarity: 'legendary', base_value: 15000, category: 'valuables', description: 'Mysterious ancient object' },
  
  // Keycards - Common
  { name: 'Factory Exit Key', rarity: 'common', base_value: 100, category: 'keycards', description: 'Basic facility access key' },
  { name: 'Customs Office Key', rarity: 'common', base_value: 120, category: 'keycards', description: 'Administrative building access' },
  { name: 'Gas Station Storage Key', rarity: 'common', base_value: 80, category: 'keycards', description: 'Fuel depot storage access' },
  { name: 'Warehouse Key', rarity: 'common', base_value: 90, category: 'keycards', description: 'Industrial storage access' },
  { name: 'Cabin Key', rarity: 'common', base_value: 70, category: 'keycards', description: 'Small building access key' },
  
  // Keycards - Uncommon
  { name: 'Dorm Room 114 Key', rarity: 'uncommon', base_value: 300, category: 'keycards', description: 'Dormitory room access' },
  { name: 'Dorm Room 203 Key', rarity: 'uncommon', base_value: 350, category: 'keycards', description: 'Second floor dorm access' },
  { name: 'Machinery Key', rarity: 'uncommon', base_value: 250, category: 'keycards', description: 'Industrial equipment access' },
  { name: 'Office Key', rarity: 'uncommon', base_value: 280, category: 'keycards', description: 'Administrative office access' },
  { name: 'Storage Room Key', rarity: 'uncommon', base_value: 200, category: 'keycards', description: 'General storage access' },
  
  // Keycards - Rare
  { name: 'EMERCOM Medical Unit Key', rarity: 'rare', base_value: 800, category: 'keycards', description: 'Emergency medical facility access' },
  { name: 'Sanitär Key', rarity: 'rare', base_value: 700, category: 'keycards', description: 'Sanitation facility access' },
  { name: 'Checkpoint Key', rarity: 'rare', base_value: 900, category: 'keycards', description: 'Security checkpoint access' },
  { name: 'Admin Office Key', rarity: 'rare', base_value: 750, category: 'keycards', description: 'High-level administrative access' },
  { name: 'Secure Container Key', rarity: 'rare', base_value: 850, category: 'keycards', description: 'Secure storage access' },
  
  // Keycards - Epic
  { name: 'Red Keycard', rarity: 'epic', base_value: 3000, category: 'keycards', description: 'High-security laboratory access' },
  { name: 'Violet Keycard', rarity: 'epic', base_value: 2800, category: 'keycards', description: 'Restricted research facility access' },
  { name: 'ULTRA Medical Storage Key', rarity: 'epic', base_value: 2500, category: 'keycards', description: 'Premium medical storage access' },
  { name: 'Manager Office Key', rarity: 'epic', base_value: 2200, category: 'keycards', description: 'Executive office access' },
  { name: 'Arsenal Storage Key', rarity: 'epic', base_value: 2600, category: 'keycards', description: 'Weapons storage facility access' },
  
  // Keycards - Legendary
  { name: 'Labs Access Keycard', rarity: 'legendary', base_value: 8000, category: 'keycards', description: 'TerraGroup Labs access card' },
  { name: 'Marked Room Key', rarity: 'legendary', base_value: 10000, category: 'keycards', description: 'Special marked room access' },
  { name: 'Reserve Marked Key', rarity: 'legendary', base_value: 12000, category: 'keycards', description: 'Military base marked room access' }
]

async function checkTablesExist(): Promise<boolean> {
  console.log('🔍 Checking if case opening tables exist...')
  
  const tablesToCheck = ['case_types', 'tarkov_items', 'case_item_pools']
  
  for (const tableName of tablesToCheck) {
    try {
      const { error } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .limit(1)

      if (error) {
        console.log(`❌ Table ${tableName} does not exist or is not accessible`)
        return false
      }
    } catch (err) {
      console.log(`❌ Error checking table ${tableName}:`, err)
      return false
    }
  }
  
  console.log('✅ All case opening tables exist')
  return true
}

async function seedCaseTypes(): Promise<any[]> {
  console.log('🎲 Seeding case types...')

  try {
    // Clear existing case types
    const { error: deleteError } = await supabaseAdmin
      .from('case_types')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (deleteError && !deleteError.message.includes('0 rows')) {
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
    return data || []
  } catch (error) {
    console.error('❌ Error seeding case types:', error)
    throw error
  }
}

async function seedTarkovItems(): Promise<any[]> {
  console.log('🎯 Seeding Tarkov items...')

  try {
    // Clear existing items
    const { error: deleteError } = await supabaseAdmin
      .from('tarkov_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (deleteError && !deleteError.message.includes('0 rows')) {
      console.warn('⚠️  Could not clear existing items:', deleteError.message)
    }

    // Insert items in batches to avoid timeout
    const batchSize = 20
    let totalInserted = 0
    const allInsertedItems = []

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
      allInsertedItems.push(...(data || []))
      console.log(`   Inserted batch ${i / batchSize + 1}: ${data?.length || 0} items`)
    }

    console.log(`✅ Inserted ${totalInserted} Tarkov items total`)
    return allInsertedItems
  } catch (error) {
    console.error('❌ Error seeding Tarkov items:', error)
    throw error
  }
}

async function createCaseItemPools(cases: any[], items: any[]): Promise<void> {
  console.log('🔗 Creating case-item pool relationships...')

  try {
    // Clear existing pools
    const { error: deleteError } = await supabaseAdmin
      .from('case_item_pools')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (deleteError && !deleteError.message.includes('0 rows')) {
      console.warn('⚠️  Could not clear existing pools:', deleteError.message)
    }

    if (!cases || !items || cases.length === 0 || items.length === 0) {
      throw new Error('No cases or items found to create pools')
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

    // Check items count by category
    const { data: itemCounts, error: itemCountsError } = await supabaseAdmin
      .from('tarkov_items')
      .select('category, rarity')

    if (itemCountsError) {
      throw new Error(`Items verification failed: ${itemCountsError.message}`)
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
    console.log(`✅ Found ${itemCounts?.length || 0} Tarkov items`)
    console.log(`✅ Found case-item pool relationships`)

    if (cases && cases.length > 0) {
      console.log('\n📦 Available case types:')
      cases.forEach(caseType => {
        console.log(`   - ${caseType.name}: ${caseType.price} currency`)
      })
    }

    if (itemCounts && itemCounts.length > 0) {
      // Group items by category and rarity
      const categoryStats: Record<string, Record<string, number>> = {}
      itemCounts.forEach(item => {
        if (!categoryStats[item.category]) {
          categoryStats[item.category] = {}
        }
        if (!categoryStats[item.category][item.rarity]) {
          categoryStats[item.category][item.rarity] = 0
        }
        categoryStats[item.category][item.rarity]++
      })

      console.log('\n🎯 Items by category and rarity:')
      Object.entries(categoryStats).forEach(([category, rarities]) => {
        const total = Object.values(rarities).reduce((sum, count) => sum + count, 0)
        console.log(`   ${category}: ${total} items`)
        Object.entries(rarities).forEach(([rarity, count]) => {
          console.log(`     - ${rarity}: ${count}`)
        })
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
    // Check if tables exist (they should be created by migration)
    const tablesExist = await checkTablesExist()
    if (!tablesExist) {
      console.log('❌ Case opening tables do not exist.')
      console.log('💡 Please ensure the database migration has been applied first.')
      console.log('   The tables should be created by the migration system.')
      throw new Error('Case opening tables do not exist')
    }

    // Seed the data
    const cases = await seedCaseTypes()
    const items = await seedTarkovItems()
    await createCaseItemPools(cases, items)
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