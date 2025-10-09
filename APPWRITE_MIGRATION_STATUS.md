# Appwrite Migration Status

This document tracks the progress of migrating from Supabase to self-hosted Appwrite.

## Migration Date
Started: [Current Date]

## ✅ Completed Tasks

### Phase 1: Core Infrastructure (Backend)

1. **Collection Configuration** ✅
   - Created `/packages/backend/src/config/collections.ts`
   - Defined all 9 collections with TypeScript interfaces
   - Created DATABASE_ID and COLLECTION_IDS constants
   
2. **Database Service Layer** ✅
   - Created `/packages/backend/src/services/appwrite-database.ts`
   - Implemented CRUD operations wrapper
   - Added query helpers and permission helpers
   
3. **User Service** ✅
   - Created `/packages/backend/src/services/user-service.ts`
   - Migrated from SQL RPC functions to TypeScript
   - Methods: getUserProfile, getUserBalance, createUserProfile, updateUserProfile, incrementStats, getUserStatistics
   
4. **Game Service** ✅
   - Created `/packages/backend/src/services/game-service.ts`
   - Methods: recordGameResult, getGameHistory, getGameStatistics, getRecentGames
   
5. **Currency Service** ✅
   - Created `/packages/backend/src/services/currency-new.ts`
   - Implemented application-level transactions with rollback
   - Methods: getBalance, validateBalance, processGameTransaction, processCaseOpening, checkDailyBonusStatus, claimDailyBonus, getCurrencyStats
   
6. **Chat Service** ✅
   - Created `/packages/backend/src/services/chat-service.ts`
   - Methods: sendMessage, getMessages, deleteMessage, updatePresence, getOnlineUsers, cleanupStalePresence
   
7. **Audit Service** ✅
   - Created `/packages/backend/src/services/audit-service.ts`
   - Methods: logEvent, logGamePlay, gamePlayStarted, gameCompleted, logSecurityEvent, logAuthEvent, logResourceChange, getUserLogs, getRecentLogs
   
8. **Case Opening Service** ✅
   - Created `/packages/backend/src/services/case-opening-appwrite.ts`
   - Migrated provably fair item selection
   - Methods: getCaseTypes, getCaseType, getItemPool, selectRandomItem, calculateItemValue, validateCaseOpening, previewCase, openCase, getCaseOpeningStats
   
9. **Collection Creation Script** ✅
   - Created `/packages/backend/src/scripts/create-collections.ts`
   - Automated script to create all 9 Appwrite collections
   - Includes attributes, indexes, and permissions setup
   
10. **Middleware Updates** ✅
    - Updated `/packages/backend/src/middleware/auth.ts`
    - Removed Supabase dependencies
    - Now uses UserService instead of direct Supabase queries

### Phase 2: Frontend Infrastructure

1. **Realtime Service** ✅
   - Created `/packages/frontend/src/services/appwrite-realtime.ts`
   - Subscription helpers for collections and documents
   - Chat, presence, balance, and game history subscriptions

## 🚧 In Progress / Pending Tasks

### Backend Routes (Partially Complete)

1. **User Routes** 🔄
   - File: `/packages/backend/src/routes/user.ts`
   - Status: Partially updated (profile and balance endpoints done)
   - Remaining: Update daily bonus claim, statistics endpoints

2. **Games Routes** ⏳
   - File: `/packages/backend/src/routes/games.ts`
   - Status: Not started
   - Needs: Update to use new CaseOpeningService and CurrencyService

3. **Chat Routes** ⏳
   - File: Needs to be created at `/packages/backend/src/routes/chat.ts`
   - Status: Not started
   - Needs: REST endpoints for chat operations

### Backend Services

1. **Statistics Service** ⏳
   - File: `/packages/backend/src/services/statistics.ts`
   - Status: Needs rewrite for Appwrite
   - Current: Uses SQL aggregations
   - Needs: TypeScript aggregations over game history

2. **Realtime Service (Backend)** ⏳
   - File: Needs to be created at `/packages/backend/src/services/appwrite-realtime-backend.ts`
   - Status: Not started
   - Purpose: Server-side realtime broadcasting

