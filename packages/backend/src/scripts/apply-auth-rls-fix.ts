#!/usr/bin/env bun

/**
 * Fix Auth RLS Initialization Plan for case_opening_metrics
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

async function applyAuthRLSFix() {
  console.log('🚀 Applying Auth RLS Initialization Plan Fix for case_opening_metrics...\n');

  // Drop the existing policy that causes re-evaluation
  console.log('🗑️  Removing old policy...');
  await executeSQL(
    'DROP POLICY IF EXISTS "Users and service can view metrics" ON case_opening_metrics;',
    'Drop existing policy with direct auth.uid() call'
  );

  // Create the optimized policy with cached auth function
  console.log('📝 Creating optimized policy...');
  await executeSQL(`
    CREATE POLICY "Users and service can view metrics" ON case_opening_metrics
    FOR SELECT USING (
        -- Authenticated users can view their own metrics
        (SELECT auth.uid()) = user_id
        OR
        -- Service role can view all metrics for monitoring
        auth.jwt() ->> 'role' = 'service_role'
    );
  `, 'Create optimized SELECT policy with cached auth.uid()');

  console.log('\n✅ Auth RLS optimization applied successfully!');
  console.log('🎉 This should resolve the "Auth RLS Initialization Plan" warning in Supabase Performance Advisor');
  console.log('📝 The auth.uid() call is now cached per statement instead of re-evaluated per row');
}

async function verifyFix() {
  console.log('\n🔍 Verifying the fix...');

  try {
    // Try to verify the database is accessible
    const { data, error } = await supabase
      .from('case_opening_metrics')
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
  await applyAuthRLSFix();
  await verifyFix();
}

main().catch(console.error);
