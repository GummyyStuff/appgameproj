import { describe, test, expect, vi } from 'vitest'

vi.mock('@/components/games/WheelSpinner', () => ({ default: () => null }))
vi.mock('@/pages/WheelOfChancePage', () => ({ default: () => null }))
vi.mock('@/pages/LeaderboardPage', () => ({ default: () => null }))
vi.mock('@/pages/ProfilePage', () => ({ default: () => null }))
vi.mock('@/components/ui/StatisticsDashboard', () => ({ default: () => null }))
vi.mock('@/components/ui/GameHistoryTable', () => ({ default: () => null }))
vi.mock('@/components/ui/AchievementSystem', () => ({ default: () => null }))

import {
  withLazyLoading,
  preloadOnHover,
  useProgressiveLoading,
  LazyWheelOfChanceGame,
  LazyLeaderboardPage,
  LazyProfilePage,
  LazyStatisticsDashboard,
  LazyGameHistoryTable,
  LazyAchievementSystem,
} from '../lazy-loading'

describe('Lazy Loading Utilities', () => {
  describe('withLazyLoading', () => {
    test('should return a React component function', () => {
      const mockImport = () => Promise.resolve({ default: () => null })
      const LazyWrapper = withLazyLoading(mockImport)
      expect(typeof LazyWrapper).toBe('function')
    })

    test('should accept a custom fallback', () => {
      const mockImport = () => Promise.resolve({ default: () => null })
      const fallback = 'Loading...'
      const LazyWrapper = withLazyLoading(mockImport, fallback)
      expect(typeof LazyWrapper).toBe('function')
    })
  })

  describe('preloadOnHover', () => {
    test('should return onMouseEnter and onFocus handlers', () => {
      const mockImport = vi.fn().mockResolvedValue({})
      const handlers = preloadOnHover(mockImport)

      expect(handlers).toHaveProperty('onMouseEnter')
      expect(handlers).toHaveProperty('onFocus')
      expect(typeof handlers.onMouseEnter).toBe('function')
      expect(typeof handlers.onFocus).toBe('function')
    })

    test('should trigger import on mouse enter', () => {
      const mockImport = vi.fn().mockResolvedValue({})
      const handlers = preloadOnHover(mockImport)

      handlers.onMouseEnter()
      expect(mockImport).toHaveBeenCalledTimes(1)
    })

    test('should only trigger import once across multiple calls', () => {
      const mockImport = vi.fn().mockResolvedValue({})
      const handlers = preloadOnHover(mockImport)

      handlers.onMouseEnter()
      handlers.onFocus()
      handlers.onMouseEnter()

      expect(mockImport).toHaveBeenCalledTimes(1)
    })
  })

  describe('useProgressiveLoading', () => {
    test('should return preloadGame and preloadPage functions', () => {
      const { preloadGame, preloadPage } = useProgressiveLoading()
      expect(typeof preloadGame).toBe('function')
      expect(typeof preloadPage).toBe('function')
    })

    test('should return a promise from preloadGame for wheel_of_chance', () => {
      const { preloadGame } = useProgressiveLoading()
      const result = preloadGame('wheel_of_chance')
      expect(result).toBeInstanceOf(Promise)
    })

    test('should return a promise from preloadPage for known pages', () => {
      const { preloadPage } = useProgressiveLoading()
      expect(preloadPage('wheel')).toBeInstanceOf(Promise)
      expect(preloadPage('profile')).toBeInstanceOf(Promise)
      expect(preloadPage('leaderboard')).toBeInstanceOf(Promise)
    })

    test('should resolve unknown page to a completed promise', () => {
      const { preloadPage } = useProgressiveLoading()
      const result = preloadPage('unknown')
      expect(result).toBeInstanceOf(Promise)
    })
  })

  describe('Lazy Component Exports', () => {
    test('should export lazy game components', () => {
      expect(LazyWheelOfChanceGame).toBeDefined()
      expect(typeof LazyWheelOfChanceGame).toBe('function')
    })

    test('should export lazy page components', () => {
      expect(LazyLeaderboardPage).toBeDefined()
      expect(LazyProfilePage).toBeDefined()
    })

    test('should export lazy UI components', () => {
      expect(LazyStatisticsDashboard).toBeDefined()
      expect(LazyGameHistoryTable).toBeDefined()
      expect(LazyAchievementSystem).toBeDefined()
    })
  })
})
