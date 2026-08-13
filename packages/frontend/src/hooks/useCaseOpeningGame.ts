import { useState, useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { useBalance } from './useBalance'
import { useAchievements } from './useAchievements'
import { useSoundEffects, useSoundPreferences } from './useSoundEffects'
import { useGamePreferences } from './useGamePreferences'
import { useToastContext } from '../components/providers/ToastProvider'
import { formatCurrency } from '../utils/currency'
import { generateCarouselSequence, calculateWinningPosition, CAROUSEL_TIMING, REVEAL_TIMING } from '../utils/carousel'
import { SimplifiedGameState, StateTransitionLogger, CaseType, CaseOpeningResult, AnimationConfig } from '../types/caseOpening'
import { useCaseData } from './useCaseData'
import { useCaseAnimation } from './useCaseAnimation'
import { useCaseOpening, CaseOpeningData } from './useCaseOpening'
import { CaseOpeningResponse } from '../services/caseOpeningApi'
import { useOptimisticCaseOpening, getCaseCacheService } from '../services/caseCache'
import { useErrorHandling } from './useErrorHandling'
import { performanceMonitoring, usePerformanceMonitoring } from '../utils/performanceMonitoring'

export interface UseCaseOpeningGameReturn {
  gameState: SimplifiedGameState
  caseTypes: CaseType[]
  isLoadingCases: boolean
  error: string | null
  displayBalance: number
  openCase: (caseType?: CaseType) => Promise<void>
  resetGame: () => void
  completeAnimation: (result: CaseOpeningResult) => void
  loadCaseTypes: () => Promise<void>
  isProcessing: boolean
}

/**
 * Centralized hook for managing case opening game state and logic.
 * 
 * This hook provides a simplified state machine for case opening with clear phases:
 * - idle: Initial state, ready for case selection
 * - loading: Case opening request in progress
 * - opening: Setting up animation
 * - animating: Carousel or reveal animation running
 * - revealing: Showing result (fallback mode)
 * - complete: Case opening finished successfully
 * - error: Error state with recovery options
 * 
 * @returns Object containing game state, case types, and control functions
 * @example
 * ```tsx
 * const { gameState, caseTypes, openCase, resetGame } = useCaseOpeningGame()
 * 
 * // Open a case
 * await openCase(selectedCase)
 * 
 * // Reset to idle state
 * resetGame()
 * ```
 */
export const useCaseOpeningGame = (): UseCaseOpeningGameReturn => {
  const { user } = useAuth()
  const { balance, refetch: refreshBalance } = useBalance()
  const { trackGamePlayed } = useAchievements()
  const { playWinSound, playLoseSound, playCaseOpen, playCaseReveal, playRarityReveal } = useSoundEffects()
  const { quickOpen, currentDuration } = useGamePreferences()
  const toast = useToastContext()
  const queryClient = useQueryClient()

  // Performance monitoring hooks
  const { monitorAPICall, monitorGameAction, startTiming } = usePerformanceMonitoring()

  // Debouncing state for preventing rapid clicks
  const [isProcessing, setIsProcessing] = useState(false)
  const lastOpenTimeRef = useRef<number>(0)

  // Use smaller hooks
  const caseData = useCaseData()
  const caseAnimation = useCaseAnimation()
  const caseOpening = useCaseOpening()
  const errorHandling = useErrorHandling()
  const optimisticCaseOpening = useOptimisticCaseOpening()

  // Initialize performance monitoring on mount
  useEffect(() => {
    performanceMonitoring.initialize()
    return () => {
      // Cleanup on unmount
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [])

  // Game state - simplified state machine
  const [gameState, setGameState] = useState<SimplifiedGameState>({
    phase: 'idle',
    selectedCase: null,
    result: null,
    history: [],
    error: null,
    transactionId: null
  })

  // Track pending winnings to delay balance update until congratulations
  const [pendingWinnings, setPendingWinnings] = useState<number>(0)

  // Track setTimeout for cleanup on unmount
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Calculate display balance (with delayCredit, balance already only has deduction, no winnings yet)
  const displayBalance = balance

  // Track credited openings to prevent duplicate credit calls
  const creditedOpeningsRef = useRef<Set<string>>(new Set())

  // Cleanup old credited openings periodically to prevent memory leaks
  const cleanupCreditedOpenings = useCallback(() => {
    // Keep only the last 50 credited openings to prevent unbounded growth
    if (creditedOpeningsRef.current.size > 50) {
      const openingsArray = Array.from(creditedOpeningsRef.current)
      const keepOpenings = openingsArray.slice(-25) // Keep the most recent 25
      creditedOpeningsRef.current = new Set(keepOpenings)
    }
  }, [])

  const transitionToPhase = useCallback((phase: SimplifiedGameState['phase'], context?: string) => {
    StateTransitionLogger.logTransition(gameState.phase, phase, context)
    setGameState(prev => ({ ...prev, phase }))
  }, [gameState.phase])

  /**
   * Quick open mode - skips animation and shows result immediately (CS2-style)
   * Based on CS2 case simulator's quick open implementation
   */
   const handleQuickOpen = useCallback(async (selectedCase: CaseType, flowId: string) => {
    try {
      // Play immediate unlock sound (different from regular open)
      playCaseOpen()

      // Make API call to open case
      const openingResponse = await monitorAPICall(
        '/api/games/cases/open',
        'POST',
        () => optimisticCaseOpening.mutateAsync({
          caseType: selectedCase,
          currentBalance: balance,
          userId: user!.id,
          delayCredit: false  // Immediate credit for quick open
        })
      )

      const result = openingResponse.opening_result

      // Transition directly to complete phase (skip animation phases)
      transitionToPhase('complete', 'Quick open completed')

      setGameState(prev => ({
        ...prev,
        phase: 'complete',
        selectedCase,
        result,
        history: [result, ...prev.history.slice(0, 9)]
      }))

      // Play rarity-based reveal sound
      playRarityReveal(result.item_won.rarity)

      // Show success message with winnings
      toast.success(
        'Case Opened Instantly!',
        `Won ${result.item_won.name} worth ${formatCurrency(result.currency_awarded, 'roubles')}`,
        { duration: 3000 }
      )

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to quick open case')
      const recovered = await errorHandling.handleError(error, 'quick open')

      if (!recovered) {
        transitionToPhase('error', `Quick open failed: ${error.message}`)
        setGameState(prev => ({
          ...prev,
          phase: 'error',
          error: error.message
        }))
      }
    }
  }, [user, balance, caseData, optimisticCaseOpening, errorHandling, toast, playCaseOpen, playRarityReveal, transitionToPhase, monitorAPICall])

  /**
   * Opens a case and manages the complete case opening flow.
   * 
   * This function handles the entire case opening process:
   * 1. Validates user authentication and balance
   * 2. Makes API call to open the case
   * 3. Sets up animation configuration
   * 4. Transitions through game phases
   * 5. Handles errors with recovery mechanisms
   * 
   * @param caseType - The case type to open (optional, uses selected case if not provided)
   * @throws Will transition to error phase if case opening fails
   * @example
   * ```tsx
   * // Open a specific case
   * await openCase(myCaseType)
   * 
   * // Open currently selected case
   * await openCase()
   * ```
   */
  const openCase = useCallback(async (caseType?: CaseType) => {
    const selectedCase = caseType || caseData.selectedCase
    const caseOpeningStart = performance.now()

    if (!selectedCase || !user) {
      return
    }

    // Prevent opening a case while another one is in progress
    if (gameState.phase !== 'idle' && gameState.phase !== 'complete') {
      console.warn('Cannot open case: another case opening is in progress', gameState.phase)
      toast.warning('Please wait', 'Another case is already opening')
      return
    }

    // Debouncing: Prevent rapid clicks (minimum 500ms between case openings)
    const now = Date.now()
    const timeSinceLastOpen = now - lastOpenTimeRef.current
    if (timeSinceLastOpen < 500) {
      console.warn('Debouncing: Click too fast', timeSinceLastOpen)
      toast.warning('Too fast!', 'Please wait before opening another case')
      return
    }

    // Set processing flag to prevent concurrent opens
    if (isProcessing) {
      console.warn('Already processing another case opening')
      return
    }
    setIsProcessing(true)
    lastOpenTimeRef.current = now

    if (balance < selectedCase.price) {
      toast.error('Insufficient balance', `You need ${formatCurrency(selectedCase.price - balance, 'roubles')} more`)
      return
    }

    // Check if quick open mode is enabled (CS2-style instant result)
    if (quickOpen) {
      await handleQuickOpen(selectedCase, '')
      return
    }

    // Update selected case if passed as parameter
    if (caseType) {
      caseData.selectCase(caseType)

      // Prefetch case items for better performance
      const prefetchTiming = startTiming('case_prefetch')
      try {
        const cacheService = getCaseCacheService()
        await cacheService.prefetchCaseItems(caseType.id)
        prefetchTiming()
      } catch (error) {
        console.warn('Cache service not available for prefetching:', error)
        prefetchTiming()
      }
    }

    // Clear any previous errors
    caseData.clearError()
    errorHandling.clearError()

    transitionToPhase('loading', 'Starting case opening')
    setGameState(prev => ({
      ...prev,
      phase: 'loading',
      result: null,
      error: null,
      selectedCase
    }))

    // Play case opening sound
    playCaseOpen()
    monitorGameAction('case_opening_started', { caseType: selectedCase.name, price: selectedCase.price })

    try {
      // Use optimistic case opening with caching and API monitoring (delay credit for suspense)
      const openingResponse = await monitorAPICall(
        '/api/games/cases/open',
        'POST',
        () => optimisticCaseOpening.mutateAsync({
          caseType: selectedCase,
          currentBalance: balance,
          userId: user.id,
          delayCredit: true
        })
      )

      // Show deduction message
      toast.success('Case Opened', `-${formatCurrency(selectedCase.price, 'roubles')} spent on case`, {
        duration: 2000
      })

      // Store transaction ID for later winnings credit
      setGameState(prev => ({
        ...prev,
        transactionId: openingResponse.transaction_id
      }))

      // Store winnings amount to be credited when congratulations appears
      setPendingWinnings(openingResponse.opening_result.currency_awarded)

      // Setup animation with small delay to ensure DOM is ready (reduced from 1000ms to 100ms)
      animationTimeoutRef.current = setTimeout(async () => {
        await setupCaseOpeningAnimation(selectedCase, '', undefined, openingResponse)
      }, 100)

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to open case')
      const recovered = await errorHandling.handleError(error, 'case opening')

      if (!recovered) {
        transitionToPhase('error', `Case opening failed: ${error.message}`)
        setGameState(prev => ({
          ...prev,
          phase: 'error',
          error: error.message
        }))
      }
    } finally {
      // Clear processing flag after operation completes
      setIsProcessing(false)
    }
  }, [user, balance, gameState.phase, caseData, caseOpening, errorHandling, toast, playCaseOpen, transitionToPhase, monitorAPICall, monitorGameAction, startTiming, currentDuration, quickOpen, isProcessing])

  // Consolidated function using TypeScript function overloading for flexible parameter handling
  const setupCaseOpeningAnimation: {
    (selectedCase: CaseType, flowId: string, result: CaseOpeningResult): Promise<void>;
    (selectedCase: CaseType, flowId: string, result: undefined, openingResponse: CaseOpeningResponse): Promise<void>;
  } = useCallback(async (
    selectedCase: CaseType,
    flowId: string,
    result?: CaseOpeningResult,
    openingResponse?: CaseOpeningResponse
  ): Promise<void> => {
    // Validate that we have a result either directly or from openingResponse
    if (!result && !openingResponse?.opening_result) {
      throw new Error('Either result or openingResponse must be provided')
    }

    const caseResult = result || openingResponse!.opening_result
    const animationSetupTiming = startTiming('animation_setup')

    try {
      // Load case items for carousel generation
      const caseItemsTiming = startTiming('case_items_load')
      const caseItems = await caseOpening.loadCaseItems(selectedCase.id)
      caseItemsTiming()

      // Transition to opening phase with carousel animation config
      transitionToPhase('opening', 'Setting up carousel animation')

      const animationConfig: AnimationConfig = {
        type: 'carousel',
        duration: currentDuration, // Use user preference (fast/normal/slow)
        easing: [0.25, 0.46, 0.45, 0.94], // Smooth deceleration easing
        items: caseItems
      }

      caseAnimation.startAnimation(animationConfig)

      setGameState(prev => ({
        ...prev,
        phase: 'opening',
        animationConfig
      }))

      const winningItem = caseResult.item_won

      // Ensure we have a proper item pool
      let itemPool = caseItems.length > 0 ? caseItems : getFallbackItems(winningItem)

      // Filter out any invalid items
      itemPool = itemPool.filter(item =>
        item &&
        item.id &&
        item.name &&
        item.rarity &&
        typeof item.base_value === 'number'
      )

      // If we still don't have enough items for a good carousel experience,
      // duplicate the existing items to fill out the sequence
      if (itemPool.length < 20) {
        const originalItems = [...itemPool]
        while (itemPool.length < 20) {
          itemPool.push(...originalItems.slice(0, Math.min(5, 20 - itemPool.length)))
        }
        // Trim to exactly 20 items
        itemPool = itemPool.slice(0, 20)
      }

      // Check if we have enough items for a proper carousel animation
      if (itemPool.length < CAROUSEL_TIMING.MIN_SEQUENCE_LENGTH) {
        // Not enough items for carousel - use reveal animation instead

        // Transition to revealing phase for simple reveal animation
        transitionToPhase('revealing', 'Insufficient items for carousel, using reveal animation')

        const revealAnimationConfig: AnimationConfig = {
          type: 'reveal',
          duration: REVEAL_TIMING.DURATION,
          easing: [0.25, 0.46, 0.45, 0.94],
          items: itemPool
        }

        setGameState(prev => ({
          ...prev,
          phase: 'revealing',
          result: caseResult,
          animationConfig: revealAnimationConfig,
          pendingCompletion: {
            caseTypeId: selectedCase.id,
            openingId: caseResult.opening_id,
            token: '',
            predeterminedWinner: caseResult
          }
        }))

        // Note: completeAnimation will be called by the ItemReveal component
        // when the animation completes, which will credit the winnings

        animationSetupTiming()
        return
      }

      // Generate the sequence with winning item at the correct position
      // Use a smaller sequence length based on available items
      const sequenceLength = Math.min(CAROUSEL_TIMING.SEQUENCE_LENGTH, itemPool.length * CAROUSEL_TIMING.MAX_SEQUENCE_MULTIPLIER)
      const winningPosition = calculateWinningPosition(sequenceLength)
      const sequenceGenerationTiming = startTiming('sequence_generation')
      const carouselSequence = generateCarouselSequence(itemPool, winningItem, sequenceLength, winningPosition)
      sequenceGenerationTiming()

      // Transition to animating phase with carousel data
      transitionToPhase('animating', 'Starting carousel animation')

      const updatedAnimationConfig: AnimationConfig = {
        ...animationConfig,
        items: carouselSequence,
        winningIndex: winningPosition
      }

      caseAnimation.startAnimation(updatedAnimationConfig)

      setGameState(prev => ({
        ...prev,
        phase: 'animating',
        result: caseResult,
        animationConfig: updatedAnimationConfig,
        pendingCompletion: {
          caseTypeId: selectedCase.id,
          openingId: caseResult.opening_id,
          token: '', // Not needed with simplified API
          predeterminedWinner: caseResult
        }
      }))

      animationSetupTiming()

    } catch (error) {
      console.error('Animation setup error:', error)
      animationSetupTiming()

      // Fallback to reveal animation
      const recovered = await errorHandling.handleError(
        error instanceof Error ? error : new Error('Animation setup failed'),
        'animation setup'
      )

      if (recovered) {
        // Try reveal fallback - only if we have openingResponse
        if (openingResponse) {
          await handleRevealFallback(selectedCase, openingResponse, '')
        }
      } else {
        transitionToPhase('error', 'Animation setup failed')
        setGameState(prev => ({
          ...prev,
          phase: 'error',
          error: 'Failed to setup animation'
        }))
      }
    }
  }, [caseOpening, caseAnimation, transitionToPhase, errorHandling, startTiming, currentDuration])

  const handleRevealFallback = useCallback(async (selectedCase: CaseType, openingResponse: CaseOpeningResponse, flowId: string) => {
    try {
      // Use the result from the opening response (already completed)
      const result = openingResponse.opening_result

      transitionToPhase('revealing', 'Using reveal fallback')

      const revealAnimationConfig: AnimationConfig = {
        type: 'reveal',
        duration: REVEAL_TIMING.DURATION,
        easing: [0.25, 0.46, 0.45, 0.94],
        items: [result.item_won]
      }

      setGameState(prev => ({
        ...prev,
        phase: 'revealing',
        result,
        animationConfig: revealAnimationConfig,
        pendingCompletion: {
          caseTypeId: selectedCase.id,
          openingId: result.opening_id,
          token: '',
          predeterminedWinner: result
        }
      }))

      // Note: completeAnimation will be called by the ItemReveal component
      // when the animation completes, which will credit the winnings

    } catch (error) {
      console.error('Reveal fallback error:', error)
      transitionToPhase('error', 'Reveal fallback failed')
      setGameState(prev => ({
        ...prev,
        phase: 'error',
        error: 'Failed to complete case opening'
      }))
    }
  }, [transitionToPhase])


  const completeAnimation = useCallback(async (result: CaseOpeningResult) => {
    if (!gameState.pendingCompletion) {
      console.error('completeAnimation called without pendingCompletion data')
      toast.error('Animation error', 'No pending completion data found')
      transitionToPhase('error', 'Animation completion failed: no pending data')
      setGameState(prev => ({
        ...prev,
        phase: 'error',
        error: 'Animation completion failed: no pending data'
      }))
      return
    }

    try {
      // Complete the case opening using the case opening hook
      const finalResult = await caseOpening.completeCase(gameState.pendingCompletion)
      if (!finalResult) {
        throw new Error('Failed to complete case opening')
      }

      // Credit pending winnings to balance and show congratulations toast
      if (pendingWinnings > 0 && user) {
        // Update the balance cache to add the winnings
        const cacheService = getCaseCacheService()
        cacheService.creditWinnings(user.id, pendingWinnings)
        
        // Clear pending winnings
        setPendingWinnings(0)
        
        // Show winnings toast
        toast.success('Congratulations!', `+${formatCurrency(pendingWinnings, 'roubles')} won!`, {
          duration: 3000
        })
      }

      // Animation is complete - transition to complete phase with final result
      transitionToPhase('complete', 'Case opening animation completed')

      setGameState(prev => ({
        ...prev,
        phase: 'complete',
        result: finalResult,
        history: [finalResult, ...prev.history.slice(0, 9)],
        pendingCompletion: undefined
      }))

    } catch (error) {
      console.error('Animation completion error:', error)
      const recovered = await errorHandling.handleError(
        error instanceof Error ? error : new Error('Animation completion failed'),
        'animation completion'
      )

      if (!recovered) {
        transitionToPhase('error', 'Animation completion failed')
        toast.error('Failed to complete case opening')
        setGameState(prev => ({
          ...prev,
          phase: 'error',
          error: 'Failed to complete case opening',
          pendingCompletion: undefined
        }))
      }
    }
  }, [gameState.pendingCompletion, gameState.selectedCase, caseOpening, errorHandling, transitionToPhase, toast, user, balance, queryClient, pendingWinnings])


  /**
   * Resets the game to idle state while preserving opening history.
   * 
   * This function:
   * - Transitions to 'idle' phase
   * - Clears current case selection and result
   * - Preserves opening history for user reference
   * - Resets all animation and opening states
   * - Clears any error states
   * 
   * @example
   * ```tsx
   * // Reset after completing a case opening
   * resetGame()
   * 
   * // Reset after an error
   * resetGame()
   * ```
   */
  const resetGame = useCallback(() => {
    transitionToPhase('idle', 'Game reset to idle state')
    setGameState(prev => ({
      phase: 'idle',
      selectedCase: null,
      result: null,
      history: prev.history, // Keep history
      error: null,
      transactionId: null,
      animationConfig: undefined
    }))
    caseAnimation.resetAnimation()
    caseOpening.resetOpening()
    errorHandling.clearError()
    setIsProcessing(false)
    lastOpenTimeRef.current = 0
  }, [transitionToPhase, caseAnimation, caseOpening, errorHandling])

  // Combine errors from all hooks
  const combinedError = gameState.error || caseData.error || caseOpening.openingError || errorHandling.currentError

  return {
    gameState: {
      ...gameState,
      error: combinedError
    },
    caseTypes: caseData.caseTypes,
    isLoadingCases: caseData.isLoadingCases,
    error: combinedError,
    displayBalance,
    openCase,
    resetGame,
    completeAnimation,
    loadCaseTypes: caseData.loadCaseTypes,
    isProcessing
  }
}

// Helper function for fallback items
const getFallbackItems = (winningItem: any) => [
  winningItem,
  {
    id: 'fallback-1',
    name: 'Bandage',
    rarity: 'common',
    base_value: 100,
    category: 'medical',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'fallback-2',
    name: 'Salewa First Aid Kit',
    rarity: 'uncommon',
    base_value: 300,
    category: 'medical',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'fallback-3',
    name: 'IFAK Personal Tactical First Aid Kit',
    rarity: 'rare',
    base_value: 1000,
    category: 'medical',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]
