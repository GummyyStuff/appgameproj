/**
 * Request Deduplication Service
 * ==============================
 * 
 * Prevents duplicate request processing using:
 * - Redis (if available) for distributed deduplication
 * - In-memory Map (fallback) for single-instance deployments
 * 
 * Features:
 * - Automatic cleanup of expired entries
 * - Size limits to prevent memory leaks
 * - Graceful fallback if Redis unavailable
 */

import { redisService } from './redis-service';

interface InMemoryEntry {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplicationService {
  private inMemoryCache = new Map<string, InMemoryEntry>();
  private readonly MAX_ENTRIES = 1000;
  private readonly TTL_MS = 30000; // 30 seconds
  private readonly TTL_SECONDS = 30; // Redis TTL
  private cleanupInterval: Timer | null = null;

  constructor() {
    this.startCleanup();
  }

  /**
   * Check if a request is already in flight and wait for it
   * @returns The existing promise if duplicate, null otherwise
   */
  async getInFlight<T>(key: string): Promise<T | null> {
    if (redisService.isAvailable()) {
      // Check if key exists in Redis
      const value = await redisService.get(`dedup:${key}`);
      if (value) {
        console.log(`🔄 Deduplicating request (Redis): ${key}`);
        // Wait a bit and retry to get the result
        await new Promise(resolve => setTimeout(resolve, 100));
        // Recursive call to wait for completion
        return this.getInFlight<T>(key);
      }
      return null;
    }

    // Fallback to in-memory
    const entry = this.inMemoryCache.get(key);
    if (entry) {
      console.log(`🔄 Deduplicating request (in-memory): ${key}`);
      return entry.promise as Promise<T>;
    }
    return null;
  }

  /**
   * Mark a request as in flight
   * @param key Unique request identifier
   * @param promise The promise to track
   */
  async setInFlight<T>(key: string, promise: Promise<T>): Promise<void> {
    if (redisService.isAvailable()) {
      await redisService.set(`dedup:${key}`, 'in-flight', this.TTL_SECONDS);
      promise.finally(() => {
        redisService.del(`dedup:${key}`).catch(() => {});
      });
      return;
    }

    // Fallback to in-memory with size limit
    if (this.inMemoryCache.size >= this.MAX_ENTRIES) {
      this.cleanup();
    }

    this.inMemoryCache.set(key, {
      promise,
      timestamp: Date.now(),
    });

    promise.finally(() => {
      setTimeout(() => {
        this.inMemoryCache.delete(key);
      }, this.TTL_MS);
    });
  }

  /**
   * Clean up expired entries (in-memory only)
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.inMemoryCache.entries()) {
      if (now - entry.timestamp > this.TTL_MS) {
        this.inMemoryCache.delete(key);
      }
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }

  /**
   * Stop cleanup (for testing/shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get cache stats (for monitoring)
   */
  getStats(): { size: number; usingRedis: boolean } {
    return {
      size: this.inMemoryCache.size,
      usingRedis: redisService.isAvailable(),
    };
  }
}

export const requestDeduplication = new RequestDeduplicationService();
