#!/usr/bin/env bun
/**
 * Create Appwrite Collections Script
 * This script creates all necessary collections for the Tarkov Casino application
 * Run from project root: bun run packages/backend/src/scripts/create-collections.ts
 * Or from backend dir: bun run src/scripts/create-collections.ts
 */

import { Databases, ID, Permission, Role } from 'node-appwrite';
import { resolve } from 'path';

// Load environment variables from backend .env file
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

import { appwriteClient } from '../config/appwrite';
import { DATABASE_ID, COLLECTION_IDS } from '../config/collections';

const databases = new Databases(appwriteClient);

async function createDatabase() {
  try {
    console.log(`\n📦 Creating database: ${DATABASE_ID}...`);
    await databases.create(DATABASE_ID, DATABASE_ID);
    console.log('✅ Database created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('ℹ️  Database already exists');
    } else {
      console.error('❌ Error creating database:', error.message);
      throw error;
    }
  }
}

async function createUsersCollection() {
  console.log('\n👤 Creating users collection...');
  
  try {
    // Create collection
    await databases.createCollection(
      DATABASE_ID,
      COLLECTION_IDS.USERS,
      'Users',
      [
        Permission.read(Role.any()), // Server can read via API key
        Permission.create(Role.users()), // Authenticated users can create
      ]
    );

    // Add attributes (required ones CANNOT have defaults in Appwrite 1.7.4)
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.USERS, 'userId', 36, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.USERS, 'username', 50, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.USERS, 'displayName', 100, false);
    await databases.createFloatAttribute(DATABASE_ID, COLLECTION_IDS.USERS, 'balance', false, 10000); // Optional with default
    await databases.createFloatAttribute(DATABASE_ID, COLLECTION_IDS.USERS, 'totalWagered', false, 0); // Optional with default
    await databases.createFloatAttribute(DATABASE_ID, COLLECTION_IDS.USERS, 'totalWon', false, 0); // Optional with default
    await databases.createIntegerAttribute(DATABASE_ID, COLLECTION_IDS.USERS, 'gamesPlayed', false, 0); // Optional with default
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTION_IDS.USERS, 'lastDailyBonus', false);
    await databases.createBooleanAttribute(DATABASE_ID, COLLECTION_IDS.USERS, 'isModerator', false, false); // Optional with default
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.USERS, 'avatarPath', 255, false); // Use string instead of url for compatibility
    await databases.createIntegerAttribute(DATABASE_ID, COLLECTION_IDS.USERS, 'chatRulesVersion', false, 1); // Optional with default
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTION_IDS.USERS, 'chatRulesAcceptedAt', false);
    await databases.createBooleanAttribute(DATABASE_ID, COLLECTION_IDS.USERS, 'isActive', false, true); // Optional with default
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTION_IDS.USERS, 'createdAt', true);
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTION_IDS.USERS, 'updatedAt', true);

    // Create indexes
    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.USERS, 'username_idx', 'unique', ['username']);
    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.USERS, 'userId_idx', 'key', ['userId']);

    console.log('✅ Users collection created');
  } catch (error: any) {
    console.error('❌ Error creating users collection:', error.message);
  }
}

async function createGameHistoryCollection() {
  console.log('\n🎮 Creating game_history collection...');
  
  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTION_IDS.GAME_HISTORY,
      'Game History',
      [] // Server-side only access
    );

    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.GAME_HISTORY, 'userId', 36, true);
    await databases.createEnumAttribute(DATABASE_ID, COLLECTION_IDS.GAME_HISTORY, 'gameType', ['roulette', 'blackjack', 'case_opening'], true);
    await databases.createFloatAttribute(DATABASE_ID, COLLECTION_IDS.GAME_HISTORY, 'betAmount', true);
    await databases.createFloatAttribute(DATABASE_ID, COLLECTION_IDS.GAME_HISTORY, 'winAmount', false, 0); // Optional with default
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.GAME_HISTORY, 'resultData', 10000, true);
    await databases.createIntegerAttribute(DATABASE_ID, COLLECTION_IDS.GAME_HISTORY, 'gameDuration', false);
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTION_IDS.GAME_HISTORY, 'createdAt', true);

    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.GAME_HISTORY, 'userId_idx', 'key', ['userId']);
    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.GAME_HISTORY, 'createdAt_idx', 'key', ['createdAt']);
    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.GAME_HISTORY, 'gameType_idx', 'key', ['gameType']);

    console.log('✅ Game history collection created');
  } catch (error: any) {
    console.error('❌ Error creating game_history collection:', error.message);
  }
}

