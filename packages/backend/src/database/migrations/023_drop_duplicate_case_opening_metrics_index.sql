-- Fix Duplicate Index on case_opening_metrics
-- Migration 023: Drop duplicate idx_case_opening_metrics_user_id_btree index

-- The table has two identical indexes on the same column:
-- 1. idx_case_opening_metrics_user_id (created in monitoring schema - standard name)
-- 2. idx_case_opening_metrics_user_id_btree (created elsewhere - possibly auto-generated)

-- Since both indexes are functionally identical (both BTREE on user_id column),
-- we keep the standard idx_case_opening_metrics_user_id and drop the duplicate.

DROP INDEX IF EXISTS idx_case_opening_metrics_user_id_btree;

-- The idx_case_opening_metrics_user_id index remains as it was created
-- as part of the original case opening monitoring system.

COMMENT ON INDEX idx_case_opening_metrics_user_id IS 'BTREE index on case_opening_metrics.user_id for efficient user-specific metrics queries';


