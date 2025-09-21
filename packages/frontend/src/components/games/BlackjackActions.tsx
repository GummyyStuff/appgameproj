import React from 'react'
import { motion } from 'framer-motion'

interface BlackjackActionsProps {
  onHit: () => void
  onStand: () => void
  onDouble: () => void
  onSplit: () => void
  canDouble: boolean
  canSplit: boolean
  isGameActive: boolean
  isProcessing: boolean
  balance: number
  currentBet: number
}

const BlackjackActions: React.FC<BlackjackActionsProps> = ({
  onHit,
  onStand,
  onDouble,
  onSplit,
  canDouble,
  canSplit,
  isGameActive,
  isProcessing,
  balance,
  currentBet
}) => {
  const buttonBaseClass = "px-6 py-3 rounded-lg font-bold text-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
  
  const actions = [
    {
      label: 'Hit',
      onClick: onHit,
      enabled: isGameActive && !isProcessing,
      className: `${buttonBaseClass} bg-tarkov-accent text-tarkov-dark hover:bg-tarkov-accent/90 hover:shadow-tarkov-accent/25`,
      icon: '👆',
      description: 'Take another card'
    },
    {
      label: 'Stand',
      onClick: onStand,
      enabled: isGameActive && !isProcessing,
      className: `${buttonBaseClass} bg-tarkov-secondary text-white hover:bg-tarkov-secondary/90 hover:shadow-tarkov-secondary/25`,
      icon: '✋',
      description: 'Keep current hand'
    },
    {
      label: 'Double',
      onClick: onDouble,
      enabled: isGameActive && !isProcessing && canDouble && balance >= currentBet,
      className: `${buttonBaseClass} bg-tarkov-warning text-tarkov-dark hover:bg-tarkov-warning/90 hover:shadow-tarkov-warning/25`,
      icon: '💰',
      description: `Double bet to ₽${currentBet * 2}`
    },
    {
      label: 'Split',
      onClick: onSplit,
      enabled: isGameActive && !isProcessing && canSplit && balance >= currentBet,
      className: `${buttonBaseClass} bg-tarkov-success text-white hover:bg-tarkov-success/90 hover:shadow-tarkov-success/25`,
      icon: '✂️',
      description: `Split into two hands (₽${currentBet} each)`
    }
  ]

  if (!isGameActive && !isProcessing) {
    return (
      <div className="text-center text-gray-400">
        <p>Place a bet to start playing</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {actions.map((action, index) => (
          <motion.button
            key={action.label}
            className={action.className}
            onClick={action.onClick}
            disabled={!action.enabled}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={action.enabled ? { scale: 1.02, y: -2 } : {}}
            whileTap={action.enabled ? { scale: 0.98 } : {}}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl">{action.icon}</span>
              <span>{action.label}</span>
            </div>
            
            {/* Tooltip */}
            <div className="text-xs opacity-75 mt-1">
              {action.description}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Action Hints */}
      <motion.div
        className="bg-tarkov-secondary/30 rounded-lg p-4 text-sm text-gray-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h4 className="font-bold text-tarkov-accent mb-2">Quick Guide:</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><strong>Hit:</strong> Take another card</div>
          <div><strong>Stand:</strong> Keep your current hand</div>
          <div><strong>Double:</strong> Double bet, get one card, then stand</div>
          <div><strong>Split:</strong> Split pairs into two separate hands</div>
        </div>
        
        {(!canDouble || balance < currentBet) && (
          <div className="mt-2 text-tarkov-warning text-xs">
            {!canDouble && "• Double down only available on first two cards"}
            {balance < currentBet && "• Insufficient balance for double/split"}
          </div>
        )}
      </motion.div>

      {/* Processing Indicator */}
      {isProcessing && (
        <motion.div
          className="flex items-center justify-center space-x-2 text-tarkov-accent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-tarkov-accent border-t-transparent"></div>
          <span className="text-sm">Processing action...</span>
        </motion.div>
      )}
    </div>
  )
}

export default BlackjackActions