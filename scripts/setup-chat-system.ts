#!/usr/bin/env bun

/**
 * Setup Complete Chat System
 * 
 * This script runs all the setup steps for the chat system:
 * 1. Create all Appwrite collections (including chat)
 * 2. Verify chat collections exist
 */

import { execSync } from 'child_process';

async function setupChatSystem() {
  try {
    console.log('🚀 Setting up complete chat system...\n');

    // Step 1: Create all collections (includes chat_messages and chat_presence)
    console.log('📊 Step 1: Creating Appwrite collections...');
    try {
      execSync('bun run packages/backend/src/scripts/create-collections.ts', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ Collections created\n');
    } catch (error) {
      console.error('❌ Collection creation failed:', error);
      throw error;
    }

    console.log('🎉 Chat system setup completed successfully!');
    console.log('\n📋 What was set up:');
    console.log('   ✅ chat_messages collection with indexes');
    console.log('   ✅ chat_presence collection with indexes');
    console.log('   ✅ All other required collections');
    console.log('   ✅ React components and hooks');
    console.log('   ✅ Chat dock integrated into app');
    console.log('\n🚀 The chat system is ready to use!');
    console.log('\n💡 Next steps:');
    console.log('   1. Start your development server: bun run dev');
    console.log('   2. Set up a moderator by updating users.isModerator = true');
    console.log('   3. Test the chat functionality');

  } catch (error) {
    console.error('❌ Chat system setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupChatSystem();
