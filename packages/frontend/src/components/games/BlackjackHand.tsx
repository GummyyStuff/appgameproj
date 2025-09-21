import React from 'react'
import { motion } from 'framer-motion'
import BlackjackCard, { Card } from './BlackjackCard'

interface BlackjackHandProps {
  cards: Card[]
  isDealer?: boolean
  hideFirstCard?: boolean
  handValue?: number
  label: string
  isActive?: boolean
}

const BlackjackHand: React.FC<BlackjackHandProps> = ({
  cards,
  isDealer = false,
  hideFirstCard = false,
  handValue,
  label,
  isActive = false
}) => {
  const calculateVisibleValue = (): number => {
    if (isDealer && hideFirstCard && cards.length > 0) {
      // Only show value of visible cards for dealer
      const visibleCards = cards.slice(1)
      return calculateHandValue(visibleCards)
    }
    return handValue || calculateHandValue(cards)
  }

  const calculateHandValue = (hand: Card[]): number => {
    let value = 0
    let aces = 0

    for (const card of hand) {
      if (card.value === 'A') {
        aces++
        value += 11
      } else if (['J', 'Q', 'K'].includes(card.value)) {
        value += 10
      } else {
        value += parseInt(card.value)
      }
    }

    // Convert aces from 11 to 1 if needed
    while (value > 21 && aces > 0) {
      value -= 10
      aces--
    }

    return value
  }

  const getHandStatus = (): { text: string; color: string } => {
    const value = calculateVisibleValue()
    
    if (value === 21 && cards.length === 2) {
      return { text: 'BLACKJACK!', color: 'text-tarkov-success' }
    } else if (value > 21) {
      return { text: 'BUST!', color: 'text-tarkov-danger' }
    } else if (value === 21) {
      return { text: '21!', color: 'text-tarkov-success' }
    } else {
      return { text: '', color: '' }
    }
  }

  const handStatus = getHandStatus()
  const displayValue = calculateVisibleValue()

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Hand Label */}
      <motion.div
        className={`text-center ${isActive ? 'text-tarkov-accent' : 'text-gray-300'}`}
        animate={isActive ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
      >
        <h3 className={`text-lg font-tarkov font-bold ${isActive ? 'text-tarkov-accent' : 'text-white'}`}>
          {label}
          {isActive && (
            <motion.span
              className="ml-2 text-tarkov-accent"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ←
            </motion.span>
          )}
        </h3>
        
        {/* Hand Value */}
        <div className="flex items-center justify-center space-x-2 mt-1">
          <span className={`text-2xl font-bold ${
            displayValue > 21 ? 'text-tarkov-danger' : 
            displayValue === 21 ? 'text-tarkov-success' : 
            'text-tarkov-accent'
          }`}>
            {isDealer && hideFirstCard && cards.length > 1 ? `${displayValue}+` : displayValue}
          </span>
          
          {handStatus.text && (
            <motion.span
              className={`text-sm font-bold ${handStatus.color}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500 }}
            >
              {handStatus.text}
            </motion.span>
          )}
        </div>
      </motion.div>

      {/* Cards */}
      <div className="flex space-x-2">
        {cards.map((card, index) => (
          <BlackjackCard
            key={`${card.suit}-${card.value}-${index}`}
            card={card}
            isHidden={isDealer && hideFirstCard && index === 0}
            delay={index * 0.2}
          />
        ))}
        
        {/* Empty slots for visual consistency */}
        {cards.length < 2 && Array.from({ length: 2 - cards.length }).map((_, index) => (
          <BlackjackCard
            key={`empty-${index}`}
            delay={(cards.length + index) * 0.2}
          />
        ))}
      </div>

      {/* Hand Status Indicator */}
      {isActive && (
        <motion.div
          className="w-full h-1 bg-tarkov-accent rounded-full"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </div>
  )
}

export default BlackjackHand