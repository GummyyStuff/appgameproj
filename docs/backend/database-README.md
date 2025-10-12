# Appwrite Database Setup Guide

## Overview

This project uses **Appwrite** as the primary Backend-as-a-Service (BaaS) platform, providing authentication, databases, storage, and realtime capabilities. This guide covers database schema, setup, and operations.

### Why Appwrite?

- 🚀 **Built-in Authentication**: Secure user management out of the box
- 🔄 **Real-time Subscriptions**: WebSocket-based live updates
- 🔒 **Row-Level Security**: Fine-grained permissions system
- 📊 **Powerful Queries**: Rich query API with filtering, sorting, pagination
- 🎯 **TypeScript Support**: Full type safety with generated types
- ⚡ **Optimized Performance**: Built-in caching and CDN
- 🛡️ **GDPR Compliant**: Enterprise-grade security features

---

## Architecture

### Service Layers

```
┌─────────────────────────────────────────────────────┐
│  Application Layer                                  │
│  (Game Logic, User Service, etc.)                   │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│  Backend API (Hono + Bun)                           │
│  - REST endpoints                                   │
│  - Authentication middleware                        │
│  - Business logic layer                             │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│  Appwrite Server SDK (node-appwrite)                │
│  - Database operations (TablesDB)                   │
│  - User management (Users)                          │
│  - Authentication (Account)                         │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│  Appwrite Cloud/Self-Hosted Instance                │
│  - PostgreSQL database                              │
│  - Authentication service                           │
│  - Realtime service                                 │
│  - Storage service                                  │
└─────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Tables

#### `user_profiles`
Stores user account information and game statistics.

**Columns:**
- `$id` (string) - Appwrite user ID (links to Appwrite Auth user)
- `username` (string, required) - Unique username (3-20 chars)
- `email` (string, required) - User email address
- `balance` (integer, required) - Virtual currency balance (default: 10000)
- `total_wagered` (integer) - Total amount wagered across all games
- `total_won` (integer) - Total amount won across all games
- `total_games_played` (integer) - Total number of games played
- `favorite_game` (string) - Most played game type
- `avatar_url` (string) - Profile avatar URL (optional)
- `is_moderator` (boolean) - Moderator status (default: false)
- `chat_rules_accepted` (boolean) - Chat rules acceptance status
- `last_daily_bonus` (datetime) - Last daily bonus claim timestamp
- `$createdAt` (datetime) - Auto-generated creation timestamp
- `$updatedAt` (datetime) - Auto-generated update timestamp
- `$permissions` (array) - Appwrite permissions array

**Permissions:**
```typescript
// User can read and update their own profile
Permission.read(Role.user('[USER_ID]')),
Permission.update(Role.user('[USER_ID]')),

// Anyone can read public profile data
Permission.read(Role.any())
```

#### `game_history`
Records all game sessions and results.

**Columns:**
- `$id` (string) - Unique game session ID
- `user_id` (string, required) - Reference to user_profiles.$id
- `game_type` (string, required) - Game type: 'roulette', 'blackjack', 'case_opening'
- `bet_amount` (integer, required) - Amount wagered in virtual currency
- `win_amount` (integer, required) - Amount won (0 for losses)
- `result_data` (object) - Game-specific result data (JSON)
- `game_duration` (integer) - Game duration in milliseconds
- `$createdAt` (datetime) - Auto-generated timestamp
- `$permissions` (array) - Appwrite permissions

**Permissions:**
```typescript
// Users can only read their own game history
Permission.read(Role.user('[USER_ID]')),

