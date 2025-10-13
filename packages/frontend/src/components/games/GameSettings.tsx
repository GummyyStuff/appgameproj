import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useGamePreferences, AnimationSpeed } from '../../hooks/useGamePreferences'
import { TarkovCard } from '../ui/TarkovCard'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'

/**
 * Game settings component for case opening preferences
 * Based on CS2 case simulator's options system with shadcn/ui collapsible
 * 
 * Features:
 * - Collapsible UI (hidden by default)
 * - Animation speed control (fast/normal/slow)
 * - Quick open toggle (skip animation entirely)
 * - Persistent localStorage storage
 * - shadcn/ui + Tarkov-themed styling
 * 
 * Research sources:
 * - CS2 simulator: /cs2-case-simulator-main/frontend/composables/optionsStore.ts
 * - shadcn/ui: https://ui.shadcn.com/docs/components/collapsible
 * - React.dev: useCallback patterns for toggles
 * - Project pattern: useSoundPreferences.ts
 */
export const GameSettings: React.FC = () => {
  const { 
    animationSpeed, 
    setAnimationSpeed, 
    quickOpen, 
    toggleQuickOpen,
    ANIMATION_DURATIONS 
  } = useGamePreferences()

  const [isOpen, setIsOpen] = useState(false)

  const speedOptions: { value: AnimationSpeed; label: string; duration: number }[] = [
    { value: 'fast', label: 'Fast', duration: ANIMATION_DURATIONS.fast },
    { value: 'normal', label: 'Normal', duration: ANIMATION_DURATIONS.normal },
    { value: 'slow', label: 'Slow', duration: ANIMATION_DURATIONS.slow }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <TarkovCard className="p-4">
        {/* Collapsible Trigger */}
        <CollapsibleTrigger asChild>
          <motion.button
            className="w-full flex items-center justify-between text-left group"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <h3 className="text-lg font-tarkov font-bold text-tarkov-accent flex items-center gap-2">
              <span className="text-2xl">⚙️</span>
              <span>Animation Settings</span>
              <span className="text-xs font-normal text-gray-400 ml-2">
                {quickOpen ? '⚡ Quick' : `${(ANIMATION_DURATIONS[animationSpeed] / 1000).toFixed(1)}s`}
              </span>
            </h3>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-tarkov-accent text-xl"
            >
              ▼
            </motion.div>
          </motion.button>
        </CollapsibleTrigger>

        {/* Collapsible Content */}
        <CollapsibleContent className="overflow-hidden">
          <motion.div
            initial={false}
            animate={{
              height: isOpen ? "auto" : 0,
              opacity: isOpen ? 1 : 0
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="pt-4"
          >

        {/* Animation Speed Selector */}
        <div className="space-y-3 mb-6">
          <label className="text-gray-300 text-sm font-semibold block">
            Animation Speed
          </label>
          <div className="grid grid-cols-3 gap-3">
            {speedOptions.map((option) => (
              <motion.button
                key={option.value}
                onClick={() => setAnimationSpeed(option.value)}
                className={`
                  px-4 py-3 rounded-lg font-semibold text-sm transition-all
                  ${animationSpeed === option.value
                    ? 'bg-tarkov-accent text-tarkov-darker border-2 border-tarkov-accent shadow-lg'
                    : 'bg-tarkov-secondary/50 text-gray-300 border-2 border-gray-600 hover:border-tarkov-accent/50'
                  }
                `}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="font-bold">{option.label}</div>
                <div className="text-xs opacity-75 mt-1">
                  {(option.duration / 1000).toFixed(1)}s
                </div>
              </motion.button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            💡 Fast mode is great for opening multiple cases quickly
          </p>
        </div>

        {/* Quick Open Toggle */}
        <div className="space-y-3">
          <label className="text-gray-300 text-sm font-semibold block">
            Quick Open Mode
          </label>
          <motion.button
            onClick={toggleQuickOpen}
            className={`
              w-full px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-between
              ${quickOpen
                ? 'bg-green-600/20 text-green-400 border-2 border-green-500/50'
                : 'bg-tarkov-secondary/50 text-gray-400 border-2 border-gray-600'
              }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="flex items-center gap-2">
              <span className="text-2xl">{quickOpen ? '⚡' : '🎰'}</span>
              <span>Skip Animation</span>
            </span>
            <span className={`
              px-3 py-1 rounded-full text-xs font-bold
              ${quickOpen ? 'bg-green-500/30 text-green-300' : 'bg-gray-600/50 text-gray-400'}
            `}>
              {quickOpen ? 'ON' : 'OFF'}
            </span>
          </motion.button>
          <p className="text-xs text-gray-400 mt-2">
            {quickOpen 
              ? '⚡ Cases open instantly - perfect for bulk opening!' 
              : '🎰 Full carousel animation plays - enjoy the suspense!'
            }
          </p>
        </div>

            {/* Info Box */}
            <motion.div
              className="mt-6 p-4 bg-tarkov-accent/10 border border-tarkov-accent/30 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-xs text-gray-300 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-tarkov-accent">💾</span>
                  <span>Settings are saved automatically</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-tarkov-accent">🎮</span>
                  <span>Based on CS2 case opening mechanics</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </CollapsibleContent>
      </TarkovCard>
      </Collapsible>
    </motion.div>
  )
}

export default GameSettings


