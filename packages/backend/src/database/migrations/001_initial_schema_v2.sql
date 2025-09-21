-- Tarkov Casino Database Schema
-- Created using Supabase best practices and PostgreSQL standards
-- This migration creates all tables, RLS policies, and constraints

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    
    -- Constraints
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 50),
    CONSTRAINT display_name_length CHECK (display_name IS NULL OR char_length(display_name) <= 100)
);

-- Create game_history table
CREATE TABLE IF NOT EXISTS game_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    game_type TEXT NOT NULL CHECK (game_type IN ('roulette', 'blackjack', 'plinko')),
    bet_amount DECIMAL(15,2) NOT NULL CHECK (bet_amount > 0),
    win_amount DECIMAL(15,2) DEFAULT 0.00 NOT NULL CHECK (win_amount >= 0),
    result_data JSONB NOT NULL,
    game_duration INTEGER CHECK (game_duration > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create daily_bonuses table
-- Using a simple approach: store date as DATE type and use regular unique constraint
CREATE TABLE IF NOT EXISTS daily_bonuses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    bonus_date DATE DEFAULT CURRENT_DATE NOT NULL,
    bonus_amount DECIMAL(15,2) NOT NULL CHECK (bonus_amount > 0),
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Simple unique constraint: one bonus per user per date
    UNIQUE(user_id, bonus_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON game_history(game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_user_game_type ON game_history(user_id, game_type);

CREATE INDEX IF NOT EXISTS idx_daily_bonuses_user_date ON daily_bonuses(user_id, bonus_date);
CREATE INDEX IF NOT EXISTS idx_daily_bonuses_date ON daily_bonuses(bonus_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_bonuses ENABLE ROW LEVEL SECURITY;

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

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION handle_new_user();

-- Set up Realtime (optional - for live updates)
BEGIN;
    DROP PUBLICATION IF EXISTS supabase_realtime;
    CREATE PUBLICATION supabase_realtime;
COMMIT;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE game_history;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_bonuses;