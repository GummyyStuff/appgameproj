# Appwrite Slow Connection - Debugging Guide

## Current Status ✅ / ⚠️

### What's Working:
- ✅ **Auth is working!** User logged in as `gummystuff`
- ✅ **User profile loads**: `/api/user/profile` - 200 (452ms)
- ✅ **Balance loads**: `/api/user/balance` - 200 (564ms)
- ✅ **No more Supabase errors** in console
- ✅ **New frontend deployed** with Appwrite code
- ✅ **Database index created** on `isActive` field

### What's Slow: ⚠️
- ❌ **Case types query**: Timing out after 30+ seconds
- ❌ **Global statistics**: Timing out
- ⚠️ **Database operations take 10-60 seconds** from Coolify

### Key Finding:
- **Appwrite server response**: 0.3 seconds (fast!) ✅
- **MCP query via my connection**: Instant (< 1s) ✅
- **Only 4 documents** in case_types collection
- **Query from Coolify server**: 30-60 seconds (VERY slow!) ❌

**This indicates a NETWORK issue between Coolify and Appwrite, not a database problem.**

## Root Cause: Network Latency

The issue is likely one of these:

### 1. Geographic Distance
- Where is your Coolify server located?
- Where is Appwrite server located?
- High latency between regions

### 2. DNS Resolution
- Coolify might be slow resolving `db.juanis.cool`
- DNS lookups happening on every request

### 3. SSL/TLS Handshake
- HTTPS connection establishment is slow
- Certificate validation taking time

### 4. Connection Pooling
- node-appwrite creating new connections for each request
- No connection reuse

## Diagnostic Steps

### Test 1: Check DNS Resolution Speed

SSH into your Coolify server and run:

```bash
time nslookup db.juanis.cool
# Should be < 0.1s

time dig db.juanis.cool
# Should be < 0.5s
```

### Test 2: Check Connection Speed

```bash
# Test raw HTTPS connection speed
time curl -I https://db.juanis.cool/v1/health

# Should be < 2s for headers
```

### Test 3: Test from Coolify Container

```bash
# Get your container ID
docker ps | grep tarkov

# Exec into the container
docker exec -it <container-id> sh

# Inside container, test connection
time curl -I https://db.juanis.cool/v1/health

# Check DNS
nslookup db.juanis.cool
```

### Test 4: Check Appwrite Logs

In Appwrite Console:
- Check for rate limiting warnings
- Check for slow query logs
- Check server resource usage

## Solutions

### Solution 1: Use Appwrite's Public IP (Skip DNS)

If DNS is the issue, use the IP directly:

**In Coolify environment variables:**
```env
APPWRITE_ENDPOINT=https://[APPWRITE_IP_ADDRESS]/v1
```

Find IP:
```bash
dig +short db.juanis.cool
```

### Solution 2: Increase Timeouts (Already Applied)

I've increased timeouts to 60 seconds, but this is a workaround, not a fix.

### Solution 3: Add Connection Keep-Alive

node-appwrite uses fetch under the hood. We can't easily configure HTTP agent settings, but Appwrite should handle this.

### Solution 4: Cache Results Aggressively

For data that doesn't change often (case types, items), cache on backend:

```typescript
// Simple cache
const caseTypesCache = {
  data: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000 // 5 minutes
};

async function getCaseTypesWithCache() {
  if (caseTypesCache.data && 
      (Date.now() - caseTypesCache.timestamp) < caseTypesCache.ttl) {
    return caseTypesCache.data;
  }
  
  const result = await fetchFromAppwrite();
  caseTypesCache.data = result;
  caseTypesCache.timestamp = Date.now();
  return result;
}
```

### Solution 5: Move Appwrite to Same Region

If Appwrite and Coolify are in different regions:
- Move Appwrite closer to Coolify
- Or move Coolify closer to Appwrite
- Or use Appwrite Cloud in same region

### Solution 6: Use Appwrite Cloud with CDN

If using self-hosted Appwrite:
- Consider Appwrite Cloud for better global performance
- Comes with built-in CDN
- Better connection pooling

## Immediate Workarounds Applied ✅

1. ✅ **Increased timeout**: 30s → 60s
2. ✅ **Reduced retries**: 3 → 1 (to avoid 3-minute waits)
3. ✅ **Added database index**: Should help when connection is fast
4. ✅ **Fixed chat header**: Chat endpoint now has auth header

## What You Should Do Now

### Option A: Debug the Network (Recommended)

1. SSH into Coolify server
2. Run the diagnostic commands above
3. Find where the slowness is
4. Fix the network issue

### Option B: Add Caching (Quick Win)

Implement backend caching for slow queries. This will make subsequent requests instant.

### Option C: Accept the Slowness (Temporary)

The increased timeout (60s) means queries will eventually complete. Users will just have to wait longer on first page load.

## Expected Behavior After Network Fix

If network is fixed:
```
📋 Listing documents from case_types with 1 queries
✅ Found 4 documents (total: 4)  // Should be < 2s
✅ GET /api/games/cases - 200 (1500ms)
```

## Current Behavior (With Slow Network)

```
📋 Listing documents from case_types with 1 queries
⚠️  Attempt 1/1 failed, retrying: Operation timeout  // 60s timeout
❌ GET /api/games/cases - 502 (60000ms)
```

---

## Summary

**Auth is 100% working!** ✅

The remaining issue is **network performance between Coolify and Appwrite**, causing 30-60 second query times for simple 4-document queries that should take < 1 second.

**Next steps:**
1. Debug network connection from Coolify to Appwrite
2. Or implement caching for slow queries
3. Redeploy with the fixes I just made (60s timeout, chat header fix)

The slowness is infrastructure-related, not code-related.

