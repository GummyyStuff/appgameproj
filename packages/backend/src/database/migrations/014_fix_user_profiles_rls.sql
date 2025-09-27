-- Fix Multiple Permissive INSERT Policies on user_profiles
-- Migration 014: Combine conflicting INSERT policies to improve performance

-- Drop the existing conflicting policies
DROP POLICY IF EXISTS "Enable insert for authenticated users during registration" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create a single combined policy that covers both use cases
-- This eliminates the performance issue of multiple permissive policies
-- The registration trigger runs with SECURITY DEFINER and bypasses RLS,
-- so we only need the policy that allows users to insert their own profiles
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

-- The INSERT policies for service_role and anon remain unchanged as they're not part of this conflict

COMMENT ON POLICY "Users can insert own profile" ON user_profiles IS 'Policy allowing authenticated users to insert their own profile';
