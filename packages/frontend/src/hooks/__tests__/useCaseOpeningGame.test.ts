import { renderHook, act, waitFor } from '@testing-library/react'
import { mock } from 'bun:test'
import { useCaseOpeningGame } from '../useCaseOpeningGame'

// Mock all the smaller hooks
mock.module('../useCaseData', () => ({
  useCaseData: () => ({
    caseTypes: [
      { id: 'test-case', name: 'Test Case', price: 100 }
    ],
    isLoadingCases: false,
    error: null,
    loadCaseTypes: mock(),
    selectCase: mock(),
    selectedCase: null,
    clearError: mock()
  })
}))

mock.module('../useCaseAnimation', () => ({
  useCaseAnimation: () => ({
    animationConfig: null,
    startAnimation: mock(),
    completeAnimation: mock(),
    resetAnimation: mock(),
    isAnimating: false
  })
}))

mock.module('../useCaseOpening', () => ({
  useCaseOpening: () => ({
    isOpening: false,
    openingError: null,
    openCase: mock(),
    completeCase: mock(),
    previewCase: mock(),
    loadCaseItems: mock(),
    resetOpening: mock()
  })
}))

mock.module('../useErrorHandling', () => ({
  useErrorHandling: () => ({
    handleError: mock().mockResolvedValue(false),
    retryOperation: mock(),
    getErrorMessage: mock(),
    clearError: mock(),
    currentError: null,
    isRetrying: false
  })
}))

// Mock other dependencies
mock.module('../useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } })
}))

mock.module('../useBalance', () => ({
  useBalance: () => ({
    balance: 1000,
    refetch: mock()
  })
}))

mock.module('../useAdvancedFeatures', () => ({
  useAdvancedFeatures: () => ({
    trackGamePlayed: mock()
  })
}))

mock.module('../useSoundEffects', () => ({
  useSoundPreferences: () => ({ soundEnabled: true }),
  useSoundEffects: () => ({
    playWinSound: mock(),
    playLoseSound: mock(),
    playCaseOpen: mock(),
    playCaseReveal: mock(),
    playRarityReveal: mock()
  })
}))

mock.module('../../components/providers/ToastProvider', () => ({
  useToastContext: () => ({
    success: mock(),
    error: mock()
  })
}))

