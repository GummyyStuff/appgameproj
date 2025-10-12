# Deprecated Files and Features

This document lists deprecated files and features that are kept for reference but should **NOT** be used in new development.

---

## ⚠️ Migration Status

**Date:** 2025-10-12  
**From:** Supabase  
**To:** Appwrite  
**Status:** Migration Complete ✅

---

## Deprecated Backend Files

### Database Services

**Location:** `packages/backend/src/services/`

| File | Status | Replacement |
|------|--------|-------------|
| `database.ts` | ⚠️ DEPRECATED | Use Appwrite SDK directly |
| `database.test.ts` | ⚠️ DEPRECATED | See individual service tests |
| `currency.ts` | ⚠️ DEPRECATED | Use `currency-new.ts` (Appwrite) |

**Note:** These files contain Supabase-specific code and should not be imported in new code.

### Database Migrations

**Location:** `packages/backend/src/database/migrations/`

All `.sql` migration files are **PostgreSQL/Supabase specific** and are deprecated:
- `001_initial_schema_v2.sql` through `027_fix_game_history_constraints.sql`

**Why Kept:**
- Historical reference
- Understanding data model evolution
- Migration documentation

**Do NOT:**
- Run these migrations on Appwrite
- Use as reference for new Appwrite schemas

**Instead:**
- Create Appwrite tables via Console or SDK
- See [Database Guide](./backend/database-README.md) for current schema

### Configuration Files

**Location:** `packages/backend/src/config/`

| File | Status | Replacement |
|------|--------|-------------|
| `supabase.ts` | ⚠️ DEPRECATED | `appwrite.ts` |

---

## Deprecated Frontend Files

### Supabase Integration

**Location:** `packages/frontend/src/lib/`

| File | Status | Replacement |
|------|--------|-------------|
| `supabase.ts` (if exists) | ⚠️ DEPRECATED | `appwrite.ts` |

---

## Deprecated Environment Variables

### Backend (.env)

**Remove these:**
```env
# ❌ DEPRECATED - Remove from .env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Use these instead:**
```env
# ✅ CURRENT - Use these
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=...
APPWRITE_API_KEY=...
APPWRITE_DATABASE_ID=tarkov_casino
```

### Frontend (.env)

**Remove these:**
```env
# ❌ DEPRECATED
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

**Use these instead:**
```env
# ✅ CURRENT
VITE_APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=...
```

---

## Deprecated Patterns

### Authentication Patterns

**❌ OLD (Supabase):**
```typescript
import { supabase } from '@/config/supabase';

const { data, error } = await supabase.auth.signUp({
  email, password
});

const { data: session } = await supabase.auth.signInWithPassword({
  email, password
});
```

**✅ NEW (Appwrite):**
```typescript
import { account } from '@/lib/appwrite';
import { ID } from 'appwrite';

const user = await account.create({
  userId: ID.unique(),
  email,
  password
});

const session = await account.createEmailPasswordSession({
  email,
  password
});
```

### Database Patterns

**❌ OLD (Supabase):**
```typescript
const { data, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', userId)
  .single();

const { data: updated } = await supabase
  .from('user_profiles')
  .update({ balance: newBalance })
  .eq('user_id', userId);
```

**✅ NEW (Appwrite):**
```typescript
import { databases } from '@/config/appwrite';

const row = await databases.getRow({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  rowId: userId
});

const updated = await databases.updateRow({
  databaseId: 'tarkov_casino',
  tableId: 'user_profiles',
  rowId: userId,
  data: { balance: newBalance }
});
```

### Real-time Patterns

**❌ OLD (Supabase):**
```typescript
const subscription = supabase
  .channel('balance')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'user_profiles',
    filter: `user_id=eq.${userId}`
  }, payload => {
    console.log('Updated:', payload.new);
  })
  .subscribe();
```

**✅ NEW (Appwrite):**
```typescript
import { client } from '@/lib/appwrite';

const unsubscribe = client.subscribe(
  `databases.tarkov_casino.tables.user_profiles.rows.${userId}`,
  response => {
    if (response.events.includes('databases.*.tables.*.rows.*.update')) {
      console.log('Updated:', response.payload);
    }
  }
);
```

---

## Migration Files (Reference Only)

### Migration Plans

**Location:** `.cursor/plans/`

These files document the migration process:
- `supabase-to-appwrite-migration-*.plan.md`

**Purpose:** Historical record of migration decisions

**Do NOT:** Use as current architecture reference

---

## How to Handle Deprecated Code

### If You Find Deprecated Code

1. **Do NOT use it** - Replace with Appwrite equivalent
2. **Report it** - Create an issue or notify the team
3. **Update it** - If possible, migrate to Appwrite
4. **Document it** - Add to this file if not already listed

### Removal Schedule

- **Phase 1** (Current): Mark as deprecated, keep for reference
- **Phase 2** (Q1 2026): Move to `/deprecated` directory
- **Phase 3** (Q2 2026): Remove completely if no longer needed

---

## Verification

### Check for Deprecated Usage

```bash
# Search for Supabase imports in source code
grep -r "from '@supabase/supabase-js'" packages/

# Search for Supabase configuration
grep -r "createClient.*supabase" packages/

# Check environment variables
grep -r "SUPABASE_" packages/*/src

# Expected: Only in deprecated files or migration docs
```

### Report Findings

If you find Supabase usage in **active production code**:
1. Create a GitHub issue
2. Tag as "migration" and "bug"
3. Include file location and suggested fix

---

## Resources

### Migration Documentation
- [Migration Summary](./MIGRATION-SUMMARY.md)
- [Appwrite Migration Guide](https://appwrite.io/docs/advanced/migrations/supabase)
- [Appwrite Integration Guide](./backend/appwrite-README.md)

### Appwrite Documentation
- [Appwrite Docs](https://appwrite.io/docs)
- [Appwrite SDKs](https://appwrite.io/docs/sdks)
- [Appwrite Discord](https://appwrite.io/discord)

---

**Last Updated:** 2025-10-12  
**Review Date:** Q1 2026  
**Status:** Active Reference Document

