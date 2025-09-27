-- Fix Multiple Permissive Policies on chat_presence
-- Migration 016: Separate SELECT and management policies to eliminate conflicts

-- Drop the existing conflicting policies
DROP POLICY IF EXISTS "Users can read all presence" ON public.chat_presence;
DROP POLICY IF EXISTS "Users can manage own presence" ON public.chat_presence;

-- Create separate policies to avoid multiple permissive policies for the same action
-- Users can read all presence information (needed for chat functionality)
CREATE POLICY "Users can read all presence" ON public.chat_presence
    FOR SELECT
    USING (true);

-- Users can only manage their own presence records
CREATE POLICY "Users can insert own presence" ON public.chat_presence
    FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own presence" ON public.chat_presence
    FOR UPDATE
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own presence" ON public.chat_presence
    FOR DELETE
    USING ((SELECT auth.uid()) = user_id);

COMMENT ON POLICY "Users can read all presence" ON public.chat_presence IS 'Allows all authenticated users to read presence information for chat functionality';
COMMENT ON POLICY "Users can insert own presence" ON public.chat_presence IS 'Allows users to insert their own presence records';
COMMENT ON POLICY "Users can update own presence" ON public.chat_presence IS 'Allows users to update their own presence records';
COMMENT ON POLICY "Users can delete own presence" ON public.chat_presence IS 'Allows users to delete their own presence records';
