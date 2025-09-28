import React from 'react'
import { motion } from 'framer-motion'
import { TarkovButton } from '../ui/TarkovButton'
import { formatCurrency } from '../../utils/currency'

export interface CaseType {
  id: string
  name: string
  price: number
  description: string
  image_url?: string
  rarity_distribution: {
    common: number
    uncommon: number
    rare: number
    epic: number
    legendary: number
  }
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CaseConfirmationProps {
  caseType: CaseType
  balance: number
  onConfirm: (caseType: CaseType) => void
  onCancel: () => void
  isVisible: boolean
}

const CaseConfirmation: React.FC<CaseConfirmationProps> = ({
  caseType,
  balance,
  onConfirm,
  onCancel,
  isVisible
}) => {
  if (!isVisible) return null

  const canAfford = balance >= caseType.price
  const remainingBalance = balance - caseType.price

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="bg-gradient-to-br from-tarkov-dark to-tarkov-primary rounded-2xl border-2 border-tarkov-accent/50 p-6 md:p-8 max-w-md w-full shadow-2xl shadow-tarkov-accent/20"
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-4xl mb-3">🎲</div>
          <h3 className="text-xl md:text-2xl font-tarkov font-bold text-tarkov-accent mb-2">
            Confirm Case Opening
          </h3>
          <p className="text-gray-300">
            Are you sure you want to open this case?
          </p>
        </motion.div>

        {/* Case Info */}
        <motion.div
          className="bg-tarkov-secondary/30 rounded-xl p-4 mb-6 border border-tarkov-accent/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-tarkov font-bold text-white text-lg">
              {caseType.name}
            </h4>
            <div className="text-tarkov-accent font-bold text-lg">
              {formatCurrency(caseType.price, 'roubles')}
            </div>
          </div>
          <p className="text-sm text-gray-300 mb-3">
            {caseType.description}
          </p>

          {/* Balance info */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Current balance:</span>
              <span className="text-white font-semibold">
                {formatCurrency(balance, 'roubles')}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Cost:</span>
              <span className="text-tarkov-accent font-semibold">
                -{formatCurrency(caseType.price, 'roubles')}
              </span>
            </div>
            <hr className="border-tarkov-accent/20 my-2" />
            <div className="flex justify-between items-center text-sm font-bold">
              <span className="text-gray-300">After opening:</span>
              <span className={remainingBalance >= 0 ? 'text-tarkov-accent' : 'text-red-400'}>
                {formatCurrency(remainingBalance, 'roubles')}
              </span>
            </div>
          </div>

          {/* Insufficient balance warning */}
          {!canAfford && (
            <motion.div
              className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-sm text-red-400 font-semibold text-center">
                ⚠️ Insufficient Balance
              </div>
              <div className="text-xs text-red-400/80 text-center mt-1">
                You need {formatCurrency(caseType.price - balance, 'roubles')} more
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <TarkovButton
            variant="secondary"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </TarkovButton>
          <TarkovButton
            onClick={() => onConfirm(caseType)}
            disabled={!canAfford}
            className="flex-1"
          >
            🎲 Open Case
          </TarkovButton>
        </motion.div>

        {/* Fun fact */}
        <motion.div
          className="mt-4 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-xs text-gray-500">
            💡 Pro tip: Higher rarity cases have better odds for rare items!
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export default CaseConfirmation
