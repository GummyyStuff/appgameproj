# Appwrite Realtime Chat System

A complete real-time chat system built with Appwrite Realtime, React, and Tailwind CSS. Features include real-time messaging, user avatars, moderation tools, and user statistics.

## Features

- **Real-time messaging** via Appwrite Realtime (WebSocket)
- **User avatars** using Appwrite Storage
- **Moderation tools** for message deletion
- **Chat rules** that users must accept before participating
- **User statistics** popover with win/loss ratio and profit charts
- **Responsive design** that works on all screen sizes
- **Global chat dock** that appears on all pages
- **Permission-based access** via Appwrite roles

## Database Schema (Appwrite)

### chat_messages Table
- `$id` (string) - Auto-generated message ID
- `user_id` (string) - Reference to user_profiles.$id
- `username` (string) - Cached username for display
- `content` (string, max 500 chars) - Message content
- `is_deleted` (boolean) - Soft delete flag
- `deleted_at` (datetime) - Deletion timestamp
- `deleted_by` (string) - Moderator user ID
- `$createdAt` (datetime) - Auto-generated
- `$updatedAt` (datetime) - Auto-generated
- `$permissions` (array) - Appwrite permissions

**Permissions:**
```typescript
// Anyone can read non-deleted messages
Permission.read(Role.any())

// Authenticated users can create messages
Permission.create(Role.users())

// Moderators can delete messages
Permission.delete(Role.team('moderators'))
```

### user_profiles (extended)
- `is_moderator` (boolean) - Moderator status
- `avatar_file_id` (string) - Appwrite Storage file ID
- `chat_rules_version` (integer) - Rules version (default: 1)
- `chat_rules_accepted_at` (datetime) - Acceptance timestamp

## Setup Instructions

### 1. Create Chat Messages Table

#### Via Appwrite Console:
1. Navigate to Databases → `tarkov_casino`
2. Create new table: `chat_messages`
3. Add attributes:
   - `user_id` (String, 36 chars, required)
   - `username` (String, 20 chars, required)
   - `content` (String, 500 chars, required)
   - `is_deleted` (Boolean, default: false)
   - `deleted_at` (DateTime, optional)
   - `deleted_by` (String, 36 chars, optional)
4. Set permissions:
   - Read: Any
   - Create: Users
   - Update: None
   - Delete: Team "moderators"

#### Via Backend Script:
```bash
cd packages/backend
bun run src/scripts/setup-chat-table.ts
```

### 2. Avatar Storage Setup

#### Create Storage Bucket:
1. Navigate to Storage in Appwrite Console
2. Create bucket: `avatars`
3. Set permissions:
   - Read: Any
   - Create: Users
   - Update: Users (own files)
   - Delete: Users (own files)
4. Configure file size limits (e.g., 5MB max)
5. Enable compression and format optimization

#### Upload Default Avatar:
```bash
bun run src/scripts/upload-default-avatar.ts
```

### 3. Create Moderators Team (Optional)

```typescript
import { Teams } from 'node-appwrite';

const teams = new Teams(client);

const modTeam = await teams.create({
  teamId: 'moderators',
  name: 'Moderators'
});
```

### 4. Complete Setup

```bash
# Run complete chat system setup
bun run scripts/setup-chat-system.ts
```

## Environment Variables

Make sure these environment variables are set:

### Backend (.env)
```env
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DATABASE_ID=tarkov_casino
APPWRITE_CHAT_TABLE_ID=chat_messages
APPWRITE_AVATARS_BUCKET_ID=avatars
```

### Frontend (.env)
```env
VITE_APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
```

## Usage

### Making a User a Moderator

#### Via Appwrite Console:
1. Navigate to Databases → `tarkov_casino` → `user_profiles`
2. Find the user row
3. Edit row and set `is_moderator` to `true`

#### Via Backend API:
```typescript
import { databases } from '@/config/appwrite';

await databases.updateRow({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  rowId: 'user-id-here',
  data: {
    is_moderator: true
  }
});
```

#### Add to Moderators Team:
```typescript
import { teams } from 'node-appwrite';

await teams.createMembership({
  teamId: 'moderators',
  email: 'user@example.com',
  roles: ['moderator'],
  url: 'https://your-domain.com/teams/moderators/verify'
});
```

### Scheduling Cleanup Job

