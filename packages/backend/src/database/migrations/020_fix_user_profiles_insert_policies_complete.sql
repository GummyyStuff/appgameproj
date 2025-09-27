-- Fix Multiple Permissive INSERT Policies on user_profiles (Complete)
-- Migration 020: Drop ALL conflicting INSERT policies to eliminate performance issues

-- Drop ALL existing INSERT policies that may conflict
DROP POLICY IF EXISTS "Enable insert for authenticated users during registration" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile creation during auth" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create a single optimized INSERT policy
-- The registration trigger runs with SECURITY DEFINER and bypasses RLS,
-- so we only need the policy that allows users to insert their own profiles
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

-- The INSERT policies for service_role remain unchanged as they're not part of this conflict

COMMENT ON POLICY "Users can insert own profile" ON user_profiles IS 'Optimized policy allowing authenticated users to insert their own profile';


