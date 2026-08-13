import { describe, test, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../../components/providers/ToastProvider', () => ({
  useToastContext: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    addToast: vi.fn(),
    removeToast: vi.fn(),
    clearAllToasts: vi.fn(),
  }),
}))

vi.mock('../useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    session: { access_token: 'test-token' },
    loading: false,
  }),
}))

vi.mock('../useBalance', () => ({
  useBalance: () => ({
    balance: 10000,
    refetch: vi.fn(),
    isLoading: false,
    error: null,
  }),
}))

vi.mock('../useAchievements', () => ({
  useAchievements: () => ({
    trackGamePlayed: vi.fn(),
  }),
}))

vi.mock('../useSoundEffects', () => ({
  useSoundEffects: () => ({
    playWinSound: vi.fn(),
    playLoseSound: vi.fn(),
    playCaseOpen: vi.fn(),
    playCaseReveal: vi.fn(),
    playRarityReveal: vi.fn(),
  }),
  useSoundPreferences: () => ({
    soundEnabled: true,
  }),
}))

vi.mock('../useGamePreferences', () => ({
  useGamePreferences: () => ({
    quickOpen: false,
    currentDuration: 4000,
  }),
}))

vi.mock('../useCaseData', () => ({
  useCaseData: () => ({
    caseTypes: [],
    isLoadingCases: false,
    selectedCase: null,
    error: null,
    selectCase: vi.fn(),
    clearError: vi.fn(),
    loadCaseTypes: vi.fn(),
  }),
}))

vi.mock('../useCaseAnimation', () => ({
  useCaseAnimation: () => ({
    startAnimation: vi.fn(),
    resetAnimation: vi.fn(),
  }),
}))

vi.mock('../useCaseOpening', () => ({
  useCaseOpening: () => ({
    loadCaseItems: vi.fn().mockResolvedValue([]),
    completeCase: vi.fn().mockResolvedValue(null),
    resetOpening: vi.fn(),
    openingError: null,
  }),
}))

vi.mock('../../services/caseCache', () => ({
  useOptimisticCaseOpening: () => ({
    mutateAsync: vi.fn(),
  }),
  getCaseCacheService: () => ({
    prefetchCaseItems: vi.fn().mockResolvedValue(undefined),
    creditWinnings: vi.fn(),
  }),
}))

vi.mock('../../utils/performanceMonitoring', () => ({
  performanceMonitoring: {
    initialize: vi.fn(),
  },
  usePerformanceMonitoring: () => ({
    monitorAPICall: vi.fn().mockImplementation((_p: string, _m: string, fn: () => any) => fn()),
    monitorGameAction: vi.fn(),
    startTiming: vi.fn().mockReturnValue(vi.fn()),
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  }),
}))

import { useCaseOpeningGame } from '../useCaseOpeningGame'

describe('useCaseOpeningGame concurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should initialize in idle phase with isProcessing false', () => {
    const { result } = renderHook(() => useCaseOpeningGame())
    expect(result.current.gameState.phase).toBe('idle')
    expect(result.current.isProcessing).toBe(false)
  })

  test('should not open case when no case is selected', async () => {
    const { result } = renderHook(() => useCaseOpeningGame())
    await act(async () => {
      await result.current.openCase()
    })
    expect(result.current.gameState.phase).toBe('idle')
  })

  test('should reset game to idle state and clear processing', () => {
    const { result } = renderHook(() => useCaseOpeningGame())
    act(() => {
      result.current.resetGame()
    })
    expect(result.current.gameState.phase).toBe('idle')
    expect(result.current.gameState.selectedCase).toBeNull()
    expect(result.current.gameState.result).toBeNull()
    expect(result.current.isProcessing).toBe(false)
  })

  test('should return all UseCaseOpeningGameReturn members', () => {
    const { result } = renderHook(() => useCaseOpeningGame())
    expect(result.current).toHaveProperty('gameState')
    expect(result.current).toHaveProperty('caseTypes')
    expect(result.current).toHaveProperty('isLoadingCases')
    expect(result.current).toHaveProperty('error')
    expect(result.current).toHaveProperty('displayBalance')
    expect(result.current).toHaveProperty('openCase')
    expect(result.current).toHaveProperty('resetGame')
    expect(result.current).toHaveProperty('completeAnimation')
    expect(result.current).toHaveProperty('loadCaseTypes')
    expect(result.current).toHaveProperty('isProcessing')
  })

  test('should have valid game state shape', () => {
    const { result } = renderHook(() => useCaseOpeningGame())
    const { gameState } = result.current
    expect(gameState).toHaveProperty('phase')
    expect(gameState).toHaveProperty('selectedCase')
    expect(gameState).toHaveProperty('result')
    expect(gameState).toHaveProperty('history')
    expect(gameState).toHaveProperty('error')
    expect(gameState).toHaveProperty('transactionId')
    expect(Array.isArray(gameState.history)).toBe(true)
  })

  test('should preserve empty history after reset', () => {
    const { result } = renderHook(() => useCaseOpeningGame())
    act(() => {
      result.current.resetGame()
    })
    expect(result.current.gameState.history).toEqual([])
  })

  test('should have displayBalance matching mocked balance', () => {
    const { result } = renderHook(() => useCaseOpeningGame())
    expect(result.current.displayBalance).toBe(10000)
  })

  test('should have no error on initialization', () => {
    const { result } = renderHook(() => useCaseOpeningGame())
    expect(result.current.error).toBeNull()
    expect(result.current.gameState.error).toBeNull()
  })
})
