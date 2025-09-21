import React from 'react'
import { motion } from 'framer-motion'
import { TarkovCard } from '../ui/TarkovCard'
import { TarkovButton } from '../ui/TarkovButton'
import { formatCurrency } from '../../utils/currency'

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
  selectedCaseType: CaseType | null
  onSelectCase: (caseType: CaseType) => void
  balance: number
  isLoading?: boolean
}

const rarityColors = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400'
}

const CaseSelector: React.FC<CaseSelectorProps> = ({
  caseTypes,
  selectedCaseType,
  onSelectCase,
  balance,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <TarkovCard className="p-4 md:p-6">
        <motion.h3 
          className="text-xl md:text-2xl font-tarkov font-bold text-tarkov-accent mb-6 text-center"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Loading Cases...
        </motion.h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3].map((i) => (
            <motion.div 
              key={i} 
              className="animate-shimmer rounded-xl overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
            >
              <div className="bg-tarkov-secondary/50 rounded-t-xl h-36 md:h-40 mb-2 relative">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-tarkov-accent/20 to-transparent"
                  animate={{ x: [-200, 200] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
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
        </div>
      </TarkovCard>
    )
  }

  return (
    <TarkovCard className="p-4 md:p-6">
      <motion.h3 
        className="text-xl md:text-2xl font-tarkov font-bold text-tarkov-accent mb-6 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Select a Case
      </motion.h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {caseTypes.map((caseType, index) => {
          const canAfford = balance >= caseType.price
          const isSelected = selectedCaseType?.id === caseType.id
          
          return (
            <motion.div
              key={caseType.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
              whileHover={{ 
                scale: canAfford ? 1.03 : 1,
                y: canAfford ? -5 : 0,
                transition: { type: "spring", stiffness: 400, damping: 25 }
              }}
              whileTap={{ scale: canAfford ? 0.97 : 1 }}
              className={`
                relative cursor-pointer rounded-xl border-2 transition-all duration-300 overflow-hidden
                ${isSelected 
                  ? 'border-tarkov-accent bg-tarkov-accent/10 shadow-lg shadow-tarkov-accent/30' 
                  : canAfford 
                    ? 'border-tarkov-secondary hover:border-tarkov-accent/50 hover:shadow-lg hover:shadow-tarkov-accent/20' 
                    : 'border-gray-600 opacity-50 cursor-not-allowed'
                }
              `}
              onClick={() => canAfford && onSelectCase(caseType)}
            >
              {/* Case Image */}
              <div className="relative h-36 md:h-40 bg-gradient-to-br from-tarkov-primary to-tarkov-dark rounded-t-xl overflow-hidden">
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
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </motion.div>
                )}
                
                {/* Enhanced Price Badge */}
                <motion.div 
                  className="absolute top-3 right-3 bg-gradient-to-r from-tarkov-dark/95 to-tarkov-primary/95 rounded-full px-3 py-2 border border-tarkov-accent/50"
                  whileHover={{ scale: 1.05 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="text-sm md:text-base font-bold text-tarkov-accent">
                    {formatCurrency(caseType.price, 'roubles')}
                  </span>
                </motion.div>
                
                {/* Enhanced Selected Indicator */}
                {isSelected && (
                  <motion.div 
                    className="absolute inset-0 bg-tarkov-accent/20 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div 
                      className="bg-tarkov-accent rounded-full p-3 shadow-lg"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <svg className="w-6 h-6 md:w-8 md:h-8 text-tarkov-dark" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </motion.div>
                    
                    {/* Pulsing border effect */}
                    <motion.div
                      className="absolute inset-0 border-2 border-tarkov-accent rounded-t-xl"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </motion.div>
                )}
                
                {/* Hover glow effect */}
                {canAfford && !isSelected && (
                  <motion.div
                    className="absolute inset-0 bg-tarkov-accent/5 opacity-0"
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </div>
              
              {/* Enhanced Case Info */}
              <div className="p-4 md:p-5">
                <motion.h4 
                  className="font-tarkov font-bold text-white mb-3 text-lg md:text-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {caseType.name}
                </motion.h4>
                
                <motion.p 
                  className="text-sm text-gray-300 mb-4 line-clamp-2 leading-relaxed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {caseType.description}
                </motion.p>
                
                {/* Enhanced Rarity Distribution */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">
                    Drop Rates:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-1 text-xs">
                    {Object.entries(caseType.rarity_distribution).map(([rarity, percentage], rarityIndex) => (
                      <motion.span 
                        key={rarity}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + rarityIndex * 0.1 }}
                        className={`
                          px-2 py-1.5 rounded-lg bg-tarkov-dark/70 border border-opacity-50
                          ${rarityColors[rarity as keyof typeof rarityColors]} 
                          font-semibold text-center transition-all duration-200
                          hover:scale-105 hover:bg-tarkov-dark/90
                        `}
                        style={{
                          borderColor: rarityColors[rarity as keyof typeof rarityColors].replace('text-', '')
                        }}
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
                    className="mt-4 p-2 bg-tarkov-danger/20 border border-tarkov-danger/50 rounded-lg"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <div className="text-xs text-tarkov-danger font-semibold text-center">
                      ⚠️ Insufficient Balance
                    </div>
                    <div className="text-xs text-tarkov-danger/80 text-center mt-1">
                      Need {formatCurrency(caseType.price - balance, 'roubles')} more
                    </div>
                  </motion.div>
                )}
                
                {/* Affordability indicator */}
                {canAfford && !isSelected && (
                  <motion.div 
                    className="mt-4 p-2 bg-tarkov-success/20 border border-tarkov-success/50 rounded-lg"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <div className="text-xs text-tarkov-success font-semibold text-center">
                      ✅ Ready to Open
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
      
      {caseTypes.length === 0 && (
        <motion.div 
          className="text-center py-12 text-gray-400"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
    </TarkovCard>
  )
}

export default CaseSelector