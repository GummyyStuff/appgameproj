#!/usr/bin/env bun

/**
 * Simple RLS Policy Fix for case_opening_metrics
 *
 * This script fixes the multiple permissive RLS policies issue by combining
 * them into a single policy for better performance.
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
    const { error } = await supabase.rpc('exec', { sql });
    if (error) {
      console.log(`   ⚠️  ${description}: ${error.message}`);
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

async function applyRLSFix() {
  console.log('🚀 Applying RLS Policy Fix for case_opening_metrics...\n');

  // Drop the existing conflicting policies
  console.log('🗑️  Removing old policies...');
  await executeSQL(
    'DROP POLICY IF EXISTS "Users can view own metrics" ON case_opening_metrics;',
    'Drop "Users can view own metrics" policy'
  );
  await executeSQL(
    'DROP POLICY IF EXISTS "Service can view all metrics" ON case_opening_metrics;',
    'Drop "Service can view all metrics" policy'
  );

  // Create the combined policy
  console.log('📝 Creating combined policy...');
  await executeSQL(`
    CREATE POLICY "Users and service can view metrics" ON case_opening_metrics
    FOR SELECT USING (
      -- Authenticated users can view their own metrics
      auth.uid() = user_id
      OR
      -- Service role can view all metrics for monitoring
      auth.jwt() ->> 'role' = 'service_role'
    );
  `, 'Create combined SELECT policy');

  console.log('\n✅ RLS Policy fix applied successfully!');
  console.log('🎉 This should resolve the "Multiple Permissive Policies" warning in Supabase Performance Advisor');
}

async function verifyFix() {
  console.log('\n🔍 Verifying the fix...');

  try {
    // Query current policies
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, permissive')
      .eq('tablename', 'case_opening_metrics');

    if (error) {
      console.log(`   ⚠️  Could not verify policies: ${error.message}`);
      return;
    }

    const selectPolicies = policies.filter(p => p.cmd === 'SELECT');
    console.log(`   📊 Found ${selectPolicies.length} SELECT policies on case_opening_metrics:`);

    selectPolicies.forEach(policy => {
      console.log(`     - ${policy.policyname} (${policy.permissive ? 'permissive' : 'restrictive'})`);
    });

    if (selectPolicies.length === 1) {
      console.log('   ✅ Success: Exactly one SELECT policy (performance issue resolved)');
    } else if (selectPolicies.length > 1) {
      console.log(`   ⚠️  Warning: Still ${selectPolicies.length} SELECT policies (may need manual review)`);
    } else {
      console.log('   ❌ Error: No SELECT policies found');
    }
  } catch (error) {
    console.log(`   ⚠️  Could not verify policies: ${error}`);
  }
}

async function main() {
  await applyRLSFix();
  await verifyFix();
}

main().catch(console.error);
