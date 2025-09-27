-- Chat System Complete Migration
-- This migration sets up the complete chat system infrastructure including:
-- 1. chat_messages table with constraints and indexes
-- 2. chat_presence table for online user tracking
-- 3. Row Level Security policies
-- 4. Real-time triggers for message broadcasting
-- 5. Real-time subscriptions enablement

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    username TEXT NOT NULL CHECK (length(username) > 0 AND length(username) <= 50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create chat_presence table for online user tracking
CREATE TABLE IF NOT EXISTS public.chat_presence (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT NOT NULL CHECK (length(username) > 0 AND length(username) <= 50),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    is_online BOOLEAN DEFAULT true NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_presence_is_online ON public.chat_presence(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_chat_presence_last_seen ON public.chat_presence(last_seen);

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_presence ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read all messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users cannot update messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users cannot delete messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can read all presence" ON public.chat_presence;
DROP POLICY IF EXISTS "Users can manage own presence" ON public.chat_presence;

-- Create RLS policies for chat_messages
-- Users can read all messages (public chat)
CREATE POLICY "Users can read all messages" ON public.chat_messages
    FOR SELECT 
    USING (true);

-- Users can only insert their own messages
CREATE POLICY "Users can insert own messages" ON public.chat_messages
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Prevent updates to messages (immutable)
CREATE POLICY "Users cannot update messages" ON public.chat_messages
    FOR UPDATE 
    USING (false);

-- Prevent deletion of messages (permanent record)
CREATE POLICY "Users cannot delete messages" ON public.chat_messages
    FOR DELETE 
    USING (false);

-- Create RLS policies for chat_presence
-- Users can read all presence information
CREATE POLICY "Users can read all presence" ON public.chat_presence
    FOR SELECT 
    USING (true);

-- Users can manage their own presence
CREATE POLICY "Users can manage own presence" ON public.chat_presence
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for chat_messages updated_at
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle user presence updates
CREATE OR REPLACE FUNCTION public.handle_user_presence()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert user presence when they send a message
    INSERT INTO public.chat_presence (user_id, username, last_seen, is_online)
    VALUES (NEW.user_id, NEW.username, NOW(), true)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        username = EXCLUDED.username,
        last_seen = EXCLUDED.last_seen,
        is_online = EXCLUDED.is_online;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update presence when messages are sent
DROP TRIGGER IF EXISTS update_user_presence_on_message ON public.chat_messages;
CREATE TRIGGER update_user_presence_on_message
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_presence();

-- Create function to clean up stale presence records
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS void AS $$
BEGIN
    -- Mark users as offline if they haven't been seen for more than 5 minutes
    UPDATE public.chat_presence 
    SET is_online = false 
    WHERE last_seen < NOW() - INTERVAL '5 minutes' 
    AND is_online = true;
    
    -- Delete presence records older than 24 hours
    DELETE FROM public.chat_presence 
    WHERE last_seen < NOW() - INTERVAL '24 hours';
END;
$$ language 'plpgsql';

-- Create function for real-time message broadcasting
CREATE OR REPLACE FUNCTION public.broadcast_chat_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Broadcast new message to all connected clients
    PERFORM pg_notify(
        'chat_message',
        json_build_object(
            'id', NEW.id,
            'content', NEW.content,
            'user_id', NEW.user_id,
            'username', NEW.username,
            'created_at', NEW.created_at,
            'updated_at', NEW.updated_at
        )::text
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for real-time message broadcasting
DROP TRIGGER IF EXISTS broadcast_new_chat_message ON public.chat_messages;
CREATE TRIGGER broadcast_new_chat_message
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.broadcast_chat_message();

-- Create function for real-time presence broadcasting
CREATE OR REPLACE FUNCTION public.broadcast_presence_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Broadcast presence change to all connected clients
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM pg_notify(
            'chat_presence',
            json_build_object(
                'user_id', NEW.user_id,
                'username', NEW.username,
                'last_seen', NEW.last_seen,
                'is_online', NEW.is_online,
                'action', CASE 
                    WHEN TG_OP = 'INSERT' THEN 'join'
                    WHEN OLD.is_online != NEW.is_online THEN 
                        CASE WHEN NEW.is_online THEN 'online' ELSE 'offline' END
                    ELSE 'update'
                END
            )::text
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM pg_notify(
            'chat_presence',
            json_build_object(
                'user_id', OLD.user_id,
                'username', OLD.username,
                'action', 'leave'
            )::text
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger for real-time presence broadcasting
DROP TRIGGER IF EXISTS broadcast_presence_change ON public.chat_presence;
CREATE TRIGGER broadcast_presence_change
    AFTER INSERT OR UPDATE OR DELETE ON public.chat_presence
    FOR EACH ROW
    EXECUTE FUNCTION public.broadcast_presence_change();

-- Enable real-time subscriptions on tables
-- Note: This is handled by Supabase automatically when RLS is enabled
-- The tables will be available for real-time subscriptions

-- Create helper function to get recent messages
CREATE OR REPLACE FUNCTION public.get_recent_chat_messages(message_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    content TEXT,
    user_id UUID,
    username TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.content,
        m.user_id,
        m.username,
        m.created_at,
        m.updated_at
    FROM public.chat_messages m
    ORDER BY m.created_at DESC
    LIMIT message_limit;
END;
$$ language 'plpgsql';

-- Create helper function to get online users
CREATE OR REPLACE FUNCTION public.get_online_users()
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    last_seen TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        p.username,
        p.last_seen
    FROM public.chat_presence p
    WHERE p.is_online = true
    ORDER BY p.username ASC;
END;
$$ language 'plpgsql';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_presence TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_chat_messages(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_online_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_presence() TO authenticated;

-- Create indexes for the helper functions
-- Note: Removed time-based partial index as NOW() is not IMMUTABLE
-- The regular created_at index will handle recent message queries efficiently
CREATE INDEX IF NOT EXISTS idx_chat_messages_recent ON public.chat_messages(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE public.chat_messages IS 'Stores all chat messages with user information and timestamps';
COMMENT ON TABLE public.chat_presence IS 'Tracks online user presence and last seen timestamps';
COMMENT ON FUNCTION public.get_recent_chat_messages(INTEGER) IS 'Returns the most recent chat messages, limited by the provided count';
COMMENT ON FUNCTION public.get_online_users() IS 'Returns all currently online users';
COMMENT ON FUNCTION public.cleanup_stale_presence() IS 'Cleans up stale presence records and marks inactive users as offline';