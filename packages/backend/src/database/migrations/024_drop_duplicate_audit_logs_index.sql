-- Fix Duplicate Index on audit_logs
-- Migration 024: Drop duplicate idx_audit_logs_user_id_btree index

-- The table has two identical indexes on the same column:
-- 1. idx_audit_logs_user_id (created in audit logs schema - standard name)
-- 2. idx_audit_logs_user_id_btree (created elsewhere - possibly auto-generated)

-- Since both indexes are functionally identical (both BTREE on user_id column),
-- we keep the standard idx_audit_logs_user_id and drop the duplicate.

DROP INDEX IF EXISTS idx_audit_logs_user_id_btree;

-- The idx_audit_logs_user_id index remains as it was created
-- as part of the original audit logging system.

COMMENT ON INDEX idx_audit_logs_user_id IS 'BTREE index on audit_logs.user_id for efficient user-specific audit queries';


