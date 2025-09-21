import React from 'react'
import { motion } from 'framer-motion'

interface PlinkoBet {
  amount: number
  riskLevel: 'low' | 'medium' | 'high'
}

interface RiskLevelInfo {
  description: string
  maxMultiplier: number
  minMultiplier: number
  expectedReturn: number
}

interface PlinkoControlsProps {
  currentBet: PlinkoBet
  onBetChange: (bet: PlinkoBet) => void
  balance: number
  riskLevels: Record<string, RiskLevelInfo>
  isPlaying: boolean
  isAnimating: boolean
  error: string | null
  onDropBall: () => void
  onPlayAgain?: () => void
  showPlayAgain?: boolean
  className?: string
}

const PlinkoControls: React.FC<PlinkoControlsProps> = ({
  currentBet,
  onBetChange,
  balance,
  riskLevels,
  isPlaying,
  isAnimating,
  error,
  onDropBall,
  onPlayAgain,
  showPlayAgain = false,
  className = ''
}) => {
  const quickBetAmounts = [10, 50, 100, 500, 1000]

  const handleBetAmountChange = (amount: number) => {
    onBetChange({ ...currentBet, amount: Math.max(1, Math.min(amount, balance)) })
  }

  const handleRiskLevelChange = (riskLevel: 'low' | 'medium' | 'high') => {
    onBetChange({ ...currentBet, riskLevel })
  }

  const isDisabled = isPlaying || isAnimating

  return (
    <div className={`bg-tarkov-dark rounded-lg p-6 space-y-6 ${className}`}>
      <h3 className="text-xl font-tarkov font-bold text-tarkov-accent">
        Place Your Bet
      </h3>

      {/* Risk Level Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Risk Level
        </label>
        <div className="space-y-2">
          {Object.entries(riskLevels).map(([level, info]) => (
            <motion.button
              key={level}
              className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                currentBet.riskLevel === level
                  ? 'border-tarkov-accent bg-tarkov-accent/20 text-tarkov-accent'
                  : 'border-gray-600 bg-tarkov-secondary/50 text-gray-300 hover:border-tarkov-accent/50'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !isDisabled && handleRiskLevelChange(level as 'low' | 'medium' | 'high')}
              disabled={isDisabled}
              whileHover={!isDisabled ? { scale: 1.02 } : {}}
              whileTap={!isDisabled ? { scale: 0.98 } : {}}
            >
              <div className="font-bold capitalize">{level}</div>
              <div className="text-xs opacity-75 mt-1">{info.description}</div>
              <div className="text-xs mt-1 flex justify-between">
                <span>Max: {info.maxMultiplier}x</span>
                <span>Min: {info.minMultiplier}x</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Bet Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Bet Amount
        </label>
        
        {/* Quick Bet Buttons */}
        <div className="flex flex-wrap gap-2 mb-3">
          {quickBetAmounts.map(amount => (
            <motion.button
              key={amount}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                currentBet.amount === amount
                  ? 'bg-tarkov-accent text-tarkov-dark'
                  : 'bg-tarkov-secondary text-gray-300 hover:bg-tarkov-accent/20'
              } ${isDisabled || amount > balance ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !isDisabled && amount <= balance && handleBetAmountChange(amount)}
              disabled={isDisabled || amount > balance}
              whileHover={!isDisabled && amount <= balance ? { scale: 1.05 } : {}}
              whileTap={!isDisabled && amount <= balance ? { scale: 0.95 } : {}}
            >
              ₽{amount}
            </motion.button>
          ))}
          <motion.button
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              'bg-tarkov-warning text-tarkov-dark hover:bg-tarkov-warning/80'
            } ${isDisabled || balance === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !isDisabled && balance > 0 && handleBetAmountChange(balance)}
            disabled={isDisabled || balance === 0}
            whileHover={!isDisabled && balance > 0 ? { scale: 1.05 } : {}}
            whileTap={!isDisabled && balance > 0 ? { scale: 0.95 } : {}}
          >
            Max
          </motion.button>
        </div>

        {/* Custom Amount Input */}
        <input
          type="number"
          value={currentBet.amount}
          onChange={(e) => !isDisabled && handleBetAmountChange(Number(e.target.value))}
          className={`w-full p-3 bg-tarkov-secondary border border-gray-600 rounded-lg text-white focus:border-tarkov-accent focus:outline-none transition-colors ${
            isDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          placeholder="Enter bet amount"
          min="1"
          max={balance}
          disabled={isDisabled}
        />
        
        <div className="text-xs text-gray-400 mt-1">
          Min: ₽1 | Max: ₽{balance.toLocaleString()} | Balance: ₽{balance.toLocaleString()}
        </div>
      </div>

      {/* Current Bet Summary */}
      <div className="bg-tarkov-secondary/50 rounded-lg p-4">
        <h4 className="font-medium text-gray-300 mb-2">Current Bet</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Risk Level:</span>
            <span className="text-white capitalize">{currentBet.riskLevel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Amount:</span>
            <span className="text-tarkov-accent font-bold">₽{currentBet.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Max Win:</span>
            <span className="text-tarkov-success font-bold">
              ₽{(currentBet.amount * (riskLevels[currentBet.riskLevel]?.maxMultiplier || 1)).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Expected RTP:</span>
            <span className="text-gray-300">
              {((riskLevels[currentBet.riskLevel]?.expectedReturn || 1) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          className="bg-tarkov-danger/20 border border-tarkov-danger rounded-lg p-3 text-tarkov-danger text-sm"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Drop Ball Button */}
        <motion.button
          className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
            isDisabled
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-tarkov-accent text-tarkov-dark hover:bg-tarkov-accent/90 shadow-lg hover:shadow-tarkov-accent/25'
          }`}
          onClick={onDropBall}
          disabled={isDisabled || currentBet.amount > balance || currentBet.amount < 1}
          whileHover={!isDisabled && currentBet.amount <= balance && currentBet.amount >= 1 ? { scale: 1.02 } : {}}
          whileTap={!isDisabled && currentBet.amount <= balance && currentBet.amount >= 1 ? { scale: 0.98 } : {}}
        >
          {isPlaying ? 'Dropping Ball...' : isAnimating ? 'Ball Dropping...' : 'Drop Ball'}
        </motion.button>

        {/* Play Again Button */}
        {showPlayAgain && onPlayAgain && (
          <motion.button
            className="w-full py-3 rounded-lg font-medium bg-tarkov-secondary text-white hover:bg-tarkov-secondary/80 transition-colors"
            onClick={onPlayAgain}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Play Again
          </motion.button>
        )}
      </div>

      {/* Game Tips */}
      <div className="bg-tarkov-secondary/30 rounded-lg p-3 text-xs text-gray-400">
        <div className="font-medium text-gray-300 mb-1">💡 Tips:</div>
        <ul className="space-y-1">
          <li>• Higher risk = higher potential rewards</li>
          <li>• Ball bounces randomly off each peg</li>
          <li>• Edge slots typically have higher multipliers</li>
          <li>• Center slots are more likely to be hit</li>
        </ul>
      </div>
    </div>
  )
}

export default PlinkoControls