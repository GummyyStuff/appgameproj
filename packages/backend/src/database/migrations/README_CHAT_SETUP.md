# Chat System Database Setup

This document provides instructions for setting up the chat system database schema.

## Overview

The chat system requires two main database tables and supporting infrastructure:

1. **chat_messages** - Stores all chat messages with user information
2. **chat_presence** - Tracks online user presence and activity
3. **Real-time triggers** - Enables instant message broadcasting
4. **Row Level Security** - Ensures secure access control
5. **Helper functions** - Provides common operations

## Manual Setup Instructions

Since automatic SQL execution is not available in this environment, please follow these steps:

### Step 1: Access Supabase Dashboard

1. Go to your Supabase dashboard: `http://192.168.0.69:8001`
2. Navigate to the **SQL Editor** section

### Step 2: Apply Migration

1. Open the migration file: `packages/backend/src/database/migrations/012_chat_system_complete.sql`
2. Copy the entire contents of the file
3. Paste it into the SQL Editor in your Supabase dashboard
4. Click **Run** to execute the migration

### Step 3: Verify Setup

After applying the migration, run the verification script:

```bash
cd packages/backend
bun run src/scripts/apply-chat-migration.ts
```

This will verify that:
- ✅ Tables are created and accessible
- ✅ RLS policies are working
- ✅ Helper functions are available
- ✅ Real-time triggers are active

## What Gets Created

### Tables

#### chat_messages
- Stores all chat messages with content, user info, and timestamps
- Includes constraints for message length (1-500 characters)
- Has indexes for performance on created_at and user_id

#### chat_presence
- Tracks which users are currently online
- Automatically updated when users send messages
- Includes cleanup for stale presence records

### Security

#### Row Level Security (RLS)
- **chat_messages**: Users can read all messages, but only insert their own
- **chat_presence**: Users can read all presence info, but only manage their own
- Messages are immutable (no updates or deletes allowed)

### Real-time Features

#### Triggers
- **Message Broadcasting**: New messages trigger pg_notify for real-time delivery
- **Presence Updates**: User presence changes are broadcast to all clients
- **Automatic Cleanup**: Stale presence records are marked offline after 5 minutes

#### Helper Functions
- `get_recent_chat_messages(limit)` - Retrieves recent messages
- `get_online_users()` - Gets list of currently online users
- `cleanup_stale_presence()` - Cleans up inactive user records

## Testing the Setup

Once the migration is applied, you can test the setup:

### 1. Verify Tables Exist
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chat_messages', 'chat_presence');
```

### 2. Test Helper Functions
```sql
-- Get recent messages (should return empty result initially)
SELECT * FROM get_recent_chat_messages(10);

-- Get online users (should return empty result initially)
SELECT * FROM get_online_users();
```

### 3. Test RLS Policies
```sql
-- This should fail (no authenticated user)
INSERT INTO chat_messages (content, user_id, username) 
VALUES ('test', '00000000-0000-0000-0000-000000000000', 'test');
```

## Troubleshooting

### Common Issues

1. **Tables not found**: Ensure the migration was applied completely
2. **RLS errors**: This is expected behavior for unauthenticated requests
3. **Function not found**: Check that all SQL statements were executed

### Verification Commands

```bash
# Check if setup script passes
cd packages/backend
bun run src/scripts/apply-chat-migration.ts

# Run verification script
bun run src/scripts/verify-chat-setup.ts
```

## Next Steps

After the database schema is set up:

1. ✅ **Task 1 Complete**: Database schema and real-time infrastructure
2. 🔄 **Task 2**: Create core TypeScript interfaces and types
3. 🔄 **Task 3**: Implement Supabase real-time service layer
4. 🔄 **Task 4**: Build React context provider for chat state management

The database foundation is now ready for the frontend chat implementation!
</content>