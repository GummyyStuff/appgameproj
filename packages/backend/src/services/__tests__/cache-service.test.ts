/**
 * Cache Service Tests
 * ===================
 * 
 * Tests for high-level caching abstraction
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { CacheService } from '../cache-service';
import { redisService } from '../redis-service';
import type { UserProfile } from '../../config/collections';

describe('CacheService', () => {
  const testUserId = 'test-user-123';
  
  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Cleanup test data
    if (CacheService.isAvailable()) {
      await CacheService.invalidateUser(testUserId);
    }
  });

  test('should check if cache is available', () => {
    const available = CacheService.isAvailable();
    expect(typeof available).toBe('boolean');
    console.log('Cache available:', available);
  });

  test('should get cache statistics', async () => {
    const stats = await CacheService.getStats();
    
    expect(stats).toHaveProperty('available');
    expect(stats).toHaveProperty('connected');
    expect(stats).toHaveProperty('onlinePlayers');
    expect(stats).toHaveProperty('activeGames');
    
    console.log('Cache stats:', stats);
  });

  if (process.env.REDIS_ENABLED !== 'false') {
    test('should cache and retrieve user profile', async () => {
      if (!CacheService.isAvailable()) {
        console.log('⚠️  Cache not available, skipping test');
        return;
      }

      const mockProfile: UserProfile = {
        $id: 'profile-id-123',
        userId: testUserId,
        username: 'testplayer',
        displayName: 'Test Player',
        balance: 5000,
        totalWagered: 1000,
        totalWon: 1200,
        gamesPlayed: 50,
        isModerator: false,
        avatarPath: 'default.png',
        chatRulesVersion: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Cache profile
      await CacheService.setUserProfile(testUserId, mockProfile);
      
      // Retrieve profile
      const cached = await CacheService.getUserProfile(testUserId);
      expect(cached).not.toBeNull();
      expect(cached?.username).toBe('testplayer');
      expect(cached?.balance).toBe(5000);
      
      console.log('✅ User profile cached successfully');
    });

    test('should cache and retrieve user balance', async () => {
      if (!CacheService.isAvailable()) {
        console.log('⚠️  Cache not available, skipping test');
        return;
      }

      const balance = 12500;
      
      await CacheService.setUserBalance(testUserId, balance);
      
      const cached = await CacheService.getUserBalance(testUserId);
      expect(cached).toBe(balance);
      
      console.log('✅ User balance cached successfully');
    });

    test('should invalidate user profile cache', async () => {
      if (!CacheService.isAvailable()) {
        console.log('⚠️  Cache not available, skipping test');
        return;
      }

      // Set profile
      const mockProfile: Partial<UserProfile> = {
        userId: testUserId,
        username: 'testuser',
        balance: 1000,
      };
      
      await CacheService.setUserProfile(testUserId, mockProfile as UserProfile);
      
      // Verify it's cached
      let cached = await CacheService.getUserProfile(testUserId);
      expect(cached).not.toBeNull();
      
      // Invalidate
      await CacheService.invalidateUserProfile(testUserId);
      
      // Should be null now
      cached = await CacheService.getUserProfile(testUserId);
      expect(cached).toBeNull();
      
      console.log('✅ Cache invalidation working');
    });

    test('should track online players counter', async () => {
      if (!CacheService.isAvailable()) {
        console.log('⚠️  Cache not available, skipping test');
        return;
      }

      const initial = await CacheService.getOnlinePlayers();
      
      await CacheService.incrementOnlinePlayers();
      await CacheService.incrementOnlinePlayers();
      
      const afterInc = await CacheService.getOnlinePlayers();
      expect(afterInc).toBe(initial + 2);
      
      await CacheService.decrementOnlinePlayers();
      
      const afterDec = await CacheService.getOnlinePlayers();
      expect(afterDec).toBe(initial + 1);
      
      console.log('✅ Online players counter working');
    });

    test('should track active games counter', async () => {
      if (!CacheService.isAvailable()) {
        console.log('⚠️  Cache not available, skipping test');
        return;
      }

      const initial = await CacheService.getActiveGames();
      
      await CacheService.incrementActiveGames();
      const after = await CacheService.getActiveGames();
      
      expect(after).toBe(initial + 1);
      
      console.log('✅ Active games counter working');
    });

    test('should handle rate limiting', async () => {
      if (!CacheService.isAvailable()) {
        console.log('⚠️  Cache not available, skipping test');
        return;
      }

      const userId = 'rate-limit-test-user';
      const action = 'test-action';
      const limit = 3;
      const window = 60;

      // First 3 requests should pass
      const req1 = await CacheService.checkRateLimit(userId, action, limit, window);
      expect(req1).toBe(true);
      
      const req2 = await CacheService.checkRateLimit(userId, action, limit, window);
      expect(req2).toBe(true);
      
      const req3 = await CacheService.checkRateLimit(userId, action, limit, window);
      expect(req3).toBe(true);
      
      // 4th request should be rate limited
      const req4 = await CacheService.checkRateLimit(userId, action, limit, window);
      expect(req4).toBe(false);
      
      // Check remaining
      const remaining = await CacheService.getRateLimitRemaining(userId, action, limit);
      expect(remaining).toBe(0);
      
      console.log('✅ Rate limiting working');
    });

    test('should cache user statistics', async () => {
      if (!CacheService.isAvailable()) {
        console.log('⚠️  Cache not available, skipping test');
        return;
      }

      const stats = {
        total_wagered: 5000,
        total_won: 6000,
        games_played: 100,
        net_profit: 1000,
      };

      await CacheService.setUserStats(testUserId, stats);
      
      const cached = await CacheService.getUserStats(testUserId);
      expect(cached).not.toBeNull();
      expect(cached.total_wagered).toBe(5000);
      expect(cached.net_profit).toBe(1000);
      
      console.log('✅ User stats cached successfully');
    });

    test('should invalidate all user cache entries', async () => {
      if (!CacheService.isAvailable()) {
        console.log('⚠️  Cache not available, skipping test');
        return;
      }

      const userId = 'bulk-invalidate-test';
      
      // Set multiple cache entries
      await CacheService.setUserBalance(userId, 1000);
      await CacheService.setUserStats(userId, { games: 10 });
      
      // Invalidate all
      await CacheService.invalidateUser(userId);
      
      // All should be null
      const balance = await CacheService.getUserBalance(userId);
      const stats = await CacheService.getUserStats(userId);
      
      expect(balance).toBeNull();
      expect(stats).toBeNull();
      
      console.log('✅ Bulk cache invalidation working');
    });
  }

  test('should handle operations gracefully when cache unavailable', async () => {
    if (!CacheService.isAvailable()) {
      // Should return null/false without errors
      const profile = await CacheService.getUserProfile('any-user');
      expect(profile).toBeNull();
      
      const balance = await CacheService.getUserBalance('any-user');
      expect(balance).toBeNull();
      
      console.log('✅ Graceful fallback working for CacheService');
    }
  });
});

