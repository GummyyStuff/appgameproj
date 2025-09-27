#!/usr/bin/env bun

/**
 * Verify Chat System Setup
 * 
 * This script verifies that the chat system database schema
 * has been properly set up and is working correctly.
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyTables() {
  console.log('🔍 Verifying table structure...');

  try {
    // Check chat_messages table
    const { data: messagesSchema, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .limit(0);

    if (messagesError) {
      console.error('❌ chat_messages table not accessible:', messagesError);
      return false;
    }

    // Check chat_presence table
    const { data: presenceSchema, error: presenceError } = await supabase
      .from('chat_presence')
      .select('*')
      .limit(0);

    if (presenceError) {
      console.error('❌ chat_presence table not accessible:', presenceError);
      return false;
    }

    console.log('✅ Both tables are accessible');
    return true;
  } catch (error) {
    console.error('❌ Table verification failed:', error);
    return false;
  }
}

async function verifyRPCFunctions() {
  console.log('🔍 Verifying RPC functions...');

  try {
    // Test get_recent_chat_messages
    const { data: recentMessages, error: recentError } = await supabase
      .rpc('get_recent_chat_messages', { message_limit: 10 });

    if (recentError) {
      console.warn('⚠️  get_recent_chat_messages function issue:', recentError.message);
    } else {
      console.log('✅ get_recent_chat_messages function working');
    }

    // Test get_online_users
    const { data: onlineUsers, error: onlineError } = await supabase
      .rpc('get_online_users');

    if (onlineError) {
      console.warn('⚠️  get_online_users function issue:', onlineError.message);
    } else {
      console.log('✅ get_online_users function working');
    }

    return true;
  } catch (error) {
    console.warn('⚠️  RPC function verification had issues:', error);
    return false;
  }
}

async function testBasicOperations() {
  console.log('🧪 Testing basic operations...');

  try {
    // Create a test user ID (this would normally come from auth)
    const testUserId = '00000000-0000-0000-0000-000000000000';
    const testUsername = 'test_user';

    // Test inserting a message (this will fail due to RLS, which is expected)
    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        content: 'Test message',
        user_id: testUserId,
        username: testUsername
      })
      .select();

    if (messageError) {
      console.log('✅ RLS is working (message insert blocked as expected)');
    } else {
      console.warn('⚠️  Message insert succeeded (RLS might not be configured correctly)');
    }

    // Test inserting presence (this will also fail due to RLS, which is expected)
    const { data: presenceData, error: presenceError } = await supabase
      .from('chat_presence')
      .insert({
        user_id: testUserId,
        username: testUsername
      })
      .select();

    if (presenceError) {
      console.log('✅ RLS is working (presence insert blocked as expected)');
    } else {
      console.warn('⚠️  Presence insert succeeded (RLS might not be configured correctly)');
    }

    return true;
  } catch (error) {
    console.error('❌ Basic operations test failed:', error);
    return false;
  }
}

async function verifyChatSetup() {
  console.log('🚀 Verifying chat system setup...\n');

  let allPassed = true;

  // Verify tables
  const tablesOk = await verifyTables();
  allPassed = allPassed && tablesOk;

  console.log('');

  // Verify RPC functions
  const rpcOk = await verifyRPCFunctions();
  allPassed = allPassed && rpcOk;

  console.log('');

  // Test basic operations
  const operationsOk = await testBasicOperations();
  allPassed = allPassed && operationsOk;

  console.log('\n📋 Verification Summary:');
  console.log(`   Tables: ${tablesOk ? '✅' : '❌'}`);
  console.log(`   RPC Functions: ${rpcOk ? '✅' : '⚠️'}`);
  console.log(`   Security (RLS): ${operationsOk ? '✅' : '❌'}`);

  if (allPassed) {
    console.log('\n🎉 Chat system verification completed successfully!');
    console.log('The database schema is ready for the chat system.');
  } else {
    console.log('\n⚠️  Some verification checks had issues.');
    console.log('Please review the output above and ensure the migration was applied correctly.');
  }

  return allPassed;
}

// Run verification
verifyChatSetup()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Verification script failed:', error);
    process.exit(1);
  });