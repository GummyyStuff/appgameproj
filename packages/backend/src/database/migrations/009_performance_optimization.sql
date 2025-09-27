-- Migration 009: Performance Optimization for Supabase
-- This migration addresses performance warnings from Supabase Performance Advisor
-- Focuses on indexing, RLS optimization, and function performance improvements

-- Enable index advisor extension for future optimization analysis
CREATE EXTENSION IF NOT EXISTS index_advisor;

-- ============================================================================
-- INDEX OPTIMIZATIONS
-- ============================================================================

-- Add missing indexes for RLS policies (auth.uid() lookups)
-- These indexes are critical for RLS performance when filtering by user_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_id_btree ON user_profiles USING btree (id);
CREATE INDEX IF NOT EXISTS idx_game_history_user_id_btree ON game_history USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_bonuses_user_id_btree ON daily_bonuses USING btree (user_id);

-- Add composite indexes for common query patterns
-- These optimize queries that filter by multiple columns simultaneously
CREATE INDEX IF NOT EXISTS idx_game_history_user_created ON game_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_user_type_created ON game_history (user_id, game_type, created_at DESC);

-- Add indexes for leaderboard queries (ORDER BY operations)
CREATE INDEX IF NOT EXISTS idx_user_profiles_balance_desc ON user_profiles (balance DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_won_desc ON user_profiles (total_won DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_games_played_desc ON user_profiles (games_played DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_wagered_desc ON user_profiles (total_wagered DESC) WHERE is_active = true;

-- Add partial index for active users (commonly filtered subset)
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles (id) WHERE is_active = true;

-- Add index for daily bonus date lookups
CREATE INDEX IF NOT EXISTS idx_daily_bonuses_date ON daily_bonuses (user_id, (claimed_at::date));

-- Add index for username lookups (unique constraint already exists, but explicit index helps)
CREATE INDEX IF NOT EXISTS idx_user_profiles_username_lower ON user_profiles (lower(username));

-- ============================================================================
-- RLS POLICY OPTIMIZATIONS
-- ============================================================================

-- Drop existing RLS policies to recreate them with optimizations
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own game history" ON game_history;
DROP POLICY IF EXISTS "Users can insert own game history" ON game_history;
DROP POLICY IF EXISTS "Users can view own daily bonuses" ON daily_bonuses;
DROP POLICY IF EXISTS "Users can insert own daily bonuses" ON daily_bonuses;

-- Recreate RLS policies with SELECT optimization (wrapping auth.uid() in SELECT)
-- This allows PostgreSQL to cache the auth.uid() result per statement
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

-- ============================================================================
-- FUNCTION OPTIMIZATIONS
-- ============================================================================

-- Optimize get_leaderboard function with better indexing support
CREATE OR REPLACE FUNCTION get_leaderboard(
    metric_param TEXT DEFAULT 'balance',
    limit_param INTEGER DEFAULT 10
)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
STABLE  -- Mark as STABLE since it doesn't modify data
AS $
DECLARE
    leaderboard JSONB;
BEGIN
    -- Validate metric parameter
    IF metric_param NOT IN ('balance', 'total_won', 'games_played', 'total_wagered') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid metric parameter'
        );
    END IF;
    
    -- Use optimized queries that leverage our new indexes
    CASE metric_param
        WHEN 'balance' THEN
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rank', rank_num,
                    'username', username,
                    'display_name', display_name,
                    'value', balance,
                    'games_played', games_played
                ) ORDER BY rank_num
            ) INTO leaderboard
            FROM (
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY balance DESC) as rank_num,
                    username, display_name, balance, games_played
                FROM public.user_profiles
                WHERE is_active = true
                ORDER BY balance DESC
                LIMIT limit_param
            ) ranked_users;
            
        WHEN 'total_won' THEN
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rank', rank_num,
                    'username', username,
                    'display_name', display_name,
                    'value', total_won,
                    'games_played', games_played
                ) ORDER BY rank_num
            ) INTO leaderboard
            FROM (
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY total_won DESC) as rank_num,
                    username, display_name, total_won, games_played
                FROM public.user_profiles
                WHERE is_active = true
                ORDER BY total_won DESC
                LIMIT limit_param
            ) ranked_users;
            
        WHEN 'games_played' THEN
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rank', rank_num,
                    'username', username,
                    'display_name', display_name,
                    'value', games_played,
                    'games_played', games_played
                ) ORDER BY rank_num
            ) INTO leaderboard
            FROM (
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY games_played DESC) as rank_num,
                    username, display_name, games_played
                FROM public.user_profiles
                WHERE is_active = true
                ORDER BY games_played DESC
                LIMIT limit_param
            ) ranked_users;
            
        WHEN 'total_wagered' THEN
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rank', rank_num,
                    'username', username,
                    'display_name', display_name,
                    'value', total_wagered,
                    'games_played', games_played
                ) ORDER BY rank_num
            ) INTO leaderboard
            FROM (
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY total_wagered DESC) as rank_num,
                    username, display_name, total_wagered, games_played
                FROM public.user_profiles
                WHERE is_active = true
                ORDER BY total_wagered DESC
                LIMIT limit_param
            ) ranked_users;
    END CASE;
    
    RETURN jsonb_build_object(
        'success', true,
        'metric', metric_param,
        'leaderboard', COALESCE(leaderboard, '[]'::jsonb)
    );
