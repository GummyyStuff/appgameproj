import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useBlackjackShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useEnhancedButton } from '../../hooks/useTouchInteractions'
import { useToastContext } from '../providers/ToastProvider'
import KeyboardShortcutsHelp from '../ui/KeyboardShortcutsHelp'

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
  const toast = useToastContext()
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const buttonBaseClass = "px-6 py-3 rounded-lg font-bold text-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed relative"

  // Enhanced action handlers with toast feedback
  const handleHit = () => {
    onHit()
    toast.info('Hit!', 'Taking another card')
  }

  const handleStand = () => {
    onStand()
    toast.info('Stand!', 'Keeping current hand')
  }

  const handleDouble = () => {
    if (!canDouble) {
      toast.warning('Cannot double', 'Double down only available on first two cards')
      return
    }
    if (balance < currentBet) {
      toast.error('Insufficient balance', 'Not enough balance to double down')
      return
    }
    onDouble()
    toast.success('Double down!', `Bet doubled to ₽${currentBet * 2}`)
  }

  const handleSplit = () => {
    if (!canSplit) {
      toast.warning('Cannot split', 'Split only available with matching pairs')
      return
    }
    if (balance < currentBet) {
      toast.error('Insufficient balance', 'Not enough balance to split')
      return
    }
    onSplit()
    toast.success('Split!', 'Hand split into two separate hands')
  }

  // Keyboard shortcuts
  const shortcuts = useBlackjackShortcuts({
    hit: isGameActive && !isProcessing ? handleHit : undefined,
    stand: isGameActive && !isProcessing ? handleStand : undefined,
    double: isGameActive && !isProcessing && canDouble && balance >= currentBet ? handleDouble : undefined,
    split: isGameActive && !isProcessing && canSplit && balance >= currentBet ? handleSplit : undefined
  })

  // Enhanced button props for touch interactions - call hooks at top level
  const hitButtonProps = useEnhancedButton({
    onClick: handleHit,
    onLongPress: () => {
      if (isGameActive && !isProcessing) {
        toast.info('Long press detected', 'Hit action triggered!')
      }
    },
    disabled: !(isGameActive && !isProcessing)
  })

  const standButtonProps = useEnhancedButton({
    onClick: handleStand,
    onLongPress: () => {
      if (isGameActive && !isProcessing) {
        toast.info('Long press detected', 'Stand action triggered!')
      }
    },
    disabled: !(isGameActive && !isProcessing)
  })

  const doubleButtonProps = useEnhancedButton({
    onClick: handleDouble,
    onLongPress: () => {
      if (isGameActive && !isProcessing && canDouble && balance >= currentBet) {
        toast.info('Long press detected', 'Double action triggered!')
      }
    },
    disabled: !(isGameActive && !isProcessing && canDouble && balance >= currentBet)
  })

  const splitButtonProps = useEnhancedButton({
    onClick: handleSplit,
    onLongPress: () => {
      if (isGameActive && !isProcessing && canSplit && balance >= currentBet) {
        toast.info('Long press detected', 'Split action triggered!')
      }
    },
    disabled: !(isGameActive && !isProcessing && canSplit && balance >= currentBet)
  })
  
  const actions = [
    {
      label: 'Hit',
      enabled: isGameActive && !isProcessing,
      className: `${buttonBaseClass} bg-tarkov-accent text-tarkov-dark hover:bg-tarkov-accent/90 hover:shadow-tarkov-accent/25`,
      icon: '👆',
      description: 'Take another card',
      shortcut: 'H',
      buttonProps: hitButtonProps
    },
    {
      label: 'Stand',
      enabled: isGameActive && !isProcessing,
      className: `${buttonBaseClass} bg-tarkov-secondary text-white hover:bg-tarkov-secondary/90 hover:shadow-tarkov-secondary/25`,
      icon: '✋',
      description: 'Keep current hand',
      shortcut: 'S',
      buttonProps: standButtonProps
    },
    {
      label: 'Double',
      enabled: isGameActive && !isProcessing && canDouble && balance >= currentBet,
      className: `${buttonBaseClass} bg-tarkov-warning text-tarkov-dark hover:bg-tarkov-warning/90 hover:shadow-tarkov-warning/25`,
      icon: '💰',
      description: `Double bet to ₽${currentBet * 2}`,
      shortcut: 'D',
      buttonProps: doubleButtonProps
    },
    {
      label: 'Split',
      enabled: isGameActive && !isProcessing && canSplit && balance >= currentBet,
      className: `${buttonBaseClass} bg-tarkov-success text-white hover:bg-tarkov-success/90 hover:shadow-tarkov-success/25`,
      icon: '✂️',
      description: `Split into two hands (₽${currentBet} each)`,
      shortcut: 'P',
      buttonProps: splitButtonProps
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
        {actions.map((action, index) => {
          return (
            <motion.button
              key={action.label}
              {...action.buttonProps}
              className={`${action.className} ${action.buttonProps.className || ''}`}
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

              {/* Keyboard shortcut indicator */}
              <span className="absolute top-1 right-1 text-xs opacity-60 bg-black/20 rounded px-1">
                {action.shortcut}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* Action Hints */}
      <motion.div
        className="bg-tarkov-secondary/30 rounded-lg p-4 text-sm text-gray-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-tarkov-accent">Quick Guide:</h4>
          <button
            onClick={() => setShowShortcutsHelp(true)}
            className="text-xs text-tarkov-accent hover:text-tarkov-accent/80 underline"
          >
            Keyboard shortcuts
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><strong>Hit (H):</strong> Take another card</div>
          <div><strong>Stand (S):</strong> Keep your current hand</div>
          <div><strong>Double (D):</strong> Double bet, get one card, then stand</div>
          <div><strong>Split (P):</strong> Split pairs into two separate hands</div>
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

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
        shortcuts={shortcuts}
        title="Blackjack Controls"
      />
    </div>
  )
}

export default BlackjackActions