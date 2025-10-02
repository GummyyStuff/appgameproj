#!/usr/bin/env bun

/**
 * Chat Cleanup Job
 * 
 * This script performs cleanup of chat messages:
 * - Hard delete soft-deleted messages after 1 day
 * - Hard delete all messages after 30 days
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanupChatMessages() {
  try {
    console.log('🧹 Starting chat cleanup job...');

    // Hard delete soft-deleted messages after 1 day
    const { data: softDeleted, error: softDeleteError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('is_deleted', true)
      .lt('deleted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (softDeleteError) {
      console.error('❌ Failed to delete soft-deleted messages:', softDeleteError);
      throw softDeleteError;
    }

    console.log(`✅ Hard deleted soft-deleted messages`);

    // Hard delete all messages after 30 days
    const { data: oldMessages, error: oldDeleteError } = await supabase
      .from('chat_messages')
      .delete()
      .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (oldDeleteError) {
      console.error('❌ Failed to delete old messages:', oldDeleteError);
      throw oldDeleteError;
    }

    console.log(`✅ Hard deleted old messages (30+ days)`);

    console.log('\n🎉 Chat cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Failed to cleanup chat messages:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupChatMessages();