// System can create game history entries
Permission.create(Role.any())
```

**Indexes:**
- `user_id_idx` - Optimized for user-specific queries
- `game_type_idx` - Filter by game type
- `created_at_idx` - Time-based queries and sorting

#### `transactions`
Tracks all balance changes and transactions.

**Columns:**
- `$id` (string) - Unique transaction ID
- `user_id` (string, required) - Reference to user_profiles.$id
- `type` (string, required) - Transaction type: 'bet', 'win', 'daily_bonus', 'adjustment'
- `amount` (integer, required) - Transaction amount (positive or negative)
- `balance_before` (integer) - Balance before transaction
- `balance_after` (integer) - Balance after transaction
- `reference_id` (string) - Reference to game_history.$id (optional)
- `description` (string) - Transaction description
- `$createdAt` (datetime) - Auto-generated timestamp
- `$permissions` (array) - Appwrite permissions

**Permissions:**
```typescript
// Users can only read their own transactions
Permission.read(Role.user('[USER_ID]'))
```

#### `case_types`
Available case types for the case opening game.

**Columns:**
- `$id` (string) - Unique case type ID
- `name` (string, required) - Case name (e.g., "Scav Case")
- `price` (integer, required) - Case purchase price
- `description` (string) - Case description
- `image_url` (string) - Case image path
- `rarity_distribution` (object) - JSON object with rarity percentages
- `is_active` (boolean) - Whether case is available (default: true)
- `$createdAt` (datetime) - Auto-generated timestamp
- `$updatedAt` (datetime) - Auto-generated timestamp
- `$permissions` (array) - Appwrite permissions

**Permissions:**
```typescript
// Anyone can read active cases
Permission.read(Role.any())
```

#### `tarkov_items`
Global pool of items available in case openings.

**Columns:**
- `$id` (string) - Unique item ID
- `name` (string, required) - Item name
- `rarity` (string, required) - Rarity: 'common', 'uncommon', 'rare', 'epic', 'legendary'
- `base_value` (integer, required) - Base currency value
- `category` (string, required) - Category: 'medical', 'electronics', 'consumables', 'valuables', 'keycards'
- `description` (string) - Item description
- `image_url` (string) - Item image path
- `is_active` (boolean) - Whether item is available (default: true)
- `$createdAt` (datetime) - Auto-generated timestamp
- `$updatedAt` (datetime) - Auto-generated timestamp
- `$permissions` (array) - Appwrite permissions

**Permissions:**
```typescript
// Anyone can read active items
Permission.read(Role.any())
```

#### `case_item_pools`
Relationship table linking cases to items with weights.

**Columns:**
- `$id` (string) - Unique pool entry ID
- `case_type_id` (string, required) - Reference to case_types.$id
- `item_id` (string, required) - Reference to tarkov_items.$id
- `weight` (float, required) - Drop probability weight
- `value_multiplier` (float) - Value multiplier for this case-item combination
- `$createdAt` (datetime) - Auto-generated timestamp
- `$permissions` (array) - Appwrite permissions

---

## Setup Instructions

### 1. Appwrite Project Setup

#### Option A: Appwrite Cloud (Recommended)

1. **Create Appwrite Cloud Account:**
   - Visit https://cloud.appwrite.io
   - Create a new account
   - Create a new project

2. **Get Your Credentials:**
   - Go to Project Settings
   - Copy your Project ID
   - Generate an API Key with these scopes:
     - `databases.read`
     - `databases.write`
     - `users.read`
     - `users.write`
     - `sessions.write`

3. **Update Environment Variables:**
   ```bash
   # In packages/backend/.env
   APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
   APPWRITE_PROJECT_ID=your_project_id_here
   APPWRITE_API_KEY=your_api_key_here
   ```

#### Option B: Self-Hosted Appwrite

1. **Install Appwrite:**
   ```bash
   docker run -d \
     --name appwrite \
     -p 80:80 -p 443:443 \
     -v appwrite-data:/storage \
     appwrite/appwrite:latest
   ```

2. **Access Console:**
   - Open http://localhost in your browser
   - Complete the setup wizard
   - Create a new project

3. **Update Environment Variables:**
   ```bash
   APPWRITE_ENDPOINT=http://localhost/v1
   APPWRITE_PROJECT_ID=your_project_id
   APPWRITE_API_KEY=your_api_key
   ```

### 2. Database Creation

#### Create Database

1. **Via Appwrite Console:**
   - Navigate to Databases in the Appwrite Console
   - Click "Create Database"
   - Name: `tarkov_casino`
   - Database ID: `tarkov_casino` (or leave blank for auto-generate)

2. **Via Node SDK:**
   ```typescript
   import { Client, Databases } from 'node-appwrite';
   
   const client = new Client()
     .setEndpoint(process.env.APPWRITE_ENDPOINT!)
     .setProject(process.env.APPWRITE_PROJECT_ID!)
     .setKey(process.env.APPWRITE_API_KEY!);
   
   const databases = new Databases(client);
   
   await databases.create({
     databaseId: 'tarkov_casino',
     name: 'Tarkov Casino'
   });
   ```

### 3. Create Tables

#### User Profiles Table

```typescript
import { TablesDB } from 'node-appwrite';

