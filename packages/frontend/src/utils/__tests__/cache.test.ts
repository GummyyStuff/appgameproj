import { describe, test, expect } from 'bun:test';

// Mock localStorage
const localStorageMock = {
  getItem: mock(),
  setItem: mock(),
  removeItem: mock(),
  clear: mock(),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

import { gameCache, PersistentCache, CACHE_KEYS, CACHE_TTL } from '../cache';

describe('Caching System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gameCache.clear();
    PersistentCache.clear();
  });

  describe('GameDataCache', () => {
    test('should cache and retrieve data correctly', () => {
      const testData = { id: 1, name: 'test' };
      const cacheKey = 'test_key';
      
      // Set cache
      gameCache.set(cacheKey, testData, 1000);
      
      // Get cache
      const retrieved = gameCache.get(cacheKey);
      expect(retrieved).toEqual(testData);
    });

    test('should return null for non-existent keys', () => {
      const retrieved = gameCache.get('non_existent_key');
      expect(retrieved).toBeNull();
    });

    test('should expire cache after TTL', async () => {
      const testData = { id: 1, name: 'test' };
      const cacheKey = 'test_key';
      
      // Set cache with short TTL
      gameCache.set(cacheKey, testData, 10);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Should be expired
      const retrieved = gameCache.get(cacheKey);
      expect(retrieved).toBeNull();
    });

    test('should check if cache has valid item', () => {
      const testData = { id: 1, name: 'test' };
      const cacheKey = 'test_key';
      
      expect(gameCache.has(cacheKey)).toBe(false);
      
      gameCache.set(cacheKey, testData, 1000);
      expect(gameCache.has(cacheKey)).toBe(true);
    });

    test('should handle cache cleanup', () => {
      gameCache.set('key1', 'data1', 1000);
      gameCache.set('key2', 'data2', 1000);
      
      expect(gameCache.size()).toBe(2);
      
      gameCache.clear();
      expect(gameCache.size()).toBe(0);
    });

    test('should cleanup expired items', async () => {
      gameCache.set('key1', 'data1', 10); // Short TTL
      gameCache.set('key2', 'data2', 1000); // Long TTL
      
      expect(gameCache.size()).toBe(2);
      
      // Wait for first item to expire
      await new Promise(resolve => setTimeout(resolve, 20));
      
      gameCache.cleanup();
      expect(gameCache.size()).toBe(1);
      expect(gameCache.has('key2')).toBe(true);
    });
  });

  describe('PersistentCache', () => {
    test('should use localStorage for persistent data', () => {
      const testData = { achievements: ['first_win'] };
      const cacheKey = 'user_achievements';
      
      PersistentCache.set(cacheKey, testData);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'tarkov_casino_user_achievements',
        expect.stringContaining('"achievements":["first_win"]')
      );
    });

    test('should retrieve data from localStorage', () => {
      const testData = { achievements: ['first_win'] };
      const cacheKey = 'user_achievements';
      
      // Mock localStorage return
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        data: testData,
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000,
      }));
      
      const retrieved = PersistentCache.get(cacheKey);
      expect(retrieved).toEqual(testData);
    });

    test('should return null for expired data', () => {
      const testData = { achievements: ['first_win'] };
      const cacheKey = 'user_achievements';
      
      // Mock expired data
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        data: testData,
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        ttl: 24 * 60 * 60 * 1000, // 24 hour TTL
      }));
      
      const retrieved = PersistentCache.get(cacheKey);
      expect(retrieved).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });

    test('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      // Should not throw
      expect(() => {
        PersistentCache.set('test_key', { data: 'test' });
      }).not.toThrow();
    });

    test('should remove items from localStorage', () => {
      const cacheKey = 'test_key';
      
      PersistentCache.remove(cacheKey);
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('tarkov_casino_test_key');
    });

    test('should clear all cache items', () => {
      // Mock localStorage keys
      Object.defineProperty(localStorageMock, 'keys', {
        value: ['tarkov_casino_key1', 'tarkov_casino_key2', 'other_key'],
        configurable: true,
      });
      
      Object.keys = mock().mockReturnValue(['tarkov_casino_key1', 'tarkov_casino_key2', 'other_key']);
      
      PersistentCache.clear();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('tarkov_casino_key1');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('tarkov_casino_key2');
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('other_key');
    });
  });

  describe('Cache Constants', () => {
    test('should have defined cache keys', () => {
      expect(CACHE_KEYS.USER_PROFILE).toBe('user_profile');
      expect(CACHE_KEYS.USER_BALANCE).toBe('user_balance');
      expect(CACHE_KEYS.GAME_HISTORY).toBe('game_history');
      expect(CACHE_KEYS.LEADERBOARD).toBe('leaderboard');
      expect(CACHE_KEYS.GAME_STATS).toBe('game_stats');
      expect(CACHE_KEYS.ACHIEVEMENTS).toBe('achievements');
    });

    test('should have defined cache TTL values', () => {
      expect(CACHE_TTL.USER_PROFILE).toBe(10 * 60 * 1000);
      expect(CACHE_TTL.USER_BALANCE).toBe(30 * 1000);
      expect(CACHE_TTL.GAME_HISTORY).toBe(5 * 60 * 1000);
      expect(CACHE_TTL.LEADERBOARD).toBe(2 * 60 * 1000);
      expect(CACHE_TTL.GAME_STATS).toBe(5 * 60 * 1000);
      expect(CACHE_TTL.ACHIEVEMENTS).toBe(15 * 60 * 1000);
    });
  });
});