#!/usr/bin/env bun
/**
 * Seed Appwrite Database
 * Populates initial data for case types, tarkov items, and case-item pools
 * Run from project root: bun run packages/backend/src/scripts/seed-appwrite.ts
 * Or from backend dir: bun run src/scripts/seed-appwrite.ts
 */

import { resolve } from 'path';

// Load environment variables from backend .env file FIRST
const envPath = resolve(__dirname, '../../.env');
console.log(`Loading environment from: ${envPath}`);

// Manually load .env file for Bun
try {
  const envFile = await Bun.file(envPath).text();
  const lines = envFile.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    }
  }
  console.log('✅ Environment variables loaded\n');
} catch (error) {
  console.error('⚠️  Could not load .env file:', error);
  console.log('Continuing with existing environment variables...\n');
}

// NOW import after env vars are loaded
import { COLLECTION_IDS, DATABASE_ID } from '../config/collections';
import { Databases, ID, Client } from 'node-appwrite';

// Create client directly here instead of importing from appwrite.ts
const appwriteClient = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(appwriteClient);

// Helper functions to match appwriteDb interface
const appwriteDb = {
  async createDocument(collectionId: string, data: any, documentId: string = ID.unique()) {
    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        collectionId,
        documentId,
        data
      );
      return { data: response, error: null };
    } catch (error: any) {
      console.error(`Error creating document in ${collectionId}:`, error);
      return { data: null, error: error.message || 'Failed to create document' };
    }
  }
};

// Case Types Data
const caseTypes = [
  {
    name: 'Starter Case',
    price: 500,
    description: 'A basic case with common items. Perfect for beginners!',
    rarityDistribution: JSON.stringify({
      common: 70,
      uncommon: 20,
      rare: 8,
      epic: 2,
      legendary: 0
    }),
    isActive: true,
  },
  {
    name: 'Military Case',
    price: 1000,
    description: 'Military grade equipment and supplies.',
    rarityDistribution: JSON.stringify({
      common: 50,
      uncommon: 30,
      rare: 15,
      epic: 4,
      legendary: 1
    }),
    isActive: true,
  },
  {
    name: 'Premium Case',
    price: 2500,
    description: 'High-value items with better drop rates.',
    rarityDistribution: JSON.stringify({
      common: 40,
      uncommon: 30,
      rare: 20,
      epic: 8,
      legendary: 2
    }),
    isActive: true,
  },
  {
    name: 'Legendary Case',
    price: 5000,
    description: 'The ultimate case with the best items in Tarkov.',
    rarityDistribution: JSON.stringify({
      common: 30,
      uncommon: 25,
      rare: 25,
      epic: 15,
      legendary: 5
    }),
    isActive: true,
  },
];

// Tarkov Items Data
const tarkovItems = [
  // Common Items
  { name: 'Bandage', rarity: 'common', baseValue: 100, category: 'medical', description: 'Basic medical supply' },
  { name: 'Water Bottle', rarity: 'common', baseValue: 80, category: 'consumables', description: 'Stay hydrated' },
  { name: 'Energy Drink', rarity: 'common', baseValue: 120, category: 'consumables', description: 'Boost your energy' },
  { name: 'Cigarettes', rarity: 'common', baseValue: 90, category: 'consumables', description: 'Reduces stress' },
  
  // Uncommon Items
  { name: 'AI-2 Medikit', rarity: 'uncommon', baseValue: 250, category: 'medical', description: 'Standard medikit' },
  { name: 'Tushonka', rarity: 'uncommon', baseValue: 200, category: 'consumables', description: 'Canned beef stew' },
  { name: 'CPU Fan', rarity: 'uncommon', baseValue: 300, category: 'electronics', description: 'Computer component' },
  { name: 'Bolts', rarity: 'uncommon', baseValue: 180, category: 'valuables', description: 'Pack of bolts' },
  
  // Rare Items
  { name: 'IFAK', rarity: 'rare', baseValue: 600, category: 'medical', description: 'Individual First Aid Kit' },
  { name: 'GPU', rarity: 'rare', baseValue: 800, category: 'electronics', description: 'Graphics Processing Unit' },
  { name: 'Bitcoin', rarity: 'rare', baseValue: 1200, category: 'valuables', description: 'Physical Bitcoin' },
  { name: 'Roler Watch', rarity: 'rare', baseValue: 700, category: 'valuables', description: 'Luxury watch' },
  
  // Epic Items
  { name: 'Grizzly Med Kit', rarity: 'epic', baseValue: 1500, category: 'medical', description: 'Advanced medical kit' },
  { name: 'LEDX', rarity: 'epic', baseValue: 2000, category: 'medical', description: 'Transilluminator' },
  { name: 'Military Cable', rarity: 'epic', baseValue: 1800, category: 'electronics', description: 'Specialized cable' },
  { name: 'Tetriz', rarity: 'epic', baseValue: 1600, category: 'electronics', description: 'Portable game' },
  
  // Legendary Items
  { name: 'Red Keycard', rarity: 'legendary', baseValue: 5000, category: 'keycards', description: 'Access to high-value areas' },
  { name: 'Violet Keycard', rarity: 'legendary', baseValue: 4500, category: 'keycards', description: 'Rare laboratory access' },
  { name: 'Blue Keycard', rarity: 'legendary', baseValue: 4000, category: 'keycards', description: 'Valuable keycard' },
  { name: 'Green Keycard', rarity: 'legendary', baseValue: 3500, category: 'keycards', description: 'Special access card' },
];

