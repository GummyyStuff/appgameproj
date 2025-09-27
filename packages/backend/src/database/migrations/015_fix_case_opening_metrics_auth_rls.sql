-- Fix Auth RLS Initialization Plan for case_opening_metrics
-- Migration 015: Optimize RLS policy by caching auth.uid() result

-- Drop the existing policy that causes re-evaluation
DROP POLICY IF EXISTS "Users and service can view metrics" ON case_opening_metrics;

-- Recreate the policy with optimized auth function caching
-- Wrapping auth.uid() in SELECT allows PostgreSQL to cache the result per statement
CREATE POLICY "Users and service can view metrics" ON case_opening_metrics
    FOR SELECT USING (
        -- Authenticated users can view their own metrics
        (SELECT auth.uid()) = user_id
        OR
        -- Service role can view all metrics for monitoring
        auth.jwt() ->> 'role' = 'service_role'
    );

COMMENT ON POLICY "Users and service can view metrics" ON case_opening_metrics IS 'Optimized policy allowing users to view own metrics and service role to view all metrics, with cached auth.uid() evaluation';