describe('useCaseOpeningGame', () => {
  let mockCaseData: any
  let mockCaseAnimation: any
  let mockCaseOpening: any
  let mockErrorHandling: any
  let mockToast: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Get references to mocked hooks
    const { useCaseData } = require('../useCaseData')
    const { useCaseAnimation } = require('../useCaseAnimation')
    const { useCaseOpening } = require('../useCaseOpening')
    const { useErrorHandling } = require('../useErrorHandling')

    mockCaseData = useCaseData()
    mockCaseAnimation = useCaseAnimation()
    mockCaseOpening = useCaseOpening()
    mockCaseAnimation = useCaseAnimation()

    const { useToastContext } = require('../../components/providers/ToastProvider')
    mockToast = useToastContext()
  })

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useCaseOpeningGame())

    expect(result.current.gameState.phase).toBe('idle')
    expect(result.current.gameState.selectedCase).toBeNull()
    expect(result.current.gameState.result).toBeNull()
    expect(result.current.gameState.history).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('should return case data from useCaseData hook', () => {
    const { result } = renderHook(() => useCaseOpeningGame())

    expect(result.current.caseTypes).toEqual(mockCaseData.caseTypes)
    expect(result.current.isLoadingCases).toBe(false)
  })

  it('should prevent opening case when another is in progress', async () => {
    const { result } = renderHook(() => useCaseOpeningGame())

    // Set game state to opening
    act(() => {
      result.current.gameState.phase = 'opening'
    })

    const caseType = { id: 'test-case', name: 'Test Case', price: 100 }

    await act(async () => {
      await result.current.openCase(caseType)
    })

    expect(mockCaseOpening.openCase).not.toHaveBeenCalled()
  })

  it('should prevent opening case when user balance is insufficient', async () => {
    // Mock insufficient balance
    const { useBalance } = require('../useBalance')
    useBalance.mockReturnValue({
      balance: 50, // Less than case price of 100
      refetch: jest.fn()
    })

    const { result } = renderHook(() => useCaseOpeningGame())

    const caseType = { id: 'test-case', name: 'Test Case', price: 100 }

    await act(async () => {
      await result.current.openCase(caseType)
    })

    expect(mockToast.error).toHaveBeenCalledWith(
      'Insufficient balance',
      expect.stringContaining('more')
    )
    expect(mockCaseOpening.openCase).not.toHaveBeenCalled()
  })

  it('should prevent opening case when no user', async () => {
    const { useAuth } = require('../useAuth')
    useAuth.mockReturnValue({ user: null })

    const { result } = renderHook(() => useCaseOpeningGame())

    const caseType = { id: 'test-case', name: 'Test Case', price: 100 }

    await act(async () => {
      await result.current.openCase(caseType)
    })

    expect(mockCaseOpening.openCase).not.toHaveBeenCalled()
  })

  it('should open case successfully', async () => {
    mockCaseOpening.openCase.mockResolvedValue({
      caseTypeId: 'test-case',
      openingId: 'test-opening',
      token: 'test-token'
    })

    const { result } = renderHook(() => useCaseOpeningGame())

    const caseType = { id: 'test-case', name: 'Test Case', price: 100 }

    await act(async () => {
      await result.current.openCase(caseType)
    })

    expect(mockCaseOpening.openCase).toHaveBeenCalledWith(caseType)
    expect(mockToast.success).toHaveBeenCalled()
    expect(result.current.gameState.phase).toBe('loading')
  })

  it('should handle case opening error', async () => {
    mockCaseOpening.openCase.mockResolvedValue(null)
    mockCaseOpening.openingError = 'Test error'

    const { result } = renderHook(() => useCaseOpeningGame())

    const caseType = { id: 'test-case', name: 'Test Case', price: 100 }

    await act(async () => {
      await result.current.openCase(caseType)
    })

    expect(result.current.gameState.phase).toBe('error')
    expect(result.current.gameState.error).toBe('Test error')
  })

  it('should complete animation successfully', async () => {
    const mockResult = {
      item_won: { id: 'item-1', name: 'Test Item', rarity: 'rare' },
      currency_awarded: 500
    }

    mockCaseOpening.completeCase.mockResolvedValue(mockResult)

    const { result } = renderHook(() => useCaseOpeningGame())

    // Set up pending completion
    act(() => {
      result.current.gameState.pendingCompletion = {
        caseTypeId: 'test-case',
        openingId: 'test-opening',
        token: 'test-token'
      }
      result.current.gameState.selectedCase = { id: 'test-case', price: 100 }
    })

    await act(async () => {
      await result.current.completeAnimation(mockResult)
    })

    expect(mockCaseOpening.completeCase).toHaveBeenCalled()
    expect(result.current.gameState.phase).toBe('complete')
  })

  it('should reset game state', () => {
    const { result } = renderHook(() => useCaseOpeningGame())

    // Set some state
    act(() => {
      result.current.gameState.phase = 'complete'
      result.current.gameState.result = { item_won: {}, currency_awarded: 100 }
      result.current.gameState.selectedCase = { id: 'test' }
    })

    act(() => {
      result.current.resetGame()
    })

    expect(result.current.gameState.phase).toBe('idle')
    expect(result.current.gameState.selectedCase).toBeNull()
    expect(result.current.gameState.result).toBeNull()
    expect(mockCaseAnimation.resetAnimation).toHaveBeenCalled()
    expect(mockCaseOpening.resetOpening).toHaveBeenCalled()
    expect(mockErrorHandling.clearError).toHaveBeenCalled()
  })

  it('should combine errors from all hooks', () => {
    // Mock error in case data
    const { useCaseData } = require('../useCaseData')
    useCaseData.mockReturnValue({
      ...mockCaseData,
      error: 'Case data error'
    })

    const { result } = renderHook(() => useCaseOpeningGame())

    expect(result.current.error).toBe('Case data error')
  })

  it('should call loadCaseTypes from case data hook', () => {
    const { result } = renderHook(() => useCaseOpeningGame())

    act(() => {
      result.current.loadCaseTypes()
    })

    expect(mockCaseData.loadCaseTypes).toHaveBeenCalled()
  })

  it('should handle animation setup errors with fallback', async () => {
    mockCaseOpening.openCase.mockResolvedValue({
      caseTypeId: 'test-case',
      openingId: 'test-opening',
      token: 'test-token'
    })

    mockCaseOpening.loadCaseItems.mockRejectedValue(new Error('Load failed'))
    mockErrorHandling.handleError.mockResolvedValue(true) // Recovery successful

    const { result } = renderHook(() => useCaseOpeningGame())

    const caseType = { id: 'test-case', name: 'Test Case', price: 100 }

    await act(async () => {
      await result.current.openCase(caseType)
    })

    expect(mockErrorHandling.handleError).toHaveBeenCalledWith(
      expect.any(Error),
      'animation setup'
    )
  })

  it('should transition through phases correctly', async () => {
    mockCaseOpening.openCase.mockResolvedValue({
      caseTypeId: 'test-case',
      openingId: 'test-opening',
      token: 'test-token'
    })

    mockCaseOpening.loadCaseItems.mockResolvedValue([])
    mockCaseOpening.previewCase.mockResolvedValue({
      item_won: { id: 'item-1', name: 'Test Item', rarity: 'common' },
      currency_awarded: 100
    })

    const { result } = renderHook(() => useCaseOpeningGame())

    const caseType = { id: 'test-case', name: 'Test Case', price: 100 }

    await act(async () => {
      await result.current.openCase(caseType)
    })

    // Wait for animation setup to complete
    await waitFor(() => {
      expect(result.current.gameState.phase).toBe('animating')
    })

    expect(result.current.gameState.phase).toBe('animating')
    expect(result.current.gameState.animationConfig).toBeDefined()
  })
})
