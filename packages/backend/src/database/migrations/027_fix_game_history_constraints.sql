-- Fix Game History Constraints for Case Opening
-- Migration 027: Update game_history table constraints to allow bet_amount >= 0 and include case_opening

-- Drop the existing check constraints
ALTER TABLE game_history
DROP CONSTRAINT IF EXISTS game_history_game_type_check;

ALTER TABLE game_history
DROP CONSTRAINT IF EXISTS game_history_bet_amount_check;

-- Add updated constraints
ALTER TABLE game_history
ADD CONSTRAINT game_history_game_type_check
CHECK (game_type IN ('roulette', 'blackjack', 'case_opening'));

ALTER TABLE game_history
ADD CONSTRAINT game_history_bet_amount_check
CHECK (bet_amount >= 0);
