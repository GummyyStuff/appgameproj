/**
 * Diagnose Appwrite Connection Issues
 * Tests network connectivity to Appwrite endpoint
 */

import { appwriteClient } from '../config/appwrite';
import { Databases, Health } from 'node-appwrite';

async function diagnoseConnection() {
  console.log('🔍 Diagnosing Appwrite Connection...\n');
  
  const endpoint = process.env.APPWRITE_ENDPOINT!;
  const projectId = process.env.APPWRITE_PROJECT_ID!;
  
  console.log('Configuration:');
  console.log('  Endpoint:', endpoint);
  console.log('  Project ID:', projectId);
  console.log('  API Key:', process.env.APPWRITE_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('');
  
  // Test 1: DNS Resolution
  console.log('1️⃣ Testing DNS resolution...');
  try {
    const url = new URL(endpoint);
    console.log('  Hostname:', url.hostname);
    
    // Try to resolve DNS using fetch with verbose error
    const response = await fetch(`${endpoint}/health/version`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    console.log('  ✅ DNS resolved, endpoint reachable');
    console.log('  Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('  Appwrite version:', data);
    }
  } catch (error: any) {
    console.error('  ❌ Connection failed:', error.message);
    console.error('  Error code:', error.code);
    console.error('  Error cause:', error.cause);
  }
  console.log('');
  
  // Test 2: Appwrite Client Test
  console.log('2️⃣ Testing Appwrite client...');
  try {
    const health = new Health(appwriteClient);
    const version = await health.get();
    console.log('  ✅ Appwrite client working');
    console.log('  Server version:', version.version);
  } catch (error: any) {
    console.error('  ❌ Client test failed:', error.message);
    console.error('  Error type:', error.type);
    console.error('  Error code:', error.code);
  }
  console.log('');
  
  // Test 3: Database Query Test
  console.log('3️⃣ Testing database query...');
  try {
    const databases = new Databases(appwriteClient);
    const result = await databases.list();
    console.log('  ✅ Database query successful');
    console.log('  Databases found:', result.total);
  } catch (error: any) {
    console.error('  ❌ Database query failed:', error.message);
    console.error('  Full error:', error);
  }
  
  console.log('\n✅ Diagnosis complete');
}

diagnoseConnection().catch(error => {
  console.error('Fatal error during diagnosis:', error);
  process.exit(1);
});

