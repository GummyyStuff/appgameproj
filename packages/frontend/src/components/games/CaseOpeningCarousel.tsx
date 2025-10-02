import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { TarkovItem } from './ItemReveal'
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
  finalItem?: TarkovItem | null
  duration?: number
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
  finalItem,
  duration = 6000
}) => {
  const { playCaseOpen, playCaseReveal } = useSoundEffects()

  // Single layer carousel system
  const carouselRef = useRef<HTMLDivElement>(null)

  const [scrollX, setScrollX] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Simplified dimensions
  const isMobile = window.innerWidth < 640
  const skinWidth = isMobile ? 160 : 256

  // Simple easing for smooth animation
  const easingStyle = `transform ${duration}ms cubic-bezier(0.1, 0.4, 0.4, 1)`

  // Calculate positions
  const safeWinningIndex = Math.max(0, Math.min(winningIndex, items.length - 1))

  // Single layer transform
  const carouselTransform = `translateX(-${scrollX}px)`

  useEffect(() => {
    if (isSpinning && items.length > 0) {
      startCarouselAnimation()
    }
  }, [isSpinning, items])

  const startCarouselAnimation = () => {
    setIsAnimating(true)
    playCaseOpen()

    // Get the actual container width at animation start time
    const currentContainerWidth = carouselRef.current?.parentElement?.clientWidth || window.innerWidth

    // Simple centering calculation
    const centerOffset = currentContainerWidth / 2 - skinWidth / 2
    const targetScroll = safeWinningIndex * skinWidth - centerOffset

    console.log('🎰 Carousel Animation Debug:', {
      safeWinningIndex,
      skinWidth,
      containerWidth: currentContainerWidth,
      centerOffset,
      targetScroll,
      winningItemInSequence: items[safeWinningIndex]?.item?.name,
      winningItemFromBackend: finalItem?.name,
      sequenceLength: items.length
    })

    // Initialize position
    if (carouselRef.current) {
      carouselRef.current.style.transformOrigin = 'center center'
      carouselRef.current.style.transition = 'none'
      carouselRef.current.style.transform = 'translateX(0)'
    }

    // Set up audio feedback during animation
    const thresholds = items.map((_, i) => i * skinWidth - currentContainerWidth / 2 + 2)
    const playedIndices = new Set<number>()
    const startTime = Date.now()

    const checkPosition = () => {
      if (!carouselRef.current) return
      const style = getComputedStyle(carouselRef.current)
      const transform = style.transform
      let currentScroll = 0

      if (transform && transform !== 'none') {
        const match = transform.match(/matrix.*\((.+)\)/)
        if (match) {
          const values = match[1].split(', ')
          currentScroll = -parseFloat(values[4])
        }
      }

      // Play audio feedback as items pass through center
      thresholds.forEach((threshold, index) => {
        if (!playedIndices.has(index) && currentScroll >= threshold) {
          playedIndices.add(index)
          playCaseReveal()
        }
      })

      if (Date.now() - startTime < duration) {
        requestAnimationFrame(checkPosition)
      }
    }

    // Start animation after a brief delay
    setTimeout(() => {
      if (carouselRef.current) carouselRef.current.style.transition = easingStyle
      setScrollX(targetScroll)
      requestAnimationFrame(checkPosition)
    }, 50)

    // Complete animation
    setTimeout(() => {
      setIsAnimating(false)

      // Debug: Check what item is actually centered
      const centerOffset = currentContainerWidth / 2 - skinWidth / 2
      const centeredItemIndex = Math.round((targetScroll + centerOffset) / skinWidth)

      console.log('🎰 Carousel Animation Complete:', {
        targetScroll,
        centerOffset,
        calculatedCenteredIndex: centeredItemIndex,
        centeredItem: items[centeredItemIndex]?.item?.name,
        isWinningItem: items[centeredItemIndex]?.isWinning,
        finalItem: finalItem?.name
      })

      onSpinComplete()
    }, duration)
  }

  return (
    <div className="flex justify-center w-full">
      <div className="relative h-40 sm:h-56 select-none w-full max-w-5xl mx-auto">
        {/* Simple single-layer carousel */}
        <div className="overflow-hidden relative w-full h-full bg-tarkov-dark/50 border-2 border-tarkov-accent/30 rounded-xl">
          {/* Gradient fade edges */}
          <div className="absolute top-0 left-0 w-12 h-full bg-gradient-to-r from-tarkov-dark via-tarkov-dark/60 to-transparent z-10 pointer-events-none" />
          <div className="absolute top-0 right-0 w-12 h-full bg-gradient-to-l from-tarkov-dark via-tarkov-dark/60 to-transparent z-10 pointer-events-none" />

          {/* Carousel items */}
          <div
            ref={carouselRef}
            className="flex absolute left-0 top-0 will-change-transform origin-center h-full"
            style={{ transform: carouselTransform }}
          >
            {items.map((itemData, index) => (
              <div key={itemData.id} className="sm:w-64 w-40 h-40 sm:h-56 flex-shrink-0 px-2 flex items-center justify-center">
                <CarouselItem
                  itemData={itemData}
                  width={skinWidth}
                  isWinning={index === safeWinningIndex && !isAnimating}
                  animationPhase={isAnimating ? 'spinning' : 'complete'}
                />
              </div>
            ))}
          </div>

          {/* Center pointer */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 z-20">
            <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-tarkov-accent drop-shadow-lg" />
          </div>
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 z-20">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-tarkov-accent drop-shadow-lg" />
          </div>

          {/* Center highlight area */}
          <div
            className="absolute top-0 bottom-0 bg-tarkov-accent/10 border-l-2 border-r-2 border-tarkov-accent/50 z-10"
            style={{
              left: '50%',
              transform: 'translateX(-50%)',
              width: `${skinWidth}px`
            }}
          />
        </div>
      </div>
    </div>
  )
}

// Simplified carousel styles
const carouselStyles = `
.fast-fade-scale-up {
  animation: fadeScaleUp 0.15s ease-out forwards;
}

@keyframes fadeScaleUp {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
`

// Inject styles into document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = carouselStyles
  document.head.appendChild(styleSheet)
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
          <div className="text-3xl mb-2">📦</div>
          <div className="text-sm text-gray-400 text-center">
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
        <div className="h-24 sm:h-32 bg-gradient-to-br from-tarkov-secondary to-tarkov-dark flex items-center justify-center relative overflow-hidden">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={itemName}
              className="w-full h-full object-cover"
            />
          ) : (
            <motion.div
              className="text-6xl"
              animate={{
                scale: [1, 1.15, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 0.4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {categoryIcons[itemCategory] || '📦'}
            </motion.div>
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
        <div className="p-2 text-center flex-1 flex flex-col justify-center">
          <div className="text-xs sm:text-sm font-semibold text-white truncate mb-1 leading-tight">
            {itemName}
          </div>
          <div className="text-xs sm:text-sm text-tarkov-accent font-bold">
            {formatCurrency(itemValue, 'roubles')}
          </div>
        </div>

        {/* Rarity Indicator */}
        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${rarity.border.replace('border-', 'bg-')}`} />

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