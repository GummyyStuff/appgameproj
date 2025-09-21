import { useCallback, useEffect, useState } from 'react';
import { gameCache, PersistentCache, CACHE_KEYS, CACHE_TTL } from '@/utils/cache';

/**
 * Hook for managing cached data with automatic invalidation
 */
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    persistent?: boolean;
    enabled?: boolean;
  } = {}
) {
  const { ttl, persistent = false, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return;

    // Check cache first
    if (!force) {
      const cached = persistent 
        ? PersistentCache.get<T>(key)
        : gameCache.get<T>(key);
      
      if (cached) {
        setData(cached);
        return cached;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);

      // Cache the result
      if (persistent) {
        PersistentCache.set(key, result, ttl);
      } else {
        gameCache.set(key, result, ttl);
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl, persistent, enabled]);

  const invalidate = useCallback(() => {
    if (persistent) {
      PersistentCache.remove(key);
    } else {
      gameCache.clear();
    }
    setData(null);
  }, [key, persistent]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
  };
}

/**
 * Hook for caching user balance with frequent updates
 */
export function useCachedBalance() {
  return useCache(
    CACHE_KEYS.USER_BALANCE,
    async () => {
      const response = await fetch('/api/user/balance');
      if (!response.ok) throw new Error('Failed to fetch balance');
      return response.json();
    },
    { ttl: CACHE_TTL.USER_BALANCE }
  );
}

/**
 * Hook for caching game history
 */
export function useCachedGameHistory() {
  return useCache(
    CACHE_KEYS.GAME_HISTORY,
    async () => {
      const response = await fetch('/api/user/history');
      if (!response.ok) throw new Error('Failed to fetch game history');
      return response.json();
    },
    { ttl: CACHE_TTL.GAME_HISTORY }
  );
}

/**
 * Hook for caching leaderboard data
 */
export function useCachedLeaderboard() {
  return useCache(
    CACHE_KEYS.LEADERBOARD,
    async () => {
      const response = await fetch('/api/statistics/leaderboard');
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return response.json();
    },
    { ttl: CACHE_TTL.LEADERBOARD }
  );
}

/**
 * Hook for caching user achievements
 */
export function useCachedAchievements() {
  return useCache(
    CACHE_KEYS.ACHIEVEMENTS,
    async () => {
      const response = await fetch('/api/user/achievements');
      if (!response.ok) throw new Error('Failed to fetch achievements');
      return response.json();
    },
    { 
      ttl: CACHE_TTL.ACHIEVEMENTS,
      persistent: true // Achievements don't change often
    }
  );
}