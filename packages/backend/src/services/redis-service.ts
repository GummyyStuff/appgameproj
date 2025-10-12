/**
 * Redis Service
 * ============
 * 
 * Bun native Redis client wrapper with:
 * - Automatic connection management
 * - Graceful fallback if Redis unavailable
 * - Error handling and retry logic
 * - Connection health monitoring
 * 
 * Based on Bun Redis documentation:
 * https://bun.sh/docs/api/redis
 */

import { redis, RedisClient } from 'bun';
import { config } from '../config/env';

class RedisService {
  private client: RedisClient | null = null;
  private isConnecting: boolean = false;
  private connectionAttempts: number = 0;
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAY_MS = 1000;
  private reconnectTimer: Timer | null = null;
  private keepaliveTimer: Timer | null = null;
  private readonly KEEPALIVE_INTERVAL_MS = 10000; // Ping every 10 seconds

  /**
   * Initialize Redis connection
   */
  async initialize(): Promise<void> {
    if (!config.redisEnabled) {
      console.log('📦 Redis is disabled in configuration');
      return;
    }

    if (this.isConnecting) {
      return;
    }

    // If we already have a connected client, don't reconnect
    if (this.client && this.client.connected) {
      return;
    }

    this.isConnecting = true;

    try {
      console.log('🔄 Connecting to Redis...');
      
      // Build Redis URL - prioritize REDIS_URL over individual components
      const redisUrl = config.redis.url || this.buildRedisUrl();
      
      if (config.redis.url) {
        console.log(`   Using REDIS_URL: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`);
      } else {
        console.log(`   Host: ${config.redis.host}`);
        console.log(`   Port: ${config.redis.port}`);
        console.log(`   DB: ${config.redis.db}`);
      }

      // Warn if connecting to localhost in production
      if (redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1')) {
        console.warn('⚠️  WARNING: Connecting to localhost Redis - this may not work in Docker!');
        console.warn('⚠️  Set REDIS_URL or REDIS_HOST environment variable to the correct Redis service');
      }

      // Create Redis client using Bun's native client
      this.client = new RedisClient(redisUrl, {
        connectionTimeout: 5000,
        idleTimeout: 30000,
        autoReconnect: true,
        maxRetries: this.MAX_RETRIES,
        enableOfflineQueue: true,
        enableAutoPipelining: true,
      });

      // Set up connection event handlers BEFORE connecting
      this.client.onconnect = () => {
        console.log('✅ Redis connected successfully');
        this.connectionAttempts = 0;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        
        // NOTE: Keepalive disabled - might interfere with Bun's Redis auth
        // this.startKeepalive();
      };

      this.client.onclose = (error?: Error) => {
        console.warn('⚠️  Redis connection closed', error ? `: ${error.message}` : '');
        
        // Stop keepalive when connection closes
        this.stopKeepalive();
        
        // Attempt reconnection with exponential backoff
        if (config.redisEnabled && this.connectionAttempts < this.MAX_RETRIES) {
          this.connectionAttempts++;
          const delay = this.RETRY_DELAY_MS * Math.pow(2, this.connectionAttempts - 1);
          console.log(`🔄 Scheduling reconnection attempt ${this.connectionAttempts}/${this.MAX_RETRIES} in ${delay}ms...`);
          
          this.reconnectTimer = setTimeout(() => {
            this.isConnecting = false;
            this.initialize().catch(err => {
              console.error('Reconnection failed:', err);
            });
          }, delay);
        } else if (this.connectionAttempts >= this.MAX_RETRIES) {
          console.error('❌ Max reconnection attempts reached. Redis is unavailable.');
        }
      };

      // Explicitly connect
      await this.client.connect();

      // Test connection with a ping
      await this.client.send('PING', []);
      
      console.log('✅ Redis service initialized');
      this.isConnecting = false;

    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      console.warn('⚠️  Application will run without Redis caching');
      this.isConnecting = false;
      this.client = null;
      
      // Don't throw - allow app to run without Redis
    }
  }

  /**
   * Build Redis URL from configuration
   * Note: Redis URL format is redis://:password@host:port/db (no username for standard Redis)
   */
  private buildRedisUrl(): string {
    const { host, port, password, db } = config.redis;
    
    if (password) {
      // Standard Redis format: no username, just :password@
      return `redis://:${password}@${host}:${port}/${db}`;
    }
    
    return `redis://${host}:${port}/${db}`;
  }

  /**
   * Check if Redis is available
   * Uses Bun's client.connected property for accurate status
   */
  isAvailable(): boolean {
    return this.client !== null && this.client.connected;
  }

