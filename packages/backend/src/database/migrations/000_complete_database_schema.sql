-- Complete Tarkov Casino Database Schema with Chat System
-- This migration creates the entire database from scratch
-- Run this on a fresh Supabase instance

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- CORE TABLES
-- ==============================================

-- Create user_profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    balance DECIMAL(15,2) DEFAULT 10000.00 NOT NULL CHECK (balance >= 0),
    total_wagered DECIMAL(15,2) DEFAULT 0.00 NOT NULL CHECK (total_wagered >= 0),
    total_won DECIMAL(15,2) DEFAULT 0.00 NOT NULL CHECK (total_won >= 0),
    games_played INTEGER DEFAULT 0 NOT NULL CHECK (games_played >= 0),
    last_daily_bonus DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Chat-related fields
    is_moderator boolean DEFAULT false,
    avatar_path text DEFAULT 'defaults/default-avatar.svg',
    chat_rules_version int DEFAULT 1,
    chat_rules_accepted_at timestamptz,
    
    -- Constraints
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 50),
    CONSTRAINT display_name_length CHECK (display_name IS NULL OR char_length(display_name) <= 100)
);

-- Create game_history table
CREATE TABLE IF NOT EXISTS game_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    game_type TEXT NOT NULL CHECK (game_type IN ('roulette', 'blackjack', 'case_opening')),
    bet_amount DECIMAL(15,2) NOT NULL CHECK (bet_amount >= 0),
    win_amount DECIMAL(15,2) DEFAULT 0.00 NOT NULL CHECK (win_amount >= 0),
    result_data JSONB NOT NULL,
    game_duration INTEGER CHECK (game_duration > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create daily_bonuses table
CREATE TABLE IF NOT EXISTS daily_bonuses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    bonus_date DATE DEFAULT CURRENT_DATE NOT NULL,
    bonus_amount DECIMAL(15,2) NOT NULL CHECK (bonus_amount > 0),
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Simple unique constraint: one bonus per user per date
    UNIQUE(user_id, bonus_date)
);

-- ==============================================
-- CASE OPENING TABLES
-- ==============================================

-- Create case_types table
CREATE TABLE IF NOT EXISTS case_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    price DECIMAL(15,2) NOT NULL CHECK (price > 0),
    description TEXT NOT NULL,
    image_url TEXT,
    rarity_distribution JSONB NOT NULL DEFAULT '{
        "common": 60,
        "uncommon": 25,
        "rare": 10,
        "epic": 4,
        "legendary": 1
    }'::jsonb,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create tarkov_items table
CREATE TABLE IF NOT EXISTS tarkov_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    base_value DECIMAL(15,2) NOT NULL CHECK (base_value > 0),
    category TEXT NOT NULL CHECK (category IN ('medical', 'electronics', 'consumables', 'valuables', 'keycards')),
    image_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create case_item_pools junction table
