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
export const LazyWheelOfChanceGame = withLazyLoading(
  () => import('@/components/games/WheelSpinner'),
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner />
    <span className="ml-2 text-tarkov-text">Loading Wheel...</span>
  </div>
);

/**
 * Lazy-loaded page components
 */
export const LazyLeaderboardPage = withLazyLoading(
  () => import('@/pages/LeaderboardPage')
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
  const preloadPromises = [
    import('@/components/games/WheelSpinner'),
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
  const preloadGame = (gameType: 'wheel_of_chance') => {
    switch (gameType) {
      case 'wheel_of_chance':
        return import('@/components/games/WheelSpinner');
      default:
        return Promise.resolve();
    }
  };

  const preloadPage = (page: string) => {
    switch (page) {
      case 'wheel':
        return import('@/pages/WheelOfChancePage');
      case 'profile':
        return import('@/pages/ProfilePage');
      case 'leaderboard':
        return import('@/pages/LeaderboardPage');
      default:
        return Promise.resolve();
    }
  };

  return { preloadGame, preloadPage };
}
