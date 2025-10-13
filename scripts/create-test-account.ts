#!/usr/bin/env bun
/**
 * Script to create a test account in Appwrite for local development
 * 
 * Usage:
 *   bun run scripts/create-test-account.ts
 *   bun run scripts/create-test-account.ts test@example.com password123
 */

import { Client, Account, ID } from 'node-appwrite';

// Load environment variables
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID) {
  console.error('❌ Missing required environment variables:');
  console.error('   APPWRITE_ENDPOINT:', APPWRITE_ENDPOINT ? '✓' : '✗');
  console.error('   APPWRITE_PROJECT_ID:', APPWRITE_PROJECT_ID ? '✓' : '✗');
  console.error('\nPlease set these in packages/backend/.env or your environment');
  process.exit(1);
}

// Get email and password from command line or use defaults
const email = process.argv[2] || 'test@example.com';
const password = process.argv[3] || 'testpassword123';
const name = process.argv[4] || 'Test User';

// Validate inputs
if (password.length < 8) {
  console.error('❌ Password must be at least 8 characters long');
  process.exit(1);
}

console.log('🔧 Creating test account...');
console.log('   Email:', email);
console.log('   Password:', '*'.repeat(password.length));
console.log('   Name:', name);
console.log('');

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const account = new Account(client);

async function createTestAccount() {
  try {
    // Create account with email/password
    const user = await account.create(
      ID.unique(),
      email,
      password,
      name
    );

    console.log('✅ Test account created successfully!');
    console.log('');
    console.log('📋 Account Details:');
    console.log('   User ID:', user.$id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('');
    console.log('🔐 Login Credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('');
    console.log('🎮 You can now log in at http://localhost:3000/login');
    console.log('   Use the "Test Login" form in development mode');
    
  } catch (error: any) {
    if (error.code === 409) {
      console.error('❌ Account already exists with this email');
      console.log('');
      console.log('💡 Try logging in with:');
      console.log('   Email:', email);
      console.log('   Password:', password);
      console.log('');
      console.log('Or create a new account with a different email:');
      console.log('   bun run scripts/create-test-account.ts newemail@example.com password123');
    } else {
      console.error('❌ Failed to create account:', error.message);
      console.error('');
      console.error('Error details:', error);
    }
    process.exit(1);
  }
}

createTestAccount();