### Frontend Updates

1. **Chat Realtime Hook** ⏳
   - File: `/packages/frontend/src/hooks/useChatRealtime.ts`
   - Status: Needs update to use Appwrite Realtime
   - Currently uses Supabase Realtime

2. **Profile Hook** ⏳
   - File: `/packages/frontend/src/hooks/useProfile.ts`
   - Status: Needs update to use backend API

3. **Balance Hook** ⏳
   - File: `/packages/frontend/src/hooks/useBalance.ts`
   - Status: Needs update to use backend API

4. **User Stats Hook** ⏳
   - File: `/packages/frontend/src/hooks/useUserStats.ts`
   - Status: Needs update to use backend API

5. **Game Realtime Hook** ⏳
   - File: Needs to be created at `/packages/frontend/src/hooks/useGameRealtime.ts`
   - Status: Not started

6. **Presence Hook** ⏳
   - File: Needs to be created at `/packages/frontend/src/hooks/usePresence.ts`
   - Status: Not started

### Database Setup

1. **Create Collections in Appwrite** ⏳
   - Status: Script ready, needs manual execution
   - Command: `bun run packages/backend/src/scripts/create-collections.ts`
   - Or: Manual creation via Appwrite Console

2. **Seed Initial Data** ⏳
   - File: Needs to be created at `/packages/backend/src/scripts/seed-appwrite.ts`
   - Status: Not started
   - Purpose: Populate case types, tarkov items, case-item pools

### Cleanup Tasks

1. **Remove Supabase Dependencies** ⏳
   - Delete `/packages/backend/src/config/supabase.ts`
   - Delete `/packages/backend/src/services/database.ts` (old version)
   - Delete `/packages/backend/src/services/realtime-supabase.ts`
   - Delete `/packages/frontend/src/lib/supabase.ts`
   - Delete all SQL migration files
   - Remove `@supabase/supabase-js` from package.json

2. **Environment Variables** ⏳
   - Update `.env` documentation
   - Remove Supabase variables
   - Add Appwrite variables

3. **Update package.json** ⏳
   - Backend: Remove `@supabase/supabase-js`
   - Frontend: Remove `@supabase/supabase-js`
   - Verify all dependencies

## 📋 Testing Checklist

- [ ] Manual collection creation in Appwrite
- [ ] Run collection creation script successfully
- [ ] Create test user via Discord OAuth
- [ ] Test user profile creation
- [ ] Test balance operations
- [ ] Test case opening flow
- [ ] Test game history recording
- [ ] Test chat message sending
- [ ] Test presence tracking
- [ ] Test daily bonus claim
- [ ] Test statistics calculations
- [ ] Test realtime updates (chat)
- [ ] Test realtime updates (balance)
- [ ] Test realtime updates (presence)

## 🔧 Manual Steps Required

### 1. Create Appwrite Database and Collections

Option A: Run the script
```bash
cd /home/juan/appgameproj
bun run packages/backend/src/scripts/create-collections.ts
```

Option B: Manual creation via Appwrite Console
- Navigate to https://db.juanis.cool
- Create database: `main_db`
- Create all 9 collections following the plan
- Set up attributes, indexes, and permissions

### 2. Update Environment Variables

**Backend** (`packages/backend/.env`):
```env
APPWRITE_ENDPOINT=https://db.juanis.cool/v1
APPWRITE_PROJECT_ID=tarkovcas
APPWRITE_API_KEY=your-api-key-here
APPWRITE_DISCORD_REDIRECT_URI=https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/redirect
APPWRITE_DATABASE_ID=main_db
FRONTEND_URL=http://localhost:3000
PORT=3001
DAILY_BONUS=1000
STARTING_BALANCE=10000
```

**Frontend** (`packages/frontend/.env`):
```env
VITE_APPWRITE_ENDPOINT=https://db.juanis.cool/v1
VITE_APPWRITE_PROJECT_ID=tarkovcas
VITE_APPWRITE_DATABASE_ID=main_db
VITE_API_URL=http://localhost:3001
```