  /**
   * Get a value from Redis
   */
  async get(key: string): Promise<string | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const value = await this.client!.get(key);
      return value;
    } catch (error: any) {
      if (error?.code === 'ERR_REDIS_CONNECTION_CLOSED') {
        console.warn(`Redis connection closed during GET for key ${key}`);
        // Trigger reconnection
        this.initialize().catch(() => {});
      } else {
        console.error(`Redis GET error for key ${key}:`, error);
      }
      return null;
    }
  }

  /**
   * Set a value in Redis with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      if (ttlSeconds) {
        await this.client!.send('SETEX', [key, ttlSeconds.toString(), value]);
      } else {
        await this.client!.set(key, value);
      }
      return true;
    } catch (error: any) {
      if (error?.code === 'ERR_REDIS_CONNECTION_CLOSED') {
        console.warn(`Redis connection closed during SET for key ${key}`);
        // Trigger reconnection
        this.initialize().catch(() => {});
      } else {
        console.error(`Redis SET error for key ${key}:`, error);
      }
      return false;
    }
  }

  /**
   * Delete a key from Redis
   */
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client!.del(key);
      return true;
    } catch (error: any) {
      if (error?.code === 'ERR_REDIS_CONNECTION_CLOSED') {
        console.warn(`Redis connection closed during DEL for key ${key}`);
        this.initialize().catch(() => {});
      } else {
        console.error(`Redis DEL error for key ${key}:`, error);
      }
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      // Get keys matching pattern
      const keys = await this.client!.send('KEYS', [pattern]) as string[];
      
      if (keys.length === 0) {
        return 0;
      }

      // Delete all matching keys
      await this.client!.send('DEL', keys);
      return keys.length;
    } catch (error) {
      console.error(`Redis DEL pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const result = await this.client!.incr(key);
      return result as number;
    } catch (error: any) {
      if (error?.code === 'ERR_REDIS_CONNECTION_CLOSED') {
        console.warn(`Redis connection closed during INCR for key ${key}`);
        this.initialize().catch(() => {});
      } else {
        console.error(`Redis INCR error for key ${key}:`, error);
      }
      return null;
    }
  }

  /**
   * Decrement a counter
   */
  async decr(key: string): Promise<number | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const result = await this.client!.send('DECR', [key]) as number;
      return result;
    } catch (error) {
      console.error(`Redis DECR error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client!.expire(key, seconds);
      return true;
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Add score to sorted set (for leaderboards)
   */
  async zadd(key: string, score: number, member: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client!.send('ZADD', [key, score.toString(), member]);
      return true;
    } catch (error) {
      console.error(`Redis ZADD error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get top N members from sorted set (descending order)
   */
  async zrevrange(key: string, start: number, stop: number, withScores: boolean = false): Promise<string[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const args = [key, start.toString(), stop.toString()];
      if (withScores) {
        args.push('WITHSCORES');
      }
      
      const result = await this.client!.send('ZREVRANGE', args) as string[];
      return result;
    } catch (error) {
      console.error(`Redis ZREVRANGE error for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Get rank of member in sorted set (descending order)
   */
  async zrevrank(key: string, member: string): Promise<number | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const rank = await this.client!.send('ZREVRANK', [key, member]) as number | null;
      return rank !== null ? rank + 1 : null; // Convert 0-based to 1-based
    } catch (error) {
      console.error(`Redis ZREVRANK error for key ${key}, member ${member}:`, error);
      return null;
    }
  }

  /**
   * Get score of member in sorted set
   */
  async zscore(key: string, member: string): Promise<number | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const score = await this.client!.send('ZSCORE', [key, member]) as string | null;
      return score !== null ? parseFloat(score) : null;
    } catch (error) {
      console.error(`Redis ZSCORE error for key ${key}, member ${member}:`, error);
      return null;
    }
  }

  /**
   * Get Redis connection status
   */
  getStatus(): { connected: boolean; bufferedAmount?: number } {
    if (!this.client) {
      return { connected: false };
    }

    return {
      connected: this.client.connected,
      bufferedAmount: this.client.bufferedAmount,
    };
  }

  /**
   * Gracefully close Redis connection
   */
  async close(): Promise<void> {
    // Clear any pending reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Stop keepalive
    this.stopKeepalive();

    if (this.client) {
      console.log('🔒 Closing Redis connection...');
      this.client.close();
      this.client = null;
    }

    this.connectionAttempts = 0;
    this.isConnecting = false;
  }

  /**
   * Start keepalive pings to maintain connection
   */
  private startKeepalive(): void {
    // Clear any existing keepalive
    this.stopKeepalive();

    // Ping Redis periodically to keep connection alive
    this.keepaliveTimer = setInterval(async () => {
      if (this.client && this.client.connected) {
        try {
          await this.client.send('PING', []);
          // Successful ping - connection is healthy
        } catch (error) {
          console.warn('⚠️  Keepalive ping failed, connection may be dead');
          // Connection is dead, let onclose handler deal with it
        }
      }
    }, this.KEEPALIVE_INTERVAL_MS);
  }

  /**
   * Stop keepalive pings
   */
  private stopKeepalive(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  /**
   * Flush all keys in current database (USE WITH CAUTION!)
   */
  async flushDb(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client!.send('FLUSHDB', []);
      console.log('⚠️  Redis database flushed');
      return true;
    } catch (error) {
      console.error('Redis FLUSHDB error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const redisService = new RedisService();

// Initialize on module load
redisService.initialize().catch(err => {
  console.error('Failed to initialize Redis service:', err);
});

