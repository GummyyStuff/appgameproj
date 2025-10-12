# Redis/Dragonfly Quick Reference

## TL;DR

```typescript
import { CacheService } from '@/services/cache-service';

// Cache user data
await CacheService.setUserProfile(userId, profile);
const profile = await CacheService.getUserProfile(userId);

// Cache works? Great! Cache down? No problem - auto-fallback to database
```

---

## Quick Setup

### Environment Variable (One Line)
```bash
REDIS_URL=redis://default:PASSWORD@dragonfly:6379/0
```

### Docker Command (Local Dev)
```bash
docker run -d --name dragonfly -p 6379:6379 --ulimit memlock=-1 docker.dragonflydb.io/dragonflydb/dragonfly
```

---

## Common Operations

### User Caching
```typescript
// Profile
await CacheService.setUserProfile(userId, profile);
const profile = await CacheService.getUserProfile(userId);
await CacheService.invalidateUserProfile(userId);

// Balance
await CacheService.setUserBalance(userId, 10000);
const balance = await CacheService.getUserBalance(userId);

// Clear all user cache
await CacheService.invalidateUser(userId);
```

### Counters
```typescript
await CacheService.incrementOnlinePlayers();
await CacheService.decrementOnlinePlayers();
const count = await CacheService.getOnlinePlayers();
```

### Rate Limiting
```typescript
const allowed = await CacheService.checkRateLimit(
  userId, 
  'action_name', 
  limit,      // e.g., 1
  window      // e.g., 86400 (24h)
);
```

### Generic Cache
```typescript
await CacheService.set('key', value, ttl);
const value = await CacheService.get('key');
await CacheService.del('key');
```

---

## Cache TTLs

| Data Type | TTL | Key Pattern |
|-----------|-----|-------------|
| User Profile | 5 min (300s) | `user:profile:{userId}` |
| User Balance | 1 min (60s) | `user:balance:{userId}` |
| User Stats | 2 min (120s) | `user:stats:{userId}` |
| Leaderboards | 30s | `leaderboard:*` |
| Rate Limits | Variable | `ratelimit:{action}:{userId}` |

---

## Health Check

```bash
curl http://localhost:3000/api/health/detailed
```

Look for:
```json
{
  "cache": {
    "available": true,
    "connected": true,
    "onlinePlayers": 42
  }
}
```

---

## Troubleshooting One-Liners

```bash
# Check if Dragonfly is running
docker ps | grep dragonfly

# Test connection
docker exec dragonfly redis-cli -a PASSWORD ping

# Check what env vars the app has
docker exec <app-container> env | grep REDIS

# View app logs
docker logs <app-container> | grep -i redis

# Disable cache temporarily
# In Coolify: REDIS_ENABLED=false
```

---

## When to Invalidate Cache

```typescript
// After database updates
await database.updateUser(userId, updates);
await CacheService.invalidateUserProfile(userId);

// After balance changes
await database.updateBalance(userId, newBalance);
await CacheService.invalidateUserBalance(userId);

// Or clear everything for user
await CacheService.invalidateUser(userId);
```

---

## Performance Tips

1. **Batch operations:**
   ```typescript
   const [profile, balance, stats] = await Promise.all([
     CacheService.getUserProfile(userId),
     CacheService.getUserBalance(userId),
     CacheService.getUserStats(userId),
   ]);
   ```

2. **Check availability before heavy caching:**
   ```typescript
   if (CacheService.isAvailable()) {
     await CacheService.setUserStats(userId, stats);
   }
   ```

3. **Let it fail gracefully:**
   ```typescript
   // Don't await cache operations if not critical
   CacheService.setUserProfile(userId, profile).catch(() => {});
   ```

---

## Error Codes

| Error Code | Meaning | Action |
|------------|---------|--------|
| `ERR_REDIS_CONNECTION_CLOSED` | Connection dropped | Auto-reconnects, operations return null |
| `ERR_REDIS_AUTHENTICATION_FAILED` | Wrong password | Check REDIS_URL |
| No error, returns null/false | Redis unavailable | Uses database fallback |

---

## Files to Reference

- `packages/backend/src/services/redis-service.ts` - Low-level Redis client
- `packages/backend/src/services/cache-service.ts` - High-level caching API
- `packages/backend/src/config/env.ts` - Environment configuration
- `docs/backend/redis-README.md` - Full documentation

---

**Remember:** This app is designed to work **with or without** Redis. If Redis/Dragonfly is down, the app automatically falls back to the database. No crashes! 🛡️