CREATE TABLE IF NOT EXISTS case_item_pools (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    case_type_id UUID REFERENCES case_types(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES tarkov_items(id) ON DELETE CASCADE NOT NULL,
    weight DECIMAL(5,2) DEFAULT 1.00 NOT NULL CHECK (weight > 0),
    value_multiplier DECIMAL(5,2) DEFAULT 1.00 NOT NULL CHECK (value_multiplier > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure unique case-item combinations
    UNIQUE(case_type_id, item_id)
);

-- ==============================================
-- AUDIT LOGS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    metadata JSONB
);

-- ==============================================
-- CHAT SYSTEM TABLES
-- ==============================================

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL CHECK (length(username) > 0 AND length(username) <= 50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  -- Enhanced functionality
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES user_profiles(id)
);

-- Create chat_presence table for online user tracking
CREATE TABLE IF NOT EXISTS chat_presence (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL CHECK (length(username) > 0 AND length(username) <= 50),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_online BOOLEAN DEFAULT true NOT NULL
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active) WHERE is_active = true;

-- Game history indexes
CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON game_history(game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_user_game_type ON game_history(user_id, game_type);

-- Daily bonuses indexes
CREATE INDEX IF NOT EXISTS idx_daily_bonuses_user_date ON daily_bonuses(user_id, bonus_date);
CREATE INDEX IF NOT EXISTS idx_daily_bonuses_date ON daily_bonuses(bonus_date);

-- Case opening indexes
CREATE INDEX IF NOT EXISTS idx_case_types_active ON case_types(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_case_types_price ON case_types(price);
CREATE INDEX IF NOT EXISTS idx_tarkov_items_rarity ON tarkov_items(rarity);
CREATE INDEX IF NOT EXISTS idx_tarkov_items_category ON tarkov_items(category);
CREATE INDEX IF NOT EXISTS idx_tarkov_items_active ON tarkov_items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tarkov_items_value ON tarkov_items(base_value);
CREATE INDEX IF NOT EXISTS idx_case_item_pools_case_type ON case_item_pools(case_type_id);
CREATE INDEX IF NOT EXISTS idx_case_item_pools_item ON case_item_pools(item_id);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id, timestamp DESC);

-- Chat system indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_deleted ON chat_messages(is_deleted);
CREATE INDEX IF NOT EXISTS idx_chat_presence_is_online ON chat_presence(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_chat_presence_last_seen ON chat_presence(last_seen DESC);

-- ==============================================
-- TRIGGER FUNCTIONS
-- ==============================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, username, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'player_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', 'Tarkov Player')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log changes to user_profiles table
    IF TG_TABLE_NAME = 'user_profiles' THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            resource_type,
            resource_id,
            old_values,
            new_values
        ) VALUES (
            COALESCE(NEW.id, OLD.id),
            TG_OP || '_user_profile',
            'user_profile',
            COALESCE(NEW.id::TEXT, OLD.id::TEXT),
            CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_case_types_updated_at ON case_types;
CREATE TRIGGER update_case_types_updated_at 
    BEFORE UPDATE ON case_types 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tarkov_items_updated_at ON tarkov_items;
CREATE TRIGGER update_tarkov_items_updated_at 
    BEFORE UPDATE ON tarkov_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION handle_new_user();

-- Chat system trigger
DROP TRIGGER IF EXISTS trigger_set_deleted_fields ON chat_messages;
CREATE TRIGGER trigger_set_deleted_fields
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_deleted_fields();

-- Audit triggers
DROP TRIGGER IF EXISTS audit_user_profiles_trigger ON user_profiles;
CREATE TRIGGER audit_user_profiles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarkov_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_item_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own chat rules acceptance" ON user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    -- Only allow updating chat_rules_accepted_at and avatar_path
    auth.uid() = id
  );

-- RLS Policies for game_history
CREATE POLICY "Users can view own game history" ON game_history
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game history" ON game_history
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for daily_bonuses
CREATE POLICY "Users can view own daily bonuses" ON daily_bonuses
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily bonuses" ON daily_bonuses
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for case_types (public read access)
CREATE POLICY "Anyone can view active case types" ON case_types
    FOR SELECT 
    USING (is_active = true);

-- RLS Policies for tarkov_items (public read access)
CREATE POLICY "Anyone can view active items" ON tarkov_items
    FOR SELECT 
    USING (is_active = true);

-- RLS Policies for case_item_pools (public read access)
CREATE POLICY "Anyone can view case item pools" ON case_item_pools
    FOR SELECT 
    USING (true);

-- RLS Policies for audit_logs (service role only)
CREATE POLICY "Service role can manage audit logs" ON audit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for chat_messages
CREATE POLICY "Users can read non-deleted messages" ON chat_messages
  FOR SELECT TO authenticated
  USING (is_deleted = false);

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

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

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

-- Function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete audit logs older than 2 years, except for critical security events
    DELETE FROM audit_logs 
    WHERE timestamp < NOW() - INTERVAL '2 years'
        AND action NOT IN ('security_event', 'ip_blocked', 'account_locked', 'admin_action');
    
    -- Log the cleanup action
    INSERT INTO audit_logs (action, resource_type, success, metadata)
    VALUES ('audit_cleanup', 'system', true, jsonb_build_object('cleaned_at', NOW()));
END;
$$;

-- Function to get audit statistics
CREATE OR REPLACE FUNCTION get_audit_statistics(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    total_events BIGINT,
    successful_events BIGINT,
    failed_events BIGINT,
    unique_users BIGINT,
    unique_ips BIGINT,
    top_actions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE success = true) as successful_events,
        COUNT(*) FILTER (WHERE success = false) as failed_events,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT ip_address) as unique_ips,
        jsonb_agg(
            jsonb_build_object(
                'action', action,
                'count', action_count
            ) ORDER BY action_count DESC
        ) FILTER (WHERE row_num <= 10) as top_actions
    FROM (
        SELECT 
            action,
            COUNT(*) as action_count,
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as row_num
        FROM audit_logs
        WHERE timestamp BETWEEN start_date AND end_date
        GROUP BY action
    ) action_stats
    CROSS JOIN (
        SELECT *
        FROM audit_logs
        WHERE timestamp BETWEEN start_date AND end_date
    ) all_logs;
