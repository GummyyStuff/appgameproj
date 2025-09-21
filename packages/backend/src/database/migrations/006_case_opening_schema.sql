-- Case Opening System Database Schema
-- Migration 006: Add case opening tables and data
-- This migration creates tables for case types, Tarkov items, and case-item relationships

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

-- Update game_history to support case opening
-- First check existing game types and update any invalid ones
UPDATE game_history 
SET game_type = 'roulette' 
WHERE game_type NOT IN ('roulette', 'blackjack', 'case_opening');

-- Now safely drop and recreate the constraint
ALTER TABLE game_history 
DROP CONSTRAINT IF EXISTS game_history_game_type_check;

ALTER TABLE game_history 
ADD CONSTRAINT game_history_game_type_check 
CHECK (game_type IN ('roulette', 'blackjack', 'case_opening'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_case_types_active ON case_types(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_case_types_price ON case_types(price);

CREATE INDEX IF NOT EXISTS idx_tarkov_items_rarity ON tarkov_items(rarity);
CREATE INDEX IF NOT EXISTS idx_tarkov_items_category ON tarkov_items(category);
CREATE INDEX IF NOT EXISTS idx_tarkov_items_active ON tarkov_items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tarkov_items_value ON tarkov_items(base_value);

CREATE INDEX IF NOT EXISTS idx_case_item_pools_case_type ON case_item_pools(case_type_id);
CREATE INDEX IF NOT EXISTS idx_case_item_pools_item ON case_item_pools(item_id);

-- Add updated_at triggers
CREATE TRIGGER update_case_types_updated_at 
    BEFORE UPDATE ON case_types 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tarkov_items_updated_at 
    BEFORE UPDATE ON tarkov_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE case_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarkov_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_item_pools ENABLE ROW LEVEL SECURITY;

-- RLS Policies for case_types (public read access)
DROP POLICY IF EXISTS "Anyone can view active case types" ON case_types;
CREATE POLICY "Anyone can view active case types" ON case_types
    FOR SELECT 
    USING (is_active = true);

-- RLS Policies for tarkov_items (public read access)
DROP POLICY IF EXISTS "Anyone can view active items" ON tarkov_items;
CREATE POLICY "Anyone can view active items" ON tarkov_items
    FOR SELECT 
    USING (is_active = true);

-- RLS Policies for case_item_pools (public read access)
DROP POLICY IF EXISTS "Anyone can view case item pools" ON case_item_pools;
CREATE POLICY "Anyone can view case item pools" ON case_item_pools
    FOR SELECT 
    USING (true);

-- Add tables to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE case_types;
ALTER PUBLICATION supabase_realtime ADD TABLE tarkov_items;
ALTER PUBLICATION supabase_realtime ADD TABLE case_item_pools;