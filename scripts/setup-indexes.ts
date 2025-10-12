#!/usr/bin/env bun
/**
 * Script to check and create Appwrite indexes for optimal query performance
 * Ensures leaderboard queries are fast by indexing balance, totalWon, etc.
 */

import { Client, Databases } from 'node-appwrite';

// Environment variables
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'main_db';
const USERS_COLLECTION = 'users';

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   APPWRITE_ENDPOINT');
  console.error('   APPWRITE_PROJECT_ID');
  console.error('   APPWRITE_API_KEY');
  process.exit(1);
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

interface IndexInfo {
  key: string;
  type: 'key' | 'fulltext' | 'unique';
  attributes: string[];
  orders: string[];
  status: string;
}

/**
 * Indexes needed for optimal leaderboard performance
 */
const REQUIRED_INDEXES = [
  {
    key: 'balance_desc',
    type: 'key' as const,
    attributes: ['balance'],
    orders: ['DESC'],
    reason: 'Leaderboard by balance'
  },
  {
    key: 'totalWon_desc',
    type: 'key' as const,
    attributes: ['totalWon'],
    orders: ['DESC'],
    reason: 'Leaderboard by total winnings'
  },
  {
    key: 'gamesPlayed_desc',
    type: 'key' as const,
    attributes: ['gamesPlayed'],
    orders: ['DESC'],
    reason: 'Leaderboard by games played'
  },
  {
    key: 'totalWagered_desc',
    type: 'key' as const,
    attributes: ['totalWagered'],
    orders: ['DESC'],
    reason: 'Leaderboard by total wagered'
  },
  {
    key: 'isActive_index',
    type: 'key' as const,
    attributes: ['isActive'],
    orders: ['ASC'],
    reason: 'Filter active users efficiently'
  }
];

async function listExistingIndexes(): Promise<IndexInfo[]> {
  try {
    console.log('📋 Fetching existing indexes...\n');
    
    const collection = await databases.getCollection(DATABASE_ID, USERS_COLLECTION);
    
    if (!collection.indexes || collection.indexes.length === 0) {
      console.log('⚠️  No indexes found on users collection');
      return [];
    }
    
    console.log(`✅ Found ${collection.indexes.length} existing indexes:\n`);
    
    collection.indexes.forEach((index: any) => {
      const statusEmoji = index.status === 'available' ? '✅' : '⏳';
      console.log(`${statusEmoji} ${index.key}:`);
      console.log(`   Attributes: ${index.attributes.join(', ')}`);
      console.log(`   Orders: ${index.orders?.join(', ') || 'N/A'}`);
      console.log(`   Status: ${index.status}`);
      console.log('');
    });
    
    return collection.indexes as IndexInfo[];
  } catch (error: any) {
    console.error('❌ Error fetching indexes:', error.message);
    return [];
  }
}

async function createIndex(
  key: string,
  type: 'key' | 'fulltext' | 'unique',
  attributes: string[],
  orders: string[] = []
): Promise<boolean> {
  try {
    console.log(`📝 Creating index: ${key}...`);
    
    await databases.createIndex(
      DATABASE_ID,
      USERS_COLLECTION,
      key,
      type,
      attributes,
      orders
    );
    
    console.log(`✅ Index ${key} created successfully\n`);
    return true;
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.code === 409) {
      console.log(`ℹ️  Index ${key} already exists\n`);
      return true;
    }
    console.error(`❌ Failed to create index ${key}:`, error.message, '\n');
    return false;
  }
}

async function main() {
  console.log('🔍 Appwrite Index Management Tool\n');
  console.log('━'.repeat(60));
  console.log(`Database: ${DATABASE_ID}`);
  console.log(`Collection: ${USERS_COLLECTION}`);
  console.log('━'.repeat(60));
  console.log('');
  
  // List existing indexes
  const existingIndexes = await listExistingIndexes();
  const existingKeys = existingIndexes.map(idx => idx.key);
  
  // Check which indexes need to be created
  const missingIndexes = REQUIRED_INDEXES.filter(
    req => !existingKeys.includes(req.key)
  );
  
  if (missingIndexes.length === 0) {
    console.log('✅ All required indexes are already present!\n');
    
    console.log('📊 Performance Impact:');
    console.log('━'.repeat(60));
    REQUIRED_INDEXES.forEach(idx => {
      const exists = existingKeys.includes(idx.key);
      console.log(`${exists ? '✅' : '❌'} ${idx.key}: ${idx.reason}`);
    });
    console.log('');
    
    return;
  }
  
  // Create missing indexes
  console.log(`⚠️  Found ${missingIndexes.length} missing indexes\n`);
  console.log('Creating missing indexes...\n');
  console.log('━'.repeat(60));
  console.log('');
  
  let successCount = 0;
  
  for (const index of missingIndexes) {
    console.log(`📝 ${index.key} - ${index.reason}`);
    const success = await createIndex(
      index.key,
      index.type,
      index.attributes,
      index.orders
    );
    
    if (success) {
      successCount++;
    }
    
    // Wait a bit between creates to avoid rate limiting
    await Bun.sleep(1000);
  }
  
  console.log('━'.repeat(60));
  console.log(`\n✅ Created ${successCount}/${missingIndexes.length} indexes\n`);
  
  // Show performance impact
  console.log('📊 Expected Performance Improvements:');
  console.log('━'.repeat(60));
  console.log('Leaderboard queries:');
  console.log('  Before: Full collection scan (~500-1000ms for 10k users)');
  console.log('  After:  Index scan (~10-50ms)');
  console.log('  Improvement: 10-100x faster! 🚀');
  console.log('');
  console.log('💡 Note: Indexes may take a few minutes to build for large datasets');
  console.log('');
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

