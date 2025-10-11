import { describe, test, expect, mock } from 'bun:test';

describe('Lazy Loading Utilities', () => {
  describe('withLazyLoading', () => {
    test('should create a lazy wrapper component', async () => {
      const { withLazyLoading } = await import('../lazy-loading');
      
      const mockImportFn = mock(() => Promise.resolve({ 
        default: () => 'MockComponent' 
      }));
      
      const LazyWrapper = withLazyLoading(mockImportFn);
      
      expect(typeof LazyWrapper).toBe('function');
    });
  });

  describe('Preloading Functions', () => {
    test('should support preloading critical components', async () => {
      const { preloadCriticalComponents } = await import('../lazy-loading');
      
      expect(typeof preloadCriticalComponents).toBe('function');
      
      // Should return a promise
      const result = preloadCriticalComponents();
      expect(result).toBeInstanceOf(Promise);
    });

    test('should support preload on hover', async () => {
      const { preloadOnHover } = await import('../lazy-loading');
      const mockImport = mock(() => Promise.resolve({}));
      
      const handlers = preloadOnHover(mockImport);
      
      expect(handlers).toHaveProperty('onMouseEnter');
      expect(handlers).toHaveProperty('onFocus');
      expect(typeof handlers.onMouseEnter).toBe('function');
      expect(typeof handlers.onFocus).toBe('function');
    });
  });

  describe('Progressive Loading Hook', () => {
    test('should provide preload functions', async () => {
      const { useProgressiveLoading } = await import('../lazy-loading');
      
      expect(typeof useProgressiveLoading).toBe('function');
    });
  });

  describe('Lazy Component Exports', () => {
    test('should export lazy game components', async () => {
      const lazyModule = await import('../lazy-loading');
      
      expect(lazyModule.LazyRouletteGame).toBeDefined();
      expect(lazyModule.LazyBlackjackGame).toBeDefined();

    });

    test('should export lazy page components', async () => {
      const lazyModule = await import('../lazy-loading');
      
      expect(lazyModule.LazyRoulettePage).toBeDefined();
      expect(lazyModule.LazyBlackjackPage).toBeDefined();

      expect(lazyModule.LazyHistoryPage).toBeDefined();
      expect(lazyModule.LazyProfilePage).toBeDefined();
    });

    test('should export lazy UI components', async () => {
      const lazyModule = await import('../lazy-loading');
      
      expect(lazyModule.LazyStatisticsDashboard).toBeDefined();
      expect(lazyModule.LazyGameHistoryTable).toBeDefined();

      expect(lazyModule.LazyAchievementSystem).toBeDefined();
    });
  });
});