const tablesDB = new TablesDB(client);

// Create user_profiles table
await tablesDB.create({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  name: 'User Profiles'
});

// Add attributes (columns)
await tablesDB.createStringAttribute({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  key: 'username',
  size: 20,
  required: true
});

await tablesDB.createStringAttribute({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  key: 'email',
  size: 255,
  required: true
});

await tablesDB.createIntegerAttribute({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  key: 'balance',
  required: true,
  default: 10000,
  min: 0
});

// Add other attributes...
```

#### Game History Table

```typescript
await tablesDB.create({
  databaseId: 'tarkov_casino',
  tableId: 'game_history',
  name: 'Game History'
});

// Add columns
await tablesDB.createStringAttribute({
  databaseId: 'tarkov_casino',
  tableId: 'game_history',
  key: 'user_id',
  size: 36,
  required: true
});

await tablesDB.createEnumAttribute({
  databaseId: 'tarkov_casino',
  tableId: 'game_history',
  key: 'game_type',
  elements: ['roulette', 'blackjack', 'case_opening'],
  required: true
});

await tablesDB.createIntegerAttribute({
  databaseId: 'tarkov_casino',
  tableId: 'game_history',
  key: 'bet_amount',
  required: true,
  min: 0
});
```

### 4. Configure Permissions

#### User Profiles Permissions

```typescript
import { Permission, Role } from 'node-appwrite';

// Users can read their own profile
await tablesDB.updateCollection({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  permissions: [
    Permission.read(Role.any()),  // Public profiles
    Permission.update(Role.user('[USER_ID]'))  // Users update own profile
  ]
});
```

---

## Usage Examples

### Creating a User Profile

```typescript
import { TablesDB, ID } from 'node-appwrite';

const tablesDB = new TablesDB(client);

const profile = await tablesDB.createRow({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  rowId: userId,  // Use Appwrite Auth user ID
  data: {
    username: 'player123',
    email: 'player@example.com',
    balance: 10000,
    total_wagered: 0,
    total_won: 0,
    total_games_played: 0
  },
  permissions: [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId))
  ]
});
```

### Updating User Balance

```typescript
// Atomic update using Appwrite's increment operation
await databases.incrementDocumentAttribute({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  rowId: userId,
  attribute: 'balance',
  value: winAmount  // Positive for wins, negative for bets
});
```

### Recording Game History

```typescript
const gameRecord = await tablesDB.createRow({
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
      winning_number: 7,
      multiplier: 2
    },
    game_duration: 15000
  },
  permissions: [
    Permission.read(Role.user(userId))
  ]
});
```

### Querying Game History

```typescript
import { Query } from 'node-appwrite';

// Get user's recent game history
const games = await tablesDB.listRows({
  databaseId: 'tarkov_casino',
  tableId: 'game_history',
  queries: [
    Query.equal('user_id', userId),
    Query.orderDesc('$createdAt'),
    Query.limit(50)
  ]
});

