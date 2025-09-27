#!/usr/bin/env bun

/**
 * Fix Case Opening Game Type Validation
 *
 * This script updates the process_game_transaction function to include
 * 'case_opening' in the allowed game types, fixing the issue where
 * case opening transactions were failing.
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

async function main() {
  console.log('🔧 Applying Case Opening Game Type Fix...');

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'packages/backend/src/database/migrations/026_fix_case_opening_game_type.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    const success = await executeSQL(migrationSQL, 'Update process_game_transaction function to allow case_opening game type');

    if (success) {
      console.log('✅ Case opening game type fix applied successfully!');
      console.log('🎉 Case opening should now properly credit winnings to user balance.');
    } else {
      console.log('❌ Failed to apply case opening game type fix.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

main();


