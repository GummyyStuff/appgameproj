-- Complete Chat System Migration
-- Creates chat_messages table and extends it with new functionality

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create chat_messages table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL CHECK (length(username) > 0 AND length(username) <= 50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  -- New columns for enhanced functionality
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES user_profiles(id)
);

-- Create chat_presence table for online user tracking (if it doesn't exist)
CREATE TABLE IF NOT EXISTS chat_presence (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL CHECK (length(username) > 0 AND length(username) <= 50),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_online BOOLEAN DEFAULT true NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_deleted ON chat_messages(is_deleted);
CREATE INDEX IF NOT EXISTS idx_chat_presence_is_online ON chat_presence(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_chat_presence_last_seen ON chat_presence(last_seen DESC);

-- Extend user_profiles table with chat-related fields
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_moderator boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS avatar_path text DEFAULT 'defaults/default-avatar.svg',
ADD COLUMN IF NOT EXISTS chat_rules_version int DEFAULT 1,
ADD COLUMN IF NOT EXISTS chat_rules_accepted_at timestamptz;

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_presence ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read all messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON chat_messages;
DROP POLICY IF EXISTS "No message updates allowed" ON chat_messages;
DROP POLICY IF EXISTS "No message deletes allowed" ON chat_messages;
DROP POLICY IF EXISTS "Users can read all presence" ON chat_presence;
DROP POLICY IF EXISTS "Users can manage own presence" ON chat_presence;
DROP POLICY IF EXISTS "Users can update own presence" ON chat_presence;
DROP POLICY IF EXISTS "Users can delete own presence" ON chat_presence;

-- Create new RLS policies for chat_messages
-- SELECT: authenticated users can read non-deleted messages
CREATE POLICY "Users can read non-deleted messages" ON chat_messages
  FOR SELECT TO authenticated
  USING (is_deleted = false);

-- INSERT: authenticated users can insert messages if they've accepted chat rules
CREATE POLICY "Users can insert messages after accepting rules" ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.is_active = true 
      AND up.chat_rules_accepted_at IS NOT NULL
    )
  );

-- UPDATE: only moderators can soft delete messages
CREATE POLICY "Moderators can soft delete messages" ON chat_messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.is_moderator = true
    )
  )
  WITH CHECK (
    -- Only allow updating is_deleted, deleted_at, deleted_by fields
    is_deleted = true AND
    deleted_at IS NOT NULL AND
    deleted_by = auth.uid()
  );

-- RLS Policies for chat_presence
CREATE POLICY "Users can read all presence" ON chat_presence
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own presence" ON chat_presence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presence" ON chat_presence
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presence" ON chat_presence
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_profiles updates
CREATE POLICY "Users can update own chat rules acceptance" ON user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    -- Only allow updating chat_rules_accepted_at and avatar_path
    auth.uid() = id
  );

-- Trigger function to set deleted_at and deleted_by on soft delete
CREATE OR REPLACE FUNCTION set_deleted_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
    NEW.deleted_at = now();
    NEW.deleted_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_deleted_fields ON chat_messages;
CREATE TRIGGER trigger_set_deleted_fields
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_deleted_fields();

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_recent_chat_messages(int);
DROP FUNCTION IF EXISTS get_user_quick_stats(uuid, int);

-- Helper function to get recent chat messages
CREATE OR REPLACE FUNCTION get_recent_chat_messages(message_limit int DEFAULT 100)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content text,
  created_at timestamptz,
  username text,
  display_name text,
  avatar_path text
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.user_id,
    cm.content,
    cm.created_at,
    up.username,
    up.display_name,
    up.avatar_path
  FROM chat_messages cm
  JOIN user_profiles up ON cm.user_id = up.id
  WHERE cm.is_deleted = false
  ORDER BY cm.created_at DESC
  LIMIT message_limit;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get user quick stats
CREATE OR REPLACE FUNCTION get_user_quick_stats(target_user_id uuid, days int DEFAULT 7)
RETURNS TABLE (
  total_wagered numeric,
  total_won numeric,
  wins int,
  losses int,
  win_loss_ratio numeric,
  profit_series jsonb
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_date timestamptz;
BEGIN
  start_date := now() - (days || ' days')::interval;
  
  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      DATE(gh.created_at) as game_date,
      SUM(gh.bet_amount) as daily_wagered,
      SUM(gh.win_amount) as daily_won,
      SUM(gh.win_amount - gh.bet_amount) as daily_profit,
      COUNT(CASE WHEN gh.win_amount > gh.bet_amount THEN 1 END) as daily_wins,
      COUNT(CASE WHEN gh.win_amount <= gh.bet_amount THEN 1 END) as daily_losses
    FROM game_history gh
    WHERE gh.user_id = target_user_id 
      AND gh.created_at >= start_date
    GROUP BY DATE(gh.created_at)
    ORDER BY game_date
  ),
  totals AS (
    SELECT 
      SUM(daily_wagered) as total_wagered,
      SUM(daily_won) as total_won,
      SUM(daily_wins) as total_wins,
      SUM(daily_losses) as total_losses
    FROM daily_stats
  ),
  profit_series AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', game_date,
        'profit', daily_profit
      ) ORDER BY game_date
    ) as series
    FROM daily_stats
  )
  SELECT 
    COALESCE(t.total_wagered, 0) as total_wagered,
    COALESCE(t.total_won, 0) as total_won,
    COALESCE(t.total_wins, 0) as wins,
    COALESCE(t.total_losses, 0) as losses,
    CASE 
      WHEN t.total_losses > 0 THEN t.total_wins::numeric / t.total_losses::numeric
      ELSE CASE WHEN t.total_wins > 0 THEN 999.99 ELSE 0 END
    END as win_loss_ratio,
    COALESCE(ps.series, '[]'::jsonb) as profit_series
  FROM totals t
  CROSS JOIN profit_series ps;
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_presence;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_presence TO authenticated;
GRANT SELECT ON user_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_chat_messages(int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_quick_stats(uuid, int) TO authenticated;
