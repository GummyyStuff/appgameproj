# Appwrite Migration Guide

Complete guide for migrating from Supabase to self-hosted Appwrite instance.

## 📚 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Migration](#step-by-step-migration)
4. [Testing](#testing)
5. [Troubleshooting](#troubleshooting)
6. [Rollback Plan](#rollback-plan)

## Overview

This migration moves the Tarkov Casino application from Supabase (PostgreSQL + Realtime) to a self-hosted Appwrite instance (NoSQL + Realtime). 

**Key Changes:**
- PostgreSQL → Appwrite Database (NoSQL)
- SQL RPC Functions → TypeScript Services
- Supabase Realtime → Appwrite Realtime
- Row Level Security → Appwrite Permissions

**Migration Status:** See [APPWRITE_MIGRATION_STATUS.md](./APPWRITE_MIGRATION_STATUS.md) for detailed progress.

## Prerequisites

✅ **Completed:**
- Discord OAuth already migrated to Appwrite
- Self-hosted Appwrite instance running at https://db.juanis.cool

⏳ **Required:**
1. Appwrite instance accessible
2. Appwrite API key with full permissions
3. Bun package manager installed
4. Node.js v18+ for frontend

## Step-by-Step Migration

### Phase 1: Database Setup (30-60 minutes)

#### 1.1 Create Database and Collections

**Option A: Automated (Recommended)**

```bash
cd /home/juan/appgameproj
bun run packages/backend/src/scripts/create-collections.ts
```

**Option B: Manual via Appwrite Console**

1. Navigate to https://db.juanis.cool
2. Login to Appwrite Console
3. Create database: `main_db`
4. Create collections manually following the schema in [plan.md](./plan.md)

**Collections to create:**
- users
- game_history
- daily_bonuses
- case_types
- tarkov_items
- case_item_pools
- chat_messages
- chat_presence
- audit_logs

#### 1.2 Verify Collections

Check Appwrite console to ensure:
- ✅ All 9 collections exist
- ✅ Attributes match the schema
- ✅ Indexes are created
- ✅ Permissions are set correctly

#### 1.3 Seed Initial Data

```bash
cd /home/juan/appgameproj
bun run packages/backend/src/scripts/seed-appwrite.ts
```

This creates:
- 4 case types (Starter, Military, Premium, Legendary)
- 20+ Tarkov items (various rarities)
- Case-item pool mappings

### Phase 2: Environment Configuration (10 minutes)

#### 2.1 Backend Environment Variables

Create/update `packages/backend/.env`:

```env
# Appwrite Configuration
APPWRITE_ENDPOINT=https://db.juanis.cool/v1
APPWRITE_PROJECT_ID=tarkovcas
APPWRITE_API_KEY=your-api-key-here
APPWRITE_DISCORD_REDIRECT_URI=https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/redirect
APPWRITE_DATABASE_ID=main_db

# Server Configuration
FRONTEND_URL=http://localhost:3000
PORT=3001
NODE_ENV=development

# Game Configuration
DAILY_BONUS=1000
STARTING_BALANCE=10000
```

#### 2.2 Frontend Environment Variables

Create/update `packages/frontend/.env`:

```env
# Appwrite Configuration
VITE_APPWRITE_ENDPOINT=https://db.juanis.cool/v1
VITE_APPWRITE_PROJECT_ID=tarkovcas
VITE_APPWRITE_DATABASE_ID=main_db

# API Configuration
VITE_API_URL=http://localhost:3001
```

### Phase 3: Code Updates (Automated - Already Done)

The following have been automated and created:

✅ **Backend Services:**
- `appwrite-database.ts` - Database service layer
- `user-service.ts` - User operations
- `game-service.ts` - Game history
- `currency-new.ts` - Currency & transactions
- `chat-service.ts` - Chat operations
- `audit-service.ts` - Audit logging
- `case-opening-appwrite.ts` - Case opening logic

✅ **Backend Configuration:**
- `collections.ts` - Collection IDs & TypeScript interfaces

✅ **Middleware:**
- `auth.ts` - Updated to use UserService

✅ **Scripts:**
- `create-collections.ts` - Automated collection creation
- `seed-appwrite.ts` - Seed initial data

✅ **Frontend Services:**
- `appwrite-realtime.ts` - Realtime subscriptions

### Phase 4: Manual Code Updates Required

#### 4.1 Update Service Imports

**In `packages/backend/src/routes/games.ts`:**

Replace:
```typescript
import { CurrencyService } from '../services/currency'
import { CaseOpeningService } from '../services/case-opening'
```

With:
```typescript
import { CurrencyService } from '../services/currency-new'
import { CaseOpeningService } from '../services/case-opening-appwrite'
```

#### 4.2 Update Frontend Hooks

Files need updating (detailed changes in migration status):
- `packages/frontend/src/hooks/useChatRealtime.ts`
- `packages/frontend/src/hooks/useProfile.ts`
- `packages/frontend/src/hooks/useBalance.ts`
- `packages/frontend/src/hooks/useUserStats.ts`

### Phase 5: Testing (Critical!)

#### 5.1 Backend Testing

```bash
cd packages/backend
bun run dev
```

**Test Checklist:**
- [ ] Server starts without errors
- [ ] Auth endpoints work (`/api/auth/me`)
- [ ] User profile endpoint (`/api/user/profile`)
- [ ] Balance endpoint (`/api/user/balance`)
- [ ] Case opening endpoint (`/api/games/cases`)

#### 5.2 Frontend Testing

```bash
cd packages/frontend
bun run dev
```

**Test Checklist:**
- [ ] App loads without console errors
- [ ] Discord login works
- [ ] User profile displays
- [ ] Balance displays
- [ ] Case opening works
- [ ] Chat messages send/receive
- [ ] Realtime updates work

#### 5.3 Integration Testing

**Complete Flow Test:**
1. Login with Discord OAuth
2. Check initial balance (10,000)
3. Open a case
4. Verify balance deduction
5. Verify currency award
6. Check game history
7. Send chat message
8. Verify realtime message appears
9. Claim daily bonus
10. Check statistics

### Phase 6: Cleanup (After Testing Success)

⚠️ **Only after everything is tested and working!**

#### 6.1 Remove Old Files

```bash
# Backend cleanup
rm packages/backend/src/config/supabase.ts
rm packages/backend/src/services/database.ts
rm packages/backend/src/services/currency.ts
rm packages/backend/src/services/case-opening.ts
rm packages/backend/src/services/realtime-supabase.ts
rm -rf packages/backend/src/database/migrations/

# Frontend cleanup
rm packages/frontend/src/lib/supabase.ts
rm packages/frontend/src/hooks/useSupabaseRealtime.ts
```

#### 6.2 Remove Dependencies

**Backend `package.json`:**
```bash
cd packages/backend
bun remove @supabase/supabase-js
```

**Frontend `package.json`:**
```bash
cd packages/frontend
bun remove @supabase/supabase-js
```

#### 6.3 Rename New Files

```bash
# Backend
mv packages/backend/src/services/currency-new.ts packages/backend/src/services/currency.ts
mv packages/backend/src/services/case-opening-appwrite.ts packages/backend/src/services/case-opening.ts
```

## Testing

### Unit Testing

```bash
# Backend tests
cd packages/backend
bun test

# Frontend tests
cd packages/frontend
bun test
```

### Manual Testing Scenarios

#### Scenario 1: New User Registration
1. Clear cookies/localStorage
2. Click "Login with Discord"
3. Authorize on Discord
4. Verify redirected to dashboard
5. Check profile created in Appwrite users collection
6. Verify starting balance is 10,000

#### Scenario 2: Case Opening
1. Login as existing user
2. Navigate to case opening page
3. Select "Starter Case" (500 cost)
4. Click "Open Case"
5. Verify:
   - Balance decreased by 500
   - Item won displayed
   - Currency awarded added to balance
   - Game history record created
   - Transaction was atomic (check audit logs)

#### Scenario 3: Chat System
1. Login with two different accounts (two browsers)
2. Send message from User A
3. Verify User B sees message instantly
4. Check online presence updated
5. Verify message stored in database

#### Scenario 4: Daily Bonus
1. Login as user
2. Navigate to daily bonus
3. Click "Claim Bonus"
4. Verify:
   - Balance increased by 1,000
   - Cannot claim again today
   - Record in daily_bonuses collection
   - Next available time displayed

## Troubleshooting

### Common Issues

#### Issue: Collections not created
**Symptoms:** Script fails with "Collection not found"
**Solution:**
1. Check Appwrite console for database existence
2. Verify DATABASE_ID matches in env vars
3. Run creation script again
4. Check Appwrite API key has permissions

#### Issue: Permission denied errors
**Symptoms:** 401/403 errors when accessing collections
**Solution:**
1. Check collection permissions in Appwrite console
2. Verify role-based access is configured correctly
3. For server-side operations, ensure using API key
4. For client-side, verify user is authenticated

#### Issue: Realtime not working
**Symptoms:** Chat messages don't appear in real-time
**Solution:**
1. Check Appwrite Realtime is enabled
2. Verify subscription channel format: `databases.{DB_ID}.collections.{COL_ID}.documents`
3. Check browser console for WebSocket errors
4. Ensure frontend has correct APPWRITE_ENDPOINT

#### Issue: Transaction rollback failures
**Symptoms:** Balance inconsistencies after errors
**Solution:**
1. Check `CurrencyService.processGameTransaction` rollback logic
2. Verify all steps in try-catch blocks
3. Check audit logs for failed transactions
4. Manually correct via Appwrite console if needed

#### Issue: Case opening returns no items
**Symptoms:** "No items found for this case type"
**Solution:**
1. Verify seed script ran successfully
2. Check `case_item_pools` collection has entries
3. Verify `caseTypeId` and `itemId` references are correct
4. Run seed script again if needed

### Debug Mode

Enable detailed logging:

**Backend:**
```typescript
// In appwrite-database.ts, add:
console.log('Query:', queries);
console.log('Result:', data);
```

**Frontend:**
```typescript
// In appwrite-realtime.ts, add:
console.log('Realtime event:', response);
console.log('Payload:', response.payload);
```

### Health Checks

**Appwrite Health:**
```bash
curl https://db.juanis.cool/v1/health
```

**Backend Health:**
```bash
curl http://localhost:3001/health
```

## Rollback Plan

If migration fails and you need to rollback to Supabase:

1. **Keep old code**: Don't delete Supabase files until fully tested
2. **Environment switch**: Change env vars back to Supabase
3. **Service imports**: Revert route imports to old services
4. **Dependencies**: Keep `@supabase/supabase-js` installed

**Quick Rollback:**
```bash
# Revert auth middleware
git checkout packages/backend/src/middleware/auth.ts

# Revert user routes
git checkout packages/backend/src/routes/user.ts

# Change env vars back to Supabase
cp .env.supabase.backup .env
```

## Performance Considerations

### Indexing
- Ensure all frequently queried fields have indexes
- Monitor query performance in Appwrite console
- Add indexes for: userId, createdAt, gameType

### Caching
- Consider implementing Redis for hot data
- Cache case types and items (rarely change)
- Cache user balances with TTL

### Batch Operations
- Use batch queries where possible
- Limit realtime subscription scope
- Implement pagination for large result sets

## Security Checklist

- [ ] API keys stored securely (not in git)
- [ ] Environment variables properly set
- [ ] Collection permissions configured correctly
- [ ] Server-side operations use API key
- [ ] Client operations restricted by user permissions
- [ ] Audit logs capturing all critical operations
- [ ] HTTPS enforced in production
- [ ] CORS properly configured

## Next Steps After Migration

1. **Monitor Performance**
   - Track query response times
   - Monitor realtime connection stability
   - Check error rates

2. **Optimize**
   - Add caching where beneficial
   - Optimize frequently-run queries
   - Implement connection pooling if needed

3. **Scale**
   - Consider read replicas for heavy read operations
   - Implement rate limiting
   - Set up monitoring alerts

4. **Document**
   - Update API documentation
   - Document new database schema
   - Create runbooks for common operations

## Support

For issues or questions:
1. Check [APPWRITE_MIGRATION_STATUS.md](./APPWRITE_MIGRATION_STATUS.md)
2. Review Appwrite documentation: https://appwrite.io/docs
3. Check Appwrite Discord community
4. Review audit logs in Appwrite console

## References

- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite Database](https://appwrite.io/docs/products/databases)
- [Appwrite Realtime](https://appwrite.io/docs/apis/realtime)
- [Appwrite Permissions](https://appwrite.io/docs/advanced/platform/permissions)
- [Migration Plan](./plan.md)
- [Migration Status](./APPWRITE_MIGRATION_STATUS.md)

