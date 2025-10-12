# Migration Summary: Supabase to Appwrite

## Overview

This document summarizes the migration from Supabase to Appwrite as the primary backend service for the Tarkov Casino project.

**Migration Date:** 2025-10-12  
**Status:** ✅ Complete

---

## What Changed

### Backend Services

| Service | Before (Supabase) | After (Appwrite) |
|---------|-------------------|------------------|
| Authentication | Supabase Auth | Appwrite Account |
| Database | PostgreSQL with RLS | Appwrite Databases (TablesDB) |
| Real-time | PostgreSQL LISTEN/NOTIFY | Appwrite Realtime (WebSocket) |
| Storage | Supabase Storage | Appwrite Storage |
| Functions | Supabase Edge Functions | Appwrite Functions (future) |
| RPC | PostgreSQL functions | Backend API + Appwrite Transactions |

### Code Changes

#### Authentication

**Before:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, anonKey);
const { data, error } = await supabase.auth.signUp({ email, password });
const { data: session } = await supabase.auth.signInWithPassword({ email, password });
```

**After:**
```typescript
import { Client, Account, ID } from 'appwrite';

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

const account = new Account(client);
const user = await account.create({ userId: ID.unique(), email, password });
const session = await account.createEmailPasswordSession({ email, password });
```

#### Database Queries

**Before:**
```typescript
const { data, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', userId)
  .single();
```

**After:**
```typescript
import { TablesDB, Query } from 'appwrite';

const databases = new TablesDB(client);
const row = await databases.getRow({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  rowId: userId
});
```

#### Real-time Subscriptions

**Before:**
```typescript
const subscription = supabase
  .channel('balance-changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'user_profiles',
    filter: `user_id=eq.${userId}`
  }, payload => {
    console.log('Balance updated:', payload.new.balance);
  })
  .subscribe();
```

**After:**
```typescript
const unsubscribe = client.subscribe(
  `databases.tarkov_casino.tables.user_profiles.rows.${userId}`,
  response => {
    if (response.events.includes('databases.*.tables.*.rows.*.update')) {
      console.log('Balance updated:', response.payload.balance);
    }
  }
);
```

---

## Key Differences

### Authentication

| Feature | Supabase | Appwrite |
|---------|----------|----------|
| Session Type | JWT tokens | Session cookies + JWT |
| Default Expiry | 3600 seconds (1 hour) | 31536000 seconds (365 days) |
| Refresh | Automatic via `onAuthStateChange` | Automatic via SDK |
| Storage | localStorage | localStorage + cookies |

### Database

| Feature | Supabase | Appwrite |
|---------|----------|----------|
| Type | PostgreSQL | PostgreSQL (abstracted) |
| Query API | SQL-like methods | Query builder |
| Transactions | PostgreSQL transactions | Appwrite Transactions API |
| ID Format | UUID v4 | Custom or auto-generated |
| Metadata | `created_at`, `updated_at` | `$createdAt`, `$updatedAt`, `$id` |
| Security | Row Level Security (RLS) | Permission arrays |

### Real-time

| Feature | Supabase | Appwrite |
|---------|----------|----------|
| Protocol | WebSocket + PostgreSQL LISTEN | WebSocket only |
| Channels | Database channels | Resource-based channels |
| Filters | SQL-like filters | Event pattern matching |
| Permissions | RLS policies | Permission-based filtering |

---

## Migration Benefits

### Advantages of Appwrite

1. **Simplified Architecture**
   - All-in-one BaaS solution
   - Unified SDK for all services
   - Consistent API across services

2. **Better Performance**
   - Built-in CDN and caching
   - Optimized for real-time
   - Faster session management

3. **Enhanced Security**
   - Role-based permissions
   - Built-in abuse protection
   - SOC 2 Type II compliance (Cloud)

4. **Developer Experience**
   - Better TypeScript support
   - Cleaner API design
   - Rich documentation
   - Active community support

5. **Cost-Effective**
   - Generous free tier
   - Predictable pricing
   - No surprise charges

---

## Remaining Supabase References

Some files still contain Supabase references for historical/migration purposes:

### Migration Files (Historical)
- `packages/backend/src/database/migrations/*.sql` - Original Supabase migrations
- `.cursor/plans/supabase-to-appwrite-migration-*.plan.md` - Migration planning docs

These are kept for reference and should **NOT** be used for new development.

### To Be Removed
If you encounter Supabase references in production code:
1. Report as a bug
2. Create Appwrite equivalent
3. Update documentation

---

## Environment Variables Cleanup

### Remove (Deprecated)
```env
# OLD - Supabase (REMOVE THESE)
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Add (Current)
```env
# NEW - Appwrite (USE THESE)
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=...
APPWRITE_API_KEY=...
APPWRITE_DATABASE_ID=tarkov_casino
```

---

## Testing After Migration

### Checklist

- [x] Authentication works (register, login, logout)
- [x] Database operations work (create, read, update, delete)
- [x] Real-time updates work (balance, chat, leaderboard)
- [x] File uploads work (avatars)
- [x] Permissions enforce correctly
- [x] Game transactions are atomic
- [x] Rate limiting functions
- [x] Cache integration works
- [x] Health checks pass

### Test Commands

```bash
# Backend tests
cd packages/backend
bun test

# Frontend tests  
cd packages/frontend
bun test

# Integration tests
bun test:integration

# Connection test
bun run db:test-connection
```

---

## Rollback Plan

If issues arise, the rollback plan is:

1. **Not Possible** - Supabase infrastructure has been decommissioned
2. **Data Migration** - One-way migration to Appwrite
3. **Forward Only** - Must fix issues in Appwrite, not rollback

---

## Support Resources

### Appwrite Documentation
- [Authentication](https://appwrite.io/docs/products/auth)
- [Databases](https://appwrite.io/docs/products/databases)
- [Realtime](https://appwrite.io/docs/apis/realtime)
- [Storage](https://appwrite.io/docs/products/storage)
- [Migration from Supabase](https://appwrite.io/docs/advanced/migrations/supabase)

### Community
- [Appwrite Discord](https://appwrite.io/discord)
- [GitHub Discussions](https://github.com/appwrite/appwrite/discussions)

---

**Migration Lead:** Development Team  
**Completion Date:** 2025-10-12  
**Status:** ✅ Production Ready

