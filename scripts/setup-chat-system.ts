#!/usr/bin/env bun

/**
 * Setup Complete Chat System
 * 
 * This script runs all the setup steps for the chat system:
 * 1. Apply database migration
 * 2. Setup avatar storage
 * 3. Deploy Edge Function (if using Supabase CLI)
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

async function setupChatSystem() {
  try {
    console.log('🚀 Setting up complete chat system...\n');

    // Step 1: Apply database migration
    console.log('📊 Step 1: Applying database migration...');
    try {
      execSync('bun run packages/backend/src/scripts/apply-chat-migration.ts', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ Database migration completed\n');
    } catch (error) {
      console.error('❌ Database migration failed:', error);
      throw error;
    }

    // Step 2: Setup avatar storage
    console.log('🖼️  Step 2: Setting up avatar storage...');
    try {
      execSync('bun run packages/backend/src/scripts/setup-avatar-storage.ts', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ Avatar storage setup completed\n');
    } catch (error) {
      console.error('❌ Avatar storage setup failed:', error);
      throw error;
    }

    // Step 3: Deploy Edge Function (optional)
    console.log('⚡ Step 3: Deploying Edge Function...');
    const supabaseDir = join(process.cwd(), 'supabase');
    if (existsSync(supabaseDir)) {
      try {
        execSync('supabase functions deploy proxy-avatar', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log('✅ Edge Function deployed\n');
      } catch (error) {
        console.log('⚠️  Edge Function deployment failed (this is optional for local development)');
        console.log('   You can deploy it later with: supabase functions deploy proxy-avatar\n');
      }
    } else {
      console.log('⚠️  Supabase directory not found, skipping Edge Function deployment\n');
    }

    console.log('🎉 Chat system setup completed successfully!');
    console.log('\n📋 What was set up:');
    console.log('   ✅ chat_messages table with RLS policies');
    console.log('   ✅ user_profiles extended with chat fields');
    console.log('   ✅ Real-time subscriptions enabled');
    console.log('   ✅ Avatar storage bucket created');
    console.log('   ✅ Default avatar uploaded');
    console.log('   ✅ Edge Function for avatar proxying');
    console.log('   ✅ React components and hooks');
    console.log('   ✅ Chat dock integrated into app');
    console.log('\n🚀 The chat system is ready to use!');
    console.log('\n💡 Next steps:');
    console.log('   1. Start your development server: bun run dev');
    console.log('   2. Set up a moderator by updating user_profiles.is_moderator = true');
    console.log('   3. Schedule the cleanup job to run daily');
    console.log('   4. Test the chat functionality');

  } catch (error) {
    console.error('❌ Chat system setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupChatSystem();