async function seedCaseTypes() {
  console.log('\n📦 Seeding case types...');
  
  const createdCases: Record<string, string> = {};
  
  for (const caseData of caseTypes) {
    try {
      const now = new Date().toISOString();
      const { data, error } = await appwriteDb.createDocument(
        COLLECTION_IDS.CASE_TYPES,
        {
          ...caseData,
          createdAt: now,
          updatedAt: now,
        },
        ID.unique()
      );

      if (error) {
        console.error(`  ❌ Failed to create ${caseData.name}:`, error);
      } else if (data) {
        createdCases[caseData.name] = data.$id;
        console.log(`  ✅ Created: ${caseData.name} (${data.$id})`);
      }
    } catch (error) {
      console.error(`  ❌ Error creating ${caseData.name}:`, error);
    }
  }
  
  return createdCases;
}

async function seedTarkovItems() {
  console.log('\n💎 Seeding tarkov items...');
  
  const createdItems: Record<string, string> = {};
  
  for (const itemData of tarkovItems) {
    try {
      const now = new Date().toISOString();
      const { data, error } = await appwriteDb.createDocument(
        COLLECTION_IDS.TARKOV_ITEMS,
        {
          ...itemData,
          isActive: true,
          createdAt: now,
        },
        ID.unique()
      );

      if (error) {
        console.error(`  ❌ Failed to create ${itemData.name}:`, error);
      } else if (data) {
        createdItems[itemData.name] = data.$id;
        console.log(`  ✅ Created: ${itemData.name} (${data.$id})`);
      }
    } catch (error) {
      console.error(`  ❌ Error creating ${itemData.name}:`, error);
    }
  }
  
  return createdItems;
}

