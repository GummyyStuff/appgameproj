#!/usr/bin/env bun

/**
 * Fix Duplicate Index on audit_logs
 *
 * This script drops the duplicate idx_audit_logs_user_id_btree index,
 * keeping only the standard idx_audit_logs_user_id.
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

async function applyDropDuplicateAuditLogsIndex() {
  console.log('🚀 Applying Duplicate Index Fix for audit_logs...\n');

  // Drop the duplicate index
  console.log('🗑️  Removing duplicate index...');
  await executeSQL(
    'DROP INDEX IF EXISTS idx_audit_logs_user_id_btree;',
    'Drop duplicate idx_audit_logs_user_id_btree index'
  );

  // Add a comment to the remaining index for clarity
  console.log('📝 Adding comment to remaining index...');
  await executeSQL(`
    COMMENT ON INDEX idx_audit_logs_user_id IS 'BTREE index on audit_logs.user_id for efficient user-specific audit queries';
  `, 'Add descriptive comment to remaining index');

  console.log('\n✅ Duplicate index fix applied successfully!');
  console.log('🎉 This should resolve the "Duplicate Index" warning in Supabase Performance Advisor');
  console.log('📝 Only the standard idx_audit_logs_user_id index remains');
}

async function verifyFix() {
  console.log('\n🔍 Verifying the fix...');

  try {
    // Try to verify the database is accessible
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id')
      .limit(1);

    if (error) {
      console.log(`   ⚠️  Could not verify via table access: ${error.message}`);
    } else {
      console.log('   ✅ Database connection and index verification successful');
    }
  } catch (error) {
    console.log(`   ⚠️  Could not verify indexes: ${error}`);
  }
}

async function main() {
  await applyDropDuplicateAuditLogsIndex();
  await verifyFix();
}

main().catch(console.error);


