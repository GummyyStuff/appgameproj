import React from 'react'
import { motion } from 'framer-motion'

interface RouletteResult {
  success: boolean
  game_result: {
    bet_type: string
    bet_value: number | string
    winning_number: number
    multiplier: number
  }
  bet_amount: number
  win_amount: number
  net_result: number
  new_balance: number
  game_id: string
}

interface ResultDisplayProps {
  result: RouletteResult
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  const isWin = result.win_amount > 0
  const getNumberColor = (num: number): 'red' | 'black' | 'green' => {
    if (num === 0) return 'green'
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
    return redNumbers.includes(num) ? 'red' : 'black'
  }

  const numberColor = getNumberColor(result.game_result.winning_number)

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`bg-tarkov-dark rounded-xl p-8 max-w-md w-full mx-4 border-2 ${
          isWin ? 'border-tarkov-success' : 'border-tarkov-danger'
        }`}
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.5, y: 50 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Result Header */}
        <div className="text-center mb-6">
          <motion.div
            className={`text-6xl mb-4 ${isWin ? 'text-tarkov-success' : 'text-tarkov-danger'}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
          >
            {isWin ? '🎉' : '💸'}
          </motion.div>
          
          <motion.h2
            className={`text-3xl font-bold ${isWin ? 'text-tarkov-success' : 'text-tarkov-danger'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {isWin ? 'You Won!' : 'Better Luck Next Time'}
          </motion.h2>
        </div>

        {/* Winning Number Display */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-gray-300 text-lg mb-2">Winning Number</div>
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold border-4 ${
            numberColor === 'red' ? 'bg-red-600 border-red-400 text-white' :
            numberColor === 'black' ? 'bg-gray-900 border-gray-600 text-white' :
            'bg-green-600 border-green-400 text-white'
          }`}>
            {result.game_result.winning_number}
          </div>
        </motion.div>

        {/* Bet Details */}
        <motion.div
          className="bg-tarkov-secondary/50 rounded-lg p-4 mb-6 space-y-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Your Bet:</span>
            <span className="text-white capitalize">
              {result.game_result.bet_type === 'number' 
                ? `Number ${result.game_result.bet_value}`
                : typeof result.game_result.bet_value === 'string' 
                  ? result.game_result.bet_value
                  : `${result.game_result.bet_type} ${result.game_result.bet_value}`
              }
            </span>
          </div>
          
          {isWin && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Multiplier:</span>
              <span className="text-tarkov-accent font-bold">
                {result.game_result.multiplier}x
              </span>
            </div>
          )}
        </motion.div>

        {/* Win/Loss Amount */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="text-gray-300 text-lg mb-2">
            {isWin ? 'You Won' : 'You Lost'}
          </div>
          <div className={`text-4xl font-bold ${isWin ? 'text-tarkov-success' : 'text-tarkov-danger'}`}>
            {isWin ? '+' : '-'}₽{Math.abs(result.win_amount).toLocaleString()}
          </div>
        </motion.div>

        {/* New Balance */}
        <motion.div
          className="text-center text-gray-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <div className="text-sm mb-1">New Balance</div>
          <div className="text-xl font-bold text-tarkov-accent">
            ₽{result.new_balance.toLocaleString()}
          </div>
        </motion.div>

        {/* Celebration Animation for Wins */}
        {isWin && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-tarkov-accent rounded-full"
                initial={{
                  x: '50%',
                  y: '50%',
                  scale: 0
                }}
                animate={{
                  x: `${50 + (Math.random() - 0.5) * 200}%`,
                  y: `${50 + (Math.random() - 0.5) * 200}%`,
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 0.5,
                  ease: "easeOut"
                }}
              />
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default ResultDisplay