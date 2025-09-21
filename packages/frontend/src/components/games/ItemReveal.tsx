import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TarkovCard } from '../ui/TarkovCard'
import { formatCurrency } from '../../utils/currency'

export interface TarkovItem {
  id: string
  name: string
  rarity: ItemRarity
  base_value: number
  category: ItemCategory
  image_url?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type ItemCategory = 'medical' | 'electronics' | 'consumables' | 'valuables' | 'keycards'

export interface CaseOpeningResult {
  case_type: {
    id: string
    name: string
    price: number
    description: string
  }
  item_won: TarkovItem
  currency_awarded: number
  opening_id: string
  timestamp: string
}

interface ItemRevealProps {
  result: CaseOpeningResult | null
  isRevealing: boolean
  onRevealComplete?: () => void
}

const rarityConfig = {
  common: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-600/20',
    borderColor: 'border-gray-400',
    glowColor: 'shadow-gray-400/50',
    particles: ['✨', '💫', '⚪'],
    label: 'Common',
    intensity: 1,
    particleCount: 6
  },
  uncommon: {
    color: 'text-green-400',
    bgColor: 'bg-green-600/20',
    borderColor: 'border-green-400',
    glowColor: 'shadow-green-400/50',
    particles: ['💚', '🟢', '✅'],
    label: 'Uncommon',
    intensity: 1.2,
    particleCount: 8
  },
  rare: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-600/20',
    borderColor: 'border-blue-400',
    glowColor: 'shadow-blue-400/50',
    particles: ['💎', '🔷', '🔵'],
    label: 'Rare',
    intensity: 1.5,
    particleCount: 10
  },
  epic: {
    color: 'text-purple-400',
    bgColor: 'bg-purple-600/20',
    borderColor: 'border-purple-400',
    glowColor: 'shadow-purple-400/50',
    particles: ['🔮', '💜', '🟣'],
    label: 'Epic',
    intensity: 2,
    particleCount: 12
  },
  legendary: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-600/20',
    borderColor: 'border-yellow-400',
    glowColor: 'shadow-yellow-400/50',
    particles: ['⭐', '🌟', '✨', '💫'],
    label: 'Legendary',
    intensity: 3,
    particleCount: 16
  }
}

const categoryIcons = {
  medical: '🏥',
  electronics: '💻',
  consumables: '🍖',
  valuables: '💰',
  keycards: '🗝️'
}

