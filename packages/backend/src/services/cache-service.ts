/**
 * Cache Service
 * =============
 * 
 * High-level caching abstraction for casino data
 * Uses Redis for super-fast access to frequently-used data
 * 
 * Cache Strategy:
 * - User Profiles: 5 minute TTL (updated on balance changes)
 * - Balances: 1 minute TTL (frequently updated)
 * - Statistics: 2 minute TTL (computed values)
 * - Leaderboards: 30 second TTL (real-time rankings)
 * 
 * All methods gracefully fall back if Redis is unavailable
 */

import { redisService } from './redis-service';
import { config } from '../config/env';
import type { UserProfile } from '../config/collections';

// Cache key prefixes for organization
const KEYS = {
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_BALANCE: (userId: string) => `user:balance:${userId}`,
  USER_STATS: (userId: string) => `user:stats:${userId}`,
  USER_ALL: (userId: string) => `user:*:${userId}`,
  
  // Counters
  ONLINE_PLAYERS: 'counters:players_online',
  ACTIVE_GAMES: 'counters:active_games',
  
  // Rate limiting
  RATE_LIMIT: (userId: string, action: string) => `ratelimit:${action}:${userId}`,
};

export class CacheService {
  // ===================
  // USER PROFILE CACHING
  // ===================

  /**
   * Cache user profile
   */
  static async setUserProfile(userId: string, profile: UserProfile): Promise<void> {
    const key = KEYS.USER_PROFILE(userId);
    const value = JSON.stringify(profile);
    const ttl = config.cache.userProfileTtl;
    
    await redisService.set(key, value, ttl);
  }

  /**
   * Get cached user profile
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const key = KEYS.USER_PROFILE(userId);
    const cached = await redisService.get(key);
    
    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached) as UserProfile;
    } catch (error) {
      console.error('Error parsing cached user profile:', error);
      // Invalidate bad cache
      await redisService.del(key);
      return null;
    }
  }

  /**
   * Invalidate user profile cache
   */
  static async invalidateUserProfile(userId: string): Promise<void> {
    const key = KEYS.USER_PROFILE(userId);
    await redisService.del(key);
  }

  // ===================
  // USER BALANCE CACHING
  // ===================

  /**
   * Cache user balance
   */
  static async setUserBalance(userId: string, balance: number): Promise<void> {
    const key = KEYS.USER_BALANCE(userId);
    const ttl = config.cache.balanceTtl;
    
    await redisService.set(key, balance.toString(), ttl);
  }

  /**
   * Get cached user balance
   */
  static async getUserBalance(userId: string): Promise<number | null> {
    const key = KEYS.USER_BALANCE(userId);
    const cached = await redisService.get(key);
    
    if (!cached) {
      return null;
    }

    const balance = parseFloat(cached);
    return isNaN(balance) ? null : balance;
  }

  /**
   * Invalidate user balance cache
   */
  static async invalidateUserBalance(userId: string): Promise<void> {
    const key = KEYS.USER_BALANCE(userId);
    await redisService.del(key);
  }

  // ===================
  // USER STATISTICS CACHING
  // ===================

  /**
   * Cache user statistics
   */
  static async setUserStats(userId: string, stats: any): Promise<void> {
    const key = KEYS.USER_STATS(userId);
    const value = JSON.stringify(stats);
    const ttl = config.cache.statsTtl;
    
    await redisService.set(key, value, ttl);
  }

