# Redis Caching Guide

## Overview

This project uses **Dragonfly** (Redis-compatible) for high-performance caching with Bun's native Redis client. Dragonfly provides better performance, stability, and connection handling compared to standard Redis.

### Why Dragonfly?

- ⚡ **25x faster** than Redis in many benchmarks
- 🛡️ **Better connection stability** with Bun's native client
- 🔄 **100% Redis protocol compatible** - all Redis commands work
- 💪 **Multi-threaded** for better concurrency
- 🐛 **Fewer compatibility issues** with modern clients

---

## Architecture

### Service Layers

```
┌─────────────────────────────────────────────────────┐
│  Application Layer                                  │
│  (User Service, Game Logic, etc.)                   │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│  Cache Service (cache-service.ts)                   │
│  - High-level caching abstraction                   │
│  - User profiles, balances, statistics              │
│  - Leaderboards, counters, rate limiting            │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│  Redis Service (redis-service.ts)                   │
│  - Low-level Redis client wrapper                   │
│  - Connection management                            │
│  - Error handling & graceful fallback               │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│  Bun Native Redis Client                            │
│  - Native Bun implementation                        │
│  - Zero dependencies                                │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│  Dragonfly Server (Redis-compatible)                │
│  - In-memory datastore                              │
│  - Fast, stable, multi-threaded                     │
└─────────────────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

```bash
# Enable/disable Redis caching
REDIS_ENABLED=true

# Connection URL (recommended - single variable)
REDIS_URL=redis://default:PASSWORD@dragonfly-host:6379/0

# OR use individual components
REDIS_HOST=dragonfly-host
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0

# Cache TTL Configuration (seconds)
CACHE_USER_PROFILE_TTL=300    # 5 minutes
CACHE_BALANCE_TTL=60          # 1 minute
CACHE_LEADERBOARD_TTL=30      # 30 seconds
CACHE_STATS_TTL=120           # 2 minutes
```

### Connection URL Formats

```typescript
// With username and password (Dragonfly/Redis 6+ ACL)
redis://username:password@host:port/db

// With password only (traditional Redis)
redis://:password@host:port/db

// No authentication
redis://host:port/db

// TLS/SSL
rediss://username:password@host:port/db
```

---

## Usage Examples

### Using Cache Service (Recommended)

The `CacheService` provides high-level caching methods:

```typescript
import { CacheService } from '@/services/cache-service';

// ===== User Profile Caching =====

// Cache user profile
await CacheService.setUserProfile(userId, userProfile);

// Get cached profile
const profile = await CacheService.getUserProfile(userId);

// Invalidate profile cache
await CacheService.invalidateUserProfile(userId);

// ===== Balance Caching =====

// Cache user balance
await CacheService.setUserBalance(userId, 10000);

// Get cached balance
const balance = await CacheService.getUserBalance(userId);

// ===== Statistics Caching =====

// Cache user stats
await CacheService.setUserStats(userId, stats);

// Get cached stats
const stats = await CacheService.getUserStats(userId);

// ===== Bulk Invalidation =====

// Invalidate all cache entries for a user
await CacheService.invalidateUser(userId);

// ===== Counters =====

// Online players
await CacheService.incrementOnlinePlayers();
await CacheService.decrementOnlinePlayers();
const count = await CacheService.getOnlinePlayers();

// Active games
await CacheService.incrementActiveGames();
const active = await CacheService.getActiveGames();

// ===== Rate Limiting =====

// Check rate limit
const allowed = await CacheService.checkRateLimit(
  userId,
  'daily_bonus',
  1,      // limit: 1 per window
  86400   // window: 24 hours
);

if (!allowed) {
  throw new Error('Rate limit exceeded');
}

// ===== Generic Caching =====

// Set any value with TTL
await CacheService.set('my-key', { data: 'value' }, 3600);

// Get cached value
const value = await CacheService.get('my-key');

// Delete key
await CacheService.del('my-key');

// Check if cache is available
if (CacheService.isAvailable()) {
  console.log('Redis is connected');
}
```

### Using Redis Service Directly (Advanced)

For low-level Redis operations:

```typescript
import { redisService } from '@/services/redis-service';

// Basic operations
await redisService.set('key', 'value', 3600);
const value = await redisService.get('key');
await redisService.del('key');

