/**
 * Performance monitoring utilities for tracking app performance
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface GamePerformanceData {
  gameType: string;
  loadTime: number;
  renderTime: number;
  interactionDelay: number;
  memoryUsage?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private gameMetrics = new Map<string, GamePerformanceData>();

  constructor() {
    this.initializeObservers();
    this.trackWebVitals();
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers(): void {
    // Track navigation timing
    if ('PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric('page_load_time', navEntry.loadEventEnd - navEntry.fetchStart);
            this.recordMetric('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.fetchStart);
            this.recordMetric('first_paint', navEntry.loadEventEnd - navEntry.fetchStart);
          }
        }
      });

      try {
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (error) {
        console.warn('Navigation timing observer not supported:', error);
      }

      // Track resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.recordMetric(`resource_load_${resourceEntry.initiatorType}`, resourceEntry.duration, {
              name: resourceEntry.name,
              size: resourceEntry.transferSize,
            });
          }
        }
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource timing observer not supported:', error);
      }
    }
  }

  /**
   * Track Core Web Vitals
   */
  private trackWebVitals(): void {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('lcp', lastEntry.startTime);
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('fid', entry.processingStart - entry.startTime);
        }
      });

      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.recordMetric('cls', clsValue);
      });

      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (error) {
        console.warn('CLS observer not supported:', error);
      }
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log significant performance issues
    // Disabled to reduce console noise
    // if (this.isSignificantMetric(name, value)) {
    //   console.warn(`Performance issue detected: ${name} = ${value}ms`, metadata);
    // }
  }

  /**
   * Check if metric indicates performance issue
   */
  private isSignificantMetric(name: string, value: number): boolean {
    const thresholds: Record<string, number> = {
      page_load_time: 3000, // 3 seconds
      lcp: 2500, // 2.5 seconds
      fid: 100, // 100ms
      cls: 0.1, // 0.1 CLS score
      game_load_time: 1000, // 1 second
      interaction_delay: 50, // 50ms
    };

    return thresholds[name] ? value > thresholds[name] : false;
  }

  /**
   * Track game-specific performance
   */
  trackGamePerformance(gameType: string, data: Partial<GamePerformanceData>): void {
    const existing = this.gameMetrics.get(gameType) || {
      gameType,
      loadTime: 0,
      renderTime: 0,
      interactionDelay: 0,
    };

    const updated = { ...existing, ...data };
    this.gameMetrics.set(gameType, updated);

    // Record individual metrics
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'number') {
        this.recordMetric(`game_${key}`, value, { gameType });
      }
    });
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    metrics: PerformanceMetric[];
    gameMetrics: Map<string, GamePerformanceData>;
    memoryUsage?: MemoryInfo;
  } {
    return {
      metrics: [...this.metrics],
      gameMetrics: new Map(this.gameMetrics),
      memoryUsage: (performance as any).memory,
    };
  }

  /**
   * Export metrics for analytics
   */
  exportMetrics(): string {
    const summary = this.getPerformanceSummary();
    return JSON.stringify({
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      metrics: summary.metrics,
      gameMetrics: Array.from(summary.gameMetrics.entries()),
      memoryUsage: summary.memoryUsage,
    });
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.gameMetrics.clear();
  }

  /**
   * Cleanup observers
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Utility function to measure function execution time
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>,
  metadata?: Record<string, any>
): T | Promise<T> {
  const start = performance.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = performance.now() - start;
      performanceMonitor.recordMetric(name, duration, metadata);
    });
  } else {
    const duration = performance.now() - start;
    performanceMonitor.recordMetric(name, duration, metadata);
    return result;
  }
}

/**
 * React hook for tracking component render performance
 */
export function usePerformanceTracking(componentName: string) {
  const trackRender = (renderTime: number) => {
    performanceMonitor.recordMetric(`component_render_${componentName}`, renderTime);
  };

  const trackInteraction = (interactionName: string, duration: number) => {
    performanceMonitor.recordMetric(`interaction_${interactionName}`, duration, {
      component: componentName,
    });
  };

  return { trackRender, trackInteraction };
}