Use Appwrite Functions for scheduled cleanup:

```bash
# Deploy function
appwrite functions create \
  --functionId chat-cleanup \
  --name "Chat Cleanup" \
  --runtime node-18.0 \
  --schedule "0 2 * * *"  # Daily at 2 AM

# Or use backend cron if preferred
0 2 * * * cd /path/to/backend && bun run src/scripts/chat-cleanup.ts
```

## Components

- `ChatDock` - Main chat container with expand/collapse functionality
- `ChatWindow` - Chat interface with messages and input
- `MessageItem` - Individual message display
- `UserQuickStatsPopover` - User statistics popup
- `ChatRulesGate` - Rules acceptance interface

## Hooks

### useChatRealtime
Real-time message subscription and sending using Appwrite Realtime.

```typescript
import { useEffect, useState } from 'react';
import { client, databases } from '@/lib/appwrite';

function useChatRealtime() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Subscribe to chat messages
    const unsubscribe = client.subscribe(
      'databases.tarkov_casino.tables.chat_messages.rows',
      response => {
        if (response.events.includes('databases.*.tables.*.rows.*.create')) {
          // New message
          setMessages(prev => [...prev, response.payload]);
        }
        if (response.events.includes('databases.*.tables.*.rows.*.delete')) {
          // Message deleted
          setMessages(prev => 
            prev.filter(msg => msg.$id !== response.payload.$id)
          );
        }
      }
    );

    return () => unsubscribe();
  }, []);

  return { messages };
}
```

### useAvatarUrl
Fetches avatar URLs from Appwrite Storage.

```typescript
import { storage } from '@/lib/appwrite';

function useAvatarUrl(fileId: string) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId) return;

    const avatarUrl = storage.getFileView({
      bucketId: 'avatars',
      fileId: fileId
    });

    setUrl(avatarUrl.toString());
  }, [fileId]);

  return url;
}
```

### useUserStats
Fetches user statistics from Appwrite database.

### useChatRules
Manages chat rules acceptance using Appwrite user preferences.

## Security Features

- **Permission-Based Access**: Appwrite permissions control who can read/write/delete
- **Avatar Storage**: Appwrite Storage with file permissions
- **Message Retention**: Automatic cleanup after 30 days via scheduled function
- **Moderator-Only Deletion**: Team-based permissions for moderation
- **Input Validation**: Character limits (500 chars) and content sanitization
- **Rate Limiting**: Prevent message spam via backend rate limiting

## Testing

Run the chat component tests:

```bash
cd packages/frontend
bun test src/components/chat
```

### Test Appwrite Realtime Connection

```typescript
import { client } from '@/lib/appwrite';

// Test subscription
const unsubscribe = client.subscribe(
  'databases.tarkov_casino.tables.chat_messages.rows',
  response => {
    console.log('✅ Realtime working:', response);
  }
);

// Send test message to trigger event
// ...

// Cleanup
setTimeout(() => unsubscribe(), 5000);
```

## Troubleshooting

### Chat not appearing
- **Check authentication**: User must be logged in via Appwrite
- **Verify chat rules**: User must accept chat rules
- **Check permissions**: Table has Permission.read(Role.any())
- **Console errors**: Check browser console for Appwrite errors

### Avatars not loading
- **Check bucket exists**: Verify `avatars` bucket in Appwrite Console
- **File permissions**: Ensure file has Permission.read(Role.any())
- **File ID valid**: Check that `avatar_file_id` exists in Storage
- **CORS settings**: Add domain to Appwrite Console → Platforms

### Messages not sending
- **Authentication required**: User must be logged in
- **Chat rules**: User must accept rules before sending
- **Permissions**: Table needs Permission.create(Role.users())
- **Rate limiting**: Check if user hit message rate limit

### Realtime not working
- **Connection status**: Check browser console for WebSocket errors
- **Permissions**: User needs read permission on chat_messages table
- **Session valid**: Ensure Appwrite session is active
- **Channel format**: Verify channel string is correct

### Moderator functions not working
- **Moderator status**: Set `is_moderator = true` in user_profiles
- **Team membership**: Add user to 'moderators' team in Appwrite
- **Permissions**: Verify Permission.delete(Role.team('moderators')) on table
- **Refresh session**: Re-login after becoming moderator