// Counters
const count = await redisService.incr('counter');
await redisService.decr('counter');

// Pattern deletion
const deleted = await redisService.delPattern('user:*:cache');

// Expiration
await redisService.expire('key', 300);

// Sorted sets (leaderboards)
await redisService.zadd('leaderboard', 1000, 'userId');
const top10 = await redisService.zrevrange('leaderboard', 0, 9, true);
const rank = await redisService.zrevrank('leaderboard', 'userId');
const score = await redisService.zscore('leaderboard', 'userId');

// Connection status
const status = redisService.getStatus();
console.log(`Connected: ${status.connected}`);
console.log(`Buffered: ${status.bufferedAmount} bytes`);
```

---

## Cache Patterns

### 1. Cache-Aside Pattern (Used in this project)

```typescript
async function getUserProfile(userId: string) {
  // 1. Try cache first
  const cached = await CacheService.getUserProfile(userId);
  if (cached) {
    return cached;
  }

  // 2. Cache miss - fetch from database
  const profile = await database.getUser(userId);

  // 3. Update cache for next request
  await CacheService.setUserProfile(userId, profile);

  return profile;
}
```

### 2. Write-Through Pattern

```typescript
async function updateUserBalance(userId: string, newBalance: number) {
  // 1. Update database
  await database.updateBalance(userId, newBalance);

  // 2. Update cache immediately
  await CacheService.setUserBalance(userId, newBalance);

  return newBalance;
}
```

### 3. Cache Invalidation Pattern

```typescript
async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  // 1. Update database
  const updated = await database.updateUser(userId, updates);

  // 2. Invalidate cache to force refresh
  await CacheService.invalidateUserProfile(userId);

  return updated;
}
```

### 4. Rate Limiting Pattern

```typescript
async function claimDailyBonus(userId: string) {
  // Check rate limit (1 claim per 24 hours)
  const allowed = await CacheService.checkRateLimit(
    userId,
    'daily_bonus',
    1,
    86400
  );

  if (!allowed) {
    throw new Error('Daily bonus already claimed');
  }

  // Process bonus...
  return bonus;
}
```

---

## Cache Keys Structure

The project uses consistent key prefixes for organization:

```
user:profile:{userId}        # User profile data
user:balance:{userId}        # User balance
user:stats:{userId}          # User statistics
counters:players_online      # Active players count
counters:active_games        # Active games count
ratelimit:{action}:{userId}  # Rate limit counters
leaderboard:global           # Global leaderboard (sorted set)
game:state:{gameId}          # Active game state
```

---

## Performance Optimization

### Automatic Pipelining

Bun's Redis client automatically pipelines commands for better performance:

```typescript
// These commands are automatically pipelined
const [profile, balance, stats] = await Promise.all([
  CacheService.getUserProfile(userId),
  CacheService.getUserBalance(userId),
  CacheService.getUserStats(userId),
]);
```

### Connection Pooling

The Redis service maintains a single persistent connection that's reused across all operations:

```typescript
// Single connection, multiple operations
await redisService.set('key1', 'value1');
await redisService.set('key2', 'value2');
await redisService.set('key3', 'value3');
// All use the same underlying connection
```

---

## Error Handling

The Redis service implements graceful degradation:

### Automatic Fallback

```typescript
// If Redis is unavailable, operations return null/false
const cached = await CacheService.getUserProfile(userId);
// Returns null if Redis is down - no error thrown!

if (!cached) {
  // Fallback to database
  const profile = await database.getUser(userId);
}
```

### Connection Recovery

```typescript
// Automatic reconnection with exponential backoff
// - Retry 1: 1 second delay
// - Retry 2: 2 seconds delay
// - Retry 3: 4 seconds delay
// - Retry 4: 8 seconds delay
// - Retry 5: 16 seconds delay
// After 5 failed attempts, Redis is considered unavailable
```

### Error Detection

The service detects and handles specific Redis errors:

```typescript
try {
  await redisService.get(key);
} catch (error) {
  if (error.code === 'ERR_REDIS_CONNECTION_CLOSED') {
    // Triggers automatic reconnection
  } else if (error.code === 'ERR_REDIS_AUTHENTICATION_FAILED') {
    // Authentication issue
  }
}
```

---

## Monitoring

### Health Checks

Check Redis status via monitoring endpoints:

```bash
# Basic health
curl http://localhost:3000/api/health