### 3. Create Seed Data Script

Create initial case types and tarkov items for testing.

## 📁 File Structure

### New Files Created
```
packages/backend/src/
├── config/
│   └── collections.ts ✅
├── services/
│   ├── appwrite-database.ts ✅
│   ├── user-service.ts ✅
│   ├── game-service.ts ✅
│   ├── currency-new.ts ✅
│   ├── chat-service.ts ✅
│   ├── audit-service.ts ✅
│   └── case-opening-appwrite.ts ✅
└── scripts/
    └── create-collections.ts ✅

packages/frontend/src/
└── services/
    └── appwrite-realtime.ts ✅
```

### Files to Update
```
packages/backend/src/
├── middleware/
│   └── auth.ts ✅ (Updated)
├── routes/
│   ├── user.ts 🔄 (Partially updated)
│   ├── games.ts ⏳ (Needs update)
│   └── chat.ts ⏳ (Needs creation)
└── services/
    ├── currency.ts ⏳ (Old version, replace with currency-new.ts)
    ├── case-opening.ts ⏳ (Old version, replace with case-opening-appwrite.ts)
    └── statistics.ts ⏳ (Needs rewrite)

packages/frontend/src/
└── hooks/
    ├── useChatRealtime.ts ⏳ (Needs update)
    ├── useProfile.ts ⏳ (Needs update)
    ├── useBalance.ts ⏳ (Needs update)
    └── useUserStats.ts ⏳ (Needs update)
```

### Files to Delete
```
packages/backend/src/
├── config/
│   └── supabase.ts ❌
├── services/
│   ├── database.ts ❌ (old Supabase version)
│   └── realtime-supabase.ts ❌
└── database/
    └── migrations/*.sql ❌ (all SQL files)

packages/frontend/src/
└── lib/
    └── supabase.ts ❌
```

## 🎯 Next Steps (Priority Order)

1. **Create Appwrite Collections** (CRITICAL)
   - Run the collection creation script
   - Verify all collections exist with correct attributes

2. **Create Seed Data Script** (HIGH)
   - Populate initial case types
   - Populate tarkov items
   - Link items to cases

3. **Update Remaining Routes** (HIGH)
   - Complete user routes updates
   - Update games routes
   - Create chat routes

4. **Update Frontend Hooks** (HIGH)
   - Update chat realtime hook
   - Update profile, balance, stats hooks
   - Create new game realtime and presence hooks

5. **Rewrite Statistics Service** (MEDIUM)
   - Convert SQL aggregations to TypeScript

6. **Remove Old Code** (LOW - only after everything works)
   - Delete Supabase config files
   - Delete SQL migrations
   - Remove Supabase dependencies from package.json

7. **Testing** (CONTINUOUS)
   - Test each component as it's updated
   - Integration testing
   - End-to-end testing

## ⚠️ Important Notes

- **Don't delete old Supabase code until everything is tested and working**
- **Application-level transactions use rollback pattern** - see CurrencyService.processGameTransaction for example
- **Composite indexes are simulated** using compound string fields (e.g., `userBonusKey = userId_date`)
- **JSON data stored as strings** and parsed in application layer
- **Permissions are critical** - ensure proper role-based access control

## 🐛 Known Issues / Considerations

1. **No ACID Transactions** - Appwrite doesn't support multi-document transactions like PostgreSQL
   - Solution: Application-level transaction pattern with rollback logic
   
2. **No Composite Indexes** - Appwrite doesn't support multi-column indexes
   - Solution: Compound string attributes for uniqueness constraints
   
3. **JSON Storage** - No native JSONB type like PostgreSQL
   - Solution: Store as string, parse in application

4. **Real-time Performance** - Different subscription model than Supabase
   - Solution: Implement reconnection logic and optimistic updates

## 📞 Support

For issues during migration:
1. Check Appwrite console logs
2. Check backend console logs
3. Check browser console for frontend errors
4. Verify environment variables are set correctly
5. Ensure collections are created with correct schemas

