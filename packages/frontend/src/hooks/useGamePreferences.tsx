import { useState, useCallback, createContext, useContext, ReactNode } from 'react'

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

interface GamePreferencesContextValue {
  animationSpeed: AnimationSpeed
  setAnimationSpeed: (speed: AnimationSpeed) => void
  quickOpen: boolean
  toggleQuickOpen: () => void
  currentDuration: number
  ANIMATION_DURATIONS: typeof ANIMATION_DURATIONS
}

// Create Context (React.dev pattern for shared state)
const GamePreferencesContext = createContext<GamePreferencesContextValue | undefined>(undefined)

/**
 * Game Preferences Provider Component
 * Based on React.dev Context patterns for shared state
 * Research: https://react.dev/reference/react/useContext
 */
export const GamePreferencesProvider = ({ children }: { children: ReactNode }) => {
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
    console.log(`🎮 Animation speed changed: ${speed} (${ANIMATION_DURATIONS[speed]}ms)`)
    setAnimationSpeedState(speed)
    localStorage.setItem(STORAGE_KEY_SPEED, speed)
  }, [])

  const toggleQuickOpen = useCallback(() => {
    const newValue = !quickOpen
    console.log(`⚡ Quick open toggled: ${newValue}`)
    setQuickOpenState(newValue)
    localStorage.setItem(STORAGE_KEY_QUICK_OPEN, JSON.stringify(newValue))
  }, [quickOpen])

  // Get current duration based on speed
  const currentDuration = ANIMATION_DURATIONS[animationSpeed]

  const value: GamePreferencesContextValue = {
    animationSpeed,
    setAnimationSpeed,
    quickOpen,
    toggleQuickOpen,
    currentDuration,
    ANIMATION_DURATIONS
  }

  return (
    <GamePreferencesContext.Provider value={value}>
      {children}
    </GamePreferencesContext.Provider>
  )
}

/**
 * Custom hook for accessing game preferences from Context.
 * Now all components share the same state!
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
  const context = useContext(GamePreferencesContext)
  if (!context) {
    throw new Error('useGamePreferences must be used within GamePreferencesProvider')
  }
  return context
}

/**
 * Hook to get just the duration (for components that only need duration)
 */
export const useAnimationDuration = () => {
  const { currentDuration } = useGamePreferences()
  return currentDuration
}