// Filter by game type
const rouletteGames = await tablesDB.listRows({
  databaseId: 'tarkov_casino',
  tableId: 'game_history',
  queries: [
    Query.equal('user_id', userId),
    Query.equal('game_type', 'roulette'),
    Query.orderDesc('$createdAt'),
    Query.limit(25)
  ]
});

// Get games within date range
const recentGames = await tablesDB.listRows({
  databaseId: 'tarkov_casino',
  tableId: 'game_history',
  queries: [
    Query.equal('user_id', userId),
    Query.greaterThan('$createdAt', '2025-01-01T00:00:00Z'),
    Query.lessThan('$createdAt', '2025-12-31T23:59:59Z')
  ]
});
```

---

## Appwrite Transactions

Appwrite supports database transactions for atomic operations.

### Example: Process Game with Transaction

```typescript
import { Databases } from 'node-appwrite';

const databases = new Databases(client);

// Create a transaction
const transaction = await databases.createTransaction({
  ttl: 30  // 30 seconds to complete
});

try {
  // 1. Deduct bet amount
  await databases.decrementDocumentAttribute({
    databaseId: 'tarkov_casino',
    tableId: 'user_profiles',
    rowId: userId,
    attribute: 'balance',
    value: betAmount,
    transactionId: transaction.$id
  });

  // 2. Record game history
  await tablesDB.createRow({
    databaseId: 'tarkov_casino',
    tableId: 'game_history',
    rowId: ID.unique(),
    data: gameData,
    transactionId: transaction.$id
  });

  // 3. Add winnings if won
  if (winAmount > 0) {
    await databases.incrementDocumentAttribute({
      databaseId: 'tarkov_casino',
      tableId: 'user_profiles',
      rowId: userId,
      attribute: 'balance',
      value: winAmount,
      transactionId: transaction.$id
    });
  }

  // Commit transaction
  await databases.createOperations({
    transactionId: transaction.$id,
    operations: []  // Operations already staged
  });

} catch (error) {
  // Rollback on error
  await databases.deleteTransaction({
    transactionId: transaction.$id
  });
  throw error;
}
```

---

## Security Features

### Row-Level Permissions

Appwrite uses a powerful permission system:

```typescript
import { Permission, Role } from 'node-appwrite';

// Examples of permission roles:
Permission.read(Role.any())                    // Anyone can read
Permission.read(Role.users())                  // Any authenticated user
Permission.read(Role.user(userId))             // Specific user only
Permission.read(Role.team('moderators'))       // Team members only

Permission.write(Role.user(userId))            // User can update
Permission.delete(Role.user(userId))           // User can delete
```

### Data Validation

Appwrite provides built-in validation:

```typescript
// String with size limit
await tablesDB.createStringAttribute({
  key: 'username',
  size: 20,
  required: true
});

// Integer with min/max bounds
await tablesDB.createIntegerAttribute({
  key: 'balance',
  required: true,
  min: 0,
  max: 9999999999
});

// Enum for restricted values
await tablesDB.createEnumAttribute({
  key: 'game_type',
  elements: ['roulette', 'blackjack', 'case_opening'],
  required: true
});

// Email validation
await tablesDB.createEmailAttribute({
  key: 'email',
  required: true
});

// URL validation
await tablesDB.createUrlAttribute({
  key: 'avatar_url',
  required: false
});
```

### Authentication Integration

```typescript
import { Account } from 'node-appwrite';

const account = new Account(client);

// Create user (automatically creates auth user)
const user = await account.create({
  userId: ID.unique(),
  email: 'user@example.com',
  password: 'secure_password',
  name: 'username'
});

// Then create corresponding profile row
await tablesDB.createRow({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  rowId: user.$id,  // Use same ID as auth user
  data: {
    username: 'username',
    email: user.email,
    balance: 10000
  }
});
```

---

## Performance Considerations

### Indexes

Create indexes for frequently queried fields:

```typescript
await tablesDB.createIndex({
  databaseId: 'tarkov_casino',
  tableId: 'game_history',
  key: 'user_id_created_idx',
  type: 'key',
  attributes: ['user_id', '$createdAt']
});
```

### Query Optimization

```typescript
// ✅ Good - Specific queries with indexes
Query.equal('user_id', userId),
Query.equal('game_type', 'roulette'),
Query.orderDesc('$createdAt'),
Query.limit(50)

