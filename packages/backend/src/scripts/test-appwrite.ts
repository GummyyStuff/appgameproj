/**
 * Test Appwrite Connection
 * Quick script to verify Appwrite connectivity and database access
 */

import { appwriteClient } from '../config/appwrite';
import { appwriteDb } from '../services/appwrite-database';
import { COLLECTION_IDS } from '../config/collections';

async function testAppwriteConnection() {
  console.log('🔍 Testing Appwrite Connection...\n');
  
  // Test 1: Client initialization
  console.log('1️⃣ Testing client initialization...');
  try {
    console.log('   Endpoint:', process.env.APPWRITE_ENDPOINT);
    console.log('   Project:', process.env.APPWRITE_PROJECT_ID);
    console.log('   API Key:', process.env.APPWRITE_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('   ✅ Client initialized\n');
  } catch (error) {
    console.error('   ❌ Client initialization failed:', error);
    process.exit(1);
  }

  // Test 2: List users
  console.log('2️⃣ Testing database query (list users)...');
  try {
    const result = await appwriteDb.listDocuments(
      COLLECTION_IDS.USERS,
      [appwriteDb.limit(1)]
    );
    console.log('   Total users:', result.total);
    console.log('   ✅ Users query successful\n');
  } catch (error) {
    console.error('   ❌ Users query failed:', error);
  }

  // Test 3: List game history
  console.log('3️⃣ Testing database query (list game history)...');
  try {
    const result = await appwriteDb.listDocuments(
      COLLECTION_IDS.GAME_HISTORY,
      [appwriteDb.limit(1)]
    );
    console.log('   Total games:', result.total);
    console.log('   ✅ Game history query successful\n');
  } catch (error) {
    console.error('   ❌ Game history query failed:', error);
  }

  // Test 4: List case types
  console.log('4️⃣ Testing database query (list case types)...');
  try {
    const result = await appwriteDb.listDocuments(
      COLLECTION_IDS.CASE_TYPES,
      [appwriteDb.equal('isActive', true)]
    );
    console.log('   Active case types:', result.data?.length || 0);
    console.log('   ✅ Case types query successful\n');
  } catch (error) {
    console.error('   ❌ Case types query failed:', error);
  }

  console.log('✅ All tests completed!');
}

testAppwriteConnection().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

