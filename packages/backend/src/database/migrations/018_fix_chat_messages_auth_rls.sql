-- Fix Auth RLS Initialization Plan for chat_messages
-- Migration 018: Optimize RLS policy by caching auth.uid() result

-- Drop the existing policy that causes re-evaluation
DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;

-- Recreate the policy with optimized auth function caching
-- Wrapping auth.uid() in SELECT allows PostgreSQL to cache the result per statement
CREATE POLICY "Users can insert own messages" ON public.chat_messages
    FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = user_id);

COMMENT ON POLICY "Users can insert own messages" ON public.chat_messages IS 'Optimized policy allowing users to insert their own messages, with cached auth.uid() evaluation';