async function createDailyBonusesCollection() {
  console.log('\n🎁 Creating daily_bonuses collection...');
  
  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTION_IDS.DAILY_BONUSES,
      'Daily Bonuses',
      [] // Server-side only
    );

    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.DAILY_BONUSES, 'userId', 36, true);
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTION_IDS.DAILY_BONUSES, 'bonusDate', true);
    await databases.createFloatAttribute(DATABASE_ID, COLLECTION_IDS.DAILY_BONUSES, 'bonusAmount', true);
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTION_IDS.DAILY_BONUSES, 'claimedAt', true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.DAILY_BONUSES, 'userBonusKey', 100, true);

    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.DAILY_BONUSES, 'userBonusKey_idx', 'unique', ['userBonusKey']);
    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.DAILY_BONUSES, 'userId_idx', 'key', ['userId']);

    console.log('✅ Daily bonuses collection created');
  } catch (error: any) {
    console.error('❌ Error creating daily_bonuses collection:', error.message);
  }
}

async function createCaseTypesCollection() {
  console.log('\n📦 Creating case_types collection...');
  
  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTION_IDS.CASE_TYPES,
      'Case Types',
      [Permission.read(Role.any())] // Public read
    );

    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.CASE_TYPES, 'name', 100, true);
    await databases.createFloatAttribute(DATABASE_ID, COLLECTION_IDS.CASE_TYPES, 'price', true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.CASE_TYPES, 'description', 1000, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.CASE_TYPES, 'imageUrl', 500, false); // Use string instead of url
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.CASE_TYPES, 'rarityDistribution', 500, true);
    await databases.createBooleanAttribute(DATABASE_ID, COLLECTION_IDS.CASE_TYPES, 'isActive', false, true); // Optional with default
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTION_IDS.CASE_TYPES, 'createdAt', true);
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTION_IDS.CASE_TYPES, 'updatedAt', true);

    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.CASE_TYPES, 'name_idx', 'unique', ['name']);

    console.log('✅ Case types collection created');
  } catch (error: any) {
    console.error('❌ Error creating case_types collection:', error.message);
  }
}

async function createTarkovItemsCollection() {
  console.log('\n💎 Creating tarkov_items collection...');
  
  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTION_IDS.TARKOV_ITEMS,
      'Tarkov Items',
      [Permission.read(Role.any())] // Public read
    );

    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.TARKOV_ITEMS, 'name', 100, true);
    await databases.createEnumAttribute(DATABASE_ID, COLLECTION_IDS.TARKOV_ITEMS, 'rarity', ['common', 'uncommon', 'rare', 'epic', 'legendary'], true);
    await databases.createFloatAttribute(DATABASE_ID, COLLECTION_IDS.TARKOV_ITEMS, 'baseValue', true);
    await databases.createEnumAttribute(DATABASE_ID, COLLECTION_IDS.TARKOV_ITEMS, 'category', ['medical', 'electronics', 'consumables', 'valuables', 'keycards'], true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.TARKOV_ITEMS, 'imageUrl', 500, false); // Use string instead of url
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.TARKOV_ITEMS, 'description', 1000, false);
    await databases.createBooleanAttribute(DATABASE_ID, COLLECTION_IDS.TARKOV_ITEMS, 'isActive', false, true); // Optional with default
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTION_IDS.TARKOV_ITEMS, 'createdAt', true);

    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.TARKOV_ITEMS, 'name_idx', 'unique', ['name']);
    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.TARKOV_ITEMS, 'rarity_idx', 'key', ['rarity']);

    console.log('✅ Tarkov items collection created');
  } catch (error: any) {
    console.error('❌ Error creating tarkov_items collection:', error.message);
  }
}

async function createCaseItemPoolsCollection() {
  console.log('\n🎲 Creating case_item_pools collection...');
  
  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTION_IDS.CASE_ITEM_POOLS,
      'Case Item Pools',
      [Permission.read(Role.any())] // Public read
    );

    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.CASE_ITEM_POOLS, 'caseTypeId', 36, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.CASE_ITEM_POOLS, 'itemId', 36, true);
    await databases.createFloatAttribute(DATABASE_ID, COLLECTION_IDS.CASE_ITEM_POOLS, 'weight', false, 1.0); // Optional with default
    await databases.createFloatAttribute(DATABASE_ID, COLLECTION_IDS.CASE_ITEM_POOLS, 'valueMultiplier', false, 1.0); // Optional with default
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTION_IDS.CASE_ITEM_POOLS, 'createdAt', true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.CASE_ITEM_POOLS, 'caseItemKey', 100, true);

    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.CASE_ITEM_POOLS, 'caseItemKey_idx', 'unique', ['caseItemKey']);
    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.CASE_ITEM_POOLS, 'caseTypeId_idx', 'key', ['caseTypeId']);
    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.CASE_ITEM_POOLS, 'itemId_idx', 'key', ['itemId']);

    console.log('✅ Case item pools collection created');
  } catch (error: any) {
    console.error('❌ Error creating case_item_pools collection:', error.message);
  }
}

