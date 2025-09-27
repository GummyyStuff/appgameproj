-- Fix Duplicate Index on chat_messages
-- Migration 022: Drop duplicate idx_chat_messages_recent index

-- The table has two identical indexes on the same column:
-- 1. idx_chat_messages_created_at (created in chat schema - standard name)
-- 2. idx_chat_messages_recent (created for recent messages functionality)

-- Since both indexes are functionally identical (both DESC on created_at column),
-- we keep the more standard idx_chat_messages_created_at and drop the duplicate.

DROP INDEX IF EXISTS idx_chat_messages_recent;

-- The idx_chat_messages_created_at index remains as it efficiently handles
-- both general created_at queries and recent message queries.

COMMENT ON INDEX idx_chat_messages_created_at IS 'DESC index on chat_messages.created_at for efficient message ordering and recent message queries';


