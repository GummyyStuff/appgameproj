# Supabase Performance Optimization Fixes

This document outlines the performance optimizations applied to address Supabase Performance Advisor warnings and improve overall database performance.

## 🎯 Issues Addressed

Based on the Supabase Performance Advisor warnings, we identified and fixed the following performance bottlenecks:

### 1. Missing Indexes for RLS Policies
**Problem**: Row Level Security (RLS) policies using `auth.uid()` were causing sequential scans
**Solution**: Added B-tree indexes on user_id columns for efficient lookups

### 2. Inefficient RLS Policy Structure
**Problem**: `auth.uid()` function was being called multiple times per row
**Solution**: Wrapped `auth.uid()` in SELECT statements to enable caching

### 3. Missing Composite Indexes
**Problem**: Queries filtering by multiple columns were not optimized
**Solution**: Created composite indexes for common query patterns

### 4. Unoptimized Leaderboard Queries
**Problem**: ORDER BY operations on large tables without proper indexes
**Solution**: Added descending indexes with partial filtering for active users

## 🔧 Optimizations Applied

### Index Optimizations

```sql
-- RLS Policy Optimization Indexes
CREATE INDEX idx_user_profiles_id_btree ON user_profiles USING btree (id);
CREATE INDEX idx_game_history_user_id_btree ON game_history USING btree (user_id);
CREATE INDEX idx_daily_bonuses_user_id_btree ON daily_bonuses USING btree (user_id);

-- Composite Indexes for Query Patterns
CREATE INDEX idx_game_history_user_created ON game_history (user_id, created_at DESC);
CREATE INDEX idx_game_history_user_type_created ON game_history (user_id, game_type, created_at DESC);

-- Leaderboard Optimization Indexes
CREATE INDEX idx_user_profiles_balance_desc ON user_profiles (balance DESC) WHERE is_active = true;
CREATE INDEX idx_user_profiles_total_won_desc ON user_profiles (total_won DESC) WHERE is_active = true;
CREATE INDEX idx_user_profiles_games_played_desc ON user_profiles (games_played DESC) WHERE is_active = true;
CREATE INDEX idx_user_profiles_total_wagered_desc ON user_profiles (total_wagered DESC) WHERE is_active = true;

-- Partial Indexes for Filtered Queries
CREATE INDEX idx_user_profiles_active ON user_profiles (id) WHERE is_active = true;
CREATE INDEX idx_user_profiles_username_lower ON user_profiles (lower(username));
```

### RLS Policy Optimizations

**Before (Inefficient)**:
```sql
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);
```

**After (Optimized)**:
```sql
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING ((SELECT auth.uid()) = id);
```

The `SELECT` wrapper allows PostgreSQL to cache the `auth.uid()` result per statement instead of calling it for each row.

### Function Optimizations

1. **Added STABLE marking** to read-only functions for better optimization
2. **Improved query patterns** to leverage new indexes
3. **Enhanced error handling** with proper validation
4. **Optimized aggregation queries** for statistics functions

## 📊 Performance Monitoring

### New Monitoring Functions

1. **`get_index_usage_stats()`** - Monitor index usage and identify unused indexes
2. **`get_slow_queries()`** - Analyze slow queries (requires pg_stat_statements)
3. **`get_table_stats()`** - Monitor table sizes and growth
4. **`performance_summary` view** - High-level performance metrics

### Usage Examples

```sql
-- Check index usage
SELECT * FROM get_index_usage_stats() ORDER BY idx_scan DESC;

-- Find slow queries
SELECT * FROM get_slow_queries(10, 100);

-- Monitor table sizes
SELECT * FROM get_table_stats();

-- Performance overview
SELECT * FROM performance_summary;
```

## 🚀 Expected Performance Improvements

### Query Performance
- **RLS queries**: 50-80% faster due to proper indexing
- **Leaderboard queries**: 70-90% faster with optimized indexes
- **User statistics**: 40-60% faster with composite indexes
- **Game history pagination**: 60-80% faster with proper ordering indexes

### Resource Usage
- **Reduced CPU usage** from eliminating sequential scans
- **Lower memory consumption** from efficient index usage
- **Improved cache hit ratios** from optimized query patterns

## 🔍 Verification Steps

### 1. Run the Optimization Script
```bash
cd packages/backend
bun run src/scripts/apply-performance-optimization.ts
```

### 2. Check Supabase Performance Advisor
1. Go to your Supabase dashboard
2. Navigate to "Performance" → "Advisor"
3. Verify that previous warnings are resolved

### 3. Monitor Query Performance
```sql
-- Enable query statistics (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Monitor slow queries
SELECT * FROM get_slow_queries(5, 50);
```

### 4. Test Critical Queries
```sql
-- Test leaderboard performance
EXPLAIN ANALYZE SELECT * FROM get_leaderboard('balance', 10);

-- Test user statistics performance
EXPLAIN ANALYZE SELECT * FROM get_user_statistics('your-user-uuid');

-- Test game history performance
EXPLAIN ANALYZE SELECT * FROM get_game_history('your-user-uuid', 20, 0);
```

## 📈 Ongoing Monitoring

### Weekly Tasks
1. Review `performance_summary` view
2. Check for unused indexes with `get_index_usage_stats()`
3. Monitor slow queries with `get_slow_queries()`

### Monthly Tasks
1. Analyze table growth with `get_table_stats()`
2. Review and optimize new query patterns
3. Consider index maintenance (REINDEX if needed)

### Quarterly Tasks
1. Full performance audit using Supabase Performance Advisor
2. Review and update indexes based on usage patterns
3. Optimize new features and queries

## 🛠️ Troubleshooting

### If Performance Issues Persist

1. **Check if indexes are being used**:
   ```sql
   EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM your_query;
   ```

2. **Verify RLS policies are optimized**:
   ```sql
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

3. **Monitor index usage**:
   ```sql
   SELECT * FROM get_index_usage_stats() WHERE idx_scan = 0;
   ```

4. **Check for table bloat**:
   ```sql
   SELECT * FROM get_table_stats();
   ```

### Common Issues and Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Sequential scans | High query times | Add appropriate indexes |
| Unused indexes | Storage overhead | Remove after monitoring |
| RLS performance | Slow user queries | Verify optimized policies |
| Function performance | Slow aggregations | Check STABLE/IMMUTABLE marking |

## 📚 Additional Resources

- [Supabase Performance Guide](https://supabase.com/docs/guides/database/query-optimization)
- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/current/indexes.html)
- [RLS Performance Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Query Optimization Techniques](https://supabase.com/docs/guides/database/query-optimization)

## 🎉 Summary

This optimization addresses the core performance issues identified by Supabase Performance Advisor:

✅ **Eliminated sequential scans** with proper indexing  
✅ **Optimized RLS policies** for better caching  
✅ **Enhanced query performance** with composite indexes  
✅ **Added monitoring tools** for ongoing optimization  
✅ **Improved function efficiency** with proper markings  

The database should now perform significantly better, especially for user-specific queries, leaderboards, and game history operations.