-- Seed data for Tarkov Casino Website
-- This file contains test data for development and testing

-- Note: This seed data is for development/testing only
-- In production, users will be created through the authentication system

-- Insert test user profiles (these would normally be created via auth trigger)
-- These are example UUIDs for testing - replace with actual auth.users IDs in development

-- Test user 1: High roller
INSERT INTO user_profiles (id, username, display_name, balance, total_wagered, total_won, games_played) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'tarkov_legend',
    'Tarkov Legend',
    50000.00,
    25000.00,
    22000.00,
    150
) ON CONFLICT (id) DO NOTHING;

-- Test user 2: New player
INSERT INTO user_profiles (id, username, display_name, balance, total_wagered, total_won, games_played) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'scav_runner',
    'Scav Runner',
    8500.00,
    1500.00,
    800.00,
    25
) ON CONFLICT (id) DO NOTHING;

-- Test user 3: Unlucky player
INSERT INTO user_profiles (id, username, display_name, balance, total_wagered, total_won, games_played) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    'extract_camper',
    'Extract Camper',
    2000.00,
    8000.00,
    3500.00,
    80
) ON CONFLICT (id) DO NOTHING;

-- Sample game history for test users
-- Roulette games
INSERT INTO game_history (user_id, game_type, bet_amount, win_amount, result_data, game_duration) VALUES
('550e8400-e29b-41d4-a716-446655440001'::uuid, 'roulette', 1000.00, 3600.00, 
 '{"bet_type": "number", "bet_value": 7, "winning_number": 7, "multiplier": 36}', 5000),
('550e8400-e29b-41d4-a716-446655440001'::uuid, 'roulette', 500.00, 0.00, 
 '{"bet_type": "red", "bet_value": "red", "winning_number": 0, "multiplier": 0}', 3000),
('550e8400-e29b-41d4-a716-446655440002'::uuid, 'roulette', 100.00, 200.00, 
 '{"bet_type": "red", "bet_value": "red", "winning_number": 14, "multiplier": 2}', 4000);

-- Blackjack games
INSERT INTO game_history (user_id, game_type, bet_amount, win_amount, result_data, game_duration) VALUES
('550e8400-e29b-41d4-a716-446655440001'::uuid, 'blackjack', 2000.00, 4000.00, 
 '{"player_hand": [{"suit": "hearts", "value": "A"}, {"suit": "spades", "value": "K"}], "dealer_hand": [{"suit": "clubs", "value": "10"}, {"suit": "diamonds", "value": "8"}], "result": "blackjack"}', 15000),
('550e8400-e29b-41d4-a716-446655440002'::uuid, 'blackjack', 250.00, 0.00, 
 '{"player_hand": [{"suit": "hearts", "value": "K"}, {"suit": "spades", "value": "Q"}], "dealer_hand": [{"suit": "clubs", "value": "A"}, {"suit": "diamonds", "value": "10"}], "result": "dealer_blackjack"}', 8000),
('550e8400-e29b-41d4-a716-446655440003'::uuid, 'blackjack', 500.00, 1000.00, 
 '{"player_hand": [{"suit": "hearts", "value": "9"}, {"suit": "spades", "value": "10"}], "dealer_hand": [{"suit": "clubs", "value": "K"}, {"suit": "diamonds", "value": "6"}], "result": "player_win"}', 12000);


-- Sample daily bonus claims
INSERT INTO daily_bonuses (user_id, bonus_amount, claimed_at) VALUES
('550e8400-e29b-41d4-a716-446655440002'::uuid, 1000.00, CURRENT_DATE - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440003'::uuid, 1000.00, CURRENT_DATE - INTERVAL '2 days');

-- Update last_daily_bonus for test users
UPDATE user_profiles 
SET last_daily_bonus = CURRENT_DATE - INTERVAL '1 day'
WHERE id = '550e8400-e29b-41d4-a716-446655440002'::uuid;

UPDATE user_profiles 
SET last_daily_bonus = CURRENT_DATE - INTERVAL '2 days'
WHERE id = '550e8400-e29b-41d4-a716-446655440003'::uuid;