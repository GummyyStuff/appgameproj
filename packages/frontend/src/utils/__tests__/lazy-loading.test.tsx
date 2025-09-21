import { describe, it, expect, vi } from 'bun:test';

describe('Lazy Loading Utilities', () => {
  describe('withLazyLoading', () => {
    it('should create a lazy wrapper component', async () => {
      const { withLazyLoading } = await import('../lazy-loading');
      
      const mockImportFn = vi.fn().mockResolvedValue({ 
        default: () => 'MockComponent' 
      });
      
      const LazyWrapper = withLazyLoading(mockImportFn);
      
      expect(typeof LazyWrapper).toBe('function');
    });
  });

  describe('Preloading Functions', () => {
    it('should support preloading critical components', async () => {
      const { preloadCriticalComponents } = await import('../lazy-loading');
      
      expect(typeof preloadCriticalComponents).toBe('function');
      
      // Should return a promise
      const result = preloadCriticalComponents();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should support preload on hover', async () => {
      const { preloadOnHover } = await import('../lazy-loading');
      const mockImport = vi.fn().mockResolvedValue({});
      
      const handlers = preloadOnHover(mockImport);
      
      expect(handlers).toHaveProperty('onMouseEnter');
      expect(handlers).toHaveProperty('onFocus');
      expect(typeof handlers.onMouseEnter).toBe('function');
      expect(typeof handlers.onFocus).toBe('function');
    });
  });

  describe('Progressive Loading Hook', () => {
    it('should provide preload functions', async () => {
      const { useProgressiveLoading } = await import('../lazy-loading');
      
      expect(typeof useProgressiveLoading).toBe('function');
    });
  });

  describe('Lazy Component Exports', () => {
    it('should export lazy game components', async () => {
      const lazyModule = await import('../lazy-loading');
      
      expect(lazyModule.LazyRouletteGame).toBeDefined();
      expect(lazyModule.LazyBlackjackGame).toBeDefined();

    });

    it('should export lazy page components', async () => {
      const lazyModule = await import('../lazy-loading');
      
      expect(lazyModule.LazyRoulettePage).toBeDefined();
      expect(lazyModule.LazyBlackjackPage).toBeDefined();

      expect(lazyModule.LazyHistoryPage).toBeDefined();
      expect(lazyModule.LazyProfilePage).toBeDefined();
    });

    it('should export lazy UI components', async () => {
      const lazyModule = await import('../lazy-loading');
      
      expect(lazyModule.LazyStatisticsDashboard).toBeDefined();
      expect(lazyModule.LazyGameHistoryTable).toBeDefined();

      expect(lazyModule.LazyAchievementSystem).toBeDefined();
    });
  });
});