// ❌ Bad - Too broad, no indexes
Query.search('username', 'player'),
Query.limit(10000)  // Large result sets
```

### Caching Strategy

- **User Profiles**: Cache for 5 minutes (300s)
- **Balances**: Cache for 1 minute (60s)
- **Leaderboards**: Cache for 30 seconds
- **Statistics**: Cache for 2 minutes (120s)

See [Redis/Dragonfly Caching Guide](./redis-README.md) for details.

---

## Testing

### Connection Test

```typescript
// Test Appwrite connection
import { Databases } from 'node-appwrite';

const databases = new Databases(client);

try {
  const database = await databases.get({
    databaseId: 'tarkov_casino'
  });
  console.log('✅ Appwrite connected:', database.name);
} catch (error) {
  console.error('❌ Appwrite connection failed:', error);
}
```

### Run Test Script

```bash
cd packages/backend
bun run db:test-connection
```

---

## Migration from Supabase

If you're migrating from Supabase, see the [Appwrite Migration Guide](https://appwrite.io/docs/advanced/migrations/supabase).

**Key Differences:**

| Feature | Supabase | Appwrite |
|---------|----------|----------|
| Tables | `public` schema | Databases → Tables |
| Rows | `INSERT/UPDATE/DELETE` | TablesDB SDK methods |
| Auth | `auth.users` table | Separate Auth service |
| RLS | PostgreSQL RLS | Appwrite Permissions |
| Real-time | PostgreSQL `LISTEN/NOTIFY` | WebSocket subscriptions |
| Functions | PostgreSQL functions | Appwrite Functions |

---

## Troubleshooting

### Common Issues

**Connection Errors:**
```bash
# Verify endpoint is reachable
curl https://<REGION>.cloud.appwrite.io/v1/health

# Check API key permissions
# Ensure API key has correct scopes in Appwrite Console
```

**Permission Errors:**
```typescript
// Ensure permissions are set when creating rows
permissions: [
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId))
]
```

**Query Errors:**
```typescript
// Check attribute names match exactly
Query.equal('user_id', userId)  // ✅ Correct
Query.equal('userId', userId)   // ❌ Wrong - underscore vs camelCase
```

---

## Best Practices

### ✅ Do's

1. **Use Transactions** for multi-step operations
2. **Set Appropriate Permissions** on all rows
3. **Create Indexes** for frequently queried fields
4. **Cache Frequently Accessed Data** with appropriate TTLs
5. **Use Atomic Operations** for balance updates
6. **Validate Input** before database operations

### ❌ Don'ts

1. **Don't Skip Permissions** - always set explicit permissions
2. **Don't Query Without Limits** - always paginate
3. **Don't Store Sensitive Data** without encryption
4. **Don't Bypass Validation** - use Appwrite's built-in validators
5. **Don't Create Too Many Indexes** - only index what you query

---

## Resources

### Internal Documentation
- [Appwrite Integration Guide](./appwrite-README.md)
- [Appwrite Realtime Guide](./appwrite-realtime.md)
- [Redis/Dragonfly Caching](./redis-README.md)

### External Resources
- [Appwrite Databases Documentation](https://appwrite.io/docs/products/databases)
- [Appwrite Server SDK (Node)](https://appwrite.io/docs/sdks#server)
- [Appwrite Permissions Guide](https://appwrite.io/docs/advanced/platform/permissions)
- [Appwrite Queries Documentation](https://appwrite.io/docs/products/databases/queries)

---

**Last Updated:** 2025-10-12  
**Appwrite Version:** 18.0+  
**Node SDK Version:** 17.2+  
**Status:** Production Ready ✅
