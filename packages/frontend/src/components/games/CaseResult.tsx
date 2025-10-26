import React from 'react'
import { motion } from 'framer-motion'
import { CaseOpeningResult } from '../../types/caseOpening'
import { formatCurrency } from '../../utils/currency'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

interface CaseResultProps {
  result: CaseOpeningResult
}

const rarityColors = {
  common: {
    border: 'border-gray-400',
    glow: 'shadow-gray-400/50',
    bg: 'bg-gray-400/10',
    text: 'text-gray-400',
    badge: 'bg-gray-800 border-gray-400 text-gray-300'
  },
  uncommon: {
    border: 'border-green-400',
    glow: 'shadow-green-400/50',
    bg: 'bg-green-400/10',
    text: 'text-green-400',
    badge: 'bg-green-900/50 border-green-400 text-green-300'
  },
  rare: {
    border: 'border-blue-400',
    glow: 'shadow-blue-400/50',
    bg: 'bg-blue-400/10',
    text: 'text-blue-400',
    badge: 'bg-blue-900/50 border-blue-400 text-blue-300'
  },
  epic: {
    border: 'border-purple-400',
    glow: 'shadow-purple-400/50',
    bg: 'bg-purple-400/10',
    text: 'text-purple-400',
    badge: 'bg-purple-900/50 border-purple-400 text-purple-300'
  },
  legendary: {
    border: 'border-yellow-400',
    glow: 'shadow-yellow-400/50',
    bg: 'bg-yellow-400/10',
    text: 'text-yellow-400',
    badge: 'bg-yellow-900/50 border-yellow-400 text-yellow-300'
  }
}

const categoryIcons = {
  medical: '🏥',
  electronics: '💻',
  consumables: '🍖',
  valuables: '💰',
  keycards: '🗝️'
}

const CaseResult: React.FC<CaseResultProps> = ({ result }) => {
  const rarity = rarityColors[result.item_won.rarity] || rarityColors.common
  
  // Rarity-specific celebration intensity with improved animation curves
  const getCelebrationIntensity = () => {
    const rarity = result.item_won.rarity
    switch (rarity) {
      case 'legendary':
        return {
          scaleRange: [1, 1.15, 1],
          glowIntensity: 0.6,
          pulseSpeed: 1.5,
          emoji: '🏆',
          particles: true,
          confetti: true
        }
      case 'epic':
        return {
          scaleRange: [1, 1.12, 1],
          glowIntensity: 0.5,
          pulseSpeed: 1.8,
          emoji: '✨',
          particles: true,
          confetti: false
        }
      case 'rare':
        return {
          scaleRange: [1, 1.08, 1],
          glowIntensity: 0.4,
          pulseSpeed: 2,
          emoji: '💎',
          particles: false,
          confetti: false
        }
      case 'uncommon':
        return {
          scaleRange: [1, 1.05, 1],
          glowIntensity: 0.3,
          pulseSpeed: 2.2,
          emoji: '🎊',
          particles: false,
          confetti: false
        }
      default:
        return {
          scaleRange: [1, 1.03, 1],
          glowIntensity: 0.2,
          pulseSpeed: 2.5,
          emoji: '🎉',
          particles: false,
          confetti: false
        }
    }
  }

  const celebration = getCelebrationIntensity()

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Enhanced Congratulations Header with better accessibility */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        role="banner"
        aria-live="polite"
      >
        <motion.h2
          className="text-4xl md:text-5xl font-tarkov font-bold text-green-400 mb-4"
          animate={{ scale: celebration.scaleRange }}
          transition={{ 
            duration: celebration.pulseSpeed, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <span role="img" aria-label="Congratulations">🎉</span> Congratulations! <span role="img" aria-label={celebration.emoji}>{celebration.emoji}</span>
        </motion.h2>
        <p className="text-gray-400 text-lg">
          You've won an amazing item!
        </p>
      </motion.div>

      {/* Enhanced Item Display Card with improved structure */}
      <Card className="relative overflow-hidden border-2 bg-gradient-to-br from-tarkov-dark to-tarkov-primary">
        <CardHeader>
          <CardTitle className="sr-only">Won Item</CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            {/* Enhanced Item Icon with better accessibility */}
            <motion.div
              className="flex justify-center mb-6"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
            >
              <div className={`
                relative w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden border-2
                ${rarity.border} ${rarity.glow} shadow-xl
              `}
              role="img"
              aria-label={`${result.item_won.name} item image`}
              >
                {result.item_won.image_url ? (
                  <img 
                    src={result.item_won.image_url}
                    alt={result.item_won.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-tarkov-secondary to-tarkov-dark flex items-center justify-center text-6xl">
                    <span role="img" aria-label={categoryIcons[result.item_won.category] || 'Item'}>
                      {categoryIcons[result.item_won.category] || '📦'}
                    </span>
                  </div>
                )}
                
                {/* Enhanced Glow overlay with rarity intensity */}
                <motion.div
                  className={`absolute inset-0 ${rarity.bg}`}
                  animate={{ opacity: [celebration.glowIntensity * 0.3, celebration.glowIntensity, celebration.glowIntensity * 0.3] }}
                  transition={{ duration: celebration.pulseSpeed, repeat: Infinity }}
                  aria-hidden="true"
                />
              </div>
            </motion.div>

            {/* Enhanced Item Name */}
            <motion.h3
              className={`text-2xl md:text-3xl font-tarkov font-bold text-center mb-3 ${rarity.text}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
            >
              {result.item_won.name}
            </motion.h3>

            {/* Enhanced Rarity Badge with better semantics */}
            <motion.div
              className="flex justify-center mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <Badge 
                variant="outline" 
                className={`${rarity.badge} px-4 py-1.5 text-sm font-bold uppercase tracking-wider`}
                aria-label={`Rarity: ${result.item_won.rarity}`}
              >
                <span className="mr-2" role="img" aria-hidden="true">⭐</span>
                {result.item_won.rarity}
              </Badge>
            </motion.div>

            {/* Item Description */}
            {result.item_won.description && (
              <motion.p
                className="text-gray-300 text-sm text-center mb-6 max-w-md mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                {result.item_won.description}
              </motion.p>
            )}

            {/* Enhanced Item Value Display with better visual hierarchy */}
            <motion.div
              className="flex flex-col items-center justify-center gap-3 mb-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
            >
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 w-full">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide font-medium">Item Value</p>
                  <span className="text-blue-400 font-bold text-xl" aria-label={`Item value: ${formatCurrency(result.item_won.base_value, 'roubles')}`}>
                    {formatCurrency(result.item_won.base_value, 'roubles')}
                  </span>
                </div>
              </div>
              
              {/* Enhanced Currency Award with visual distinction */}
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 w-full">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide font-medium">Bonus Award</p>
                  <span className="text-green-400 font-bold text-xl" aria-label={`Bonus award: ${formatCurrency(result.currency_awarded, 'roubles')}`}>
                    <span className="mr-1" role="img" aria-hidden="true">💰</span>
                    +{formatCurrency(result.currency_awarded, 'roubles')}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </CardContent>

        {/* Enhanced Animated background glow with rarity intensity */}
        <motion.div
          className={`absolute inset-0 ${rarity.bg} pointer-events-none`}
          animate={{ 
            opacity: [
              celebration.glowIntensity * 0.3, 
              celebration.glowIntensity, 
              celebration.glowIntensity * 0.3
            ] 
          }}
          transition={{ duration: celebration.pulseSpeed * 1.5, repeat: Infinity }}
          aria-hidden="true"
        />
      </Card>
    </div>
  )
}

export default CaseResult
