import { lazy } from 'react'

// Lazy load heavy components to improve initial load time
export const LazyRouletteWheel = lazy(() => import('./RouletteWheel'))
export const LazyBettingPanel = lazy(() => import('./BettingPanel'))
export const LazyResultDisplay = lazy(() => import('./ResultDisplay'))
export const LazyGameHistory = lazy(() => import('./GameHistory'))

// Preload components on user interaction
export const preloadRouletteComponents = () => {
  import('./RouletteWheel')
  import('./BettingPanel')
  import('./ResultDisplay')
  import('./GameHistory')
}