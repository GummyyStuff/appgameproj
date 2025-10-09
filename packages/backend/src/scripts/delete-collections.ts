#!/usr/bin/env bun
/**
 * Delete All Appwrite Collections
 * Use this to reset and recreate collections with corrected schema
 * Run: bun run src/scripts/delete-collections.ts
 */

import { Databases } from 'node-appwrite';
import { resolve } from 'path';

// Load environment variables
const envPath = resolve(__dirname, '../../.env');
console.log(`Loading environment from: ${envPath}`);

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
}

import { appwriteClient } from '../config/appwrite';
import { DATABASE_ID, COLLECTION_IDS } from '../config/collections';

const databases = new Databases(appwriteClient);

async function deleteCollections() {
  console.log('🗑️  Deleting all collections...\n');

  const collections = Object.values(COLLECTION_IDS);
  
  for (const collectionId of collections) {
    try {
      await databases.deleteCollection(DATABASE_ID, collectionId);
      console.log(`  ✅ Deleted: ${collectionId}`);
    } catch (error: any) {
      if (error.code === 404) {
        console.log(`  ℹ️  Collection doesn't exist: ${collectionId}`);
      } else {
        console.error(`  ❌ Error deleting ${collectionId}:`, error.message);
      }
    }
  }
}

async function main() {
  console.log('🚀 Cleaning up Appwrite collections...');
  console.log('=====================================\n');

  try {
    await deleteCollections();

    console.log('\n=====================================');
    console.log('✅ Cleanup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Run create-collections.ts to recreate with correct schema');
    console.log('2. Run seed-appwrite.ts to populate data');
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  }
}

main();

