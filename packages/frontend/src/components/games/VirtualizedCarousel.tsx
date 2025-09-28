import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { TarkovItem } from './ItemReveal'
import { formatCurrency } from '../../utils/currency'

export interface CarouselItemData {
  item: TarkovItem
  id: string
  isWinning: boolean
}

interface VirtualizedCarouselProps {
  items: CarouselItemData[]
  winningIndex: number
  phase: 'idle' | 'spinning' | 'decelerating' | 'settling' | 'complete'
  visibleCount?: number
  itemWidth?: number
  className?: string
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

const VirtualizedCarousel: React.FC<VirtualizedCarouselProps> = ({
  items,
  winningIndex,
  phase,
  visibleCount = 7,
  itemWidth = 160,
  className = ''
}) => {
  const [visibleItems, setVisibleItems] = useState<CarouselItemData[]>([])
  const [startIndex, setStartIndex] = useState(0)

  // Calculate which items should be visible based on winning index
  const { visibleSlice, offset } = useMemo(() => {
    if (items.length === 0) {
      return { visibleSlice: [], offset: 0 }
    }

    // Ensure winning index is valid
    const safeWinningIndex = Math.max(0, Math.min(winningIndex, items.length - 1))

    // Calculate the range of items to show
    const halfVisible = Math.floor(visibleCount / 2)
    let start = Math.max(0, safeWinningIndex - halfVisible)
    let end = Math.min(items.length, start + visibleCount)

    // Adjust if we're near the end
    if (end - start < visibleCount && start > 0) {
      start = Math.max(0, end - visibleCount)
    }

    // Calculate offset for positioning
    const offset = (safeWinningIndex - start) * itemWidth

    return {
      visibleSlice: items.slice(start, end),
      offset
    }
  }, [items, winningIndex, visibleCount, itemWidth])

  useEffect(() => {
    setVisibleItems(visibleSlice)
    setStartIndex(Math.max(0, winningIndex - Math.floor(visibleCount / 2)))
  }, [visibleSlice, winningIndex, visibleCount])

  if (items.length === 0) {
    return (
      <div className={`flex justify-center items-center ${className}`} style={{ width: visibleCount * itemWidth, height: 280 }}>
        <div className="text-gray-400">No items to display</div>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
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
          left: (visibleCount * itemWidth) / 2 - itemWidth / 2,
          width: itemWidth
        }}
      />

      {/* Carousel Items Container */}
      <motion.div
        className="flex absolute top-0 left-0 h-full"
        style={{
          width: visibleItems.length * itemWidth,
          transform: `translateX(${-(visibleCount * itemWidth) / 2 - itemWidth / 2 + offset}px)`,
          willChange: 'transform',
          backfaceVisibility: 'hidden'
        }}
        animate={phase === 'spinning' ? {
          x: [null, -(offset - itemWidth * 2), -(offset + itemWidth * 2), -offset]
        } : {}}
        transition={{
          duration: phase === 'spinning' ? 2 : 0,
          ease: 'easeInOut',
          times: [0, 0.3, 0.7, 1]
        }}
      >
        {visibleItems.map((itemData, index) => {
          const globalIndex = startIndex + index
          const isWinning = globalIndex === winningIndex

          return (
            <VirtualizedCarouselItem
              key={itemData.id}
              itemData={itemData}
              width={itemWidth}
              isWinning={isWinning && phase === 'complete'}
              phase={phase}
              globalIndex={globalIndex}
              winningIndex={winningIndex}
            />
          )
        })}
      </motion.div>
    </div>
  )
}

interface VirtualizedCarouselItemProps {
  itemData: CarouselItemData
  width: number
  isWinning: boolean
  phase: string
  globalIndex: number
  winningIndex: number
}

const VirtualizedCarouselItem: React.FC<VirtualizedCarouselItemProps> = ({
  itemData,
  width,
  isWinning,
  phase,
  globalIndex,
  winningIndex
}) => {
  const { item } = itemData

  // Validate item object and provide fallbacks
  if (!item || !item.id || !item.name) {
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

  // Calculate distance from winning item for animation effects
  const distanceFromWinner = Math.abs(globalIndex - winningIndex)
  // Only blur items that are far from center to keep main icons visible and big
  const blurIntensity = phase === 'spinning' && distanceFromWinner > 3 ? distanceFromWinner * 1.5 : 0

  return (
    <div
      className={`
        flex-shrink-0 h-full p-2 relative
        ${isWinning ? `${rarity.glow} shadow-2xl` : ''}
      `}
      style={{ width }}
    >
      <motion.div
        className={`
          h-full rounded-lg border-2 overflow-hidden relative
          transition-all duration-300
          ${rarity.border} ${rarity.bg}
          ${isWinning ? 'scale-105 animate-pulse' : ''}
        `}
        style={{
          filter: blurIntensity > 0 ? `blur(${blurIntensity}px)` : 'none'
        }}
        animate={
          isWinning && phase === 'complete' ? {
            scale: [1, 1.1, 1.05],
            boxShadow: [
              `0 0 10px ${rarity.border.replace('border-', '')}`,
              `0 0 20px ${rarity.border.replace('border-', '')}`,
              `0 0 30px ${rarity.border.replace('border-', '')}`
            ]
          } : phase === 'spinning' ? {
            scale: [1, 1.02, 1],
          } : {}
        }
        transition={{ duration: 0.5, repeat: isWinning ? Infinity : 0 }}
      >
        {/* Item Image */}
        <div className="h-32 bg-gradient-to-br from-tarkov-secondary to-tarkov-dark flex items-center justify-center relative overflow-hidden">
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
            <motion.div
              className={`absolute inset-0 ${rarity.bg} opacity-30`}
              animate={{ opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </div>

        {/* Item Info */}
        <div className="p-3 text-center">
          <div className="text-sm font-semibold text-white truncate mb-2 leading-tight">
            {itemName}
          </div>
          <div className="text-sm text-tarkov-accent font-bold">
            {formatCurrency(itemValue, 'roubles')}
          </div>
        </div>

        {/* Rarity Indicator */}
        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${rarity.border.replace('border-', 'bg-')}`} />

        {/* Winning Item Effects */}
        {isWinning && phase === 'complete' && (
          <>
            {/* Particle burst effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {/* Primary particle burst */}
              {[...Array(8)].map((_, i) => {
                const angle = (i * 360) / 8
                const distance = 40 + Math.random() * 20

                return (
                  <motion.div
                    key={`primary-${i}`}
                    className="absolute text-xs"
                    initial={{
                      opacity: 0,
                      scale: 0,
                      x: '50%',
                      y: '50%',
                      rotate: 0
                    }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                      x: `${50 + Math.cos(angle * Math.PI / 180) * distance}%`,
                      y: `${50 + Math.sin(angle * Math.PI / 180) * distance}%`,
                      rotate: 360
                    }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.1,
                      ease: 'easeOut'
                    }}
                  >
                    ✨
                  </motion.div>
                )
              })}
            </motion.div>

            {/* Enhanced Border Glow */}
            <motion.div
              className={`absolute inset-0 rounded-lg border-2 ${rarity.border} pointer-events-none`}
              animate={{
                boxShadow: [
                  `0 0 5px ${rarity.border.replace('border-', '')}`,
                  `0 0 15px ${rarity.border.replace('border-', '')}`,
                  `0 0 5px ${rarity.border.replace('border-', '')}`
                ]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          </>
        )}
      </motion.div>
    </div>
  )
}

export default VirtualizedCarousel


