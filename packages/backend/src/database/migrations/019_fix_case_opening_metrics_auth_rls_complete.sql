-- Fix Auth RLS Initialization Plan for case_opening_metrics (Complete)
-- Migration 019: Optimize RLS policy by caching all auth function results

-- Drop the existing policy that causes re-evaluation
DROP POLICY IF EXISTS "Users and service can view metrics" ON case_opening_metrics;

-- Recreate the policy with fully optimized auth function caching
-- Wrapping both auth.uid() and auth.jwt() in SELECT allows PostgreSQL to cache both results per statement
CREATE POLICY "Users and service can view metrics" ON case_opening_metrics
    FOR SELECT USING (
        -- Authenticated users can view their own metrics
        (SELECT auth.uid()) = user_id
        OR
        -- Service role can view all metrics for monitoring
        (SELECT auth.jwt() ->> 'role') = 'service_role'
    );

COMMENT ON POLICY "Users and service can view metrics" ON case_opening_metrics IS 'Fully optimized policy allowing users to view own metrics and service role to view all metrics, with cached auth function evaluation';
