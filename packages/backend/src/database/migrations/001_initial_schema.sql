-- Initial database schema for Tarkov Casino Website
-- This migration creates the core tables and sets up Row Level Security

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    balance DECIMAL(15,2) DEFAULT 10000.00 NOT NULL CHECK (balance >= 0),
    total_wagered DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
    total_won DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
    games_played INTEGER DEFAULT 0 NOT NULL,
    last_daily_bonus DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Create game_history table
CREATE TABLE IF NOT EXISTS game_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    game_type VARCHAR(20) NOT NULL CHECK (game_type IN ('roulette', 'blackjack')),
    bet_amount DECIMAL(15,2) NOT NULL CHECK (bet_amount > 0),
    win_amount DECIMAL(15,2) DEFAULT 0.00 NOT NULL CHECK (win_amount >= 0),
    result_data JSONB NOT NULL, -- Game-specific result data
    game_duration INTEGER, -- Duration in milliseconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for game_history table
CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON game_history (user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON game_history (game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_user_game_type ON game_history (user_id, game_type);

-- Create daily_bonuses table to track bonus claims
CREATE TABLE IF NOT EXISTS daily_bonuses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    bonus_amount DECIMAL(15,2) NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create unique index to ensure one bonus per user per day
-- Using date cast instead of DATE() function since it's immutable
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_bonuses_user_date 
ON daily_bonuses (user_id, (claimed_at::date));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger to user_profiles
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_bonuses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for game_history
CREATE POLICY "Users can view own game history" ON game_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game history" ON game_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for daily_bonuses
CREATE POLICY "Users can view own daily bonuses" ON daily_bonuses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily bonuses" ON daily_bonuses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user registration
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
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();