# Detailed health (includes Redis status)
curl http://localhost:3000/api/health/detailed
```

### Cache Statistics

```typescript
// Get cache statistics
const stats = await CacheService.getStats();
console.log(stats);
/* Output:
{
  available: true,
  connected: true,
  onlinePlayers: 42,
  activeGames: 15
}
*/
```

### Connection Status

```typescript
// Check if Redis is available
if (CacheService.isAvailable()) {
  console.log('✅ Redis is connected and ready');
} else {
  console.warn('⚠️ Redis is unavailable - using database fallback');
}

// Get detailed connection status
const status = redisService.getStatus();
console.log(`Connected: ${status.connected}`);
console.log(`Buffered: ${status.bufferedAmount} bytes`);
```

---

## Development & Testing

### Local Development

For local development, you can run Dragonfly with Docker:

```bash
# Using Docker
docker run -d \
  --name dragonfly \
  -p 6379:6379 \
  --ulimit memlock=-1 \
  docker.dragonflydb.io/dragonflydb/dragonfly

# Or with password
docker run -d \
  --name dragonfly \
  -p 6379:6379 \
  --ulimit memlock=-1 \
  docker.dragonflydb.io/dragonflydb/dragonfly \
  --requirepass your-password
```

Then set in `.env`:
```bash
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password  # if using password
REDIS_DB=0
```

### Testing Without Redis

To test without Redis (fallback mode):

```bash
# Disable Redis in environment
REDIS_ENABLED=false

# Run application
bun run dev
```

All cache operations will gracefully return null/false and the app will use database queries.

### Flushing Cache

```typescript
// DANGER: This deletes ALL cache data!
// Only use in development or testing
await redisService.flushDb();
```

---

## Production Deployment

### Coolify Setup

1. **Add Dragonfly service** in Coolify:
   - Service: Dragonfly
   - Image: `docker.dragonflydb.io/dragonflydb/dragonfly`
   - Port: `6379`
   - Set password in service configuration

2. **Link to your application**:
   - Coolify will create a network connection
   - Use the service hostname (usually `dragonfly` or the container name)

3. **Set environment variables** in your app:
   ```bash
   REDIS_ENABLED=true
   REDIS_URL=redis://default:PASSWORD@dragonfly-service-name:6379/0
   ```

4. **Redeploy** your application

### Docker Compose (Alternative)

```yaml
services:
  dragonfly:
    image: docker.dragonflydb.io/dragonflydb/dragonfly
    container_name: dragonfly
    ports:
      - "6379:6379"
    ulimits:
      memlock: -1
    volumes:
      - dragonfly-data:/data
    command:
      - --requirepass
      - ${REDIS_PASSWORD}
    networks:
      - app-network

  app:
    build: .
    environment:
      REDIS_URL: redis://default:${REDIS_PASSWORD}@dragonfly:6379/0
    depends_on:
      - dragonfly
    networks:
      - app-network

volumes:
  dragonfly-data:

networks:
  app-network:
