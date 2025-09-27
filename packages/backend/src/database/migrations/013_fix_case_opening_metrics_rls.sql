-- Fix Multiple Permissive RLS Policies on case_opening_metrics
-- Migration 013: Combine conflicting SELECT policies to improve performance

-- Drop the existing conflicting policies
DROP POLICY IF EXISTS "Users can view own metrics" ON case_opening_metrics;
DROP POLICY IF EXISTS "Service can view all metrics" ON case_opening_metrics;

-- Create a single combined policy that covers both use cases
-- This eliminates the performance issue of multiple permissive policies
CREATE POLICY "Users and service can view metrics" ON case_opening_metrics
    FOR SELECT USING (
        -- Authenticated users can view their own metrics
        auth.uid() = user_id
        OR
        -- Service role can view all metrics for monitoring
        auth.jwt() ->> 'role' = 'service_role'
    );

-- The INSERT policy remains unchanged as it's not part of the conflict
-- "Service can insert metrics" policy should still exist from migration 007

COMMENT ON POLICY "Users and service can view metrics" ON case_opening_metrics IS 'Combined policy allowing users to view own metrics and service role to view all metrics';