END;
$$;

-- ==============================================
-- REALTIME SETUP
-- ==============================================

-- Set up Realtime publication
BEGIN;
    DROP PUBLICATION IF EXISTS supabase_realtime;
    CREATE PUBLICATION supabase_realtime;
COMMIT;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE game_history;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_bonuses;
ALTER PUBLICATION supabase_realtime ADD TABLE case_types;
ALTER PUBLICATION supabase_realtime ADD TABLE tarkov_items;
ALTER PUBLICATION supabase_realtime ADD TABLE case_item_pools;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_presence;

-- ==============================================
-- PERMISSIONS
-- ==============================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, INSERT ON game_history TO authenticated;
GRANT SELECT, INSERT ON daily_bonuses TO authenticated;
GRANT SELECT ON case_types TO authenticated;
GRANT SELECT ON tarkov_items TO authenticated;
GRANT SELECT ON case_item_pools TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_presence TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_chat_messages(int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_quick_stats(uuid, int) TO authenticated;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs() TO service_role;
GRANT EXECUTE ON FUNCTION get_audit_statistics(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

-- ==============================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON TABLE user_profiles IS 'User account information and chat settings';
COMMENT ON TABLE game_history IS 'Game results and statistics tracking';
COMMENT ON TABLE daily_bonuses IS 'Daily bonus claims tracking';
COMMENT ON TABLE case_types IS 'Different types of cases available for opening';
COMMENT ON TABLE tarkov_items IS 'Tarkov items database with rarities and values';
COMMENT ON TABLE case_item_pools IS 'Junction table linking cases to their possible items';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for security and compliance tracking';
COMMENT ON TABLE chat_messages IS 'Real-time chat messages with moderation support';
COMMENT ON TABLE chat_presence IS 'Online user presence tracking for chat';

COMMENT ON COLUMN user_profiles.is_moderator IS 'Whether user has moderator privileges for chat';
COMMENT ON COLUMN user_profiles.avatar_path IS 'Path to user avatar in storage bucket';
COMMENT ON COLUMN user_profiles.chat_rules_accepted_at IS 'When user accepted current chat rules version';

COMMENT ON COLUMN chat_messages.is_deleted IS 'Soft delete flag for moderation';
COMMENT ON COLUMN chat_messages.deleted_at IS 'When message was soft deleted';
COMMENT ON COLUMN chat_messages.deleted_by IS 'User who deleted the message';

COMMENT ON FUNCTION get_recent_chat_messages(int) IS 'Get recent chat messages with user info';
COMMENT ON FUNCTION get_user_quick_stats(uuid, int) IS 'Get user statistics and profit chart data';
COMMENT ON FUNCTION cleanup_old_audit_logs() IS 'Removes old audit logs according to retention policy';
COMMENT ON FUNCTION get_audit_statistics(TIMESTAMPTZ, TIMESTAMPTZ) IS 'Returns audit statistics for a given time period';
