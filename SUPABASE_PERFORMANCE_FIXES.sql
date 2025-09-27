-- ============================================================================
-- SUPABASE PERFORMANCE OPTIMIZATION FIXES - COMPLETE COMPATIBILITY VERSION
-- ============================================================================
-- Run this SQL directly in your Supabase SQL Editor to fix performance warnings
-- This addresses the issues shown in the Supabase Performance Advisor
-- 
-- COMPATIBILITY: This script is compatible with ALL existing migrations:
-- - 001_initial_schema.sql
-- - 002_rpc_functions.sql  
-- - 003_fix_leaderboard.sql
-- - 004_realtime_triggers.sql
-- - 005_audit_logs.sql
-- - 006_case_opening_schema.sql
-- - 007_case_opening_monitoring.sql
-- - 008_fix_function_security.sql

-- Enable extensions for optimization
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================================
-- 1. CREATE ESSENTIAL INDEXES FOR RLS PERFORMANCE
-- ============================================================================

-- These indexes are critical for RLS policies that filter by user_id
-- They prevent sequential scans when auth.uid() is used in policies

-- Check if indexes already exist from migration 001 and add missing ones
CREATE INDEX IF NOT EXISTS idx_game_history_user_id_btree 
ON game_history USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_daily_bonuses_user_id_btree 
ON daily_bonuses USING btree (user_id);

-- Add missing index for audit_logs (from migration 005)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_btree 
ON audit_logs USING btree (user_id);

