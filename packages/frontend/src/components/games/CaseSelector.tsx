import React from 'react'
import { motion } from 'framer-motion'
import { TarkovCard } from '../ui/TarkovCard'
import { formatCurrency } from '../../utils/currency'
import CaseConfirmation from './CaseConfirmation'
import { animationVariants, createStaggeredAnimation } from '../../styles/animationVariants'

export interface CaseType {
  id: string
  name: string
  price: number
  description: string
  image_url?: string
  rarity_distribution: RarityDistribution
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RarityDistribution {
  common: number    // 60%
  uncommon: number  // 25%
  rare: number      // 10%
  epic: number      // 4%
  legendary: number // 1%
}

interface CaseSelectorProps {
  caseTypes: CaseType[]
  onCaseSelected?: (caseType: CaseType) => void
  onOpenCase: (caseType: CaseType) => void
  balance: number
  isLoading?: boolean
  selectedCase?: CaseType | null
  showConfirmation?: boolean
  onCancelConfirmation?: () => void
}

// Rarity colors are now defined in caseOpening.css

const CaseSelector: React.FC<CaseSelectorProps> = ({
  caseTypes,
  onCaseSelected,
  onOpenCase,
  balance,
  isLoading = false,
  selectedCase = null,
  showConfirmation = false,
  onCancelConfirmation
}) => {
  if (isLoading) {
    const staggeredAnimation = createStaggeredAnimation(3, 0.2)

    return (
      <TarkovCard className="p-4 md:p-6">
        <motion.h3
          className="text-xl md:text-2xl font-tarkov font-bold text-tarkov-accent mb-6 text-center"
          {...animationVariants.loading.pulse}
        >
          Loading Cases...
        </motion.h3>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
          {...staggeredAnimation.container}
        >
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="loading-shimmer rounded-xl overflow-hidden"
              {...staggeredAnimation.item}
            >
              <div className="bg-tarkov-secondary/50 rounded-t-xl h-36 md:h-40 mb-2 relative">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-tarkov-accent/20 to-transparent"
                  {...animationVariants.loading.shimmer}
                />
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-tarkov-secondary/30 rounded-lg h-6 mb-2" />
                <div className="bg-tarkov-secondary/20 rounded-lg h-4 mb-2" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-tarkov-secondary/15 rounded-lg h-8" />
                  <div className="bg-tarkov-secondary/15 rounded-lg h-8" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </TarkovCard>
    )
  }

  const staggeredAnimation = createStaggeredAnimation(caseTypes.length, 0.1)

  return (
    <TarkovCard className="p-4 md:p-6">
      <motion.h3
        className="text-xl md:text-2xl font-tarkov font-bold text-tarkov-accent mb-6 text-center"
        {...animationVariants.text.fadeInUp}
      >
        Select a Case
      </motion.h3>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
        {...staggeredAnimation.container}
      >
        {caseTypes.map((caseType, _index) => {
          const canAfford = balance >= caseType.price
          const cardClasses = [
            'case-card',
            canAfford ? 'case-card-affordable' : 'case-card-disabled'
          ].join(' ')

          return (
            <motion.div
              key={caseType.id}
              {...staggeredAnimation.item}
              {...(canAfford ? animationVariants.caseCard : {})}
              className={cardClasses}
              onClick={() => canAfford && onCaseSelected?.(caseType)}
            >
              {/* Case Image */}
              <div className="case-card-image">
                {caseType.image_url ? (
                  <motion.img
                    src={caseType.image_url}
                    alt={caseType.name}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  />
                ) : (
                  <motion.div
                    className="w-full h-full flex items-center justify-center relative"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-5xl md:text-6xl">📦</div>
                    {/* Animated glow for case icon */}
                    <motion.div
                      className="absolute inset-0 bg-tarkov-accent/10 rounded-full"
                      {...animationVariants.glow.subtle}
                    />
                  </motion.div>
                )}

                {/* Enhanced Price Badge */}
                <motion.div
                  className="price-badge"
                  whileHover={{ scale: 1.05 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="price-badge-text">
                    {formatCurrency(caseType.price, 'roubles')}
                  </span>
                </motion.div>

                {/* Hover glow effect */}
                {canAfford && (
                  <motion.div
                    className="absolute inset-0 bg-tarkov-accent/5 opacity-0"
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </div>
              
              {/* Enhanced Case Info */}
              <div className="case-card-content">
                <motion.h4
                  className="case-card-title"
                  {...animationVariants.text.fadeInUp}
                  transition={{ delay: 0.3 }}
                >
                  {caseType.name}
                </motion.h4>

                <motion.p
                  className="case-card-description"
                  {...animationVariants.text.fadeInUp}
                  transition={{ delay: 0.4 }}
                >
                  {caseType.description}
                </motion.p>

                {/* Enhanced Rarity Distribution */}
                <motion.div
                  className="rarity-distribution"
                  {...animationVariants.text.fadeInUp}
                  transition={{ delay: 0.5 }}
                >
                  <div className="rarity-distribution-title">
                    Drop Rates:
                  </div>
                  <div className="rarity-grid">
                    {Object.entries(caseType.rarity_distribution).map(([rarity, percentage], rarityIndex) => (
                      <motion.span
                        key={rarity}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + rarityIndex * 0.1 }}
                        className={`rarity-item rarity-item-${rarity} hover:scale-105`}
                      >
                        <div className="capitalize">{rarity}</div>
                        <div className="text-xs opacity-80">{percentage}%</div>
                      </motion.span>
                    ))}
                  </div>
                </motion.div>

                {/* Enhanced Insufficient Balance Warning */}
                {!canAfford && (
                  <motion.div
                    className="status-message status-insufficient"
                    {...animationVariants.text.fadeInUp}
                    transition={{ delay: 0.7 }}
                  >
                    <div className="status-insufficient-title">
                      ⚠️ Insufficient Balance
                    </div>
                    <div className="status-insufficient-subtitle">
                      Need {formatCurrency(caseType.price - balance, 'roubles')} more
                    </div>
                  </motion.div>
                )}

                {/* Hover to open indicator */}
                {canAfford && (
                  <motion.div
                    className="status-message status-ready"
                    {...animationVariants.text.fadeInUp}
                    transition={{ delay: 0.7 }}
                  >
                    <motion.div
                      className="status-ready-title"
                      whileHover={{ scale: 1.05 }}
                    >
                      🎲 Click to Open
                    </motion.div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {caseTypes.length === 0 && (
        <motion.div
          className="text-center py-12 text-gray-400"
          {...animationVariants.text.fadeInUp}
        >
          <motion.div
            className="text-6xl mb-6"
            animate={{
              rotateY: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{
              rotateY: { duration: 3, repeat: Infinity },
              scale: { duration: 2, repeat: Infinity }
            }}
          >
            📦
          </motion.div>
          <h3 className="text-xl font-tarkov font-bold mb-2">No Cases Available</h3>
          <p className="text-gray-500">Check back later for new case types!</p>
        </motion.div>
      )}

      {/* Case Confirmation Dialog */}
      <CaseConfirmation
        caseType={selectedCase!}
        balance={balance}
        onConfirm={onOpenCase}
        onCancel={onCancelConfirmation || (() => {})}
        isVisible={showConfirmation && !!selectedCase}
      />
    </TarkovCard>
  )
}

export default CaseSelector