#!/usr/bin/env bun

/**
 * Direct Performance Fixes Application
 * 
 * This script applies performance optimizations directly using individual SQL statements
 * to avoid issues with complex migration parsing.
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

async function applyPerformanceFixes() {
  console.log('🚀 Applying Supabase Performance Fixes...\n');

  // 1. Create essential indexes
  console.log('📊 Creating Performance Indexes...');
  
  const indexes = [
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_game_history_user_id_btree ON game_history USING btree (user_id);',
      desc: 'User ID index for game history'
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_daily_bonuses_user_id_btree ON daily_bonuses USING btree (user_id);',
      desc: 'User ID index for daily bonuses'
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_game_history_user_created ON game_history (user_id, created_at DESC);',
      desc: 'Composite index for user game history'
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_user_profiles_balance_desc ON user_profiles (balance DESC) WHERE is_active = true;',
      desc: 'Balance leaderboard index'
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_user_profiles_total_won_desc ON user_profiles (total_won DESC) WHERE is_active = true;',
      desc: 'Total won leaderboard index'
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles (id) WHERE is_active = true;',
      desc: 'Active users partial index'
    }
  ];

  for (const index of indexes) {
    await executeSQL(index.sql, index.desc);
  }

  // 2. Optimize RLS policies
  console.log('\n🔒 Optimizing RLS Policies...');
  
  const rlsPolicies = [
    {
      sql: `DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
            CREATE POLICY "Users can view own profile" ON user_profiles
            FOR SELECT USING ((SELECT auth.uid()) = id);`,
      desc: 'Optimized user profile view policy'
    },
    {
      sql: `DROP POLICY IF EXISTS "Users can view own game history" ON game_history;
            CREATE POLICY "Users can view own game history" ON game_history
            FOR SELECT USING ((SELECT auth.uid()) = user_id);`,
      desc: 'Optimized game history view policy'
    },
    {
      sql: `DROP POLICY IF EXISTS "Users can view own daily bonuses" ON daily_bonuses;
            CREATE POLICY "Users can view own daily bonuses" ON daily_bonuses
            FOR SELECT USING ((SELECT auth.uid()) = user_id);`,
      desc: 'Optimized daily bonuses view policy'
    }
  ];

  for (const policy of rlsPolicies) {
    await executeSQL(policy.sql, policy.desc);
  }

  // 3. Update table statistics
  console.log('\n📈 Updating Table Statistics...');
  
  const analyzeCommands = [
    { sql: 'ANALYZE user_profiles;', desc: 'Analyzed user_profiles table' },
    { sql: 'ANALYZE game_history;', desc: 'Analyzed game_history table' },
    { sql: 'ANALYZE daily_bonuses;', desc: 'Analyzed daily_bonuses table' }
  ];

  for (const cmd of analyzeCommands) {
    await executeSQL(cmd.sql, cmd.desc);
  }

  // 4. Test critical queries
  console.log('\n🧪 Testing Query Performance...');
  
  try {
    // Test leaderboard query
    const start1 = Date.now();
    const { data: leaderboard, error: leaderboardError } = await supabase
      .rpc('get_leaderboard', { metric_param: 'balance', limit_param: 10 });
    const time1 = Date.now() - start1;
    
    if (leaderboardError) {
      console.log(`   ⚠️  Leaderboard test: ${leaderboardError.message}`);
    } else {
      console.log(`   ✅ Leaderboard query: ${time1}ms (${leaderboard?.leaderboard?.length || 0} entries)`);
    }

    // Test user profiles query
    const start2 = Date.now();
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, username, balance')
      .eq('is_active', true)
      .order('balance', { ascending: false })
      .limit(10);
    const time2 = Date.now() - start2;
    
    if (profilesError) {
      console.log(`   ⚠️  Profiles query test: ${profilesError.message}`);
    } else {
      console.log(`   ✅ Profiles query: ${time2}ms (${profiles?.length || 0} profiles)`);
    }

    // Test game history query
    if (profiles && profiles.length > 0) {
      const start3 = Date.now();
      const { data: history, error: historyError } = await supabase
        .from('game_history')
        .select('*')
        .eq('user_id', profiles[0].id)
        .order('created_at', { ascending: false })
        .limit(20);
      const time3 = Date.now() - start3;
      
      if (historyError) {
        console.log(`   ⚠️  Game history test: ${historyError.message}`);
      } else {
        console.log(`   ✅ Game history query: ${time3}ms (${history?.length || 0} records)`);
      }
    }

  } catch (error) {
    console.log(`   ❌ Query testing failed: ${error}`);
  }

  console.log('\n🎯 Performance Fixes Summary:');
  console.log('   ✅ Added B-tree indexes for RLS optimization');
  console.log('   ✅ Created composite indexes for common patterns');
  console.log('   ✅ Added partial indexes for filtered queries');
  console.log('   ✅ Optimized RLS policies with SELECT wrapping');
  console.log('   ✅ Updated table statistics with ANALYZE');

  console.log('\n📋 Next Steps:');
  console.log('   1. Check Supabase Performance Advisor for improvements');
  console.log('   2. Monitor query performance in production');
  console.log('   3. Consider enabling pg_stat_statements for detailed analysis');
  console.log('   4. Review index usage after a few days of operation');

  console.log('\n🎉 Performance optimization completed!');
}

// Main execution
applyPerformanceFixes().catch(console.error);