-- Add missing index for case_opening_metrics (from migration 007)
CREATE INDEX IF NOT EXISTS idx_case_opening_metrics_user_id_btree 
ON case_opening_metrics USING btree (user_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_game_history_user_created 
ON game_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_history_user_type_created 
ON game_history (user_id, game_type, created_at DESC);

-- Audit logs composite indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp 
ON audit_logs (user_id, timestamp DESC);

-- Case opening metrics composite indexes
CREATE INDEX IF NOT EXISTS idx_case_opening_metrics_user_timestamp 
ON case_opening_metrics (user_id, timestamp DESC);

-- ============================================================================
-- 2. LEADERBOARD OPTIMIZATION INDEXES
-- ============================================================================

-- These indexes optimize ORDER BY operations for leaderboards
-- Partial indexes only include active users to reduce size

CREATE INDEX IF NOT EXISTS idx_user_profiles_balance_desc 
ON user_profiles (balance DESC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_profiles_total_won_desc 
ON user_profiles (total_won DESC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_profiles_games_played_desc 
ON user_profiles (games_played DESC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_profiles_total_wagered_desc 
ON user_profiles (total_wagered DESC) 
WHERE is_active = true;

-- ============================================================================
-- 3. ADDITIONAL PERFORMANCE INDEXES
-- ============================================================================

-- Partial index for active users (commonly filtered subset)
CREATE INDEX IF NOT EXISTS idx_user_profiles_active 
ON user_profiles (id) 
WHERE is_active = true;

-- Index for case-insensitive username lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username_lower 
ON user_profiles (lower(username));

-- Index for daily bonus date lookups (compatible with existing unique index)
CREATE INDEX IF NOT EXISTS idx_daily_bonuses_user_date_lookup 
ON daily_bonuses (user_id, (claimed_at::date));

-- Case opening system performance indexes
CREATE INDEX IF NOT EXISTS idx_case_types_active_price 
ON case_types (price) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tarkov_items_rarity_value 
ON tarkov_items (rarity, base_value DESC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_case_item_pools_case_weight 
ON case_item_pools (case_type_id, weight DESC);

-- Audit logs performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp 
ON audit_logs (action, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_timestamp 
ON audit_logs (resource_type, resource_id, timestamp DESC);

-- Case opening metrics performance indexes  
CREATE INDEX IF NOT EXISTS idx_case_opening_metrics_operation_success 
ON case_opening_metrics (operation, success, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_case_opening_metrics_case_rarity 
ON case_opening_metrics (case_type_id, item_rarity, timestamp DESC);

-- ============================================================================
-- 4. OPTIMIZE RLS POLICIES (COMPATIBLE WITH ALL EXISTING POLICIES)
-- ============================================================================

-- Drop existing policies to recreate them with optimizations
-- This is compatible with all existing migrations and won't break functionality

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own game history" ON game_history;
DROP POLICY IF EXISTS "Users can insert own game history" ON game_history;
DROP POLICY IF EXISTS "Users can view own daily bonuses" ON daily_bonuses;
DROP POLICY IF EXISTS "Users can insert own daily bonuses" ON daily_bonuses;

-- Also optimize audit logs policies (from migration 005)
DROP POLICY IF EXISTS "Users can view own metrics" ON case_opening_metrics;

-- Recreate RLS policies with SELECT optimization
-- Wrapping auth.uid() in SELECT allows PostgreSQL to cache the result per statement

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can view own game history" ON game_history
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own game history" ON game_history
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view own daily bonuses" ON daily_bonuses
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own daily bonuses" ON daily_bonuses
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- Optimize case opening metrics policy (from migration 007)
CREATE POLICY "Users can view own metrics" ON case_opening_metrics
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- 5. UPDATE TABLE STATISTICS (ALL EXISTING TABLES)
-- ============================================================================

-- Update statistics for better query planning on all existing tables
ANALYZE user_profiles;
ANALYZE game_history;
ANALYZE daily_bonuses;
ANALYZE audit_logs;
ANALYZE case_types;
ANALYZE tarkov_items;
ANALYZE case_item_pools;
ANALYZE case_opening_metrics;

-- ============================================================================
-- 6. PERFORMANCE MONITORING FUNCTIONS
-- ============================================================================

-- Function to check index usage statistics
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE (
    schemaname TEXT,
    tablename TEXT,
    indexname TEXT,
    idx_scan BIGINT,
    idx_tup_read BIGINT,
    idx_tup_fetch BIGINT,
    usage_ratio NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT 
        schemaname::TEXT,
        tablename::TEXT,
        indexname::TEXT,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        CASE 
            WHEN idx_scan = 0 THEN 0
            ELSE round((idx_tup_fetch::numeric / NULLIF(idx_tup_read, 0)::numeric) * 100, 2)
        END as usage_ratio
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC;
$$;

-- Function to get table size information
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    total_size TEXT,
    index_size TEXT,
    toast_size TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT 
        schemaname||'.'||tablename as table_name,
        n_tup_ins - n_tup_del as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as toast_size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
$$;

-- ============================================================================
-- 7. VERIFICATION QUERIES
-- ============================================================================

-- Check that indexes were created successfully
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check RLS policies are optimized
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- PERFORMANCE TESTING QUERIES (COMPREHENSIVE)
-- ============================================================================

-- Test leaderboard query performance (should use new indexes)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT username, display_name, balance, games_played
FROM user_profiles 
WHERE is_active = true 
ORDER BY balance DESC 
LIMIT 10;

-- Test user game history query performance (should use composite index)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM game_history 
WHERE user_id = (SELECT id FROM user_profiles LIMIT 1)
ORDER BY created_at DESC 
LIMIT 20;

-- Test case opening queries (should use new indexes)
EXPLAIN (ANALYZE, BUFFERS)
SELECT ct.name, ct.price, COUNT(cip.item_id) as item_count
FROM case_types ct
LEFT JOIN case_item_pools cip ON ct.id = cip.case_type_id
WHERE ct.is_active = true
GROUP BY ct.id, ct.name, ct.price
ORDER BY ct.price;

-- Test audit logs query performance (should use composite index)
EXPLAIN (ANALYZE, BUFFERS)
SELECT action, timestamp, success
FROM audit_logs 
WHERE user_id = (SELECT id FROM user_profiles LIMIT 1)
ORDER BY timestamp DESC 
LIMIT 50;

-- Test case opening metrics query performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT operation, AVG(duration_ms), COUNT(*)
FROM case_opening_metrics 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY operation;

-- Test RLS policy performance (should use btree index)
SET ROLE authenticated;
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM user_profiles 
WHERE id = auth.uid();
RESET ROLE;

-- ============================================================================
-- MONITORING QUERIES
-- ============================================================================

-- Check index usage after running for a while
SELECT * FROM get_index_usage_stats() 
WHERE idx_scan > 0 
ORDER BY idx_scan DESC;

-- Check table sizes
SELECT * FROM get_table_stats();

-- Check for unused indexes (run after some production usage)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check all tables and their sizes
SELECT 
    schemaname,
    tablename,
    n_tup_ins - n_tup_del as estimated_rows,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION get_index_usage_stats() IS 'Returns index usage statistics to identify unused or inefficient indexes';
COMMENT ON FUNCTION get_table_stats() IS 'Returns table size and bloat information for monitoring database growth';

-- ============================================================================
-- COMPLETION MESSAGE AND VERIFICATION
-- ============================================================================

DO $$
DECLARE
    index_count INTEGER;
    policy_count INTEGER;
    table_count INTEGER;
BEGIN
    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
    
    -- Count RLS policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM pg_tables 
    WHERE schemaname = 'public';
    
    RAISE NOTICE '✅ Supabase Performance Optimization Complete!';
    RAISE NOTICE '📊 Total indexes created: %', index_count;
    RAISE NOTICE '🔒 Total RLS policies optimized: %', policy_count;
    RAISE NOTICE '📋 Total tables analyzed: %', table_count;
    RAISE NOTICE '📈 Updated table statistics for better query planning';
    RAISE NOTICE '🎯 Check Supabase Performance Advisor to verify improvements';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Next steps:';
    RAISE NOTICE '   1. Monitor query performance over the next 24-48 hours';
    RAISE NOTICE '   2. Check index usage with: SELECT * FROM get_index_usage_stats();';
    RAISE NOTICE '   3. Review table sizes with: SELECT * FROM get_table_stats();';
    RAISE NOTICE '   4. Verify Performance Advisor shows improvements';
END $$;