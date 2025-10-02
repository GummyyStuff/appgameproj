# Supabase Realtime Chat System

A complete real-time chat system built with Supabase, React, and Tailwind CSS. Features include real-time messaging, user avatars, moderation tools, and user statistics.

## Features

- **Real-time messaging** via Supabase Realtime
- **User avatars** with secure proxy serving
- **Moderation tools** for message deletion
- **Chat rules** that users must accept before participating
- **User statistics** popover with win/loss ratio and profit charts
- **Responsive design** that works on all screen sizes
- **Global chat dock** that appears on all pages

## Database Schema

### chat_messages
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to user_profiles)
- `content` (text, max 500 characters)
- `created_at` (timestamptz)
- `is_deleted` (boolean)
- `deleted_at` (timestamptz)
- `deleted_by` (uuid)

### user_profiles (extended)
- `is_moderator` (boolean)
- `avatar_path` (text, default: 'defaults/default-avatar.svg')
- `chat_rules_version` (int, default: 1)
- `chat_rules_accepted_at` (timestamptz)

## Setup Instructions

### 1. Database Migration

Run the database migration to create tables and policies:

```bash
bun run packages/backend/src/scripts/apply-chat-migration.ts
```

### 2. Avatar Storage Setup

Create the avatars storage bucket and upload the default avatar:

```bash
bun run packages/backend/src/scripts/setup-avatar-storage.ts
```

### 3. Edge Function Deployment (Optional)

Deploy the avatar proxy Edge Function:

```bash
supabase functions deploy proxy-avatar
```

### 4. Complete Setup (All Steps)

Run the complete setup script:

```bash
bun run scripts/setup-chat-system.ts
```

## Environment Variables

Make sure these environment variables are set:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Usage

### Making a User a Moderator

Update the user_profiles table:

```sql
UPDATE user_profiles 
SET is_moderator = true 
WHERE id = 'user-uuid-here';
```

### Scheduling Cleanup Job

Set up a cron job or scheduled function to run the cleanup script daily:

```bash
# Add to crontab for daily cleanup at 2 AM
0 2 * * * /path/to/your/project/packages/backend/src/scripts/chat-cleanup.ts
```

## Components

- `ChatDock` - Main chat container with expand/collapse functionality
- `ChatWindow` - Chat interface with messages and input
- `MessageItem` - Individual message display
- `UserQuickStatsPopover` - User statistics popup
- `ChatRulesGate` - Rules acceptance interface

## Hooks

- `useChatRealtime` - Real-time message subscription and sending
- `useAvatarUrl` - Avatar URL fetching with caching
- `useUserStats` - User statistics fetching
- `useChatRules` - Chat rules acceptance management

## Security Features

- **Row Level Security (RLS)** policies for data access control
- **Avatar proxying** via Edge Function to prevent hotlinking
- **Message retention** with automatic cleanup after 30 days
- **Moderator-only** message deletion
- **Input validation** with character limits and sanitization

## Testing

Run the chat component tests:

```bash
bun test src/components/chat
```

## Troubleshooting

### Chat not appearing
- Ensure user is authenticated
- Check that chat rules have been accepted
- Verify RLS policies are correctly applied

### Avatars not loading
- Check that the avatars storage bucket exists
- Verify the Edge Function is deployed and accessible
- Ensure user has valid authentication token

### Messages not sending
- Confirm user has accepted chat rules
- Check RLS policies allow message insertion
- Verify real-time subscriptions are enabled

### Moderator functions not working
- Ensure user has `is_moderator = true` in user_profiles
- Check RLS policies for moderator permissions
