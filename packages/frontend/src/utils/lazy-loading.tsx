import { lazy, Suspense, ComponentType } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * Higher-order component for lazy loading with loading state
 */
export function withLazyLoading<T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn);

  return function LazyWrapper(props: T) {
    return (
      <Suspense fallback={fallback || <LoadingSpinner />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Lazy-loaded game components
 */
export const LazyRouletteGame = withLazyLoading(
  () => import('@/components/games/RouletteWheel'),
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner />
    <span className="ml-2 text-tarkov-text">Loading Roulette...</span>
  </div>
);

export const LazyBlackjackGame = withLazyLoading(
  () => import('@/components/games/BlackjackGame'),
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner />
    <span className="ml-2 text-tarkov-text">Loading Blackjack...</span>
  </div>
);



/**
 * Lazy-loaded page components
 */
export const LazyRoulettePage = withLazyLoading(
  () => import('@/pages/RoulettePage')
);

export const LazyBlackjackPage = withLazyLoading(
  () => import('@/pages/BlackjackPage')
);



export const LazyHistoryPage = withLazyLoading(
  () => import('@/pages/HistoryPage')
);

export const LazyProfilePage = withLazyLoading(
  () => import('@/pages/ProfilePage')
);

/**
 * Lazy-loaded UI components
 */
export const LazyStatisticsDashboard = withLazyLoading(
  () => import('@/components/ui/StatisticsDashboard')
);

export const LazyGameHistoryTable = withLazyLoading(
  () => import('@/components/ui/GameHistoryTable')
);



export const LazyAchievementSystem = withLazyLoading(
  () => import('@/components/ui/AchievementSystem')
);



/**
 * Preload critical components
 */
export function preloadCriticalComponents() {
  // Preload components that are likely to be used soon
  const preloadPromises = [
    import('@/components/games/RouletteWheel'),
    import('@/components/games/BlackjackGame'),

  ];

  return Promise.all(preloadPromises);
}

/**
 * Preload component based on user interaction
 */
export function preloadOnHover(componentImport: () => Promise<any>) {
  let preloadPromise: Promise<any> | null = null;

  return {
    onMouseEnter: () => {
      if (!preloadPromise) {
        preloadPromise = componentImport();
      }
    },
    onFocus: () => {
      if (!preloadPromise) {
        preloadPromise = componentImport();
      }
    },
  };
}

/**
 * Hook for progressive loading
 */
export function useProgressiveLoading() {
  const preloadGame = (gameType: 'roulette' | 'blackjack') => {
    switch (gameType) {
      case 'roulette':
        return import('@/components/games/RouletteWheel');
      case 'blackjack':
        return import('@/components/games/BlackjackGame');

      default:
        return Promise.resolve();
    }
  };

  const preloadPage = (page: string) => {
    switch (page) {
      case 'roulette':
        return import('@/pages/RoulettePage');
      case 'blackjack':
        return import('@/pages/BlackjackPage');

      case 'profile':
        return import('@/pages/ProfilePage');
      case 'history':
        return import('@/pages/HistoryPage');
      default:
        return Promise.resolve();
    }
  };

  return { preloadGame, preloadPage };
}