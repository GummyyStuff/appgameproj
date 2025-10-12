/**
 * Client-side caching utilities for game data and user information
 * Optimized for Bun 1.3 with native Map performance
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class GameDataCache {
  private cache = new Map<string, CacheItem<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Set cache item with TTL
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get cache item if not expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Check if cache has valid item
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get or fetch data with caching and deduplication
   * Prevents multiple simultaneous requests for the same data
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if there's a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending;
    }

    // Create new request
    const request = fetcher()
      .then((data) => {
        this.set(key, data, ttl);
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, request);
    return request;
  }

  /**
   * Clear expired items
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Game-specific cache configurations
export const CACHE_KEYS = {
  USER_PROFILE: 'user_profile',
  USER_BALANCE: 'user_balance',
  GAME_HISTORY: 'game_history',
  LEADERBOARD: 'leaderboard',
  GAME_STATS: 'game_stats',
  ACHIEVEMENTS: 'achievements',
} as const;

export const CACHE_TTL = {
  USER_PROFILE: 10 * 60 * 1000, // 10 minutes
  USER_BALANCE: 30 * 1000, // 30 seconds
  GAME_HISTORY: 5 * 60 * 1000, // 5 minutes
  LEADERBOARD: 2 * 60 * 1000, // 2 minutes
  GAME_STATS: 5 * 60 * 1000, // 5 minutes
  ACHIEVEMENTS: 15 * 60 * 1000, // 15 minutes
} as const;

// Singleton cache instance
export const gameCache = new GameDataCache();

// Auto cleanup every 5 minutes (only in browser)
if (typeof window !== 'undefined') {
  setInterval(() => {
    gameCache.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Local storage cache for persistent data
 */
export class PersistentCache {
  private static readonly PREFIX = 'tarkov_casino_';

  static set<T>(key: string, data: T, ttl?: number): void {
    const item = {
      data,
      timestamp: Date.now(),
      ttl: ttl || 24 * 60 * 60 * 1000, // Default 24 hours
    };

    try {
      localStorage.setItem(
        this.PREFIX + key,
        JSON.stringify(item)
      );
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  static get<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(this.PREFIX + key);
      if (!stored) return null;

      const item = JSON.parse(stored);
      const now = Date.now();

      if (now - item.timestamp > item.ttl) {
        localStorage.removeItem(this.PREFIX + key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }

  static remove(key: string): void {
    localStorage.removeItem(this.PREFIX + key);
  }

  static clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
}