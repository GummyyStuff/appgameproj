# Database Setup Guide

This directory contains the database schema, migrations, and setup scripts for the Tarkov Casino Website.

## Overview

The database uses Supabase (PostgreSQL) with the following key features:
- **Row Level Security (RLS)** for data protection
- **Atomic transactions** for game operations
- **Real-time subscriptions** for live updates
- **Built-in authentication** with Supabase Auth

## Database Schema

### Core Tables

#### `user_profiles`
Stores user account information and game statistics.
- Links to `auth.users` via foreign key
- Tracks virtual currency balance
- Maintains game statistics (total wagered, won, games played)
- Includes daily bonus tracking

#### `game_history`
Records all game sessions and results.
- Stores game type, bet amounts, and winnings
- Contains game-specific result data as JSONB
- Tracks game duration for analytics
- Indexed for efficient querying

#### `daily_bonuses`
Tracks daily bonus claims.
- Ensures one bonus per user per day
- Records bonus amounts and claim timestamps

### RPC Functions

#### `process_game_transaction()`
Atomically processes game bets and winnings:
- Validates user balance
- Updates balance and statistics
- Records game history
- Returns transaction result

#### `claim_daily_bonus()`
Handles daily bonus claims:
- Checks eligibility (once per day)
- Updates user balance
- Records bonus claim

#### `get_user_statistics()`
Returns comprehensive user statistics:
- Balance and game totals
- Per-game statistics
- Win rates and biggest wins

#### `get_game_history()`
Retrieves paginated game history:
- Supports filtering by game type
- Returns pagination metadata
- Ordered by most recent first

## Setup Instructions

### 1. Supabase Connection Setup

1. **Your Supabase is running at**: `http://192.168.0.69:8001`

2. **Get your Supabase credentials**:
   - Open browser: `http://192.168.0.69:8001`
   - Go to Settings > API
   - Copy the `anon/public` key and `service_role` key

3. **Update environment variables**:
   ```bash
   # Your .env file is already created, just update the keys:
   SUPABASE_ANON_KEY=your_actual_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_key_here
   ```

4. **Test connection**:
   ```bash
   cd packages/backend
   bun run db:test-connection
   ```

### 2. Database Migration

#### Option A: Manual Execution (Recommended)

1. **Copy SQL content** from migration files:
   - `migrations/001_initial_schema.sql`
   - `migrations/002_rpc_functions.sql`

2. **Execute in Supabase Dashboard**:
   - Go to Supabase Dashboard > SQL Editor
   - Paste and run each migration file
   - Verify tables and functions are created

#### Option B: Using Setup Script

```bash
# Run the setup script (validates files)
cd packages/backend
bun run src/database/setup.ts

# With seed data for testing
bun run src/database/setup.ts --seed
```

### 3. Seed Data (Development Only)

For development and testing, you can add sample data:

1. **Execute seed file**:
   - Copy content from `seeds/001_test_data.sql`
   - Run in Supabase Dashboard > SQL Editor

2. **Test users created**:
   - `tarkov_legend` - High roller with lots of games
   - `scav_runner` - New player
   - `extract_camper` - Unlucky player

### 4. Authentication Configuration

1. **Configure Supabase Auth** in Dashboard:
   - Go to Authentication > Settings
   - Set site URL: `http://localhost:3000` (development)
   - Configure email templates (optional)
   - Set password requirements

2. **Enable RLS policies** (should be automatic from migration):
   - Users can only access their own data
   - Policies enforce data isolation

## Verification

### Check Database Setup

```typescript
import { DatabaseService } from '../services/database'

// Test basic operations
const balance = await DatabaseService.getUserBalance('user-id')
const stats = await DatabaseService.getUserStatistics('user-id')
```

### Verify RLS Policies

1. **Test with different users**:
   - Each user should only see their own data
   - Cross-user access should be blocked

2. **Check function permissions**:
   - RPC functions should work with authenticated users
   - Anonymous access should be restricted

## File Structure

```
database/
├── migrations/
│   ├── 001_initial_schema.sql    # Core tables and RLS
│   └── 002_rpc_functions.sql     # Stored procedures
├── seeds/
│   └── 001_test_data.sql         # Development test data
├── setup.ts                      # Setup automation script
└── README.md                     # This file
```

## Security Features

### Row Level Security (RLS)
- **User Isolation**: Users can only access their own records
- **Automatic Enforcement**: Database-level security
- **Policy-Based**: Flexible access control

### Data Validation
- **Check Constraints**: Ensure data integrity
- **Foreign Keys**: Maintain referential integrity
- **Atomic Transactions**: Prevent data corruption

### Authentication Integration
- **Supabase Auth**: Built-in user management
- **JWT Tokens**: Secure session handling
- **Automatic User Creation**: Profile created on registration

## Performance Considerations

### Indexes
- **User-based queries**: Optimized for user_id lookups
- **Time-based queries**: Efficient date range filtering
- **Game type filtering**: Fast game-specific queries

### Connection Management
- **Connection pooling**: Handled by Supabase
- **Query optimization**: Efficient RPC functions
- **Real-time subscriptions**: Minimal overhead

## Troubleshooting

### Common Issues

1. **Migration Errors**:
   - Check Supabase connection
   - Verify SQL syntax
   - Ensure proper permissions

2. **RLS Policy Issues**:
   - Verify user authentication
   - Check policy conditions
   - Test with different user contexts

3. **Function Errors**:
   - Check function signatures
   - Verify parameter types
   - Review error logs

### Debug Commands

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Test RPC functions
SELECT get_user_balance('00000000-0000-0000-0000-000000000000');
```

## Production Deployment

### Environment Variables
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### Security Checklist
- [ ] RLS enabled on all tables
- [ ] Service role key secured
- [ ] Email confirmations enabled
- [ ] Rate limiting configured
- [ ] Backup strategy in place

### Monitoring
- Monitor query performance
- Track user growth
- Watch for security issues
- Regular backup verification