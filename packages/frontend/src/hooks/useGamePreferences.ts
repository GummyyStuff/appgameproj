import { useState, useCallback } from 'react'

/**
 * Animation speed options for case opening carousel
 * Based on CS2 case opening simulator patterns
 */
export type AnimationSpeed = 'fast' | 'normal' | 'slow'

export interface GamePreferences {
  animationSpeed: AnimationSpeed
  quickOpen: boolean
}

/**
 * Animation duration mappings (in milliseconds)
 * Based on research from CS2 simulator and UX best practices
 */
export const ANIMATION_DURATIONS: Record<AnimationSpeed, number> = {
  fast: 1500,    // 1.5 seconds - for power users (CS2 fast mode)
  normal: 3600,  // 3.6 seconds - balanced (our optimized default)
  slow: 6000     // 6 seconds - full experience (CS2 normal mode)
}

const STORAGE_KEY_SPEED = 'tarkov-casino-animation-speed'
const STORAGE_KEY_QUICK_OPEN = 'tarkov-casino-quick-open'

/**
 * Custom hook for managing game preferences with localStorage persistence.
 * Follows the same pattern as useSoundPreferences for consistency.
 * 
 * Features:
 * - Animation speed control (fast/normal/slow)
 * - Quick open mode (skip animation entirely)
 * - Persistent storage using localStorage
 * - Type-safe with TypeScript
 * 
 * @example
 * ```tsx
 * const { animationSpeed, setAnimationSpeed, quickOpen, toggleQuickOpen } = useGamePreferences()
 * 
 * // Get duration for carousel
 * const duration = ANIMATION_DURATIONS[animationSpeed]
 * ```
 */
export const useGamePreferences = () => {
  // Animation speed preference
  const [animationSpeed, setAnimationSpeedState] = useState<AnimationSpeed>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SPEED)
    if (saved && (saved === 'fast' || saved === 'normal' || saved === 'slow')) {
      return saved as AnimationSpeed
    }
    return 'normal' // Default to optimized normal speed
  })

  // Quick open preference
  const [quickOpen, setQuickOpenState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_QUICK_OPEN)
    return saved !== null ? JSON.parse(saved) : false
  })

  const setAnimationSpeed = useCallback((speed: AnimationSpeed) => {
    setAnimationSpeedState(speed)
    localStorage.setItem(STORAGE_KEY_SPEED, speed)
  }, [])

  const toggleQuickOpen = useCallback(() => {
    const newValue = !quickOpen
    setQuickOpenState(newValue)
    localStorage.setItem(STORAGE_KEY_QUICK_OPEN, JSON.stringify(newValue))
  }, [quickOpen])

  // Get current duration based on speed
  const currentDuration = ANIMATION_DURATIONS[animationSpeed]

  return {
    animationSpeed,
    setAnimationSpeed,
    quickOpen,
    toggleQuickOpen,
    currentDuration,
    ANIMATION_DURATIONS
  }
}

/**
 * Hook to get just the duration (for components that only need duration)
 */
export const useAnimationDuration = () => {
  const { currentDuration } = useGamePreferences()
  return currentDuration
}