```

---

## Troubleshooting

### Connection Issues

**Problem:** `ERR_REDIS_CONNECTION_CLOSED`

**Solutions:**

1. **Check connection URL format:**
   ```bash
   # With ACL username (Dragonfly/Redis 6+)
   redis://default:password@host:6379/0
   
   # Without username (traditional)
   redis://:password@host:6379/0
   ```

2. **Verify Dragonfly is running:**
   ```bash
   docker ps | grep dragonfly
   ```

3. **Test connectivity from app container:**
   ```bash
   docker exec <app-container> nc -zv dragonfly 6379
   ```

4. **Check authentication:**
   ```bash
   docker exec <dragonfly-container> redis-cli -a PASSWORD ping
   # Should return: PONG
   ```

### Performance Issues

**Problem:** Slow cache operations

**Solutions:**

1. **Enable automatic pipelining** (enabled by default):
   ```typescript
   // Batch operations automatically
   const results = await Promise.all([
     redisService.get('key1'),
     redisService.get('key2'),
     redisService.get('key3'),
   ]);
   ```

2. **Check connection status:**
   ```typescript
   const status = redisService.getStatus();
   console.log(`Buffered: ${status.bufferedAmount}`);
   // High bufferedAmount indicates network issues
   ```

3. **Adjust TTL values** in environment variables to reduce cache misses

### Memory Issues

**Problem:** Redis/Dragonfly using too much memory

**Solutions:**

1. **Check TTL values** - shorter TTLs = less memory usage
2. **Monitor key count:**
   ```bash
   docker exec dragonfly redis-cli DBSIZE
   ```

3. **Set memory limit** in Dragonfly:
   ```bash
   docker run -d \
     docker.dragonflydb.io/dragonflydb/dragonfly \
     --maxmemory 512mb
   ```

---

## Best Practices

### ✅ Do's

1. **Always check cache availability** before critical operations:
   ```typescript
   if (CacheService.isAvailable()) {
     await CacheService.setUserProfile(userId, profile);
   }
   ```

2. **Use appropriate TTLs** for different data types:
   - Frequently changing data (balances): 60s
   - Stable data (profiles): 300s
   - Real-time data (leaderboards): 30s

3. **Implement cache invalidation** when data changes:
   ```typescript
   await database.updateUser(userId, updates);
   await CacheService.invalidateUserProfile(userId);
   ```

4. **Use key prefixes** for organization:
   ```typescript
   const key = `user:profile:${userId}`;
   ```

5. **Handle cache misses gracefully**:
   ```typescript
   const cached = await CacheService.get(key);
   return cached ?? await fetchFromDatabase();
   ```

### ❌ Don'ts

1. **Don't rely solely on cache** - always have database fallback
2. **Don't cache sensitive data** without encryption
3. **Don't use cache for critical data** that must be 100% accurate
4. **Don't forget to invalidate** when data changes
5. **Don't set infinite TTL** - always expire cached data

---

## Common Patterns

### Pattern 1: Lazy Loading

```typescript
async function getUserProfile(userId: string) {
  // Check cache
  let profile = await CacheService.getUserProfile(userId);
  
  if (!profile) {
    // Cache miss - load from database
    console.log(`🔄 Cache MISS: user:profile:${userId}, fetching...`);
    profile = await database.getUser(userId);
    
    // Update cache
    if (profile) {
      await CacheService.setUserProfile(userId, profile);
    }
  } else {
    console.log(`📦 Cache HIT: user:profile:${userId}`);
  }
  
  return profile;
}
```

### Pattern 2: Write-Through Cache

```typescript
async function updateBalance(userId: string, amount: number) {
  // Update database first
  const updated = await database.updateBalance(userId, amount);
  
  // Then update cache
  await CacheService.setUserBalance(userId, updated.balance);
  
  return updated;
}
```

### Pattern 3: Cache Warming

```typescript
async function warmUserCache(userId: string) {
  // Preload frequently accessed data
  const [profile, balance, stats] = await Promise.all([
    database.getUser(userId),
    database.getBalance(userId),
    database.getStats(userId),
  ]);
  
  // Store in cache
  await Promise.all([
    CacheService.setUserProfile(userId, profile),
    CacheService.setUserBalance(userId, balance),
    CacheService.setUserStats(userId, stats),
  ]);
}
```

### Pattern 4: Distributed Locking

```typescript
async function acquireLock(lockKey: string, ttl: number = 10): Promise<boolean> {
  const lockValue = crypto.randomUUID();
  const acquired = await redisService.set(
    `lock:${lockKey}`,
    lockValue,
    ttl
  );
  
  return acquired;
}

