import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { performanceMonitor } from '@/utils/performance';
import { errorTracker } from '@/utils/error-tracking';
import { gameCache } from '@/utils/cache';
import { preloadCriticalComponents } from '@/utils/lazy-loading';

interface PerformanceContextType {
  trackGamePerformance: (gameType: string, data: any) => void;
  trackUserInteraction: (interaction: string, duration: number) => void;
  reportError: (error: Error, context?: any) => void;
  clearCache: () => void;
}

const PerformanceContext = createContext<PerformanceContextType | null>(null);

interface PerformanceProviderProps {
  children: ReactNode;
  userId?: string;
}

export function PerformanceProvider({ children, userId }: PerformanceProviderProps) {
  useEffect(() => {
    if (userId) {
      errorTracker.setUserId(userId);
    }

    preloadCriticalComponents().catch(error => {
      console.warn('Failed to preload components:', error);
    });

    const trackInitialLoad = () => {
      if (document.readyState === 'complete') {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          performanceMonitor.recordMetric('initial_page_load', navigation.loadEventEnd - navigation.fetchStart);
          performanceMonitor.recordMetric('dom_interactive', navigation.domInteractive - navigation.fetchStart);
          performanceMonitor.recordMetric('first_contentful_paint', navigation.loadEventEnd - navigation.fetchStart);
        }
      } else {
        window.addEventListener('load', trackInitialLoad, { once: true });
      }
    };

    trackInitialLoad();

    const trackRouteChange = () => {
      performanceMonitor.recordMetric('route_change', performance.now());
    };

    window.addEventListener('popstate', trackRouteChange);

    return () => {
      window.removeEventListener('popstate', trackRouteChange);
    };
  }, [userId]);

  const contextValue: PerformanceContextType = {
    trackGamePerformance: (gameType: string, data: any) => {
      performanceMonitor.trackGamePerformance(gameType, data);
    },

    trackUserInteraction: (interaction: string, duration: number) => {
      performanceMonitor.recordMetric(`interaction_${interaction}`, duration);
    },

    reportError: (error: Error, context?: any) => {
      errorTracker.captureError(error, context);
    },

    clearCache: () => {
      gameCache.clear();
    },
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
}

export function withPerformanceTracking<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: T) {
    const { reportError } = usePerformance();

    useEffect(() => {
      const startTime = performance.now();

      return () => {
        const renderTime = performance.now() - startTime;
        performanceMonitor.recordMetric(`component_mount_${componentName}`, renderTime);
      };
    }, []);

    const handleError = (error: Error) => {
      reportError(error, { component: componentName });
    };

    try {
      return <Component {...props} />;
    } catch (error) {
      handleError(error as Error);
      throw error;
    }
  };
}

export function useGamePerformanceTracking(gameType: string) {
  const { trackGamePerformance } = usePerformance();

  const trackLoadTime = (loadTime: number) => {
    trackGamePerformance(gameType, { loadTime });
  };

  const trackRenderTime = (renderTime: number) => {
    trackGamePerformance(gameType, { renderTime });
  };

  const trackInteractionDelay = (delay: number) => {
    trackGamePerformance(gameType, { interactionDelay: delay });
  };

  const trackGameAction = (action: string, duration: number) => {
    performanceMonitor.recordMetric(`game_${gameType}_${action}`, duration);
  };

  return {
    trackLoadTime,
    trackRenderTime,
    trackInteractionDelay,
    trackGameAction,
  };
}
