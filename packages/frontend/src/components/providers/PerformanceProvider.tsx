import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { performanceMonitor } from '@/utils/performance';
import { analytics } from '@/utils/analytics';
import { errorTracker } from '@/utils/error-tracking';
import { abTesting } from '@/utils/ab-testing';
import { gameCache } from '@/utils/cache';
import { preloadCriticalComponents } from '@/utils/lazy-loading';

interface PerformanceContextType {
  trackGamePerformance: (gameType: string, data: any) => void;
  trackUserInteraction: (interaction: string, duration: number) => void;
  reportError: (error: Error, context?: any) => void;
  getABTestVariant: (testId: string) => any;
  clearCache: () => void;
}

const PerformanceContext = createContext<PerformanceContextType | null>(null);

interface PerformanceProviderProps {
  children: ReactNode;
  userId?: string;
}

export function PerformanceProvider({ children, userId }: PerformanceProviderProps) {
  useEffect(() => {
    // Set user ID for all tracking systems
    if (userId) {
      analytics.setUserId(userId);
      errorTracker.setUserId(userId);
      abTesting.setUserId(userId);
    }

    // Preload critical components
    preloadCriticalComponents().catch(error => {
      console.warn('Failed to preload components:', error);
    });

    // Track initial page load performance
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

    // Track route changes
    const trackRouteChange = () => {
      analytics.trackPageView(window.location.pathname);
      performanceMonitor.recordMetric('route_change', performance.now());
    };

    // Listen for route changes (for React Router)
    window.addEventListener('popstate', trackRouteChange);

    // Track visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        analytics.track('page_hidden');
      } else {
        analytics.track('page_visible');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track user interactions
    const trackInteraction = (event: Event) => {
      const target = event.target as HTMLElement;
      const interactionType = event.type;
      const elementType = target.tagName.toLowerCase();
      
      analytics.track('user_interaction', {
        type: interactionType,
        element: elementType,
        className: target.className,
        id: target.id,
      });
    };

    // Add interaction listeners
    ['click', 'keydown', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, trackInteraction, { passive: true });
    });

    // Cleanup function
    return () => {
      window.removeEventListener('popstate', trackRouteChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      ['click', 'keydown', 'touchstart'].forEach(eventType => {
        document.removeEventListener(eventType, trackInteraction);
      });
    };
  }, [userId]);

  // Context value
  const contextValue: PerformanceContextType = {
    trackGamePerformance: (gameType: string, data: any) => {
      performanceMonitor.trackGamePerformance(gameType, data);
      analytics.trackGameEvent({
        gameType: gameType as any,
        action: 'performance_tracked',
        ...data,
      });
    },

    trackUserInteraction: (interaction: string, duration: number) => {
      performanceMonitor.recordMetric(`interaction_${interaction}`, duration);
      analytics.track('user_interaction_timed', {
        interaction,
        duration,
      });
    },

    reportError: (error: Error, context?: any) => {
      errorTracker.captureError(error, context);
      analytics.trackError(error, context);
    },

    getABTestVariant: (testId: string) => {
      return abTesting.getVariant(testId);
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

/**
 * Hook to use performance context
 */
export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
}

/**
 * HOC for tracking component performance
 */
export function withPerformanceTracking<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: T) {
    const { trackUserInteraction, reportError } = usePerformance();

    useEffect(() => {
      const startTime = performance.now();

      return () => {
        const renderTime = performance.now() - startTime;
        performanceMonitor.recordMetric(`component_mount_${componentName}`, renderTime);
      };
    }, []);

    // Error boundary
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

/**
 * Hook for tracking game performance
 */
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
    analytics.trackGameEvent({
      gameType: gameType as any,
      action: action as any,
      duration,
    });
  };

  return {
    trackLoadTime,
    trackRenderTime,
    trackInteractionDelay,
    trackGameAction,
  };
}