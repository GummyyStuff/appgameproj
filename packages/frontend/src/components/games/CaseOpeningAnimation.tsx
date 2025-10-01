import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AnimationConfig } from '../../types/animation'
import { CaseOpeningResult } from './ItemReveal'
import CaseOpeningCarousel from './CaseOpeningCarousel'
import ItemReveal from './ItemReveal'
import { animationVariants } from '../../styles/animationVariants'

interface CaseOpeningAnimationProps {
  config: AnimationConfig
  result?: CaseOpeningResult | null
  onComplete: () => void
}

/**
 * Unified animation component for case opening that supports both carousel and reveal animations.
 * 
 * This component provides a single interface for all case opening animations:
 * - Carousel animations with virtualized item display
 * - Reveal animations for fallback scenarios
 * - Smooth phase transitions and completion callbacks
 * - Performance-optimized rendering
 * 
 * @param config - Animation configuration specifying type, duration, and easing
 * @param result - The case opening result to display
 * @param onComplete - Callback fired when animation completes
 * @example
 * ```tsx
 * <CaseOpeningAnimation
 *   config={{
 *     type: 'carousel',
 *     duration: 5000,
 *     easing: [0.25, 0.46, 0.45, 0.94],
 *     items: carouselItems,
 *     winningIndex: 15
 *   }}
 *   result={openingResult}
 *   onComplete={handleAnimationComplete}
 * />
 * ```
 */
const CaseOpeningAnimation: React.FC<CaseOpeningAnimationProps> = ({
  config,
  result,
  onComplete
}) => {
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'running' | 'complete'>('idle')

  useEffect(() => {
    if (config && animationPhase === 'idle') {
      startAnimation()
    }
  }, [config, animationPhase])

  const startAnimation = () => {
    setAnimationPhase('running')

    // The individual animation components will handle their own timing and call onComplete
  }

  const handleCarouselComplete = () => {
    setAnimationPhase('complete')
    onComplete()
  }

  const handleRevealComplete = () => {
    setAnimationPhase('complete')
    onComplete()
  }

  if (!config) {
    return null
  }

  return (
    <div className="animation-container">
      {config.type === 'carousel' && config.items && config.items.length > 0 && (
        <CaseOpeningCarousel
          items={config.items}
          winningIndex={config.winningIndex || 0}
          isSpinning={animationPhase === 'running'}
          onSpinComplete={handleCarouselComplete}
          finalItem={result?.item_won}
          duration={config.duration}
        />
      )}

      {config.type === 'reveal' && result && (
        <ItemReveal
          result={result}
          isRevealing={animationPhase === 'running'}
          onRevealComplete={handleRevealComplete}
        />
      )}

      {/* Loading state for when animation is preparing */}
      {animationPhase === 'idle' && (
        <div className="animation-placeholder">
          <motion.div
            className="animation-placeholder-text"
            {...animationVariants.loading.pulse}
          >
            {config.type === 'carousel' ? '🎰 Preparing carousel...' : '✨ Preparing reveal...'}
          </motion.div>

          <div className="loading-dots">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="loading-dot"
                {...animationVariants.loading.dots}
                transition={{
                  ...animationVariants.loading.dots.transition,
                  delay: i * 0.2
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CaseOpeningAnimation


