-- ============================================================================
-- SUPABASE PERFORMANCE OPTIMIZATION FIXES - IMMUTABLE FUNCTION FIX
-- ============================================================================
-- This version fixes the IMMUTABLE function error by avoiding problematic functional indexes

-- Enable extensions for optimization
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================================
-- 1. CREATE ESSENTIAL INDEXES FOR RLS PERFORMANCE
-- ============================================================================

-- These indexes are critical for RLS policies that filter by user_id
-- They prevent sequential scans when auth.uid() is used in policies

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
-- 3. ADDITIONAL PERFORMANCE INDEXES (FIXED - NO FUNCTIONAL INDEXES)
-- ============================================================================

-- Partial index for active users (commonly filtered subset)
CREATE INDEX IF NOT EXISTS idx_user_profiles_active 
ON user_profiles (id) 
WHERE is_active = true;

-- Regular index on username (case-sensitive, but still helpful)
CREATE INDEX IF NOT EXISTS idx_user_profiles_username 
ON user_profiles (username);

-- Index on claimed_at for daily bonuses (without date casting)
CREATE INDEX IF NOT EXISTS idx_daily_bonuses_claimed_at 
ON daily_bonuses (user_id, claimed_at);

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
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own game history" ON game_history;
DROP POLICY IF EXISTS "Users can insert own game history" ON game_history;
DROP POLICY IF EXISTS "Users can view own daily bonuses" ON daily_bonuses;
DROP POLICY IF EXISTS "Users can insert own daily bonuses" ON daily_bonuses;

-- Also optimize case opening metrics policy (from migration 007)
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
        psi.schemaname::TEXT,
        psi.relname::TEXT as tablename,
        psi.indexrelname::TEXT as indexname,
        psi.idx_scan,
        psi.idx_tup_read,
        psi.idx_tup_fetch,
        CASE 
            WHEN psi.idx_scan = 0 THEN 0
            ELSE round((psi.idx_tup_fetch::numeric / NULLIF(psi.idx_tup_read, 0)::numeric) * 100, 2)
        END as usage_ratio
    FROM pg_stat_user_indexes psi
    WHERE psi.schemaname = 'public'
    ORDER BY psi.idx_scan DESC;
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
        pst.schemaname||'.'||pst.relname as table_name,
        pst.n_tup_ins - pst.n_tup_del as row_count,
        pg_size_pretty(pg_total_relation_size(pst.schemaname||'.'||pst.relname)) as total_size,
        pg_size_pretty(pg_indexes_size(pst.schemaname||'.'||pst.relname)) as index_size,
        pg_size_pretty(pg_total_relation_size(pst.schemaname||'.'||pst.relname) - pg_relation_size(pst.schemaname||'.'||pst.relname)) as toast_size
    FROM pg_stat_user_tables pst
    WHERE pst.schemaname = 'public'
    ORDER BY pg_total_relation_size(pst.schemaname||'.'||pst.relname) DESC;
$$;

-- ============================================================================
-- 7. VERIFICATION QUERIES
-- ============================================================================

-- Check that indexes were created successfully
SELECT 
    '📊 Created Indexes' as info,
    schemaname,
    tablename,
    indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check RLS policies are optimized
SELECT 
    '🔒 Optimized RLS Policies' as info,
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- PERFORMANCE TESTING QUERIES
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

-- ============================================================================
-- MONITORING QUERIES
-- ============================================================================

-- Check index usage
SELECT * FROM get_index_usage_stats() 
WHERE idx_scan > 0 
ORDER BY idx_scan DESC;

-- Check table sizes
SELECT * FROM get_table_stats();

-- ============================================================================
-- COMPLETION MESSAGE
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