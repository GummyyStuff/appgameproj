import React from 'react'
import { motion } from 'framer-motion'

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  value: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
}

interface BlackjackCardProps {
  card?: Card
  isHidden?: boolean
  delay?: number
}

const BlackjackCard: React.FC<BlackjackCardProps> = ({ 
  card, 
  isHidden = false, 
  delay = 0 
}) => {
  const getSuitSymbol = (suit: Card['suit']): string => {
    switch (suit) {
      case 'hearts': return '♥'
      case 'diamonds': return '♦'
      case 'clubs': return '♣'
      case 'spades': return '♠'
      default: return ''
    }
  }

  const getSuitColor = (suit: Card['suit']): string => {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-gray-900'
  }

  const getDisplayValue = (value: Card['value']): string => {
    return value
  }

  if (isHidden) {
    return (
      <motion.div
        className="relative w-12 h-18 sm:w-16 sm:h-24 bg-gradient-to-br from-tarkov-accent to-tarkov-warning rounded-lg shadow-lg border-2 border-tarkov-accent/50"
        initial={{ rotateY: 180, scale: 0.8 }}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{ 
          duration: 0.6, 
          delay: delay,
          type: "spring",
          stiffness: 300,
          damping: 20
        }}
        whileHover={{ scale: 1.05 }}
      >
        {/* Card back pattern */}
        <div className="absolute inset-1 bg-tarkov-dark rounded-md flex items-center justify-center">
          <div className="text-tarkov-accent text-2xl font-bold opacity-50">
            ⚡
          </div>
        </div>
      </motion.div>
    )
  }

  if (!card) {
    return (
      <div className="w-12 h-18 sm:w-16 sm:h-24 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center">
        <div className="text-gray-500 text-xs">Empty</div>
      </div>
    )
  }

  return (
    <motion.div
      className="relative w-12 h-18 sm:w-16 sm:h-24 bg-white rounded-lg shadow-lg border-2 border-gray-300 overflow-hidden"
      initial={{ 
        rotateY: 180, 
        scale: 0.8,
        x: -50,
        opacity: 0
      }}
      animate={{ 
        rotateY: 0, 
        scale: 1,
        x: 0,
        opacity: 1
      }}
      transition={{ 
        duration: 0.6, 
        delay: delay,
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
      whileHover={{ 
        scale: 1.05,
        y: -5,
        boxShadow: "0 10px 25px rgba(246, 173, 85, 0.3)"
      }}
    >
      {/* Top left corner */}
      <div className={`absolute top-1 left-1 text-xs font-bold ${getSuitColor(card.suit)}`}>
        <div>{getDisplayValue(card.value)}</div>
        <div className="text-lg leading-none">{getSuitSymbol(card.suit)}</div>
      </div>

      {/* Center symbol */}
      <div className={`absolute inset-0 flex items-center justify-center text-3xl ${getSuitColor(card.suit)}`}>
        {getSuitSymbol(card.suit)}
      </div>

      {/* Bottom right corner (rotated) */}
      <div className={`absolute bottom-1 right-1 text-xs font-bold transform rotate-180 ${getSuitColor(card.suit)}`}>
        <div>{getDisplayValue(card.value)}</div>
        <div className="text-lg leading-none">{getSuitSymbol(card.suit)}</div>
      </div>

      {/* Tarkov-themed border glow for face cards */}
      {['J', 'Q', 'K', 'A'].includes(card.value) && (
        <div className="absolute inset-0 border-2 border-tarkov-accent/30 rounded-lg pointer-events-none" />
      )}
    </motion.div>
  )
}

export default BlackjackCard