/**
 * Fix Balance Attribute Constraint
 * Updates the balance attribute to allow values below 10,000
 * Run: bun run packages/backend/src/scripts/fix-balance-constraint.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Client, Databases } from 'node-appwrite';
import { COLLECTION_IDS } from '../config/collections';

// Load environment variables from .env file
try {
  const envFile = readFileSync(join(process.cwd(), '.env'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && !key.startsWith('#')) {
      const value = values.join('=').trim().replace(/^["']|["']$/g, '');
      if (value) {
        process.env[key.trim()] = value;
      }
    }
  });
} catch (e) {
  console.log('⚠️  .env file not found, using environment variables');
}

// Verify required env vars
if (!process.env.APPWRITE_ENDPOINT || !process.env.APPWRITE_PROJECT_ID || !process.env.APPWRITE_API_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   APPWRITE_ENDPOINT:', process.env.APPWRITE_ENDPOINT ? '✓' : '✗');
  console.error('   APPWRITE_PROJECT_ID:', process.env.APPWRITE_PROJECT_ID ? '✓' : '✗');
  console.error('   APPWRITE_API_KEY:', process.env.APPWRITE_API_KEY ? '✓' : '✗');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'main_db';

async function fixBalanceConstraint() {
  console.log('🔧 Fixing balance attribute constraint...');
  
  try {
    // Update balance attribute to allow values from 0 to very large number
    // This removes the 10,000 minimum constraint
    await databases.updateFloatAttribute(
      DATABASE_ID,
      COLLECTION_IDS.USERS,
      'balance',
      false, // required
      0, // min value (allow balance to go to 0)
      Number.MAX_SAFE_INTEGER, // max value
      10000 // default value for new documents
    );
    
    console.log('✅ Balance attribute updated successfully!');
    console.log('   - Minimum: 0');
    console.log('   - Maximum:', Number.MAX_SAFE_INTEGER);
    console.log('   - Default: 10000');
  } catch (error) {
    console.error('❌ Error updating balance attribute:', error);
    throw error;
  }
}

fixBalanceConstraint()
  .then(() => {
    console.log('\n✅ Done! Users can now have balances below 10,000.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed to fix balance constraint');
    console.error(error);
    process.exit(1);
  });

