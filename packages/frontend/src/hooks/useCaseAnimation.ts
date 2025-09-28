import { useState, useCallback } from 'react'
import { AnimationConfig } from '../types/caseOpening'

export interface UseCaseAnimationReturn {
  animationConfig: AnimationConfig | null
  startAnimation: (config: AnimationConfig) => void
  completeAnimation: () => void
  resetAnimation: () => void
  isAnimating: boolean
}

export const useCaseAnimation = (): UseCaseAnimationReturn => {
  const [animationConfig, setAnimationConfig] = useState<AnimationConfig | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  const startAnimation = useCallback((config: AnimationConfig) => {
    setAnimationConfig(config)
    setIsAnimating(true)
  }, [])

  const completeAnimation = useCallback(() => {
    setIsAnimating(false)
    // Keep animationConfig for completion handling
  }, [])

  const resetAnimation = useCallback(() => {
    setAnimationConfig(null)
    setIsAnimating(false)
  }, [])

  return {
    animationConfig,
    startAnimation,
    completeAnimation,
    resetAnimation,
    isAnimating
  }
}