async function releaseLock(lockKey: string): Promise<void> {
  await redisService.del(`lock:${lockKey}`);
}
```

---

## API Reference

### CacheService Methods

#### User Profile
- `setUserProfile(userId, profile)` - Cache user profile (5min TTL)
- `getUserProfile(userId)` - Get cached profile
- `invalidateUserProfile(userId)` - Remove profile from cache

#### User Balance
- `setUserBalance(userId, balance)` - Cache balance (1min TTL)
- `getUserBalance(userId)` - Get cached balance
- `invalidateUserBalance(userId)` - Remove balance from cache

#### User Statistics
- `setUserStats(userId, stats)` - Cache stats (2min TTL)
- `getUserStats(userId)` - Get cached stats
- `invalidateUserStats(userId)` - Remove stats from cache

#### Bulk Operations
- `invalidateUser(userId)` - Clear all cache for user

#### Counters
- `incrementOnlinePlayers()` - Increment online player count
- `decrementOnlinePlayers()` - Decrement online player count
- `getOnlinePlayers()` - Get current online players
- `incrementActiveGames()` - Increment active games
- `decrementActiveGames()` - Decrement active games
- `getActiveGames()` - Get active games count

#### Rate Limiting
- `checkRateLimit(userId, action, limit, windowSeconds)` - Check/increment rate limit
- `getRateLimitRemaining(userId, action, limit)` - Get remaining quota

#### Generic
- `set(key, value, ttl?)` - Set any value
- `get(key)` - Get any value
- `del(key)` - Delete key
- `isAvailable()` - Check Redis availability
- `getStats()` - Get cache statistics

### RedisService Methods

#### Basic Operations
- `get(key)` - Get value
- `set(key, value, ttl?)` - Set value with optional TTL
- `del(key)` - Delete key
- `delPattern(pattern)` - Delete keys matching pattern

#### Counters
- `incr(key)` - Increment counter
- `decr(key)` - Decrement counter

#### Expiration
- `expire(key, seconds)` - Set expiration

#### Sorted Sets (Leaderboards)
- `zadd(key, score, member)` - Add to sorted set
- `zrevrange(key, start, stop, withScores?)` - Get top members
- `zrevrank(key, member)` - Get member rank
- `zscore(key, member)` - Get member score

#### System
- `isAvailable()` - Check if connected
- `getStatus()` - Get connection details
- `close()` - Close connection
- `flushDb()` - Clear all keys (DANGER!)

---

## Migration Notes

### From Redis to Dragonfly

If you're migrating from Redis to Dragonfly:

1. **No code changes needed** - Dragonfly is 100% Redis protocol compatible
2. **Update connection URL** to point to Dragonfly
3. **Performance boost** - expect 2-5x faster operations
4. **Better stability** - especially with Bun's native client

### Disabling Redis

To disable Redis and use database-only mode:

```bash
REDIS_ENABLED=false
```

The application will:
- ✅ Continue working normally
- ✅ Use database for all queries
- ⚠️ Slightly slower response times
- ⚠️ Higher database load

---

## Known Issues

### Bun Redis Client Issues

1. **Issue #20836:** Auto-reconnect doesn't work reliably
   - **Workaround:** Use Dragonfly (better connection handling)
   - **Our fix:** Disabled `idleTimeout`, improved error handling

2. **Issue #21673:** Connection failures with special characters in password
   - **Workaround:** URL-encode passwords or use environment variables

### Dragonfly Advantages

Using Dragonfly instead of Redis resolves:
- ✅ Connection stability issues with Bun client
- ✅ Better multi-threaded performance
- ✅ Lower memory usage
- ✅ Faster command execution

---

## Resources

### Internal Documentation
- [Redis Service Implementation](../../packages/backend/src/services/redis-service.ts)
- [Cache Service Implementation](../../packages/backend/src/services/cache-service.ts)
- [Environment Configuration](../../packages/backend/src/config/env.ts)

### External Resources
- [Bun Redis Documentation](https://bun.sh/docs/api/redis)
- [Dragonfly Documentation](https://www.dragonflydb.io/docs)
- [Redis Commands Reference](https://redis.io/commands/)
- [Bun Issue #20836](https://github.com/oven-sh/bun/issues/20836)

### Dragonfly vs Redis
- [Performance Benchmarks](https://www.dragonflydb.io/blog/dragonfly-vs-redis)
- [Migration Guide](https://www.dragonflydb.io/docs/getting-started)
- [Docker Setup](https://www.dragonflydb.io/docs/getting-started/docker)

---

## Support

For Redis/Dragonfly issues:

1. **Check logs** for Redis connection messages
2. **Verify environment variables** are set correctly
3. **Test connectivity** between containers
4. **Consult this documentation** for common patterns
5. **Check Bun GitHub issues** for known problems

Remember: The application is designed to work gracefully without Redis, so disabling it temporarily is always a safe option while debugging.

---

**Last Updated:** 2025-10-12  
**Bun Version:** 1.3+  
**Dragonfly Version:** Latest  
**Status:** Production Ready ✅