async function createChatMessagesCollection() {
  console.log('\n💬 Creating chat_messages collection...');
  
  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTION_IDS.CHAT_MESSAGES,
      'Chat Messages',
      [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
      ]
    );

    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.CHAT_MESSAGES, 'userId', 36, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.CHAT_MESSAGES, 'username', 50, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.CHAT_MESSAGES, 'content', 500, true);
    await databases.createBooleanAttribute(DATABASE_ID, COLLECTION_IDS.CHAT_MESSAGES, 'isDeleted', false, false); // Optional with default
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTION_IDS.CHAT_MESSAGES, 'deletedAt', false);
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.CHAT_MESSAGES, 'deletedBy', 36, false);
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTION_IDS.CHAT_MESSAGES, 'createdAt', true);
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTION_IDS.CHAT_MESSAGES, 'updatedAt', true);

    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.CHAT_MESSAGES, 'userId_idx', 'key', ['userId']);
    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.CHAT_MESSAGES, 'createdAt_idx', 'key', ['createdAt']);

    console.log('✅ Chat messages collection created');
  } catch (error: any) {
    console.error('❌ Error creating chat_messages collection:', error.message);
  }
}

async function createChatPresenceCollection() {
  console.log('\n👥 Creating chat_presence collection...');
  
  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTION_IDS.CHAT_PRESENCE,
      'Chat Presence',
      [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
      ]
    );

    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.CHAT_PRESENCE, 'userId', 36, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.CHAT_PRESENCE, 'username', 50, true);
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTION_IDS.CHAT_PRESENCE, 'lastSeen', true);
    await databases.createBooleanAttribute(DATABASE_ID, COLLECTION_IDS.CHAT_PRESENCE, 'isOnline', false, true); // Optional with default

    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.CHAT_PRESENCE, 'userId_idx', 'unique', ['userId']);

    console.log('✅ Chat presence collection created');
  } catch (error: any) {
    console.error('❌ Error creating chat_presence collection:', error.message);
  }
}

async function createAuditLogsCollection() {
  console.log('\n📝 Creating audit_logs collection...');
  
  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTION_IDS.AUDIT_LOGS,
      'Audit Logs',
      [] // Server-side only
    );

    // Simplified attributes to avoid hitting limit
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.AUDIT_LOGS, 'userId', 36, false);
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.AUDIT_LOGS, 'action', 100, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.AUDIT_LOGS, 'resourceType', 50, true);
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTION_IDS.AUDIT_LOGS, 'timestamp', true);
    await databases.createBooleanAttribute(DATABASE_ID, COLLECTION_IDS.AUDIT_LOGS, 'success', false, true); // Optional with default
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_IDS.AUDIT_LOGS, 'details', 10000, false); // Combined all other fields into one JSON field

    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.AUDIT_LOGS, 'userId_idx', 'key', ['userId']);
    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.AUDIT_LOGS, 'timestamp_idx', 'key', ['timestamp']);
    await databases.createIndex(DATABASE_ID, COLLECTION_IDS.AUDIT_LOGS, 'resourceType_idx', 'key', ['resourceType']);

    console.log('✅ Audit logs collection created');
  } catch (error: any) {
    console.error('❌ Error creating audit_logs collection:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting Appwrite collection setup...');
  console.log('=====================================\n');

  try {
    await createDatabase();
    await createUsersCollection();
    await createGameHistoryCollection();
    await createDailyBonusesCollection();
    await createCaseTypesCollection();
    await createTarkovItemsCollection();
    await createCaseItemPoolsCollection();
    await createChatMessagesCollection();
    await createChatPresenceCollection();
    await createAuditLogsCollection();

    console.log('\n=====================================');
    console.log('✅ All collections created successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Verify collections in Appwrite console');
    console.log('2. Run seed script to add initial data');
    console.log('3. Update environment variables');
    console.log('4. Test the application');
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

main();

