-- ============================================================================
-- COMPATIBILITY VERIFICATION SCRIPT
-- ============================================================================
-- Run this BEFORE applying performance fixes to verify compatibility
-- This script checks for all existing tables, indexes, and policies

-- ============================================================================
-- 1. VERIFY ALL EXPECTED TABLES EXIST
-- ============================================================================

DO $$
DECLARE
    missing_tables TEXT[] := '{}';
    table_name TEXT;
    expected_tables TEXT[] := ARRAY[
        'user_profiles',
        'game_history', 
        'daily_bonuses',
        'audit_logs',
        'case_types',
        'tarkov_items',
        'case_item_pools',
        'case_opening_metrics'
    ];
BEGIN
    RAISE NOTICE '🔍 Checking for required tables...';
    
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = table_name
        ) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '❌ Missing tables: %', array_to_string(missing_tables, ', ');
        RAISE NOTICE '⚠️  Please run all migrations before applying performance fixes';
    ELSE
        RAISE NOTICE '✅ All required tables exist';
    END IF;
END $$;

-- ============================================================================
-- 2. VERIFY EXISTING INDEXES
-- ============================================================================

SELECT 
    '📊 Existing Indexes' as info,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- ============================================================================
-- 3. VERIFY EXISTING RLS POLICIES
-- ============================================================================

SELECT 
    '🔒 Existing RLS Policies' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 4. VERIFY EXISTING FUNCTIONS
-- ============================================================================

SELECT 
    '⚙️ Existing Functions' as info,
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN (
        'get_user_balance',
        'process_game_transaction',
        'claim_daily_bonus',
        'get_user_statistics',
        'get_game_history',
        'get_leaderboard',
        'handle_new_user',
        'update_updated_at_column',
        'notify_balance_change',
        'notify_game_completion',
        'notify_daily_bonus',
        'get_realtime_channels',
        'cleanup_old_audit_logs',
        'get_audit_statistics',
        'detect_suspicious_activity',
        'audit_trigger_function',
        'cleanup_old_case_opening_metrics',
        'get_case_opening_system_health'
    )
ORDER BY function_name;

-- ============================================================================
-- 5. CHECK COLUMN COMPATIBILITY
-- ============================================================================

-- Verify user_profiles columns
SELECT 
    '👤 user_profiles columns' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Verify game_history columns and constraints
SELECT 
    '🎮 game_history columns' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'game_history'
ORDER BY ordinal_position;

-- Check game_type constraint
SELECT 
    '🎮 game_history constraints' as info,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.game_history'::regclass
    AND contype = 'c'; -- check constraints

-- ============================================================================
-- 6. VERIFY EXTENSIONS
-- ============================================================================

SELECT 
    '🔧 Installed Extensions' as info,
    extname as extension_name,
    extversion as version
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pg_stat_statements')
ORDER BY extname;

-- ============================================================================
-- 7. CHECK FOR POTENTIAL CONFLICTS
-- ============================================================================

-- Check for indexes that might conflict with our new ones
SELECT 
    '⚠️ Potential Index Conflicts' as info,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND (
        indexname LIKE '%user_id%' OR
        indexname LIKE '%balance%' OR
        indexname LIKE '%created_at%' OR
        indexname LIKE '%timestamp%'
    )
ORDER BY tablename, indexname;

-- ============================================================================
-- 8. COMPATIBILITY SUMMARY
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    policy_count INTEGER;
    function_count INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM pg_tables 
    WHERE schemaname = 'public';
    
    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '📋 COMPATIBILITY SUMMARY';
    RAISE NOTICE '========================';
    RAISE NOTICE 'Tables: %', table_count;
    RAISE NOTICE 'Indexes: %', index_count;
    RAISE NOTICE 'RLS Policies: %', policy_count;
    RAISE NOTICE 'Functions: %', function_count;
    RAISE NOTICE '';
    
    IF table_count >= 8 THEN
        RAISE NOTICE '✅ Database appears to have all expected tables';
        RAISE NOTICE '✅ Ready to apply performance optimizations';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 Next step: Run SUPABASE_PERFORMANCE_FIXES.sql';
    ELSE
        RAISE NOTICE '⚠️  Database may be missing some tables';
        RAISE NOTICE '⚠️  Please verify all migrations have been applied';
    END IF;
END $$;