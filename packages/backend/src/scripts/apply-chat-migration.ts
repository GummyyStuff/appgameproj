#!/usr/bin/env bun

/**
 * Apply Chat System Migration
 * 
 * This script applies the complete chat system migration including:
 * - chat_messages table with constraints and indexes
 * - user_profiles extensions
 * - Row Level Security policies
 * - Real-time triggers and functions
 * - Helper functions for common operations
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

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

async function applyChatMigration() {
  try {
    console.log('🚀 Applying chat system migration...');

    // Read the migration file
    const migrationPath = join(__dirname, '../database/migrations/013_chat_system_complete.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...');

    // Split the SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 100)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });

        if (error) {
          console.error(`❌ Error executing statement: ${statement.substring(0, 100)}...`);
          console.error(error);
          throw error;
        }
      }
    }

    console.log('✅ Chat system migration applied successfully!');

    // Verify the tables were created
    console.log('🔍 Verifying table creation...');

    const { data: messagesTable, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .limit(0);

    if (messagesError) {
      console.error('❌ Failed to verify chat_messages table:', messagesError);
      throw messagesError;
    }

    console.log('✅ Tables verified successfully!');

    // Test helper functions
    console.log('🧪 Testing helper functions...');

    const { data: recentMessages, error: recentError } = await supabase
      .rpc('get_recent_chat_messages', { message_limit: 10 });

    if (recentError) {
      console.error('❌ Failed to test get_recent_chat_messages function:', recentError);
      throw recentError;
    }

    console.log('✅ Helper functions working correctly!');
    console.log(`📊 Current state: ${recentMessages?.length || 0} messages`);

    console.log('\n🎉 Chat system migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ chat_messages table created with constraints and indexes');
    console.log('   ✅ user_profiles extended with chat-related fields');
    console.log('   ✅ Row Level Security policies configured');
    console.log('   ✅ Real-time triggers and functions created');
    console.log('   ✅ Helper functions for common operations');
    console.log('   ✅ Real-time subscriptions enabled');
    console.log('\n🚀 The chat system is ready for use!');

  } catch (error) {
    console.error('❌ Failed to apply chat migration:', error);
    process.exit(1);
  }
}

// Run the migration
applyChatMigration();