END;
$;

-- Optimize get_user_statistics function for better performance
CREATE OR REPLACE FUNCTION get_user_statistics(user_uuid UUID)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
STABLE  -- Mark as STABLE since it doesn't modify data
AS $
DECLARE
    user_stats RECORD;
    game_stats JSONB;
BEGIN
    -- Get basic user statistics with optimized query
    SELECT 
        balance,
        total_wagered,
        total_won,
        games_played,
        created_at,
        last_daily_bonus
    INTO user_stats
    FROM public.user_profiles
    WHERE id = user_uuid;
    
    IF user_stats IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Get game-specific statistics with optimized aggregation
    -- Use the composite index on (user_id, game_type, created_at)
    SELECT jsonb_object_agg(
        game_type,
        jsonb_build_object(
            'games_played', count(*),
            'total_wagered', COALESCE(sum(bet_amount), 0),
            'total_won', COALESCE(sum(win_amount), 0),
            'biggest_win', COALESCE(max(win_amount), 0),
            'win_rate', CASE 
                WHEN count(*) > 0 THEN 
                    round((count(*) FILTER (WHERE win_amount > bet_amount)::decimal / count(*) * 100), 2)
                ELSE 0 
            END
        )
    ) INTO game_stats
    FROM public.game_history
    WHERE user_id = user_uuid
    GROUP BY game_type;
    
    -- Return combined statistics
    RETURN jsonb_build_object(
        'success', true,
        'balance', user_stats.balance,
        'total_wagered', user_stats.total_wagered,
        'total_won', user_stats.total_won,
        'games_played', user_stats.games_played,
        'net_profit', (user_stats.total_won - user_stats.total_wagered),
        'member_since', user_stats.created_at,
        'last_daily_bonus', user_stats.last_daily_bonus,
        'can_claim_bonus', (user_stats.last_daily_bonus IS NULL OR user_stats.last_daily_bonus < CURRENT_DATE),
        'game_statistics', COALESCE(game_stats, '{}'::jsonb)
    );
END;
$;

-- Optimize get_game_history function with better pagination
CREATE OR REPLACE FUNCTION get_game_history(
    user_uuid UUID,
    limit_param INTEGER DEFAULT 50,
    offset_param INTEGER DEFAULT 0,
    game_type_filter TEXT DEFAULT NULL
)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
STABLE  -- Mark as STABLE since it doesn't modify data
AS $
DECLARE
    games JSONB;
    total_count INTEGER;
