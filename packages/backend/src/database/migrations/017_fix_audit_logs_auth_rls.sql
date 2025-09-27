-- Fix Auth RLS Initialization Plan for audit_logs
-- Migration 017: Optimize RLS policy by caching auth.role() result

-- Drop the existing policy that causes re-evaluation
DROP POLICY IF EXISTS "Service role can manage audit logs" ON audit_logs;

-- Recreate the policy with optimized auth function caching
-- Wrapping auth.role() in SELECT allows PostgreSQL to cache the result per statement
CREATE POLICY "Service role can manage audit logs" ON audit_logs
    FOR ALL USING ((SELECT auth.role()) = 'service_role');

COMMENT ON POLICY "Service role can manage audit logs" ON audit_logs IS 'Optimized policy allowing only service role to manage audit logs, with cached auth.role() evaluation';
