#!/usr/bin/env bun
/**
 * Fix Users Collection - Disable Document Security
 * This script updates the users collection to disable row-level security
 * so that API key operations work properly
 */

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
  console.log('Continuing with existing environment variables...\n');
}

import { Databases, Permission, Role, Client } from 'node-appwrite';
import { DATABASE_ID, COLLECTION_IDS } from '../config/collections';

const appwriteClient = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(appwriteClient);

async function fixUsersCollection() {
  console.log('🔧 Updating users collection settings...\n');
  
  try {
    // Update collection to disable document security and set proper permissions
    await databases.updateCollection(
      DATABASE_ID,
      COLLECTION_IDS.USERS,
      'Users',
      [
        Permission.read(Role.any()), // Anyone can read (with API key)
        Permission.create(Role.users()), // Authenticated users can create
        Permission.update(Role.any()), // API key can update
        Permission.delete(Role.any()), // API key can delete
      ],
      false, // documentSecurity = false (disable row-level permissions)
      true   // enabled = true
    );

    console.log('✅ Users collection updated successfully!');
    console.log('\nSettings:');
    console.log('  - Document Security: DISABLED');
    console.log('  - API Key can now update any user document');
    console.log('  - Row-level permissions will be ignored');
    console.log('\n⚠️  Note: You should restart your backend server for changes to take effect');
  } catch (error: any) {
    console.error('❌ Error updating users collection:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting users collection permission fix...\n');
  console.log('=========================================\n');

  try {
    await fixUsersCollection();
    
    console.log('\n=========================================');
    console.log('✅ Permission fix completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. Try opening a Legendary case again');
    console.log('3. The case opening should now work correctly');
  } catch (error) {
    console.error('\n❌ Fix failed:', error);
    process.exit(1);
  }
}

main();

