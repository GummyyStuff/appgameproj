import React, { useState, useEffect, useRef } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { TarkovItem } from './ItemReveal'
import { CaseType } from './CaseSelector'
import { formatCurrency } from '../../utils/currency'
import { useSoundEffects } from '../../hooks/useSoundEffects'

export interface CarouselItemData {
  item: TarkovItem
  id: string
  isWinning: boolean
}

interface CaseOpeningCarouselProps {
  items: CarouselItemData[]
  winningIndex: number
  isSpinning: boolean
  onSpinComplete: () => void
  caseType: CaseType
  finalItem?: TarkovItem | null
  animationDuration?: number
  itemWidth?: number
  visibleItems?: number
  soundEnabled?: boolean
}

interface CarouselAnimationConfig {
  totalItems: number
  itemWidth: number
  winningIndex: number
  spinDuration: number
  decelerationDuration: number
  finalPosition: number
  easing: string
}

const rarityColors = {
  common: {
    border: 'border-gray-400',
    glow: 'shadow-gray-400/50',
    bg: 'bg-gray-400/10'
  },
  uncommon: {
    border: 'border-green-400',
    glow: 'shadow-green-400/50',
    bg: 'bg-green-400/10'
  },
  rare: {
    border: 'border-blue-400',
    glow: 'shadow-blue-400/50',
    bg: 'bg-blue-400/10'
  },
  epic: {
    border: 'border-purple-400',
    glow: 'shadow-purple-400/50',
    bg: 'bg-purple-400/10'
  },
  legendary: {
    border: 'border-yellow-400',
    glow: 'shadow-yellow-400/50',
    bg: 'bg-yellow-400/10'
  }
}

const categoryIcons = {
  medical: '🏥',
  electronics: '💻',
  consumables: '🍖',
  valuables: '💰',
  keycards: '🗝️'
}

