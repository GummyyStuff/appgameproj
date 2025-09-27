-- Fix Duplicate Index on game_history
-- Migration 021: Drop duplicate idx_game_history_user_id index

-- The table has two identical indexes on the same column:
-- 1. idx_game_history_user_id (created in initial schema)
-- 2. idx_game_history_user_id_btree (created in performance optimization)

-- Since both indexes are functionally identical (both BTREE on user_id column),
-- we keep the more descriptive one and drop the duplicate.

DROP INDEX IF EXISTS idx_game_history_user_id;

-- The idx_game_history_user_id_btree index remains as it's more descriptive
-- and was created as part of the performance optimization efforts.

COMMENT ON INDEX idx_game_history_user_id_btree IS 'BTREE index on game_history.user_id for efficient user-specific queries';


