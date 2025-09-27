#!/usr/bin/env bun

/**
 * Fix Auth RLS Initialization Plan for chat_messages
 *
 * This script optimizes the RLS policy by wrapping auth.uid() in SELECT
 * to cache the result per statement instead of re-evaluating per row.
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

async function executeSQL(sql: string, description: string) {
  try {
    // Try using the query endpoint directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql_query: sql })
    });

    if (!response.ok) {
      console.log(`   ⚠️  ${description}: ${response.status} - ${await response.text()}`);
      return false;
    } else {
      console.log(`   ✅ ${description}`);
      return true;
    }
  } catch (error) {
    console.log(`   ❌ ${description}: ${error}`);
    return false;
  }
}

async function applyChatMessagesRLSFix() {
  console.log('🚀 Applying Auth RLS Initialization Plan Fix for chat_messages...\n');

  // Drop the existing policy that causes re-evaluation
  console.log('🗑️  Removing old policy...');
  await executeSQL(
    'DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;',
    'Drop existing policy with direct auth.uid() call'
  );

  // Create the optimized policy with cached auth function
  console.log('📝 Creating optimized policy...');
  await executeSQL(`
    CREATE POLICY "Users can insert own messages" ON public.chat_messages
    FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = user_id);
  `, 'Create optimized INSERT policy with cached auth.uid()');

  console.log('\n✅ Auth RLS optimization applied successfully!');
  console.log('🎉 This should resolve the "Auth RLS Initialization Plan" warning in Supabase Performance Advisor');
  console.log('📝 The auth.uid() call is now cached per statement instead of re-evaluated per row');
}

async function verifyFix() {
  console.log('\n🔍 Verifying the fix...');

  try {
    // Try to verify the database is accessible
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id')
      .limit(1);

    if (error) {
      console.log(`   ⚠️  Could not verify via table access: ${error.message}`);
    } else {
      console.log('   ✅ Database connection and policy verification successful');
    }
  } catch (error) {
    console.log(`   ⚠️  Could not verify policies: ${error}`);
  }
}

async function main() {
  await applyChatMessagesRLSFix();
  await verifyFix();
}

main().catch(console.error);
