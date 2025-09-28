import { describe, it, expect, beforeEach, afterEach, vi } from 'bun:test';

// Mock browser APIs before importing modules
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

const performanceMock = {
  now: vi.fn(() => Date.now()),
  getEntriesByType: vi.fn(() => []),
  mark: vi.fn(),
  measure: vi.fn(),
};

const windowMock = {
  localStorage: localStorageMock,
  performance: performanceMock,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  location: { href: 'http://localhost:3000', pathname: '/' },
  navigator: { userAgent: 'test-agent', language: 'en-US' },
  screen: { width: 1920, height: 1080 },
  innerWidth: 1920,
  innerHeight: 1080,
  document: {
    hidden: false,
    title: 'Test Page',
    referrer: '',
    readyState: 'complete',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  Intl: {
    DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: 'UTC' }) }),
  },
  PerformanceObserver: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
  })),
  fetch: vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({}),
  }),
  setInterval: vi.fn(),
  clearInterval: vi.fn(),
  setTimeout: vi.fn(),
  clearTimeout: vi.fn(),
  URL: {
    createObjectURL: vi.fn(),
    revokeObjectURL: vi.fn(),
  },
};

// Set up global mocks
Object.defineProperty(globalThis, 'window', { value: windowMock, writable: true });
Object.defineProperty(globalThis, 'document', { value: windowMock.document, writable: true });
Object.defineProperty(globalThis, 'navigator', { value: windowMock.navigator, writable: true });
Object.defineProperty(globalThis, 'screen', { value: windowMock.screen, writable: true });
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(globalThis, 'performance', { value: performanceMock, writable: true });
Object.defineProperty(globalThis, 'fetch', { value: windowMock.fetch, writable: true });

// Now import the modules after mocking
import { measurePerformance } from '../performance';
import { gameCache, PersistentCache, CACHE_KEYS } from '../cache';

describe('Performance Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gameCache.clear();
    PersistentCache.clear();
  });

  describe('Caching System', () => {
    it('should cache and retrieve data correctly', () => {
      const testData = { id: 1, name: 'test' };
      const cacheKey = 'test_key';
      
      // Set cache
      gameCache.set(cacheKey, testData, 1000);
      
      // Get cache
      const retrieved = gameCache.get(cacheKey);
      expect(retrieved).toEqual(testData);
    });

    it('should expire cache after TTL', async () => {
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

    it('should use persistent cache for long-term data', () => {
      const testData = { achievements: ['first_win'] };
      const cacheKey = 'user_achievements';
      
      // Mock localStorage to return the stored data
      localStorageMock.getItem.mockReturnValue(JSON.stringify(testData));
      
      PersistentCache.set(cacheKey, testData);
      const retrieved = PersistentCache.get(cacheKey);
      
      expect(retrieved).toEqual(testData);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should handle cache cleanup', () => {
      gameCache.set('key1', 'data1', 1000);
      gameCache.set('key2', 'data2', 1000);
      
      expect(gameCache.size()).toBe(2);
      
      gameCache.clear();
      expect(gameCache.size()).toBe(0);
    });
  });

  describe('Performance Monitoring', () => {
    it('should measure function performance', async () => {
      const testFunction = () => {
        // Simulate work
        return 'result';
      };
      
      const result = measurePerformance('test_function', testFunction);
      
      expect(result).toBe('result');
    });

    it('should handle async function performance measurement', async () => {
      const asyncFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async_result';
      };
      
      const result = await measurePerformance('async_function', asyncFunction);
      
      expect(result).toBe('async_result');
    });
  });

  describe('Basic Functionality', () => {
    it('should support caching operations', () => {
      // Cache some data
      gameCache.set(CACHE_KEYS.USER_BALANCE, { balance: 1000 });
      
      // Verify cache works
      expect(gameCache.get(CACHE_KEYS.USER_BALANCE)).toEqual({ balance: 1000 });
    });

    it('should support persistent cache', () => {
      const testData = { achievements: ['first_win'] };
      const cacheKey = 'user_achievements';
      
      PersistentCache.set(cacheKey, testData);
      
      // Should have called localStorage
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });
});

describe('Bundle Optimization', () => {
  it('should support lazy loading', async () => {
    // Test that lazy loading utilities work
    const { withLazyLoading } = await import('../lazy-loading');
    
    expect(typeof withLazyLoading).toBe('function');
  });

  it('should support progressive loading', async () => {
    const { useProgressiveLoading } = await import('../lazy-loading');
    
    expect(typeof useProgressiveLoading).toBe('function');
  });
});