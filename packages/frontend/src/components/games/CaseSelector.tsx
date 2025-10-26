import React from 'react'
import { motion } from 'framer-motion'
import { TarkovCard } from '../ui/TarkovCard'
import { formatCurrency } from '../../utils/currency'
import CaseConfirmation from './CaseConfirmation'
import ItemsByRarityModal, { TarkovItem } from './ItemsByRarityModal'
import { animationVariants, createStaggeredAnimation } from '../../styles/animationVariants'
import { caseOpeningApi } from '../../services/caseOpeningApi'
import { Badge } from '../ui/badge'

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
  isProcessing?: boolean
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
  onCancelConfirmation,
  isProcessing = false
}) => {
  const [itemsModal, setItemsModal] = React.useState<{
    isOpen: boolean
    rarity: string
    items: TarkovItem[]
    caseName: string
  }>({
    isOpen: false,
    rarity: '',
    items: [],
    caseName: ''
  })

  // Handle rarity click to show items
  const handleRarityClick = async (rarity: string, caseType: CaseType) => {
    console.log(`Fetching ${rarity} items for case: ${caseType.name} (${caseType.id})`)
    try {
      // Fetch item pool for this case
      const items = await caseOpeningApi.getItemPool(caseType.id)
      console.log(`Total items fetched: ${items.length}`)
      
      // Filter items by rarity
      const rarityItems = items.filter(item => item.rarity === rarity)
      console.log(`${rarity} items found: ${rarityItems.length}`)
      
      setItemsModal({
        isOpen: true,
        rarity,
        items: rarityItems,
        caseName: caseType.name
      })
    } catch (error) {
      console.error('Failed to load items:', error)
      // Show empty modal if failed to load
      setItemsModal({
        isOpen: true,
        rarity,
        items: [],
        caseName: caseType.name
      })
    }
  }

  const closeItemsModal = () => {
    setItemsModal(prev => ({ ...prev, isOpen: false }))
  }

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
              role="status"
              aria-label="Loading case"
            >
              <div className="bg-tarkov-secondary/50 rounded-t-xl h-36 md:h-40 mb-2 relative">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-tarkov-accent/20 to-transparent"
                  {...animationVariants.loading.shimmer}
                  aria-hidden="true"
                />
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-tarkov-secondary/30 rounded-lg h-6 mb-2" aria-hidden="true" />
                <div className="bg-tarkov-secondary/20 rounded-lg h-4 mb-2" aria-hidden="true" />
                <div className="grid grid-cols-2 gap-2" aria-hidden="true">
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
        role="grid"
        aria-label="Available cases"
      >
        {caseTypes.map((caseType, _index) => {
          const canAfford = balance >= caseType.price
          const cardClasses = [
            'case-card',
            canAfford ? 'case-card-affordable' : 'case-card-disabled'
          ].join(' ')

          return (
            <motion.article
              key={caseType.id}
              {...staggeredAnimation.item}
              {...(canAfford ? animationVariants.caseCard : {})}
              className={cardClasses}
              onClick={() => canAfford && onCaseSelected?.(caseType)}
              role="gridcell"
              aria-label={`${caseType.name} - ${formatCurrency(caseType.price, 'roubles')}`}
              aria-disabled={!canAfford}
              tabIndex={canAfford ? 0 : -1}
              onKeyDown={(e) => {
                if (canAfford && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  onCaseSelected?.(caseType)
                }
              }}
            >
              {/* Enhanced Case Image with accessibility */}
              <div className="case-card-image">
                {caseType.image_url ? (
                  <motion.img
                    src={caseType.image_url}
                    alt={caseType.name}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    loading="lazy"
                  />
                ) : (
                  <motion.div
                    className="w-full h-full flex items-center justify-center relative"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                    role="img"
                    aria-label="Case icon"
                  >
                    <div className="text-5xl md:text-6xl">📦</div>
                    {/* Animated glow for case icon */}
                    <motion.div
                      className="absolute inset-0 bg-tarkov-accent/10 rounded-full"
                      {...animationVariants.glow.subtle}
                      aria-hidden="true"
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
                  role="text"
                  aria-label={`Price: ${formatCurrency(caseType.price, 'roubles')}`}
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
                    aria-hidden="true"
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

                {/* Enhanced Rarity Distribution with better accessibility */}
                <motion.div
                  className="rarity-distribution"
                  {...animationVariants.text.fadeInUp}
                  transition={{ delay: 0.5 }}
                >
                  <div className="rarity-distribution-title">
                    Drop Rates:
                  </div>
                  <div className="rarity-grid" role="list" aria-label="Rarity distribution">
                    {Object.entries(caseType.rarity_distribution)
                      .sort(([a], [b]) => {
                        const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 }
                        return rarityOrder[a as keyof typeof rarityOrder] - rarityOrder[b as keyof typeof rarityOrder]
                      })
                      .map(([rarity, percentage], rarityIndex) => (
                      <motion.button
                        key={rarity}
                        type="button"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + rarityIndex * 0.1 }}
                        className={`rarity-item rarity-item-${rarity} hover:scale-105 cursor-pointer transition-all duration-200 hover:brightness-110`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRarityClick(rarity, caseType)
                        }}
                        title={`Click to see ${rarity} items (${percentage}%)`}
                        aria-label={`${rarity} drop rate ${percentage}%`}
                        role="listitem"
                      >
                        <div className="capitalize font-medium">{rarity}</div>
                        <div className="text-xs opacity-80 font-semibold">{percentage}%</div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Enhanced Insufficient Balance Warning */}
                {!canAfford && (
                  <motion.div
                    className="status-message status-insufficient"
                    {...animationVariants.text.fadeInUp}
                    transition={{ delay: 0.7 }}
                    role="alert"
                    aria-live="polite"
                  >
                    <div className="status-insufficient-title">
                      ⚠️ Insufficient Balance
                    </div>
                    <div className="status-insufficient-subtitle">
                      Need {formatCurrency(caseType.price - balance, 'roubles')} more
                    </div>
                  </motion.div>
                )}

                {/* Enhanced ready state indicator */}
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
            </motion.article>
          )
        })}
      </motion.div>

      {caseTypes.length === 0 && (
        <motion.div
          className="text-center py-12 text-gray-400"
          {...animationVariants.text.fadeInUp}
          role="status"
          aria-live="polite"
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
            role="img"
            aria-label="Empty"
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
        isProcessing={isProcessing}
      />

      {/* Items by Rarity Modal */}
      <ItemsByRarityModal
        isOpen={itemsModal.isOpen}
        onClose={closeItemsModal}
        rarity={itemsModal.rarity}
        items={itemsModal.items}
        caseName={itemsModal.caseName}
      />
    </TarkovCard>
  )
}

export default CaseSelector