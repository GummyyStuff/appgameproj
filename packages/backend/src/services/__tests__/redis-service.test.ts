/**
 * Redis Service Tests
 * ===================
 * 
 * Tests for Bun 1.3 native Redis client wrapper
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { redisService } from '../redis-service';

describe('RedisService', () => {
  beforeAll(async () => {
    // Wait for Redis to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Clean up test keys
    if (redisService.isAvailable()) {
      await redisService.delPattern('test:*');
    }
  });

  test('should check if Redis is available', () => {
    const available = redisService.isAvailable();
    console.log('Redis available:', available);
    
    // Test passes whether Redis is available or not
    expect(typeof available).toBe('boolean');
  });

  test('should get status information', () => {
    const status = redisService.getStatus();
    
    expect(status).toHaveProperty('connected');
    expect(typeof status.connected).toBe('boolean');
    
    console.log('Redis status:', status);
  });

  // Only run these tests if Redis is available
  if (process.env.REDIS_ENABLED !== 'false') {
    test('should set and get a value', async () => {
      if (!redisService.isAvailable()) {
        console.log('⚠️  Redis not available, skipping test');
        return;
      }

      const key = 'test:simple';
      const value = 'Hello Redis!';

      const setResult = await redisService.set(key, value);
      expect(setResult).toBe(true);

      const getValue = await redisService.get(key);
      expect(getValue).toBe(value);

      // Cleanup
      await redisService.del(key);
    });

    test('should set value with TTL', async () => {
      if (!redisService.isAvailable()) {
        console.log('⚠️  Redis not available, skipping test');
        return;
      }

      const key = 'test:ttl';
      const value = 'expires soon';
      const ttl = 2; // 2 seconds

      await redisService.set(key, value, ttl);
      
      const getValue = await redisService.get(key);
      expect(getValue).toBe(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const expiredValue = await redisService.get(key);
      expect(expiredValue).toBeNull();
    });

    test('should delete a key', async () => {
      if (!redisService.isAvailable()) {
        console.log('⚠️  Redis not available, skipping test');
        return;
      }

      const key = 'test:delete';
      await redisService.set(key, 'delete me');
      
      const delResult = await redisService.del(key);
      expect(delResult).toBe(true);
      
      const getValue = await redisService.get(key);
      expect(getValue).toBeNull();
    });

    test('should increment a counter', async () => {
      if (!redisService.isAvailable()) {
        console.log('⚠️  Redis not available, skipping test');
        return;
      }

      const key = 'test:counter';
      
      const count1 = await redisService.incr(key);
      expect(count1).toBe(1);
      
      const count2 = await redisService.incr(key);
      expect(count2).toBe(2);
      
      const count3 = await redisService.incr(key);
      expect(count3).toBe(3);
      
      // Cleanup
      await redisService.del(key);
    });

    test('should decrement a counter', async () => {
      if (!redisService.isAvailable()) {
        console.log('⚠️  Redis not available, skipping test');
        return;
      }

      const key = 'test:decr';
      
      // Set initial value
      await redisService.set(key, '10');
      
      const count1 = await redisService.decr(key);
      expect(count1).toBe(9);
      
      const count2 = await redisService.decr(key);
      expect(count2).toBe(8);
      
      // Cleanup
      await redisService.del(key);
    });

    test('should handle sorted sets (leaderboard)', async () => {
      if (!redisService.isAvailable()) {
        console.log('⚠️  Redis not available, skipping test');
        return;
      }

      const key = 'test:leaderboard';
      
      // Add scores
      await redisService.zadd(key, 100, 'player1');
      await redisService.zadd(key, 200, 'player2');
      await redisService.zadd(key, 150, 'player3');
      
      // Get top 3 (descending)
      const top3 = await redisService.zrevrange(key, 0, 2, true);
      expect(top3.length).toBe(6); // [player2, 200, player3, 150, player1, 100]
      expect(top3[0]).toBe('player2'); // Highest score
      expect(top3[1]).toBe('200');
      
      // Get rank of player
      const rank = await redisService.zrevrank(key, 'player2');
      expect(rank).toBe(1); // 1st place (1-based)
      
      // Get score
      const score = await redisService.zscore(key, 'player2');
      expect(score).toBe(200);
      
      // Cleanup
      await redisService.del(key);
    });

    test('should delete keys by pattern', async () => {
      if (!redisService.isAvailable()) {
        console.log('⚠️  Redis not available, skipping test');
        return;
      }

      // Create multiple test keys
      await redisService.set('test:pattern:1', 'value1');
      await redisService.set('test:pattern:2', 'value2');
      await redisService.set('test:pattern:3', 'value3');
      
      // Delete all matching
      const deleted = await redisService.delPattern('test:pattern:*');
      expect(deleted).toBeGreaterThanOrEqual(3);
      
      // Verify deletion
      const val1 = await redisService.get('test:pattern:1');
      expect(val1).toBeNull();
    });
  }

  test('should gracefully handle operations when Redis is unavailable', async () => {
    // These should return false/null without throwing
    if (!redisService.isAvailable()) {
      const getValue = await redisService.get('any:key');
      expect(getValue).toBeNull();
      
      const setResult = await redisService.set('any:key', 'value');
      expect(setResult).toBe(false);
      
      const delResult = await redisService.del('any:key');
      expect(delResult).toBe(false);
      
      console.log('✅ Graceful fallback working');
    }
  });
});

