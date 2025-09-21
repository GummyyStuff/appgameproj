import React from 'react'
import { motion } from 'framer-motion'

interface BetOption {
  type: string
  value: string | number
  label: string
  payout: string
}

interface RouletteBet {
  betType: 'number' | 'red' | 'black' | 'odd' | 'even' | 'low' | 'high' | 'dozen' | 'column'
  betValue: number | string
  amount: number
}

interface BettingPanelProps {
  currentBet: RouletteBet
  setCurrentBet: (bet: RouletteBet) => void
  betAmount: number
  setBetAmount: (amount: number) => void
  balance: number
  betTypeOptions: BetOption[]
  onPlaceBet: () => void
  isSpinning: boolean
  error: string | null
}

const BettingPanel: React.FC<BettingPanelProps> = ({
  currentBet,
  setCurrentBet,
  betAmount,
  setBetAmount,
  balance,
  betTypeOptions,
  onPlaceBet,
  isSpinning,
  error
}) => {
  const quickBetAmounts = [10, 50, 100, 500, 1000]

  const handleBetTypeChange = (option: BetOption) => {
    setCurrentBet({
      betType: option.type as RouletteBet['betType'],
      betValue: option.value,
      amount: betAmount
    })
  }

  const handleQuickBet = (amount: number) => {
    setBetAmount(Math.min(amount, balance))
  }

  const handleMaxBet = () => {
    setBetAmount(balance)
  }

  return (
    <div className="bg-tarkov-dark rounded-lg p-6 space-y-6">
      <h3 className="text-xl font-tarkov font-bold text-tarkov-accent mb-4">
        Place Your Bet
      </h3>

      {/* Bet Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Bet Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {betTypeOptions.map((option) => (
            <motion.button
              key={`${option.type}-${option.value}`}
              className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                currentBet.betType === option.type && currentBet.betValue === option.value
                  ? 'border-tarkov-accent bg-tarkov-accent/20 text-tarkov-accent'
                  : 'border-gray-600 bg-tarkov-secondary/50 text-gray-300 hover:border-tarkov-accent/50'
              }`}
              onClick={() => handleBetTypeChange(option)}
              disabled={isSpinning}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="font-bold">{option.label}</div>
              <div className="text-xs opacity-75">{option.payout}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Number Bet Grid */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Or Bet on Specific Number (35:1)
        </label>
        <div className="grid grid-cols-6 gap-1 max-h-32 overflow-y-auto">
          {Array.from({ length: 37 }, (_, i) => i).map(number => {
            const color = number === 0 ? 'green' : 
                         [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(number) ? 'red' : 'black'
            
            return (
              <motion.button
                key={number}
                className={`w-8 h-8 text-xs font-bold rounded border ${
                  currentBet.betType === 'number' && currentBet.betValue === number
                    ? 'border-tarkov-accent bg-tarkov-accent text-tarkov-dark'
                    : `border-gray-600 ${
                        color === 'red' ? 'bg-red-600 text-white' :
                        color === 'black' ? 'bg-gray-900 text-white' :
                        'bg-green-600 text-white'
                      } hover:border-tarkov-accent/50`
                }`}
                onClick={() => setCurrentBet({
                  betType: 'number',
                  betValue: number,
                  amount: betAmount
                })}
                disabled={isSpinning}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {number}
              </motion.button>
            )
          })}
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
              className={`px-3 py-1 rounded text-sm font-medium ${
                betAmount === amount
                  ? 'bg-tarkov-accent text-tarkov-dark'
                  : 'bg-tarkov-secondary text-gray-300 hover:bg-tarkov-accent/20'
              }`}
              onClick={() => handleQuickBet(amount)}
              disabled={isSpinning || amount > balance}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ₽{amount}
            </motion.button>
          ))}
          <motion.button
            className="px-3 py-1 rounded text-sm font-medium bg-tarkov-warning text-tarkov-dark hover:bg-tarkov-warning/80"
            onClick={handleMaxBet}
            disabled={isSpinning || balance === 0}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Max
          </motion.button>
        </div>

        {/* Custom Amount Input */}
        <input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(Math.max(1, Math.min(Number(e.target.value), balance)))}
          className="w-full p-3 bg-tarkov-secondary border border-gray-600 rounded-lg text-white focus:border-tarkov-accent focus:outline-none"
          placeholder="Enter bet amount"
          min="1"
          max={balance}
          disabled={isSpinning}
        />
        
        <div className="text-xs text-gray-400 mt-1">
          Min: ₽1 | Max: ₽{balance.toLocaleString()}
        </div>
      </div>

      {/* Current Bet Summary */}
      <div className="bg-tarkov-secondary/50 rounded-lg p-4">
        <h4 className="font-medium text-gray-300 mb-2">Current Bet</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Type:</span>
            <span className="text-white capitalize">
              {currentBet.betType === 'number' ? `Number ${currentBet.betValue}` : 
               typeof currentBet.betValue === 'string' ? currentBet.betValue :
               `${currentBet.betType} ${currentBet.betValue}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Amount:</span>
            <span className="text-tarkov-accent font-bold">₽{betAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Potential Win:</span>
            <span className="text-tarkov-success font-bold">
              ₽{(betAmount * (currentBet.betType === 'number' ? 35 : 
                              ['dozen', 'column'].includes(currentBet.betType) ? 2 : 1)).toLocaleString()}
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
          {error}
        </motion.div>
      )}

      {/* Place Bet Button */}
      <motion.button
        className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
          isSpinning
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-tarkov-accent text-tarkov-dark hover:bg-tarkov-accent/90 shadow-lg hover:shadow-tarkov-accent/25'
        }`}
        onClick={onPlaceBet}
        disabled={isSpinning || betAmount > balance || betAmount < 1}
        whileHover={!isSpinning ? { scale: 1.02 } : {}}
        whileTap={!isSpinning ? { scale: 0.98 } : {}}
      >
        {isSpinning ? 'Spinning...' : 'Place Bet'}
      </motion.button>
    </div>
  )
}

export default BettingPanel