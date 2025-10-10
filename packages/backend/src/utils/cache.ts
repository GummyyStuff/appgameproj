/**
 * Simple in-memory cache for slow Appwrite queries
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string, ttlMs: number): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const age = Date.now() - entry.timestamp;
    if (age > ttlMs) {
      // Expired
      this.cache.delete(key);
      return null;
    }
    
    console.log(`📦 Cache HIT: ${key} (age: ${Math.round(age/1000)}s)`);
    return entry.data;
  }
  
  /**
   * Set cached data
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    console.log(`💾 Cache SET: ${key}`);
  }
  
  /**
   * Clear cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log('🗑️  Cache cleared');
  }
  
  /**
   * Get cache stats
   */
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const appwriteCache = new SimpleCache();

/**
 * Wrapper to cache slow Appwrite operations
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000 // Default 5 minutes
): Promise<T> {
  // Try cache first
  const cached = appwriteCache.get<T>(key, ttlMs);
  if (cached !== null) {
    return cached;
  }
  
  // Cache miss - fetch fresh data
  console.log(`🔄 Cache MISS: ${key}, fetching...`);
  const data = await fetcher();
  
  // Store in cache
  appwriteCache.set(key, data);
  
  return data;
}

