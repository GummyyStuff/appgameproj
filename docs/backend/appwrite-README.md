# Appwrite Integration Guide

## Overview

This comprehensive guide covers the complete Appwrite integration for the Tarkov Casino project, including authentication, databases, storage, realtime, and best practices.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Setup and Configuration](#setup-and-configuration)
3. [Authentication](#authentication)
4. [Database Operations](#database-operations)
5. [Storage and Files](#storage-and-files)
6. [Realtime Subscriptions](#realtime-subscriptions)
7. [Server SDK vs Client SDK](#server-sdk-vs-client-sdk)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is Appwrite?

Appwrite is an open-source Backend-as-a-Service (BaaS) that provides:

- **Authentication**: Email/password, OAuth, magic links, phone auth
- **Databases**: NoSQL-like document database with powerful queries
- **Storage**: File storage with built-in image transformations
- **Functions**: Serverless functions for custom backend logic
- **Realtime**: WebSocket-based live data synchronization
- **Messaging**: Email, SMS, and push notifications

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Frontend (React + Appwrite Client SDK)             │
│  - Authentication (Account)                         │
│  - Database Queries (TablesDB)                      │
│  - Realtime Subscriptions (Realtime)                │
│  - File Operations (Storage)                        │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ HTTPS/WSS
                      │
┌─────────────────────▼───────────────────────────────┐
│  Backend API (Bun + Hono)                           │
│  - Server SDK (node-appwrite)                       │
│  - Business Logic                                   │
│  - Game Processing                                  │
│  - Admin Operations                                 │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ HTTPS
                      │
┌─────────────────────▼───────────────────────────────┐
│  Appwrite Instance (Cloud or Self-Hosted)           │
│  ├── Auth Service                                   │
│  ├── Database Service (PostgreSQL)                  │
│  ├── Storage Service                                │
│  ├── Realtime Service (WebSocket)                   │
│  └── Functions Runtime                              │
└─────────────────────────────────────────────────────┘
```

---

## Setup and Configuration

### 1. Install SDKs

#### Backend (Server SDK)
```bash
cd packages/backend
bun add node-appwrite
```

#### Frontend (Client SDK)
```bash
cd packages/frontend
bun add appwrite
```

### 2. Environment Configuration

#### Backend (.env)
```env
# Appwrite Configuration
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key_with_proper_scopes

# Database IDs
APPWRITE_DATABASE_ID=tarkov_casino
APPWRITE_USERS_TABLE_ID=user_profiles
APPWRITE_GAMES_TABLE_ID=game_history
APPWRITE_TRANSACTIONS_TABLE_ID=transactions
APPWRITE_CASES_TABLE_ID=case_types
APPWRITE_ITEMS_TABLE_ID=tarkov_items

# Storage Buckets
APPWRITE_AVATARS_BUCKET_ID=avatars
APPWRITE_ASSETS_BUCKET_ID=game_assets
```

#### Frontend (.env)
```env
VITE_APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
```

### 3. Initialize SDK

#### Backend Initialization
```typescript
// packages/backend/src/config/appwrite.ts
import { Client, Databases, Users, Storage, Account } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

// Export service instances
export const databases = new Databases(client);
export const users = new Users(client);
export const storage = new Storage(client);
export const account = new Account(client);

export { client };
```

#### Frontend Initialization
```typescript
// packages/frontend/src/lib/appwrite.ts
import { Client, Account, TablesDB, Storage } from 'appwrite';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

// Export service instances
export const account = new Account(client);
export const databases = new TablesDB(client);
export const storage = new Storage(client);

export { client };
```

---

## Authentication

### User Registration

#### Frontend (Client SDK)
```typescript
import { account } from '@/lib/appwrite';
import { ID } from 'appwrite';

async function register(email: string, password: string, username: string) {
  try {
    // Create Appwrite account
    const user = await account.create({
      userId: ID.unique(),
      email,
      password,
      name: username
    });

    // Create email session (auto-login)
    const session = await account.createEmailPasswordSession({
      email,
      password
    });

    return { user, session };
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}
```

#### Backend (Server SDK)
```typescript
import { users } from '@/config/appwrite';
import { ID } from 'node-appwrite';

async function createUser(email: string, password: string, username: string) {
  try {
    // Create user with Server SDK (bypasses auth)
    const user = await users.create({
      userId: ID.unique(),
      email,
      password,
      name: username
    });

    // Create corresponding profile in database
    await databases.createRow({
      databaseId: process.env.APPWRITE_DATABASE_ID!,
      tableId: 'user_profiles',
      rowId: user.$id,
      data: {
        username,
        email,
        balance: 10000,
        total_wagered: 0,
        total_won: 0,
        total_games_played: 0
      }
    });

    return user;
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}
```

### User Login

```typescript
import { account } from '@/lib/appwrite';

async function login(email: string, password: string) {
  try {
    const session = await account.createEmailPasswordSession({
      email,
      password
    });
    
    return session;
  } catch (error) {
    if (error.code === 401) {
      throw new Error('Invalid email or password');
    }
    throw error;
  }
}
```

### Check Authentication Status

```typescript
async function getCurrentUser() {
  try {
    const user = await account.get();
    return user;  // User is logged in
  } catch (error) {
    return null;  // User is not logged in
  }
}
```

### Logout

```typescript
async function logout() {
  try {
    // Delete current session
    await account.deleteSession('current');
  } catch (error) {
    console.error('Logout failed:', error);
  }
}
```

### Session Management

```typescript
// Get all active sessions
const sessions = await account.listSessions();

// Delete specific session
await account.deleteSession(sessionId);

// Delete all sessions (logout from all devices)
await account.deleteSessions();

// Update session (extend expiration)
const session = await account.updateSession({
  sessionId: 'current'
});
```

---

## Database Operations

### CRUD Operations

#### Create Row
```typescript
import { databases } from '@/config/appwrite';
import { ID, Permission, Role } from 'node-appwrite';

const row = await databases.createRow({
  databaseId: 'tarkov_casino',
  tableId: 'game_history',
  rowId: ID.unique(),
  data: {
    user_id: userId,
    game_type: 'roulette',
    bet_amount: 100,
    win_amount: 200,
    result_data: {
      bet_type: 'red',
      winning_number: 7
    }
  },
  permissions: [
    Permission.read(Role.user(userId))
  ]
});
```

#### Read Row
```typescript
const row = await databases.getRow({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  rowId: userId
});

console.log('Balance:', row.balance);
```

#### Update Row
```typescript
const updated = await databases.updateRow({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  rowId: userId,
  data: {
    username: 'new_username',
    avatar_url: '/avatars/new-avatar.png'
  }
});
```

#### Delete Row
```typescript
await databases.deleteRow({
  databaseId: 'tarkov_casino',
  tableId: 'game_history',
  rowId: gameId
});
```

### Bulk Operations

```typescript
// Create multiple rows
const rows = await databases.createRows({
  databaseId: 'tarkov_casino',
  tableId: 'tarkov_items',
  rows: [
    { data: { name: 'Item 1', rarity: 'common', base_value: 100 } },
    { data: { name: 'Item 2', rarity: 'rare', base_value: 500 } },
    { data: { name: 'Item 3', rarity: 'legendary', base_value: 5000 } }
  ]
});

// Update multiple rows
await databases.updateRows({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  queries: [Query.equal('is_moderator', true)],
  data: {
    moderator_level: 2
  }
});

// Delete multiple rows
await databases.deleteRows({
  databaseId: 'tarkov_casino',
  tableId: 'game_history',
  queries: [
    Query.lessThan('$createdAt', '2024-01-01T00:00:00Z')
  ]
});
```

### Atomic Operations

```typescript
// Increment balance (atomic)
await databases.incrementDocumentAttribute({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  rowId: userId,
  attribute: 'balance',
  value: 1000,
  max: 9999999999  // Optional max value
});

// Decrement balance (atomic)
await databases.decrementDocumentAttribute({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  rowId: userId,
  attribute: 'balance',
  value: 100,
  min: 0  // Optional min value (prevents negative)
});
```

### Advanced Queries

```typescript
import { Query } from 'node-appwrite';

// Pagination
const games = await databases.listRows({
  databaseId: 'tarkov_casino',
  tableId: 'game_history',
  queries: [
    Query.equal('user_id', userId),
    Query.limit(25),
    Query.offset(0)
  ]
});

// Filtering
const bigWins = await databases.listRows({
  databaseId: 'tarkov_casino',
  tableId: 'game_history',
  queries: [
    Query.equal('user_id', userId),
    Query.greaterThan('win_amount', 1000),
    Query.equal('game_type', 'roulette')
  ]
});

// Sorting
const recentGames = await databases.listRows({
  databaseId: 'tarkov_casino',
  tableId: 'game_history',
  queries: [
    Query.orderDesc('$createdAt'),
    Query.limit(10)
  ]
});

// Complex queries
const stats = await databases.listRows({
  databaseId: 'tarkov_casino',
  tableId: 'game_history',
  queries: [
    Query.equal('user_id', userId),
    Query.equal('game_type', ['roulette', 'blackjack']),  // OR condition
    Query.greaterThan('$createdAt', '2025-01-01T00:00:00Z'),
    Query.orderDesc('win_amount'),
    Query.limit(100)
  ]
});
```

---

## Storage and Files

### File Upload

```typescript
import { storage } from '@/lib/appwrite';
import { ID } from 'appwrite';

async function uploadAvatar(file: File, userId: string) {
  const result = await storage.createFile({
    bucketId: 'avatars',
    fileId: ID.unique(),
    file: file,
    permissions: [
      Permission.read(Role.any()),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId))
    ]
  });

  // Get file URL
  const fileUrl = storage.getFileView({
    bucketId: 'avatars',
    fileId: result.$id
  });

  return { fileId: result.$id, url: fileUrl };
}
```

### File Download

```typescript
// Get file view URL (for <img> tags)
const imageUrl = storage.getFileView({
  bucketId: 'avatars',
  fileId: fileId
});

// Download file (triggers download)
const downloadUrl = storage.getFileDownload({
  bucketId: 'avatars',
  fileId: fileId
});

// Get file preview (with transformations)
const previewUrl = storage.getFilePreview({
  bucketId: 'avatars',
  fileId: fileId,
  width: 200,
  height: 200,
  gravity: 'center',
  quality: 80,
  output: 'webp'
});
```

### File Management

```typescript
// List files
const files = await storage.listFiles({
  bucketId: 'avatars',
  queries: [
    Query.equal('userId', userId)
  ]
});

// Delete file
await storage.deleteFile({
  bucketId: 'avatars',
  fileId: fileId
});

// Update file permissions
await storage.updateFile({
  bucketId: 'avatars',
  fileId: fileId,
  permissions: [
    Permission.read(Role.any())
  ]
});
```

---

## Realtime Subscriptions

### Basic Subscription

```typescript
import { client } from '@/lib/appwrite';

// Subscribe to account updates
const unsubscribe = client.subscribe('account', response => {
  console.log('Account updated:', response.payload);
});

// Unsubscribe when done
unsubscribe();
```

### Database Row Subscriptions

```typescript
// Subscribe to specific row updates
client.subscribe(
  `databases.tarkov_casino.tables.user_profiles.rows.${userId}`,
  response => {
    if (response.events.includes('databases.*.tables.*.rows.*.update')) {
      console.log('Profile updated:', response.payload);
      // Update UI with new balance
      setBalance(response.payload.balance);
    }
  }
);

// Subscribe to all rows in a table (leaderboard)
client.subscribe(
  'databases.tarkov_casino.tables.user_profiles.rows',
  response => {
    console.log('Leaderboard updated:', response.payload);
  }
);
```

### File Upload Subscriptions

```typescript
// Subscribe to file uploads in a bucket
client.subscribe('buckets.avatars.files', response => {
  if (response.events.includes('buckets.*.files.*.create')) {
    console.log('New avatar uploaded:', response.payload);
  }
});
```

### Multiple Channels

```typescript
// Subscribe to multiple channels
const unsubscribe = client.subscribe(
  [
    'account',
    `databases.tarkov_casino.tables.user_profiles.rows.${userId}`,
    'buckets.avatars.files'
  ],
  response => {
    console.log('Update received:', response);
  }
);
```

See [Appwrite Realtime Guide](./appwrite-realtime.md) for comprehensive realtime documentation.

---

## Server SDK vs Client SDK

### When to Use Server SDK (node-appwrite)

Use the **Server SDK** for:
- ✅ Admin operations (creating users, bypassing permissions)
- ✅ Sensitive operations (balance updates, transactions)
- ✅ Bulk operations (seeding data, migrations)
- ✅ Background tasks (cleanup, notifications)
- ✅ Server-side API routes

**Example:**
```typescript
import { Users, Databases } from 'node-appwrite';

// Server SDK can bypass permissions
const allUsers = await users.list({
  queries: [Query.limit(100)]
});

// Update any user's balance (admin operation)
await databases.updateRow({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  rowId: anyUserId,
  data: { balance: 50000 }
});
```

### When to Use Client SDK (appwrite)

Use the **Client SDK** for:
- ✅ User authentication (login, register, logout)
- ✅ User-scoped data access
- ✅ Real-time subscriptions
- ✅ File uploads from browser
- ✅ Client-side queries

**Example:**
```typescript
import { account, databases } from '@/lib/appwrite';

// Client SDK respects permissions
const currentUser = await account.get();

// Can only access user's own data
const myProfile = await databases.getRow({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  rowId: currentUser.$id
});
```

### Permission Model

```
┌─────────────────────────────────────────────────────┐
│  Client SDK (appwrite)                              │
│  ✓ Respects permissions                             │
│  ✓ User context                                     │
│  ✗ Cannot bypass security                           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Server SDK (node-appwrite)                         │
│  ✓ Bypasses permissions with API key                │
│  ✓ Full admin access                                │
│  ✗ More security responsibility                     │
└─────────────────────────────────────────────────────┘
```

---

## Best Practices

### Security

1. **Never Expose API Keys:**
   ```typescript
   // ❌ Bad - API key in frontend
   const client = new Client()
     .setKey('secret_api_key');  // NEVER DO THIS!

   // ✅ Good - Only in backend
   // Backend only, in server-side code
   const client = new Client()
     .setKey(process.env.APPWRITE_API_KEY!);
   ```

2. **Always Set Permissions:**
   ```typescript
   // ✅ Good - Explicit permissions
   await databases.createRow({
     databaseId: 'tarkov_casino',
     tableId: 'game_history',
     rowId: ID.unique(),
     data: gameData,
     permissions: [
       Permission.read(Role.user(userId))
     ]
   });

   // ❌ Bad - No permissions (might be inaccessible)
   await databases.createRow({
     databaseId: 'tarkov_casino',
     tableId: 'game_history',
     rowId: ID.unique(),
     data: gameData
     // Missing permissions!
   });
   ```

3. **Validate on Server:**
   ```typescript
   // ✅ Good - Server-side validation
   async function placeBet(userId: string, betAmount: number) {
     // Validate balance on server
     const user = await databases.getRow({
       databaseId: 'tarkov_casino',
       tableId: 'user_profiles',
       rowId: userId
     });

     if (user.balance < betAmount) {
       throw new Error('Insufficient balance');
     }

     // Process bet...
   }
   ```

### Performance

1. **Use Indexes:**
   ```typescript
   // Create indexes for frequently queried fields
   await databases.createIndex({
     databaseId: 'tarkov_casino',
     tableId: 'game_history',
     key: 'user_game_type_idx',
     type: 'key',
     attributes: ['user_id', 'game_type']
   });
   ```

2. **Paginate Large Queries:**
   ```typescript
   // ✅ Good - Paginated
   const games = await databases.listRows({
     databaseId: 'tarkov_casino',
     tableId: 'game_history',
     queries: [
       Query.limit(50),
       Query.offset(page * 50)
     ]
   });

   // ❌ Bad - Loading everything
   const allGames = await databases.listRows({
     databaseId: 'tarkov_casino',
     tableId: 'game_history'
     // No limit!
   });
   ```

3. **Cache Frequently Accessed Data:**
   ```typescript
   import { CacheService } from '@/services/cache-service';

   async function getUserBalance(userId: string) {
     // Try cache first
     const cached = await CacheService.getUserBalance(userId);
     if (cached) return cached;

     // Cache miss - fetch from Appwrite
     const user = await databases.getRow({
       databaseId: 'tarkov_casino',
       tableId: 'user_profiles',
       rowId: userId
     });

     // Update cache
     await CacheService.setUserBalance(userId, user.balance);
     return user.balance;
   }
   ```

### Error Handling

```typescript
import { AppwriteException } from 'node-appwrite';

async function safeOperation() {
  try {
    const result = await databases.getRow({
      databaseId: 'tarkov_casino',
      tableId: 'user_profiles',
      rowId: userId
    });
    return result;
  } catch (error) {
    if (error instanceof AppwriteException) {
      switch (error.code) {
        case 401:
          console.error('Unauthorized access');
          break;
        case 404:
          console.error('Row not found');
          break;
        case 429:
          console.error('Rate limit exceeded');
          break;
        default:
          console.error('Appwrite error:', error.message);
      }
    }
    throw error;
  }
}
```

---

## Common Patterns

### Pattern 1: User Registration Flow

```typescript
async function registerUser(email: string, password: string, username: string) {
  try {
    // 1. Create Appwrite auth user (Client SDK)
    const user = await account.create({
      userId: ID.unique(),
      email,
      password,
      name: username
    });

    // 2. Create session (auto-login)
    const session = await account.createEmailPasswordSession({
      email,
      password
    });

    // 3. Create user profile (Backend API with Server SDK)
    await fetch('/api/users/create-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.$id, username, email })
    });

    return { user, session };
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}
```

### Pattern 2: Game Transaction

```typescript
async function processGameTransaction(
  userId: string,
  gameType: string,
  betAmount: number,
  winAmount: number,
  resultData: object
) {
  const transactionId = await databases.createTransaction({ ttl: 30 });

  try {
    // 1. Deduct bet
    await databases.decrementDocumentAttribute({
      databaseId: 'tarkov_casino',
      tableId: 'user_profiles',
      rowId: userId,
      attribute: 'balance',
      value: betAmount,
      transactionId
    });

    // 2. Record game
    const game = await databases.createRow({
      databaseId: 'tarkov_casino',
      tableId: 'game_history',
      rowId: ID.unique(),
      data: {
        user_id: userId,
        game_type: gameType,
        bet_amount: betAmount,
        win_amount: winAmount,
        result_data: resultData
      },
      transactionId
    });

    // 3. Add winnings
    if (winAmount > 0) {
      await databases.incrementDocumentAttribute({
        databaseId: 'tarkov_casino',
        tableId: 'user_profiles',
        rowId: userId,
        attribute: 'balance',
        value: winAmount,
        transactionId
      });
    }

    // 4. Update stats
    await databases.incrementDocumentAttribute({
      databaseId: 'tarkov_casino',
      tableId: 'user_profiles',
      rowId: userId,
      attribute: 'total_games_played',
      value: 1,
      transactionId
    });

    // Commit transaction
    await databases.createOperations({
      transactionId,
      operations: []
    });

    return game;
  } catch (error) {
    // Rollback transaction
    await databases.deleteTransaction({ transactionId });
    throw error;
  }
}
```

### Pattern 3: Leaderboard

```typescript
async function getLeaderboard(limit: number = 10) {
  const topPlayers = await databases.listRows({
    databaseId: 'tarkov_casino',
    tableId: 'user_profiles',
    queries: [
      Query.orderDesc('balance'),
      Query.limit(limit),
      Query.select(['$id', 'username', 'balance', 'total_won'])
    ]
  });

  return topPlayers.rows;
}
```

---

## Environment Variables Reference

```env
# Required
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key

# Database IDs (match your Appwrite Console)
APPWRITE_DATABASE_ID=tarkov_casino
APPWRITE_USERS_TABLE_ID=user_profiles
APPWRITE_GAMES_TABLE_ID=game_history
APPWRITE_TRANSACTIONS_TABLE_ID=transactions
APPWRITE_CASES_TABLE_ID=case_types
APPWRITE_ITEMS_TABLE_ID=tarkov_items

# Storage Buckets
APPWRITE_AVATARS_BUCKET_ID=avatars
APPWRITE_ASSETS_BUCKET_ID=game_assets
```

---

## Troubleshooting

### Connection Issues

```bash
# Test Appwrite endpoint
curl https://<REGION>.cloud.appwrite.io/v1/health

# Should return: {"status":"OK"}
```

### Permission Errors

```typescript
// Error: User missing read access
// Solution: Add permission when creating row
permissions: [
  Permission.read(Role.user(userId))
]

// Error: Document not found
// Solution: Check if row exists and user has permission
const row = await databases.getRow({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  rowId: userId
}).catch(error => {
  if (error.code === 404) {
    console.log('Row does not exist or no permission');
  }
});
```

### Rate Limiting

```typescript
// Appwrite has built-in rate limiting
// If you hit rate limits:
// 1. Implement caching
// 2. Batch operations
// 3. Upgrade to higher tier plan

// Error code 429: Too many requests
if (error.code === 429) {
  console.log('Rate limit exceeded, try again later');
}
```

---

## Migration Notes

### From Supabase to Appwrite

**Key Changes:**

1. **Authentication:**
   - Supabase: `auth.signUp()` → Appwrite: `account.create()`
   - Supabase: `auth.signIn()` → Appwrite: `account.createEmailPasswordSession()`
   - Supabase: `auth.signOut()` → Appwrite: `account.deleteSession()`

2. **Database:**
   - Supabase: `from('table').select()` → Appwrite: `databases.listRows()`
   - Supabase: `from('table').insert()` → Appwrite: `databases.createRow()`
   - Supabase: `from('table').update()` → Appwrite: `databases.updateRow()`

3. **Real-time:**
   - Supabase: PostgreSQL `LISTEN/NOTIFY` → Appwrite: WebSocket subscriptions
   - Supabase: Channel subscriptions → Appwrite: Resource subscriptions

4. **Permissions:**
   - Supabase: Row Level Security (RLS) → Appwrite: Permission arrays
   - Supabase: PostgreSQL policies → Appwrite: Role-based permissions

See [Appwrite Supabase Migration Guide](https://appwrite.io/docs/advanced/migrations/supabase) for complete migration instructions.

---

## Resources

### Official Appwrite Documentation
- [Appwrite Databases](https://appwrite.io/docs/products/databases)
- [Appwrite Authentication](https://appwrite.io/docs/products/auth)
- [Appwrite Storage](https://appwrite.io/docs/products/storage)
- [Appwrite Realtime](https://appwrite.io/docs/apis/realtime)
- [Node.js Server SDK](https://appwrite.io/docs/sdks#server)
- [Web Client SDK](https://appwrite.io/docs/sdks#client)

### Project Documentation
- [Appwrite Realtime Guide](./appwrite-realtime.md)
- [Database Schema Guide](./database-README.md)
- [API Documentation](../api/README.md)

---

**Last Updated:** 2025-10-12  
**Appwrite Version:** 18.0+  
**Node SDK:** 17.2+  
**Client SDK:** 18.0+  
**Status:** Production Ready ✅