const CaseOpeningCarousel: React.FC<CaseOpeningCarouselProps> = ({
  items,
  winningIndex,
  isSpinning,
  onSpinComplete,
  caseType,
  finalItem,
  itemWidth = 120,
  visibleItems = 5,
  soundEnabled = true
}) => {
  const { playCaseOpen, playCaseReveal } = useSoundEffects(soundEnabled)
  const carouselRef = useRef<HTMLDivElement>(null)
  const controls = useAnimation()
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'spinning' | 'decelerating' | 'settling' | 'complete'>('idle')

  const [blurIntensity, setBlurIntensity] = useState(0)
  const [shouldShake, setShouldShake] = useState(false)

  // Calculate carousel dimensions
  const viewportWidth = visibleItems * itemWidth
  const centerOffset = viewportWidth / 2 - itemWidth / 2
  
  // Validate winning index
  const safeWinningIndex = Math.max(0, Math.min(winningIndex, items.length - 1))

  // Animation configuration
  const animationConfig: CarouselAnimationConfig = {
    totalItems: items.length,
    itemWidth,
    winningIndex: safeWinningIndex,
    spinDuration: 2000, // 2 seconds fast spin
    decelerationDuration: 3000, // 3 seconds deceleration
    finalPosition: -(safeWinningIndex * itemWidth - centerOffset),
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  }

  // Calculate initial position - start at the beginning of the sequence
  // The carousel should start showing the first few items, not the winning item
  const initialPosition = 0

  // Reset animation state when items change
  useEffect(() => {
    if (!isSpinning) {
      setAnimationPhase('idle')
      setBlurIntensity(0)
      setShouldShake(false)
      // Reset to initial position when not spinning
      if (items.length > 0) {
        controls.set({ x: initialPosition })
      }
    }
  }, [items, isSpinning, initialPosition, controls])

  useEffect(() => {
    if (isSpinning && items.length > 0) {
      // Validate items before starting animation
      const validItems = items.filter(itemData => itemData && itemData.item)
      if (validItems.length === 0) {
        console.error('CaseOpeningCarousel: No valid items found')
        onSpinComplete()
        return
      }
      startCarouselAnimation()
    }
  }, [isSpinning, items])

  const startCarouselAnimation = async () => {
    setAnimationPhase('spinning')
    
    // Play carousel start sound
    playCaseOpen()

    try {
      // Calculate positions for smooth single-direction animation
      const finalPosition = animationConfig.finalPosition
      
      // Start far to the left for excitement
      const extraSpinDistance = itemWidth * 50 // Extra distance for excitement
      const startPosition = finalPosition - extraSpinDistance
      
      // Debug the winning item position calculation
      const winningItemLeftEdge = safeWinningIndex * itemWidth
      const winningItemCenter = winningItemLeftEdge + (itemWidth / 2)
      const viewportCenter = centerOffset + (itemWidth / 2)
      
      console.log('Detailed position analysis:', {
        // Basic info
        winningIndex: safeWinningIndex,
        itemsLength: items.length,
        itemWidth,
        
        // Viewport info
        viewportWidth,
        centerOffset,
        viewportCenter,
        
        // Winning item info
        winningItemLeftEdge,
        winningItemCenter,
        
        // Animation positions
        startPosition,
        finalPosition,
        extraSpinDistance,
        
        // Calculation check
        calculatedFinalPosition: -(safeWinningIndex * itemWidth - centerOffset),
        
        // Direction info
        direction: 'left-to-right only',
        totalCarouselWidth: items.length * itemWidth
      })
      
      // Firefox-compatible animation approach
      setBlurIntensity(8)
      setAnimationPhase('spinning')
      
      // Firefox has issues with complex easing curves causing direction reversals
      // Use linear easing and multiple simple animations for Firefox compatibility
      const isFirefox = navigator.userAgent.toLowerCase().includes('firefox')
      const easing = isFirefox ? 'linear' : [0.1, 0.8, 0.9, 1]
      
      // Never-overshoot approach: Calculate positions to ensure we never go past the winning item
      console.log('Using never-overshoot animation approach')
      
      // The key insight: we must NEVER animate past the final position
      // Calculate a safe intermediate position that's guaranteed to be before the final position
      const totalDistance = finalPosition - startPosition // This should be positive (moving right)
      
      // Safety check: if totalDistance is negative or zero, something is wrong with our calculation
      if (totalDistance <= 0) {
        console.error('Invalid distance calculation - finalPosition should be to the right of startPosition', {
          startPosition,
          finalPosition,
          totalDistance,
          winningIndex: safeWinningIndex,
          centerOffset
        })
        
        // Fallback: animate directly to final position
        await controls.start({
          x: finalPosition,
          transition: {
            duration: (animationConfig.spinDuration + animationConfig.decelerationDuration) / 1000,
            ease: 'linear'
          }
        })
      } else {
        // SINGLE SMOOTH ANIMATION - No phases, no intermediate positions, no direction changes
        console.log('🎯 Using SINGLE SMOOTH animation - absolutely no direction changes possible')
        console.log('Single animation plan:', {
          startPosition,
          finalPosition,
          totalDistance,
          direction: 'single smooth left-to-right movement',
          noIntermediatePositions: true,
          guaranteedNoBackwards: true,
          easingCurve: isFirefox ? 'linear' : 'fast start, then slow down [0.7, 0, 0.3, 1]'
        })
        
        // Single animation from start directly to final position
        const animationPromise = controls.start({
          x: finalPosition,
          transition: {
            duration: (animationConfig.spinDuration + animationConfig.decelerationDuration) / 1000,
            ease: isFirefox ? 'linear' : [0.7, 0, 0.3, 1] // Fast start, then slow down to stop
          }
        })
        
        // Change visual phases during the animation (without interrupting the movement)
        setTimeout(() => {
          setAnimationPhase('decelerating')
          setBlurIntensity(3)
          playCaseReveal()
        }, animationConfig.spinDuration)
        
        setTimeout(() => {
          setAnimationPhase('settling')
          setBlurIntensity(0)
        }, animationConfig.spinDuration + animationConfig.decelerationDuration - 500)
        
        // Wait for the single smooth animation to complete
        await animationPromise
      }
      
      // Phase 3: Settling
      setAnimationPhase('settling')
      setBlurIntensity(0)
      await new Promise(resolve => setTimeout(resolve, 300))

      // Animation complete
      setAnimationPhase('complete')
      
      // Check if winning item is high rarity for screen shake
      const winningItem = items[safeWinningIndex]
      if (winningItem && winningItem.item) {
        const itemRarity = winningItem.item.rarity || 'common'
        if (itemRarity === 'epic' || itemRarity === 'legendary') {
          setShouldShake(true)
          setTimeout(() => setShouldShake(false), 1000)
        }
      }
      
      onSpinComplete()

    } catch (error) {
      console.error('Carousel animation error:', error)
      setAnimationPhase('complete')
      onSpinComplete()
    }
  }

  return (
    <div className="flex justify-center w-full">
      <motion.div 
        className="relative"
        animate={shouldShake ? {
          x: [0, -2, 2, -2, 2, 0],
          y: [0, -1, 1, -1, 1, 0]
        } : {}}
        transition={{ duration: 0.5, repeat: shouldShake ? 2 : 0 }}
      >
      {/* Carousel Container */}
      <div 
        className={`
          relative overflow-hidden rounded-xl transition-all duration-300 mx-auto
          ${animationPhase === 'spinning' 
            ? 'bg-tarkov-dark/70 border-2 border-tarkov-accent/60 shadow-lg shadow-tarkov-accent/30' 
            : animationPhase === 'complete'
              ? 'bg-tarkov-dark/50 border-2 border-tarkov-accent/80 shadow-xl shadow-tarkov-accent/50'
              : 'bg-tarkov-dark/50 border-2 border-tarkov-accent/30'
          }
        `}
        style={{ 
          width: viewportWidth, // Fixed width based on visible items
          height: 180
        }}
      >
        {/* Center Pointer Indicator */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-20">
          <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-tarkov-accent drop-shadow-lg" />
        </div>

        {/* Bottom Pointer Indicator */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-20">
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-tarkov-accent drop-shadow-lg" />
        </div>

        {/* Center Selection Area Highlight */}
        <div 
          className="absolute top-0 bottom-0 bg-tarkov-accent/10 border-l-2 border-r-2 border-tarkov-accent/50 z-10"
          style={{ 
            left: centerOffset,
            width: itemWidth
          }}
        />

        {/* Carousel Items Container */}
        <motion.div
          ref={carouselRef}
          className="flex absolute top-0 left-0 h-full transition-all duration-300"
          animate={controls}
          initial={{ x: initialPosition }}
          style={{ 
            width: items.length * itemWidth,
            filter: (animationPhase === 'spinning' || animationPhase === 'decelerating') && blurIntensity > 0 ? `blur(${blurIntensity}px)` : 'none',
            willChange: 'transform', // Optimize for animations
            backfaceVisibility: 'hidden', // Prevent flickering
            // Firefox-specific optimizations
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d'
          }}
        >
          {items.map((itemData, index) => {
            // Use finalItem for the winning index when animation is complete
            const displayItemData = (index === winningIndex && animationPhase === 'complete' && finalItem)
              ? { ...itemData, item: finalItem, isWinning: true }
              : itemData

            return (
              <CarouselItem
                key={displayItemData.id}
                itemData={displayItemData}
                width={itemWidth}
                isWinning={displayItemData.isWinning && animationPhase === 'complete'}
                animationPhase={animationPhase}
              />
            )
          })}
        </motion.div>

        {/* Enhanced Gradient Fade Edges */}
        <div className="absolute top-0 left-0 w-12 h-full bg-gradient-to-r from-tarkov-dark via-tarkov-dark/60 to-transparent z-15 pointer-events-none" />
        <div className="absolute top-0 right-0 w-12 h-full bg-gradient-to-l from-tarkov-dark via-tarkov-dark/60 to-transparent z-15 pointer-events-none" />

        {/* Spinning animation effects */}
        {animationPhase === 'spinning' && (
          <>
            {/* Speed lines effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
            >
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={`speed-line-${i}`}
                  className="absolute h-0.5 bg-gradient-to-r from-transparent via-tarkov-accent/60 to-transparent"
                  style={{
                    top: `${20 + i * 25}%`,
                    width: '100%',
                    left: 0
                  }}
                  animate={{
                    x: ['-100%', '100%']
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: 'linear'
                  }}
                />
              ))}
            </motion.div>
            
            {/* Pulsing border during spin */}
            <motion.div
              className="absolute inset-0 border-2 border-tarkov-accent/60 rounded-xl pointer-events-none"
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.01, 1]
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          </>
        )}

        {/* Victory animation effects */}
        {animationPhase === 'complete' && (
          <>
            {/* Falling emojis effect */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`victory-emoji-${i}`}
                className="absolute pointer-events-none text-2xl"
                style={{
                  left: `${10 + (i % 4) * 20}%`,
                  top: '-20px'
                }}
                initial={{ y: -20, opacity: 0, rotate: 0 }}
                animate={{
                  y: '120vh',
                  opacity: [0, 1, 1, 0],
                  rotate: [0, 180, 360]
                }}
                transition={{
                  duration: 3,
                  delay: i * 0.2,
                  ease: 'easeOut'
                }}
              >
                {['🎉', '💎', '⭐', '🏆'][i % 4]}
              </motion.div>
            ))}

            {/* Golden particles effect */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={`particle-${i}`}
                className="absolute w-1 h-1 bg-yellow-400 rounded-full pointer-events-none"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${30 + Math.random() * 40}%`
                }}
                initial={{ scale: 0, opacity: 1 }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0],
                  x: [0, (Math.random() - 0.5) * 100],
                  y: [0, (Math.random() - 0.5) * 100]
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 1,
                  ease: 'easeOut'
                }}
              />
            ))}

            {/* Win glow effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 2, ease: 'easeOut' }}
            >
              <div className="w-full h-full bg-gradient-to-br from-yellow-400/20 via-yellow-500/10 to-yellow-600/5 rounded-lg" />
            </motion.div>
          </>
        )}


        {/* Deceleration glow effect */}
        {animationPhase === 'decelerating' && (
          <motion.div
            className="absolute inset-0 border-2 border-tarkov-accent/40 rounded-xl pointer-events-none"
            animate={{
              boxShadow: [
                '0 0 10px rgba(246, 173, 85, 0.3)',
                '0 0 20px rgba(246, 173, 85, 0.5)',
                '0 0 10px rgba(246, 173, 85, 0.3)'
              ]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        )}

        {/* Completion celebration */}
        {animationPhase === 'complete' && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {/* Confetti burst */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={`confetti-${i}`}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#F6AD55', '#48BB78', '#4299E1', '#9F7AEA', '#F56565'][i % 5],
                  left: '50%',
                  top: '50%'
                }}
                initial={{
                  opacity: 0,
                  scale: 0,
                  x: 0,
                  y: 0
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.5],
                  x: (Math.random() - 0.5) * 200,
                  y: (Math.random() - 0.5) * 200,
                  rotate: Math.random() * 360
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.05,
                  ease: 'easeOut'
                }}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Enhanced Animation Status Indicator */}
      <motion.div 
        className="text-center mt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <motion.div 
          className={`
            inline-flex items-center px-6 py-3 rounded-full border-2 transition-all duration-300
            ${animationPhase === 'spinning' 
              ? 'bg-tarkov-accent/20 border-tarkov-accent/50 text-tarkov-accent' 
              : animationPhase === 'decelerating'
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                : animationPhase === 'settling'
                  ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                  : animationPhase === 'complete'
                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                    : 'bg-gray-600/20 border-gray-600/50 text-gray-400'
            }
          `}
          animate={animationPhase === 'spinning' ? {
            scale: [1, 1.05, 1],
            opacity: [0.8, 1, 0.8]
          } : {}}
          transition={{ duration: 1, repeat: animationPhase === 'spinning' ? Infinity : 0 }}
        >
          <motion.span 
            className="text-lg mr-2"
            animate={animationPhase === 'spinning' ? { rotate: 360 } : {}}
            transition={{ duration: 1, repeat: animationPhase === 'spinning' ? Infinity : 0, ease: 'linear' }}
          >
            {animationPhase === 'spinning' && '🎰'}
            {animationPhase === 'decelerating' && '⏳'}
            {animationPhase === 'settling' && '🎯'}
            {animationPhase === 'complete' && '✨'}
          </motion.span>
          
          <span className="font-semibold uppercase tracking-wide text-sm">
            {animationPhase === 'spinning' && 'Spinning...'}
            {animationPhase === 'decelerating' && 'Slowing down...'}
            {animationPhase === 'settling' && 'Landing...'}
            {animationPhase === 'complete' && 'Complete!'}
          </span>
          
          {/* Progress dots */}
          {animationPhase !== 'complete' && (
            <div className="flex space-x-1 ml-3">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-current opacity-50"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ 
                    duration: 1, 
                    repeat: Infinity, 
                    delay: i * 0.2 
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
        
        {/* Phase progress bar */}
        <motion.div 
          className="mt-3 w-64 h-1 bg-gray-700 rounded-full mx-auto overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: animationPhase !== 'complete' ? 1 : 0 }}
        >
          <motion.div
            className={`h-full rounded-full ${
              animationPhase === 'spinning' 
                ? 'bg-tarkov-accent' 
                : animationPhase === 'decelerating'
                  ? 'bg-blue-400'
                  : 'bg-yellow-400'
            }`}
            initial={{ width: '0%' }}
            animate={{ 
              width: animationPhase === 'spinning' 
                ? '30%' 
                : animationPhase === 'decelerating'
                  ? '70%'
                  : animationPhase === 'settling'
                    ? '100%'
                    : '0%'
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
    </div>
  )
}

// Individual Carousel Item Component
interface CarouselItemProps {
  itemData: CarouselItemData
  width: number
  isWinning: boolean
  animationPhase: string
}

const CarouselItem: React.FC<CarouselItemProps> = ({
  itemData,
  width,
  isWinning,
  animationPhase
}) => {
  const { item } = itemData
  
  // Validate item object and provide fallbacks
  if (!item || !item.id || !item.name) {
    console.error('CarouselItem: invalid item data', itemData)
    // Return a placeholder item instead of empty space
    return (
      <div style={{ width }} className="flex-shrink-0 h-full p-2">
        <div className="h-full rounded-lg border-2 border-gray-400 bg-gray-400/10 flex flex-col items-center justify-center">
          <div className="text-2xl mb-1">📦</div>
          <div className="text-xs text-gray-400 text-center">
            Loading...
          </div>
        </div>
      </div>
    )
  }
  
  // Ensure rarity exists and fallback to 'common' if undefined
  const itemRarity = item.rarity || 'common'
  const rarity = rarityColors[itemRarity] || rarityColors.common
  
  // Ensure other properties have fallbacks
  const itemName = item.name || 'Unknown Item'
  const itemValue = item.base_value || 0
  const itemCategory = item.category || 'valuables'

  return (
    <div
      className={`
        flex-shrink-0 h-full p-2 relative
        ${isWinning ? `${rarity.glow} shadow-2xl` : ''}
      `}
      style={{ width }}
    >
      <div
        className={`
          h-full rounded-lg border-2 overflow-hidden relative
          transition-all duration-300
          ${rarity.border} ${rarity.bg}
          ${isWinning ? 'scale-105 animate-pulse' : ''}
        `}
      >
        {/* Item Image */}
        <div className="h-20 bg-gradient-to-br from-tarkov-secondary to-tarkov-dark flex items-center justify-center relative overflow-hidden">
          {item.image_url ? (
            <img 
              src={item.image_url}
              alt={itemName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-2xl">
              {categoryIcons[itemCategory] || '📦'}
            </div>
          )}
          
          {/* Winning item glow overlay */}
          {isWinning && (
            <>
              <motion.div
                className={`absolute inset-0 ${rarity.bg} opacity-30`}
                animate={{ opacity: [0.2, 0.6, 0.2] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              {/* Additional glow ring for legendary items */}
              {itemRarity === 'legendary' && (
                <motion.div
                  className="absolute inset-0 border-2 border-yellow-400 rounded-lg"
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </>
          )}
        </div>

        {/* Item Info */}
        <div className="p-2 text-center">
          <div className="text-xs font-semibold text-white truncate mb-1">
            {itemName}
          </div>
          <div className="text-xs text-tarkov-accent font-bold">
            {formatCurrency(itemValue, 'roubles')}
          </div>
        </div>

        {/* Rarity Indicator */}
        <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${rarity.border.replace('border-', 'bg-')}`} />

        {/* Winning Item Effects */}
        {isWinning && animationPhase === 'complete' && (
          <>
            {/* Enhanced Particle System */}
            <motion.div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {/* Primary particle burst */}
              {[...Array(12)].map((_, i) => {
                const angle = (i * 360) / 12
                const distance = 60 + Math.random() * 40
                const particleType = ['✨', '💫', '⭐', '🌟'][Math.floor(Math.random() * 4)]
                
                return (
                  <motion.div
                    key={`primary-${i}`}
                    className="absolute text-sm"
                    initial={{ 
                      opacity: 0,
                      scale: 0,
                      x: '50%',
                      y: '50%',
                      rotate: 0
                    }}
                    animate={{ 
                      opacity: [0, 1, 0.8, 0],
                      scale: [0, 1.2, 0.8, 0],
                      x: `${50 + Math.cos(angle * Math.PI / 180) * distance}%`,
                      y: `${50 + Math.sin(angle * Math.PI / 180) * distance}%`,
                      rotate: 360
                    }}
                    transition={{ 
                      duration: 2.5,
                      delay: i * 0.05,
                      ease: 'easeOut'
                    }}
                  >
                    {particleType}
                  </motion.div>
                )
              })}
              
              {/* Secondary floating particles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`secondary-${i}`}
                  className="absolute text-xs"
                  initial={{ 
                    opacity: 0,
                    x: `${30 + Math.random() * 40}%`,
                    y: `${30 + Math.random() * 40}%`,
                    scale: 0.5
                  }}
                  animate={{ 
                    opacity: [0, 0.8, 0],
                    y: [0, -30, -60],
                    x: [0, (Math.random() - 0.5) * 30],
                    scale: [0.5, 1, 0.3],
                    rotate: [0, 180, 360]
                  }}
                  transition={{ 
                    duration: 3,
                    delay: 0.5 + i * 0.15,
                    repeat: 2,
                    ease: 'easeOut'
                  }}
                >
                  ✨
                </motion.div>
              ))}

              {/* Rarity-specific effects */}
              {itemRarity === 'legendary' && (
                <>
                  {/* Golden rays */}
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={`ray-${i}`}
                      className="absolute w-0.5 bg-gradient-to-t from-yellow-400/80 to-transparent"
                      style={{
                        height: '100%',
                        left: '50%',
                        top: 0,
                        transformOrigin: 'bottom center',
                        transform: `rotate(${i * 45}deg)`
                      }}
                      initial={{ opacity: 0, scaleY: 0 }}
                      animate={{ 
                        opacity: [0, 0.8, 0],
                        scaleY: [0, 1, 0]
                      }}
                      transition={{ 
                        duration: 1.5,
                        delay: 0.3 + i * 0.1,
                        repeat: 3,
                        ease: 'easeInOut'
                      }}
                    />
                  ))}
                  
                  {/* Legendary crown effect */}
                  <motion.div
                    className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-lg"
                    initial={{ opacity: 0, scale: 0, y: 10 }}
                    animate={{ 
                      opacity: [0, 1, 1, 0],
                      scale: [0, 1.2, 1, 0.8],
                      y: [10, -5, -5, -10]
                    }}
                    transition={{ 
                      duration: 3,
                      delay: 1,
                      ease: 'easeOut'
                    }}
                  >
                    👑
                  </motion.div>
                </>
              )}

              {itemRarity === 'epic' && (
                <>
                  {/* Purple energy waves */}
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={`wave-${i}`}
                      className="absolute inset-0 border-2 border-purple-400/40 rounded-lg"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ 
                        opacity: [0, 0.6, 0],
                        scale: [0.8, 1.3, 1.6]
                      }}
                      transition={{ 
                        duration: 2,
                        delay: 0.5 + i * 0.3,
                        ease: 'easeOut'
                      }}
                    />
                  ))}
                </>
              )}
            </motion.div>

            {/* Enhanced Border Glow */}
            <motion.div
              className={`absolute inset-0 rounded-lg border-2 ${rarity.border} pointer-events-none`}
              animate={{ 
                boxShadow: [
                  `0 0 5px ${rarity.border.replace('border-', '').replace('-400', '')}`,
                  `0 0 15px ${rarity.border.replace('border-', '').replace('-400', '')}`,
                  `0 0 25px ${rarity.border.replace('border-', '').replace('-400', '')}`,
                  `0 0 15px ${rarity.border.replace('border-', '').replace('-400', '')}`,
                  `0 0 5px ${rarity.border.replace('border-', '').replace('-400', '')}`
                ]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />

            {/* Pulsing background */}
            <motion.div
              className={`absolute inset-0 ${rarity.bg} rounded-lg pointer-events-none`}
              animate={{ 
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default CaseOpeningCarousel