const ItemReveal: React.FC<ItemRevealProps> = ({
  result,
  isRevealing,
  onRevealComplete
}) => {
  const [animationPhase, setAnimationPhase] = useState<'opening' | 'revealing' | 'celebrating' | 'complete'>('opening')
  const [showParticles, setShowParticles] = useState(false)
  const [showSecondaryEffects, setShowSecondaryEffects] = useState(false)

  useEffect(() => {
    if (isRevealing && result) {
      setAnimationPhase('opening')
      
      // Phase 1: Opening animation (2 seconds)
      const revealTimer = setTimeout(() => {
        setAnimationPhase('revealing')
        setShowParticles(true)
      }, 2000)
      
      // Phase 2: Celebration effects (1.5 seconds after reveal)
      const celebrationTimer = setTimeout(() => {
        setAnimationPhase('celebrating')
        setShowSecondaryEffects(true)
      }, 3500)
      
      // Phase 3: Complete (2 seconds after celebration)
      const completeTimer = setTimeout(() => {
        setAnimationPhase('complete')
        onRevealComplete?.()
      }, 5500)
      
      return () => {
        clearTimeout(revealTimer)
        clearTimeout(celebrationTimer)
        clearTimeout(completeTimer)
      }
    } else {
      setAnimationPhase('opening')
      setShowParticles(false)
      setShowSecondaryEffects(false)
    }
  }, [isRevealing, result, onRevealComplete])

  if (!result) return null

  const rarity = rarityConfig[result.item_won.rarity]

  return (
    <AnimatePresence>
      {isRevealing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
        >
          {/* Background Effects */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: animationPhase === 'celebrating' ? 0.3 : 0 }}
            transition={{ duration: 1 }}
          >
            <div className={`absolute inset-0 ${rarity.bgColor} opacity-20`} />
            {showSecondaryEffects && (
              <motion.div
                className="absolute inset-0"
                animate={{
                  background: [
                    `radial-gradient(circle at 20% 20%, ${rarity.color.replace('text-', '')} 0%, transparent 50%)`,
                    `radial-gradient(circle at 80% 80%, ${rarity.color.replace('text-', '')} 0%, transparent 50%)`,
                    `radial-gradient(circle at 50% 50%, ${rarity.color.replace('text-', '')} 0%, transparent 50%)`
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>

          <div className="relative max-w-md w-full">
            {/* Opening Phase */}
            <AnimatePresence>
              {animationPhase === 'opening' && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.2, opacity: 0 }}
                  className="text-center"
                >
                  {/* Animated Case */}
                  <motion.div
                    className="relative mb-6"
                    animate={{ 
                      rotateY: [0, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotateY: { duration: 2, repeat: Infinity, ease: "linear" },
                      scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
                    }}
                  >
                    <div className="text-8xl">📦</div>
                    
                    {/* Spinning glow effect */}
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      style={{
                        background: `conic-gradient(from 0deg, transparent, ${rarity.color.replace('text-', '')}, transparent)`,
                        filter: 'blur(20px)',
                        opacity: 0.5
                      }}
                    />
                  </motion.div>

                  {/* Opening Text */}
                  <motion.div
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <h3 className="text-2xl font-tarkov font-bold text-tarkov-accent mb-2">
                      Opening {result.case_type.name}...
                    </h3>
                    <div className="flex justify-center space-x-1">
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-tarkov-accent rounded-full"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ 
                            duration: 1, 
                            repeat: Infinity, 
                            delay: i * 0.2 
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Revealing Phase */}
            <AnimatePresence>
              {(animationPhase === 'revealing' || animationPhase === 'celebrating' || animationPhase === 'complete') && (
                <motion.div
                  initial={{ scale: 0, rotateY: 180, opacity: 0 }}
                  animate={{ 
                    scale: animationPhase === 'celebrating' ? [1, 1.05, 1] : 1, 
                    rotateY: 0, 
                    opacity: 1 
                  }}
                  transition={{ 
                    scale: { duration: 0.5, repeat: animationPhase === 'celebrating' ? Infinity : 0 },
                    rotateY: { type: "spring", stiffness: 200, damping: 20 },
                    opacity: { duration: 0.3 }
                  }}
                >
                  <TarkovCard 
                    className={`
                      relative overflow-hidden text-center p-6
                      ${rarity.bgColor} ${rarity.borderColor} border-2
                      ${rarity.glowColor} shadow-2xl
                      ${animationPhase === 'celebrating' ? 'animate-pulse' : ''}
                    `}
                  >
                    {/* Enhanced Particle Effects */}
                    <AnimatePresence>
                      {showParticles && (
                        <>
                          {/* Primary particle burst */}
                          {[...Array(rarity.particleCount)].map((_, i) => {
                            const angle = (i * 360) / rarity.particleCount
                            const distance = 120 * rarity.intensity
                            return (
                              <motion.div
                                key={`primary-${i}`}
                                initial={{ 
                                  opacity: 0, 
                                  scale: 0,
                                  x: 0,
                                  y: 0
                                }}
                                animate={{ 
                                  opacity: [0, 1, 0.5, 0], 
                                  scale: [0, 1.5, 1, 0],
                                  x: Math.cos(angle * Math.PI / 180) * distance,
                                  y: Math.sin(angle * Math.PI / 180) * distance
                                }}
                                transition={{ 
                                  duration: 2.5,
                                  delay: i * 0.05,
                                  ease: "easeOut"
                                }}
                                className="absolute top-1/2 left-1/2 text-2xl pointer-events-none"
                              >
                                {rarity.particles[i % rarity.particles.length]}
                              </motion.div>
                            )
                          })}
                          
                          {/* Secondary floating particles */}
                          {showSecondaryEffects && [...Array(8)].map((_, i) => (
                            <motion.div
                              key={`secondary-${i}`}
                              initial={{ 
                                opacity: 0,
                                x: (Math.random() - 0.5) * 200,
                                y: (Math.random() - 0.5) * 200
                              }}
                              animate={{ 
                                opacity: [0, 0.8, 0],
                                y: [0, -50, -100],
                                x: [(Math.random() - 0.5) * 50, (Math.random() - 0.5) * 100]
                              }}
                              transition={{ 
                                duration: 3,
                                delay: i * 0.2,
                                repeat: Infinity,
                                ease: "easeOut"
                              }}
                              className="absolute top-1/2 left-1/2 text-lg pointer-events-none"
                            >
                              {rarity.particles[Math.floor(Math.random() * rarity.particles.length)]}
                            </motion.div>
                          ))}
                        </>
                      )}
                    </AnimatePresence>

                    {/* Rarity Badge */}
                    <motion.div
                      initial={{ y: -30, opacity: 0, scale: 0.5 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      transition={{ 
                        delay: 0.2, 
                        type: "spring", 
                        stiffness: 300,
                        damping: 20
                      }}
                      className={`
                        inline-block px-6 py-3 rounded-full mb-6 relative
                        ${rarity.bgColor} ${rarity.borderColor} border-2
                        ${rarity.color} font-bold text-lg uppercase tracking-wide
                        shadow-lg
                      `}
                    >
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        animate={{ 
                          boxShadow: [
                            `0 0 10px ${rarity.color.replace('text-', '')}`,
                            `0 0 20px ${rarity.color.replace('text-', '')}`,
                            `0 0 10px ${rarity.color.replace('text-', '')}`
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      {rarity.label}
                    </motion.div>

                    {/* Item Image with Enhanced Effects */}
                    <motion.div
                      initial={{ scale: 0, opacity: 0, rotateY: 180 }}
                      animate={{ 
                        scale: animationPhase === 'celebrating' ? [1, 1.1, 1] : 1, 
                        opacity: 1, 
                        rotateY: 0 
                      }}
                      transition={{ 
                        scale: { duration: 0.8, repeat: animationPhase === 'celebrating' ? Infinity : 0 },
                        opacity: { delay: 0.4, duration: 0.3 },
                        rotateY: { delay: 0.4, type: "spring", stiffness: 200 }
                      }}
                      className="mb-6 relative"
                    >
                      <div className={`
                        relative w-32 h-32 mx-auto rounded-xl overflow-hidden
                        ${rarity.borderColor} border-2 ${rarity.glowColor} shadow-xl
                      `}>
                        {result.item_won.image_url ? (
                          <img 
                            src={result.item_won.image_url}
                            alt={result.item_won.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`
                            w-full h-full bg-gradient-to-br from-tarkov-secondary to-tarkov-dark 
                            flex items-center justify-center text-5xl
                          `}>
                            {categoryIcons[result.item_won.category]}
                          </div>
                        )}
                        
                        {/* Image glow overlay */}
                        <motion.div
                          className={`absolute inset-0 ${rarity.bgColor} opacity-20`}
                          animate={{ opacity: [0.1, 0.3, 0.1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </div>
                      
                      {/* Floating category icon */}
                      <motion.div
                        className="absolute -top-2 -right-2 text-2xl bg-tarkov-dark rounded-full p-2 border border-tarkov-accent"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
                      >
                        {categoryIcons[result.item_won.category]}
                      </motion.div>
                    </motion.div>

                    {/* Item Name with Enhanced Typography */}
                    <motion.h2
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                      className={`
                        text-3xl font-tarkov font-bold mb-3 ${rarity.color}
                        text-shadow-glow leading-tight
                      `}
                    >
                      {result.item_won.name}
                    </motion.h2>

                    {/* Item Description */}
                    {result.item_won.description && (
                      <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="text-gray-300 text-sm mb-6 max-w-xs mx-auto leading-relaxed"
                      >
                        {result.item_won.description}
                      </motion.p>
                    )}

                    {/* Enhanced Currency Display */}
                    <motion.div
                      initial={{ scale: 0, opacity: 0, y: 20 }}
                      animate={{ 
                        scale: animationPhase === 'celebrating' ? [1, 1.05, 1] : 1, 
                        opacity: 1, 
                        y: 0 
                      }}
                      transition={{ 
                        scale: { duration: 0.6, repeat: animationPhase === 'celebrating' ? Infinity : 0 },
                        opacity: { delay: 0.9, duration: 0.3 },
                        y: { delay: 0.9, type: "spring", stiffness: 300 }
                      }}
                      className="relative"
                    >
                      <div className="bg-gradient-to-r from-tarkov-accent/20 to-tarkov-accent/30 rounded-xl p-6 border-2 border-tarkov-accent/50 shadow-xl">
                        <motion.div
                          className="text-sm text-gray-300 mb-2 uppercase tracking-wide"
                          animate={{ opacity: [0.7, 1, 0.7] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          Currency Awarded
                        </motion.div>
                        <div className="text-4xl font-tarkov font-bold text-tarkov-accent mb-2">
                          {formatCurrency(result.currency_awarded, 'roubles')}
                        </div>
                        
                        {/* Profit/Loss indicator */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.1 }}
                          className={`text-sm font-semibold ${
                            result.currency_awarded > result.case_type.price 
                              ? 'text-green-400' 
                              : result.currency_awarded === result.case_type.price
                                ? 'text-yellow-400'
                                : 'text-red-400'
                          }`}
                        >
                          {result.currency_awarded > result.case_type.price && '🎉 '}
                          {result.currency_awarded > result.case_type.price 
                            ? `+${formatCurrency(result.currency_awarded - result.case_type.price, 'roubles')} Profit!`
                            : result.currency_awarded === result.case_type.price
                              ? 'Break Even'
                              : `${formatCurrency(result.case_type.price - result.currency_awarded, 'roubles')} Loss`
                          }
                        </motion.div>
                      </div>
                      
                      {/* Animated border glow */}
                      <motion.div
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        animate={{ 
                          boxShadow: [
                            `0 0 20px ${rarity.color.replace('text-', '')}`,
                            `0 0 40px ${rarity.color.replace('text-', '')}`,
                            `0 0 20px ${rarity.color.replace('text-', '')}`
                          ]
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: animationPhase === 'celebrating' ? Infinity : 3
                        }}
                      />
                    </motion.div>

                    {/* Enhanced Glow Effects */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: animationPhase === 'celebrating' ? [0, 0.6, 0] : [0, 0.3, 0]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        delay: 1
                      }}
                      className={`
                        absolute inset-0 rounded-lg pointer-events-none
                        ${rarity.borderColor} border-2 ${rarity.glowColor} shadow-2xl
                      `}
                    />
                    
                    {/* Legendary special effects */}
                    {result.item_won.rarity === 'legendary' && animationPhase === 'celebrating' && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.8, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-yellow-400/20 animate-pulse" />
                        <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/20 via-transparent to-yellow-400/20 animate-pulse" />
                      </motion.div>
                    )}
                  </TarkovCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ItemReveal