import React, { useState, useEffect } from 'react'
import { TarkovSpinner, TarkovIcons } from './TarkovIcons'
import TarkovBackground from './TarkovBackground'

interface LoadingScreenProps {
  message?: string
  progress?: number
  showTips?: boolean
  variant?: 'default' | 'game' | 'minimal'
  className?: string
}

// Tarkov-themed loading tips
const TARKOV_TIPS = [
  "Always check your corners - PMCs and Scavs can be anywhere",
  "Insure your gear before raids - you might get it back",
  "Learn the maps - knowledge is your best weapon",
  "Don't get too attached to your gear - you will lose it",
  "Headshots deal massive damage - aim for the head",
  "Different ammo types have different penetration values",
  "Healing takes time - find safe spots to recover",
  "Sound is crucial - listen for footsteps and reloads",
  "Scav runs are great for learning maps risk-free",
  "Check your extracts before entering a raid",
  "Stamina management is key to survival",
  "Some doors require keys - plan your routes",
  "Night raids offer different loot and encounters",
  "Traders have different loyalty levels and requirements",
  "The Flea Market unlocks at level 15",
  "Hideout upgrades provide passive benefits",
  "Different armor protects different body parts",
  "Painkillers prevent fracture effects temporarily",
  "Grenades can flush out campers effectively",
  "Weather affects visibility and sound",
  "Some extracts require payment or specific items",
  "Looting efficiently saves time and space",
  "Medical items have different healing speeds",
  "Weapon modding affects recoil and ergonomics",
  "Container items are kept on death"
]

export const TarkovLoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Loading...",
  progress,
  showTips = true,
  variant = 'default',
  className = ''
}) => {
  const [currentTip, setCurrentTip] = useState('')
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    if (showTips) {
      const randomTip = TARKOV_TIPS[Math.floor(Math.random() * TARKOV_TIPS.length)]
      setCurrentTip(randomTip)
      
      const interval = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % TARKOV_TIPS.length)
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [showTips])

  useEffect(() => {
    if (showTips) {
      setCurrentTip(TARKOV_TIPS[tipIndex])
    }
  }, [tipIndex, showTips])

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center justify-center space-x-3 ${className}`}>
        <TarkovSpinner className="text-tarkov-accent" />
        <span className="text-white font-tarkov">{message}</span>
      </div>
    )
  }

  return (
    <TarkovBackground variant="menu" className={className}>
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="max-w-2xl w-full text-center space-y-8">
          
          {/* Main logo/title area */}
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-4">
              <TarkovIcons.Skull className="text-tarkov-accent" size={48} />
              <h1 className="text-4xl font-bold text-tarkov-accent font-tarkov uppercase tracking-wider">
                Tarkov Casino
              </h1>
              <TarkovIcons.Skull className="text-tarkov-accent" size={48} />
            </div>
            
            <div className="flex items-center justify-center space-x-6 text-tarkov-steel">
              <TarkovIcons.Weapon size={24} />
              <TarkovIcons.Helmet size={24} />
              <TarkovIcons.Ammo size={24} />
            </div>
          </div>

          {/* Loading spinner and message */}
          <div className="space-y-6">
            <TarkovSpinner size={60} className="text-tarkov-accent mx-auto" />
            
            <div className="space-y-2">
              <p className="text-xl text-white font-tarkov uppercase tracking-wide">
                {message}
              </p>
              
              {progress !== undefined && (
                <div className="w-full max-w-md mx-auto">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-tarkov-dark rounded-full h-3 border border-tarkov-secondary overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-tarkov-accent to-orange-500 transition-all duration-300 animate-pulse-slow"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Loading tip */}
          {showTips && currentTip && (
            <div className="bg-tarkov-dark/50 border border-tarkov-secondary rounded-lg p-6 backdrop-blur-sm">
              <div className="flex items-start space-x-3">
                <TarkovIcons.Health className="text-tarkov-accent flex-shrink-0 mt-1" size={20} />
                <div className="text-left">
                  <h3 className="text-tarkov-accent font-bold uppercase text-sm mb-2 font-tarkov">
                    Survival Tip
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed animate-fade-in">
                    {currentTip}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Decorative elements */}
          <div className="flex items-center justify-center space-x-8 text-tarkov-steel/50">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-tarkov-steel/50" />
            <TarkovIcons.Roubles size={16} />
            <TarkovIcons.Dollars size={16} />
            <TarkovIcons.Euros size={16} />
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-tarkov-steel/50" />
          </div>
        </div>
      </div>
    </TarkovBackground>
  )
}

// Game-specific loading screens
export const GameLoadingScreen: React.FC<{
  gameType: 'roulette' | 'blackjack' | 'plinko'
  message?: string
}> = ({ gameType, message }) => {
  const gameConfig = {
    roulette: {
      icon: TarkovIcons.Roulette,
      title: 'Roulette Table',
      defaultMessage: 'Preparing the wheel...',
      tips: [
        "Red and Black pay 1:1, but the house edge comes from the green zero",
        "Straight up bets on single numbers pay 35:1",
        "Outside bets have better odds but lower payouts",
        "The wheel has 37 numbers in European roulette (0-36)"
      ]
    },
    blackjack: {
      icon: TarkovIcons.Blackjack,
      title: 'Blackjack Table',
      defaultMessage: 'Shuffling the deck...',
      tips: [
        "Always split Aces and 8s",
        "Never split 10s or face cards",
        "Double down on 11 when dealer shows 2-10",
        "Basic strategy reduces the house edge significantly"
      ]
    },
    plinko: {
      icon: TarkovIcons.Plinko,
      title: 'Plinko Board',
      defaultMessage: 'Setting up the pegs...',
      tips: [
        "Higher risk levels offer bigger multipliers",
        "The ball's path is determined by physics simulation",
        "Center slots typically have lower multipliers",
        "Edge slots can have the highest payouts"
      ]
    }
  }

  const config = gameConfig[gameType]
  const IconComponent = config.icon

  return (
    <div className="flex items-center justify-center min-h-64 p-8">
      <div className="text-center space-y-6">
        <div className="space-y-3">
          <IconComponent className="text-tarkov-accent mx-auto" size={48} />
          <h2 className="text-2xl font-bold text-white font-tarkov uppercase">
            {config.title}
          </h2>
        </div>
        
        <TarkovSpinner size={40} className="text-tarkov-accent mx-auto" />
        
        <p className="text-tarkov-accent font-medium">
          {message || config.defaultMessage}
        </p>
        
        <div className="bg-tarkov-dark/30 border border-tarkov-secondary/50 rounded-lg p-4 max-w-md">
          <p className="text-sm text-gray-300">
            {config.tips[Math.floor(Math.random() * config.tips.length)]}
          </p>
        </div>
      </div>
    </div>
  )
}

// Simple loading overlay for quick operations
export const LoadingOverlay: React.FC<{
  show: boolean
  message?: string
  className?: string
}> = ({ show, message = 'Loading...', className = '' }) => {
  if (!show) return null

  return (
    <div className={`
      fixed inset-0 bg-black/50 backdrop-blur-sm z-50
      flex items-center justify-center
      ${className}
    `}>
      <div className="bg-tarkov-dark border border-tarkov-secondary rounded-lg p-6 text-center space-y-4">
        <TarkovSpinner size={40} className="text-tarkov-accent mx-auto" />
        <p className="text-white font-tarkov">{message}</p>
      </div>
    </div>
  )
}

export default TarkovLoadingScreen