BEGIN
    -- Validate game type filter if provided
    IF game_type_filter IS NOT NULL AND game_type_filter NOT IN ('roulette', 'blackjack', 'case_opening') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid game type filter'
        );
    END IF;
    
    -- Get total count for pagination using optimized index
    SELECT count(*) INTO total_count
    FROM public.game_history
    WHERE user_id = user_uuid
    AND (game_type_filter IS NULL OR game_type = game_type_filter);
    
    -- Get paginated game history using composite index (user_id, created_at DESC)
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'game_type', game_type,
            'bet_amount', bet_amount,
            'win_amount', win_amount,
            'net_result', (win_amount - bet_amount),
            'result_data', result_data,
            'game_duration', game_duration,
            'created_at', created_at
        ) ORDER BY created_at DESC
    ) INTO games
    FROM (
        SELECT *
        FROM public.game_history
        WHERE user_id = user_uuid
        AND (game_type_filter IS NULL OR game_type = game_type_filter)
        ORDER BY created_at DESC
        LIMIT limit_param
        OFFSET offset_param
    ) subquery;
    
    -- Return paginated result
    RETURN jsonb_build_object(
        'success', true,
        'games', COALESCE(games, '[]'::jsonb),
        'total_count', total_count,
        'limit', limit_param,
        'offset', offset_param,
        'has_more', (offset_param + limit_param < total_count)
    );
END;
$;

-- ============================================================================
-- VACUUM AND ANALYZE
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE user_profiles;
ANALYZE game_history;
ANALYZE daily_bonuses;

-- ============================================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- ============================================================================

-- Function to get index usage statistics
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
AS $
BEGIN
    RETURN QUERY
    SELECT 
        schemaname::TEXT,
        tablename::TEXT,
        indexname::TEXT,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        CASE 
            WHEN idx_scan = 0 THEN 0
            ELSE round((idx_tup_fetch::numeric / idx_tup_read::numeric) * 100, 2)
        END as usage_ratio
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC;
END;
$;

-- Function to analyze slow queries (requires pg_stat_statements extension)
CREATE OR REPLACE FUNCTION get_slow_queries(
    min_calls INTEGER DEFAULT 10,
    min_mean_time_ms NUMERIC DEFAULT 100
)
RETURNS TABLE (
    query TEXT,
    calls BIGINT,
    total_time_ms NUMERIC,
    mean_time_ms NUMERIC,
    rows_per_call NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $
BEGIN
    -- Check if pg_stat_statements is available
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        RETURN QUERY SELECT 
            'pg_stat_statements extension not available'::TEXT as query,
            0::BIGINT as calls,
            0::NUMERIC as total_time_ms,
            0::NUMERIC as mean_time_ms,
            0::NUMERIC as rows_per_call;
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        query::TEXT,
        calls,
        round(total_exec_time, 2) as total_time_ms,
        round(mean_exec_time, 2) as mean_time_ms,
        round(rows::numeric / calls, 2) as rows_per_call
    FROM pg_stat_statements
    WHERE calls >= min_calls
    AND mean_exec_time >= min_mean_time_ms
    ORDER BY mean_exec_time DESC
    LIMIT 20;
END;
$;

-- Function to get table size and bloat information
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
AS $
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        n_tup_ins - n_tup_del as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as toast_size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$;

-- Add comments for documentation
COMMENT ON FUNCTION get_index_usage_stats() IS 'Returns index usage statistics to identify unused or inefficient indexes';
COMMENT ON FUNCTION get_slow_queries(INTEGER, NUMERIC) IS 'Returns slow queries analysis (requires pg_stat_statements extension)';
COMMENT ON FUNCTION get_table_stats() IS 'Returns table size and bloat information for monitoring database growth';

-- Create a view for easy performance monitoring
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
    'Index Usage' as metric_type,
    COUNT(*) as total_indexes,
    COUNT(*) FILTER (WHERE idx_scan = 0) as unused_indexes,
    AVG(usage_ratio) as avg_usage_ratio
FROM (
    SELECT 
        idx_scan,
        CASE 
            WHEN idx_scan = 0 THEN 0
            ELSE round((idx_tup_fetch::numeric / NULLIF(idx_tup_read, 0)::numeric) * 100, 2)
        END as usage_ratio
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
) index_stats
UNION ALL
SELECT 
    'Table Stats' as metric_type,
    COUNT(*) as total_tables,
    SUM(n_tup_ins - n_tup_del) as total_rows,
    AVG(pg_total_relation_size(schemaname||'.'||tablename)) as avg_table_size
FROM pg_stat_user_tables
WHERE schemaname = 'public';

COMMENT ON VIEW performance_summary IS 'High-level performance metrics summary for monitoring database health';