async function seedCaseItemPools(
  caseIds: Record<string, string>,
  itemIds: Record<string, string>
) {
  console.log('\n🎲 Seeding case-item pools...');
  
  // Define which items go in which cases with weights
  // Note: Weights scaled x10 to avoid float values < 1 (Appwrite validation requirement)
  const poolMappings = [
    // Starter Case - mostly common and uncommon
    { caseName: 'Starter Case', itemName: 'Bandage', weight: 30, valueMultiplier: 1.0 },
    { caseName: 'Starter Case', itemName: 'Water Bottle', weight: 30, valueMultiplier: 1.0 },
    { caseName: 'Starter Case', itemName: 'Energy Drink', weight: 25, valueMultiplier: 1.0 },
    { caseName: 'Starter Case', itemName: 'Cigarettes', weight: 25, valueMultiplier: 1.0 },
    { caseName: 'Starter Case', itemName: 'AI-2 Medikit', weight: 20, valueMultiplier: 1.2 },
    { caseName: 'Starter Case', itemName: 'Tushonka', weight: 20, valueMultiplier: 1.1 },
    { caseName: 'Starter Case', itemName: 'CPU Fan', weight: 15, valueMultiplier: 1.2 },
    { caseName: 'Starter Case', itemName: 'IFAK', weight: 8, valueMultiplier: 1.5 },
    
    // Military Case - balanced mix
    { caseName: 'Military Case', itemName: 'AI-2 Medikit', weight: 25, valueMultiplier: 1.0 },
    { caseName: 'Military Case', itemName: 'Tushonka', weight: 25, valueMultiplier: 1.0 },
    { caseName: 'Military Case', itemName: 'CPU Fan', weight: 20, valueMultiplier: 1.1 },
    { caseName: 'Military Case', itemName: 'Bolts', weight: 20, valueMultiplier: 1.0 },
    { caseName: 'Military Case', itemName: 'IFAK', weight: 18, valueMultiplier: 1.3 },
    { caseName: 'Military Case', itemName: 'GPU', weight: 15, valueMultiplier: 1.4 },
    { caseName: 'Military Case', itemName: 'Bitcoin', weight: 12, valueMultiplier: 1.5 },
    { caseName: 'Military Case', itemName: 'Grizzly Med Kit', weight: 5, valueMultiplier: 1.8 },
    
    // Premium Case - better items
    { caseName: 'Premium Case', itemName: 'IFAK', weight: 20, valueMultiplier: 1.2 },
    { caseName: 'Premium Case', itemName: 'GPU', weight: 20, valueMultiplier: 1.3 },
    { caseName: 'Premium Case', itemName: 'Bitcoin', weight: 18, valueMultiplier: 1.4 },
    { caseName: 'Premium Case', itemName: 'Roler Watch', weight: 15, valueMultiplier: 1.5 },
    { caseName: 'Premium Case', itemName: 'Grizzly Med Kit', weight: 15, valueMultiplier: 1.6 },
    { caseName: 'Premium Case', itemName: 'LEDX', weight: 10, valueMultiplier: 2.0 },
    { caseName: 'Premium Case', itemName: 'Military Cable', weight: 10, valueMultiplier: 1.8 },
    { caseName: 'Premium Case', itemName: 'Tetriz', weight: 8, valueMultiplier: 1.9 },
    { caseName: 'Premium Case', itemName: 'Red Keycard', weight: 3, valueMultiplier: 2.5 },
    
    // Legendary Case - all items with good chances for legendaries
    { caseName: 'Legendary Case', itemName: 'Bitcoin', weight: 15, valueMultiplier: 1.5 },
    { caseName: 'Legendary Case', itemName: 'Roler Watch', weight: 15, valueMultiplier: 1.6 },
    { caseName: 'Legendary Case', itemName: 'Grizzly Med Kit', weight: 18, valueMultiplier: 1.7 },
    { caseName: 'Legendary Case', itemName: 'LEDX', weight: 18, valueMultiplier: 2.0 },
    { caseName: 'Legendary Case', itemName: 'Military Cable', weight: 15, valueMultiplier: 1.9 },
    { caseName: 'Legendary Case', itemName: 'Tetriz', weight: 15, valueMultiplier: 1.9 },
    { caseName: 'Legendary Case', itemName: 'Red Keycard', weight: 10, valueMultiplier: 3.0 },
    { caseName: 'Legendary Case', itemName: 'Violet Keycard', weight: 10, valueMultiplier: 2.8 },
    { caseName: 'Legendary Case', itemName: 'Blue Keycard', weight: 12, valueMultiplier: 2.6 },
    { caseName: 'Legendary Case', itemName: 'Green Keycard', weight: 12, valueMultiplier: 2.4 },
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  for (const mapping of poolMappings) {
    const caseTypeId = caseIds[mapping.caseName];
    const itemId = itemIds[mapping.itemName];
    
    if (!caseTypeId || !itemId) {
      console.error(`  ❌ Missing case or item: ${mapping.caseName} / ${mapping.itemName}`);
      failCount++;
      continue;
    }
    
    try {
      const caseItemKey = `${caseTypeId}_${itemId}`;
      const now = new Date().toISOString();
      
      const { error } = await appwriteDb.createDocument(
        COLLECTION_IDS.CASE_ITEM_POOLS,
        {
          caseTypeId,
          itemId,
          weight: mapping.weight,
          valueMultiplier: mapping.valueMultiplier,
          caseItemKey,
          createdAt: now,
        },
        ID.unique()
      );

      if (error) {
        console.error(`  ❌ Failed to link ${mapping.itemName} to ${mapping.caseName}:`, error);
        failCount++;
      } else {
        successCount++;
      }
    } catch (error) {
      console.error(`  ❌ Error linking ${mapping.itemName} to ${mapping.caseName}:`, error);
      failCount++;
    }
  }
  
  console.log(`  ✅ Created ${successCount} pool entries`);
  if (failCount > 0) {
    console.log(`  ❌ Failed: ${failCount} pool entries`);
  }
}

async function main() {
  console.log('🚀 Starting Appwrite database seeding...');
  console.log('=========================================\n');

  try {
    // Seed case types
    const caseIds = await seedCaseTypes();
    
    // Seed tarkov items
    const itemIds = await seedTarkovItems();
    
    // Seed case-item pools
    await seedCaseItemPools(caseIds, itemIds);

    console.log('\n=========================================');
    console.log('✅ Database seeding completed!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Case Types: ${Object.keys(caseIds).length}`);
    console.log(`   - Tarkov Items: ${Object.keys(itemIds).length}`);
    console.log('\n📋 Next steps:');
    console.log('1. Verify data in Appwrite console');
    console.log('2. Test case opening in the application');
    console.log('3. Adjust weights and values as needed');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();

