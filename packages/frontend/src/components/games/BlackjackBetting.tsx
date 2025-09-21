import React from 'react'
import { motion } from 'framer-motion'

interface BlackjackBettingProps {
  betAmount: number
  setBetAmount: (amount: number) => void
  balance: number
  onStartGame: () => void
  isGameActive: boolean
  isProcessing: boolean
  error: string | null
}

const BlackjackBetting: React.FC<BlackjackBettingProps> = ({
  betAmount,
  setBetAmount,
  balance,
  onStartGame,
  isGameActive,
  isProcessing,
  error
}) => {
  const quickBetAmounts = [10, 50, 100, 500, 1000]

  const handleQuickBet = (amount: number) => {
    setBetAmount(Math.min(amount, balance))
  }

  const handleMaxBet = () => {
    setBetAmount(balance)
  }

  const handleCustomBet = (value: string) => {
    const amount = parseInt(value) || 0
    setBetAmount(Math.max(1, Math.min(amount, balance)))
  }

  if (isGameActive) {
    return (
      <div className="bg-tarkov-dark rounded-lg p-6">
        <h3 className="text-xl font-tarkov font-bold text-tarkov-accent mb-4">
          Current Bet
        </h3>
        <div className="text-center">
          <div className="text-3xl font-bold text-tarkov-accent mb-2">
            ₽{betAmount.toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">
            Balance: ₽{balance.toLocaleString()}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-tarkov-dark rounded-lg p-6 space-y-6">
      <h3 className="text-xl font-tarkov font-bold text-tarkov-accent mb-4">
        Place Your Bet
      </h3>

      {/* Quick Bet Buttons */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Quick Bet
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {quickBetAmounts.map(amount => (
            <motion.button
              key={amount}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                betAmount === amount
                  ? 'bg-tarkov-accent text-tarkov-dark shadow-lg'
                  : 'bg-tarkov-secondary text-gray-300 hover:bg-tarkov-accent/20 hover:text-tarkov-accent'
              }`}
              onClick={() => handleQuickBet(amount)}
              disabled={isProcessing || amount > balance}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ₽{amount}
            </motion.button>
          ))}
          <motion.button
            className="px-4 py-2 rounded-lg text-sm font-medium bg-tarkov-warning text-tarkov-dark hover:bg-tarkov-warning/80 transition-all"
            onClick={handleMaxBet}
            disabled={isProcessing || balance === 0}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Max
          </motion.button>
        </div>
      </div>

      {/* Custom Amount Input */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Custom Amount
        </label>
        <input
          type="number"
          value={betAmount}
          onChange={(e) => handleCustomBet(e.target.value)}
          className="w-full p-3 bg-tarkov-secondary border border-gray-600 rounded-lg text-white focus:border-tarkov-accent focus:outline-none transition-colors"
          placeholder="Enter bet amount"
          min="1"
          max={balance}
          disabled={isProcessing}
        />
        <div className="text-xs text-gray-400 mt-1">
          Min: ₽1 | Max: ₽{balance.toLocaleString()}
        </div>
      </div>

      {/* Bet Summary */}
      <div className="bg-tarkov-secondary/50 rounded-lg p-4">
        <h4 className="font-medium text-gray-300 mb-2">Bet Summary</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Bet Amount:</span>
            <span className="text-tarkov-accent font-bold">₽{betAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Potential Win (Blackjack):</span>
            <span className="text-tarkov-success font-bold">₽{Math.floor(betAmount * 2.5).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Potential Win (Regular):</span>
            <span className="text-tarkov-success font-bold">₽{(betAmount * 2).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Remaining Balance:</span>
            <span className="text-white">₽{(balance - betAmount).toLocaleString()}</span>
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
          {error}
        </motion.div>
      )}

      {/* Deal Cards Button */}
      <motion.button
        className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
          isProcessing
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-tarkov-accent text-tarkov-dark hover:bg-tarkov-accent/90 shadow-lg hover:shadow-tarkov-accent/25'
        }`}
        onClick={onStartGame}
        disabled={isProcessing || betAmount > balance || betAmount < 1}
        whileHover={!isProcessing ? { scale: 1.02 } : {}}
        whileTap={!isProcessing ? { scale: 0.98 } : {}}
      >
        {isProcessing ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent"></div>
            <span>Dealing...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl">🃏</span>
            <span>Deal Cards</span>
          </div>
        )}
      </motion.button>

      {/* Game Rules */}
      <motion.div
        className="bg-tarkov-secondary/30 rounded-lg p-4 text-sm text-gray-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h4 className="font-bold text-tarkov-accent mb-2">Blackjack Rules:</h4>
        <ul className="space-y-1 text-xs">
          <li>• Get as close to 21 as possible without going over</li>
          <li>• Blackjack (21 with 2 cards) pays 3:2</li>
          <li>• Dealer hits on soft 17</li>
          <li>• Double down on any first two cards</li>
          <li>• Split pairs (additional bet required)</li>
        </ul>
      </motion.div>
    </div>
  )
}

export default BlackjackBetting