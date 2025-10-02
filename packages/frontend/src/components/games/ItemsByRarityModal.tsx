import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TarkovCard } from '../ui/TarkovCard'
import { formatCurrency } from '../../utils/currency'

export interface TarkovItem {
  id: string
  name: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  base_value: number
  category: string
  image_url?: string
  description?: string
}

interface ItemsByRarityModalProps {
  isOpen: boolean
  onClose: () => void
  rarity: string
  items: TarkovItem[]
  caseName: string
}

const rarityColors = {
  common: 'text-gray-400 border-gray-400 bg-gray-400/10',
  uncommon: 'text-green-400 border-green-400 bg-green-400/10',
  rare: 'text-blue-400 border-blue-400 bg-blue-400/10',
  epic: 'text-purple-400 border-purple-400 bg-purple-400/10',
  legendary: 'text-yellow-400 border-yellow-400 bg-yellow-400/10'
}

const rarityIcons = {
  common: '⚪',
  uncommon: '🟢',
  rare: '🔵',
  epic: '🟣',
  legendary: '⭐'
}

const ItemsByRarityModal: React.FC<ItemsByRarityModalProps> = ({
  isOpen,
  onClose,
  rarity,
  items,
  caseName
}) => {
  const rarityColor = rarityColors[rarity as keyof typeof rarityColors] || rarityColors.common
  const rarityIcon = rarityIcons[rarity as keyof typeof rarityIcons] || '⚪'

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-4xl max-h-[80vh] overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          <TarkovCard className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{rarityIcon}</span>
                <div>
                  <h2 className="text-2xl font-tarkov font-bold text-tarkov-accent capitalize">
                    {rarity} Items
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Available in {caseName}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>

            {/* Items Grid */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 opacity-30">📦</div>
                  <p className="text-gray-400 text-lg">
                    No {rarity} items found in this case
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-lg border-2 ${rarityColor} hover:scale-105 transition-transform cursor-pointer`}
                    >
                      {/* Item Image */}
                      <div className="aspect-square mb-3 bg-gradient-to-br from-tarkov-secondary to-tarkov-dark rounded-lg flex items-center justify-center overflow-hidden">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-4xl opacity-50">
                            {getCategoryIcon(item.category)}
                          </div>
                        )}
                      </div>

                      {/* Item Info */}
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm truncate" title={item.name}>
                          {item.name}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="text-xs opacity-80 capitalize">
                            {item.category}
                          </span>
                          <span className="text-xs font-medium">
                            {formatCurrency(item.base_value, 'roubles')}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs opacity-70 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>
                  {items.length} {rarity} item{items.length !== 1 ? 's' : ''} available
                </span>
                <span>
                  Click outside or press ✕ to close
                </span>
              </div>
            </div>
          </TarkovCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Helper function to get category icons
function getCategoryIcon(category: string): string {
  const categoryIcons: Record<string, string> = {
    medical: '🏥',
    electronics: '💻',
    consumables: '🍖',
    valuables: '💰',
    keycards: '🗝️'
  }
  return categoryIcons[category] || '📦'
}

export default ItemsByRarityModal
