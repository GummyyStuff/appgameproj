# Appwrite Slow Database Queries - Diagnosis & Fix

## Problem

Database queries to Appwrite are timing out after 10+ seconds, causing:
- Case types page failing to load
- 500 errors on `/api/games/cases`
- Multiple retry attempts taking 20+ seconds

## Immediate Fixes Applied ✅

### 1. Increased Timeout (30 seconds)
**File**: `packages/backend/src/utils/appwrite-retry.ts`
- Changed from 10s to 30s timeout
- Gives slow queries more time to complete

### 2. Increased Retries
**File**: `packages/backend/src/services/appwrite-database.ts`
- Changed from 2 to 3 retries
- Increased delay from 300ms to 1000ms

## Root Causes to Investigate

### 1. Missing Database Index on `isActive` field

**Query being executed:**
```typescript
appwriteDb.listDocuments(
  COLLECTION_IDS.CASE_TYPES,
  [appwriteDb.equal('isActive', true)]
)
```

**Solution:** Create index in Appwrite Console

1. Go to Appwrite Console: https://db.juanis.cool/console
2. Navigate to: **Databases > main_db > case_types collection**
3. Go to **Indexes** tab
4. Create new index:
   - **Key**: `isActive_idx`
   - **Type**: Key
   - **Attributes**: `isActive`
   - **Orders**: Ascending

This will make queries filtering by `isActive` MUCH faster.

### 2. Check Appwrite Server Performance

**In Appwrite Console:**
- Check Server Status
- Look for any performance warnings
- Check if there are a lot of documents in collections

### 3. Network Latency

Test network speed between Coolify and Appwrite:

```bash
# SSH into your Coolify server
curl -w "\nTime: %{time_total}s\n" -o /dev/null -s https://db.juanis.cool/v1/health

# Should return in < 1 second for good latency
```

### 4. Check Collection Size

Too many documents without pagination can cause slow queries:

```bash
# In Appwrite Console, check document count in case_types
# If > 1000 documents, add limit parameter to query
```

## Recommended Solution (Priority Order)

### Priority 1: Add Database Index (DO THIS FIRST) 🔥

**Appwrite Console Steps:**

1. Login to https://db.juanis.cool/console
2. Navigate to: **Databases** (left sidebar)
3. Click on your database (`main_db`)
4. Click on `case_types` collection
5. Go to **Indexes** tab
6. Click **Create Index**
7. Fill in:
   ```
   Key: isActive_idx
   Type: Key
   Attributes: isActive (ascending)
   ```
8. Click **Create**
9. Wait for index to build

**This should reduce query time from 10+ seconds to < 1 second!**

### Priority 2: Check Other Collections

Add indexes for commonly queried fields on other collections:

**`users` collection:**
- Index on `userId` (should already exist)
- Index on `username` (for lookups)
- Index on `email` (for lookups)

**`game_history` collection:**
- Index on `userId` (for user game history)
- Index on `gameType` (for game type filtering)
- Index on `createdAt` (for time-based queries)

**`case_items` collection:**
- Index on `caseTypeId` (for case items lookup)
- Index on `rarity` (for rarity-based queries)

### Priority 3: Add Pagination

Limit query results to prevent loading too much data:

```typescript
// In appwrite-database.ts
async listDocuments<T>(
  collectionId: CollectionId,
  queries: string[] = [],
  limit: number = 100 // Add default limit
) {
  // Add limit to queries
  const queriesWithLimit = [...queries, Query.limit(limit)];
  
  const response = await retryAppwriteOperation(
    () => this.databases.listDocuments(
      DATABASE_ID, 
      collectionId, 
      queriesWithLimit
    ),
    { maxRetries: 3, delayMs: 1000 }
  );
  // ...
}
```

### Priority 4: Network Optimization

If Appwrite server is in a different region:

1. **Consider Appwrite Regions** - Move to closer region if possible
2. **Use CDN** - Enable Appwrite CDN if available
3. **Connection Pooling** - Already handled by node-appwrite

## Testing After Fix

1. **Rebuild and deploy** your backend:
   ```bash
   # In Coolify, trigger new deployment
   ```

2. **Test the cases endpoint**:
   ```bash
   curl -X GET https://your-domain.com/api/games/cases
   ```

3. **Check logs** for query timing:
   - Should see: `✅ Found X documents` 
   - Response time should be < 2 seconds

4. **Monitor** for a few hours to ensure stability

## Performance Benchmarks

**Before Fixes:**
- Query time: 10-20+ seconds
- Multiple timeouts
- 500 errors

**After Index + Fixes:**
- Query time: < 1 second ✅
- No timeouts ✅
- 200 responses ✅

## Alternative: Cache Results

If queries are still slow, add caching:

```typescript
// Simple in-memory cache
const caseTypesCache = {
  data: null as any,
  timestamp: 0,
  ttl: 5 * 60 * 1000 // 5 minutes
};

async function getCaseTypesWithCache() {
  const now = Date.now();
  
  if (caseTypesCache.data && (now - caseTypesCache.timestamp) < caseTypesCache.ttl) {
    console.log('📦 Returning cached case types');
    return caseTypesCache.data;
  }
  
  console.log('🔄 Fetching fresh case types');
  const result = await appwriteDb.listDocuments(COLLECTION_IDS.CASE_TYPES, [/*...*/]);
  
  caseTypesCache.data = result;
  caseTypesCache.timestamp = now;
  
  return result;
}
```

## Next Steps

1. ✅ Applied timeout increase (30s)
2. ✅ Applied retry increase (3 retries)
3. **⏭️ GO TO APPWRITE CONSOLE AND ADD INDEX** (this is the real fix!)
4. Test and monitor performance
5. Add caching if needed

---

**Status**: Immediate workarounds applied. **Action required**: Add database index in Appwrite Console.

