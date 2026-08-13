---
title: "Redis/Dragonfly Caching"
audience: developer
layer: backend
status: stable
tags: [redis, caching, dragonfly, performance, optimization]
last_updated: 08/07/2026
---

# Redis/Dragonfly Caching

## Purpose and Context
This document explains the implementation of high-performance caching using Dragonfly (Redis-compatible) to improve application response times and reduce database load in the Tarkov Casino project.

## Architecture Overview
The caching architecture includes:
- Dragonfly as the in-memory cache solution
- Redis-compatible client for seamless integration
- Automatic cache invalidation strategies
- Fallback mechanisms to database when cache unavailable
- Performance monitoring and metrics collection

## Technical Details
Key implementation aspects:
- Connection pooling for efficient resource usage
- Automatic pipelining for batch operations
- TTL (Time To Live) configuration for cache expiration
- Cache key naming conventions and structure
- Graceful degradation when cache is unavailable

## Requirements and Dependencies
- Dragonfly 1.0+ (Redis-compatible)
- Bun runtime (latest)
- TypeScript 5.9+

## Implementation Code Examples
```typescript
import { connect, RedisClientType } from 'redis';

let client: RedisClientType | null = null;

async function getRedisClient(): Promise<RedisClientType> {
  if (client) return client;
  client = await connect({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  return client;
}

// Set cache
const redis = await getRedisClient();
await redis.set('user:profile:123', JSON.stringify(profile), { EX: 300 });

// Get from cache
const cachedData = await redis.get('user:profile:123');
```

## Best Practices and Guidelines
- Implement proper cache key naming conventions
- Configure appropriate TTL values for different data types
- Use connection pooling to manage Redis connections efficiently
- Implement fallback to database when cache is unavailable
- Monitor cache hit rates and performance metrics

## Related Components
- [Database Operations](./database-README.md)
- [Frontend Architecture](../frontend/README.md)
- [Appwrite Integration Guide](./appwrite-README.md)

## Version History
- v0.1: Initial implementation with Dragonfly caching