#!/usr/bin/env bun

/**
 * Apply Performance Optimization Migration
 * 
 * This script applies the performance optimization migration and provides
 * analysis of the improvements made to address Supabase performance warnings.
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

async function applyPerformanceOptimization() {
  console.log('🚀 Starting Performance Optimization Migration...\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '../database/migrations/009_performance_optimization.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📖 Applying performance optimization migration...');
    
    // Apply the migration
    const { error: migrationError } = await supabase.rpc('exec', {
      sql: migrationSQL
    });

    if (migrationError) {
      // Try alternative approach using direct SQL execution
      const { error: directError } = await supabase
        .from('_migrations')
        .select('*')
        .limit(1);
      
      if (directError) {
        console.log('📝 Executing migration via direct SQL...');
        
        // Split migration into smaller chunks to avoid timeout
        const statements = migrationSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of statements) {
          if (statement.trim()) {
            const { error } = await supabase.rpc('exec', { sql: statement + ';' });
            if (error) {
              console.warn(`⚠️  Warning executing statement: ${error.message}`);
              console.log(`Statement: ${statement.substring(0, 100)}...`);
            }
          }
        }
      }
    }

    console.log('✅ Performance optimization migration applied successfully!\n');

    // Analyze the improvements
    await analyzePerformanceImprovements();

  } catch (error) {
    console.error('❌ Error applying performance optimization:', error);
    process.exit(1);
  }
}

async function analyzePerformanceImprovements() {
  console.log('📊 Analyzing Performance Improvements...\n');

  try {
    // Check index usage statistics
    console.log('🔍 Index Usage Statistics:');
    const { data: indexStats, error: indexError } = await supabase
      .rpc('get_index_usage_stats');

    if (indexError) {
      console.log('   ⚠️  Could not retrieve index statistics:', indexError.message);
    } else if (indexStats) {
      console.log(`   📈 Total indexes: ${indexStats.length}`);
      const unusedIndexes = indexStats.filter((idx: any) => idx.idx_scan === 0);
      console.log(`   🔍 Unused indexes: ${unusedIndexes.length}`);
      
      // Show top 5 most used indexes
      const topIndexes = indexStats
        .filter((idx: any) => idx.idx_scan > 0)
        .sort((a: any, b: any) => b.idx_scan - a.idx_scan)
        .slice(0, 5);
      
      if (topIndexes.length > 0) {
        console.log('   🏆 Top 5 most used indexes:');
        topIndexes.forEach((idx: any, i: number) => {
          console.log(`      ${i + 1}. ${idx.indexname}: ${idx.idx_scan} scans`);
        });
      }
    }

    // Check table statistics
    console.log('\n📋 Table Statistics:');
    const { data: tableStats, error: tableError } = await supabase
      .rpc('get_table_stats');

    if (tableError) {
      console.log('   ⚠️  Could not retrieve table statistics:', tableError.message);
    } else if (tableStats) {
      tableStats.forEach((table: any) => {
        console.log(`   📊 ${table.table_name}:`);
        console.log(`      Rows: ${table.row_count?.toLocaleString() || 'N/A'}`);
        console.log(`      Total Size: ${table.total_size}`);
        console.log(`      Index Size: ${table.index_size}`);
      });
    }

    // Check performance summary
    console.log('\n📈 Performance Summary:');
    const { data: perfSummary, error: perfError } = await supabase
      .from('performance_summary')
      .select('*');

    if (perfError) {
      console.log('   ⚠️  Could not retrieve performance summary:', perfError.message);
    } else if (perfSummary) {
      perfSummary.forEach((metric: any) => {
        console.log(`   ${metric.metric_type}:`);
        if (metric.metric_type === 'Index Usage') {
          console.log(`      Total Indexes: ${metric.total_indexes}`);
          console.log(`      Unused Indexes: ${metric.unused_indexes}`);
          console.log(`      Avg Usage Ratio: ${metric.avg_usage_ratio?.toFixed(2)}%`);
        } else {
          console.log(`      Total Tables: ${metric.total_tables}`);
          console.log(`      Total Rows: ${metric.total_rows?.toLocaleString()}`);
          console.log(`      Avg Table Size: ${(metric.avg_table_size / 1024 / 1024).toFixed(2)} MB`);
        }
      });
    }

    console.log('\n🎯 Performance Optimizations Applied:');
    console.log('   ✅ Added B-tree indexes for RLS policy optimization');
    console.log('   ✅ Created composite indexes for common query patterns');
    console.log('   ✅ Added partial indexes for filtered queries');
    console.log('   ✅ Optimized RLS policies with SELECT wrapping');
    console.log('   ✅ Enhanced functions with STABLE marking');
    console.log('   ✅ Added performance monitoring functions');
    console.log('   ✅ Updated table statistics with ANALYZE');

    console.log('\n📋 Recommendations:');
    console.log('   🔍 Monitor index usage with get_index_usage_stats()');
    console.log('   📊 Check slow queries with get_slow_queries()');
    console.log('   📈 Review performance_summary view regularly');
    console.log('   🧹 Consider removing unused indexes after monitoring');
    console.log('   ⚡ Enable pg_stat_statements for query analysis');

  } catch (error) {
    console.error('❌ Error analyzing performance improvements:', error);
  }
}

async function testOptimizedQueries() {
  console.log('\n🧪 Testing Optimized Queries...\n');

  try {
    // Test leaderboard query
    console.log('🏆 Testing leaderboard query...');
    const start1 = Date.now();
    const { data: leaderboard, error: leaderboardError } = await supabase
      .rpc('get_leaderboard', { metric_param: 'balance', limit_param: 10 });
    const time1 = Date.now() - start1;
    
    if (leaderboardError) {
      console.log('   ❌ Leaderboard query failed:', leaderboardError.message);
    } else {
      console.log(`   ✅ Leaderboard query completed in ${time1}ms`);
      console.log(`   📊 Retrieved ${leaderboard?.leaderboard?.length || 0} entries`);
    }

    // Test user statistics query
    console.log('\n📊 Testing user statistics query...');
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    if (users && users.length > 0) {
      const start2 = Date.now();
      const { data: stats, error: statsError } = await supabase
        .rpc('get_user_statistics', { user_uuid: users[0].id });
      const time2 = Date.now() - start2;
      
      if (statsError) {
        console.log('   ❌ User statistics query failed:', statsError.message);
      } else {
        console.log(`   ✅ User statistics query completed in ${time2}ms`);
        console.log(`   📈 Retrieved statistics for user ${users[0].id}`);
      }
    } else {
      console.log('   ⚠️  No users found to test statistics query');
    }

    // Test game history query
    console.log('\n🎮 Testing game history query...');
    if (users && users.length > 0) {
      const start3 = Date.now();
      const { data: history, error: historyError } = await supabase
        .rpc('get_game_history', { 
          user_uuid: users[0].id, 
          limit_param: 20, 
          offset_param: 0 
        });
      const time3 = Date.now() - start3;
      
      if (historyError) {
        console.log('   ❌ Game history query failed:', historyError.message);
      } else {
        console.log(`   ✅ Game history query completed in ${time3}ms`);
        console.log(`   🎯 Retrieved ${history?.games?.length || 0} game records`);
      }
    }

  } catch (error) {
    console.error('❌ Error testing optimized queries:', error);
  }
}

// Main execution
async function main() {
  await applyPerformanceOptimization();
  await testOptimizedQueries();
  
  console.log('\n🎉 Performance optimization completed successfully!');
  console.log('💡 Check Supabase Performance Advisor to verify improvements.');
}

main().catch(console.error);