  /**
   * Get cached user statistics
   */
  static async getUserStats(userId: string): Promise<any | null> {
    const key = KEYS.USER_STATS(userId);
    const cached = await redisService.get(key);
    
    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached);
    } catch (error) {
      console.error('Error parsing cached user stats:', error);
      await redisService.del(key);
      return null;
    }
  }

  /**
   * Invalidate user statistics cache
   */
  static async invalidateUserStats(userId: string): Promise<void> {
    const key = KEYS.USER_STATS(userId);
    await redisService.del(key);
  }

  // ===================
  // BULK INVALIDATION
  // ===================

  /**
   * Invalidate all cache entries for a user
   * Call this when user data changes significantly
   */
  static async invalidateUser(userId: string): Promise<void> {
    const pattern = KEYS.USER_ALL(userId);
    const deletedCount = await redisService.delPattern(pattern);
    
    if (deletedCount > 0) {
      console.log(`🗑️  Invalidated ${deletedCount} cache entries for user ${userId}`);
    }
  }

  // ===================
  // COUNTERS
  // ===================

  /**
   * Increment online players count
   */
  static async incrementOnlinePlayers(): Promise<number | null> {
    return await redisService.incr(KEYS.ONLINE_PLAYERS);
  }

  /**
   * Decrement online players count
   */
  static async decrementOnlinePlayers(): Promise<number | null> {
    return await redisService.decr(KEYS.ONLINE_PLAYERS);
  }

  /**
   * Get online players count
   */
  static async getOnlinePlayers(): Promise<number> {
    const count = await redisService.get(KEYS.ONLINE_PLAYERS);
    return count ? parseInt(count) : 0;
  }

  /**
   * Increment active games count
   */
  static async incrementActiveGames(): Promise<number | null> {
    return await redisService.incr(KEYS.ACTIVE_GAMES);
  }

  /**
   * Decrement active games count
   */
  static async decrementActiveGames(): Promise<number | null> {
    return await redisService.decr(KEYS.ACTIVE_GAMES);
  }

  /**
   * Get active games count
   */
  static async getActiveGames(): Promise<number> {
    const count = await redisService.get(KEYS.ACTIVE_GAMES);
    return count ? parseInt(count) : 0;
  }

  // ===================
  // RATE LIMITING
  // ===================

  /**
   * Check and increment rate limit counter
   * Returns true if rate limit NOT exceeded
   */
  static async checkRateLimit(
    userId: string,
    action: string,
    limit: number,
    windowSeconds: number
  ): Promise<boolean> {
    const key = KEYS.RATE_LIMIT(userId, action);
    
    // Get current count
    const currentStr = await redisService.get(key);
    const current = currentStr ? parseInt(currentStr) : 0;
    
    if (current >= limit) {
      return false; // Rate limit exceeded
    }
    
    // Increment counter
    const newCount = await redisService.incr(key);
    
    // Set expiration if this is the first request
    if (current === 0) {
      await redisService.expire(key, windowSeconds);
    }
    
    return true;
  }

  /**
   * Get remaining rate limit
   */
  static async getRateLimitRemaining(
    userId: string,
    action: string,
    limit: number
  ): Promise<number> {
    const key = KEYS.RATE_LIMIT(userId, action);
    const currentStr = await redisService.get(key);
    const current = currentStr ? parseInt(currentStr) : 0;
    
    return Math.max(0, limit - current);
  }

  // ===================
  // UTILITY METHODS
  // ===================

  /**
   * Set a generic cache value
   */
  static async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    return await redisService.set(key, serialized, ttlSeconds);
  }

  /**
   * Get a generic cache value
   */
  static async get(key: string): Promise<any> {
    const cached = await redisService.get(key);
    
    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached);
    } catch {
      // Return as string if not JSON
      return cached;
    }
  }

  /**
   * Delete a cache key
   */
  static async del(key: string): Promise<boolean> {
    return await redisService.del(key);
  }

  /**
   * Check if cache is available
   */
  static isAvailable(): boolean {
    return redisService.isAvailable();
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    available: boolean;
    onlinePlayers: number;
    activeGames: number;
    connected: boolean;
  }> {
    const status = redisService.getStatus();
    
    return {
      available: redisService.isAvailable(),
      connected: status.connected,
      onlinePlayers: await this.getOnlinePlayers(),
      activeGames: await this.getActiveGames(),
    };
  }
}

