import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PlinkoResultData {
  success: boolean
  game_result: {
    risk_level: 'low' | 'medium' | 'high'
    ball_path: number[]
    multiplier: number
    landing_slot: number
  }
  bet_amount: number
  win_amount: number
  net_result: number
  new_balance: number
  game_id: string
}

interface PlinkoResultProps {
  result: PlinkoResultData | null
  isVisible: boolean
  onPlayAgain?: () => void
  className?: string
}

const PlinkoResult: React.FC<PlinkoResultProps> = ({
  result,
  isVisible,
  onPlayAgain,
  className = ''
}) => {
  if (!result || !isVisible) return null

  const isWin = result.net_result > 0
  const isBreakEven = result.net_result === 0

  return (
    <AnimatePresence>
      <motion.div
        className={`bg-tarkov-dark rounded-lg p-6 text-center ${className}`}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        {/* Result Header */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-4xl mb-2">
            {isWin ? '🎉' : isBreakEven ? '🤝' : '😔'}
          </div>
          <h3 className="text-3xl font-tarkov font-bold mb-2">
            {isWin ? (
              <span className="text-tarkov-success">You Won!</span>
            ) : isBreakEven ? (
              <span className="text-tarkov-warning">Break Even!</span>
            ) : (
              <span className="text-tarkov-danger">You Lost</span>
            )}
          </h3>
          <p className="text-gray-400">
            {isWin 
              ? `Congratulations! The ball landed on a ${result.game_result.multiplier}x multiplier!`
              : isBreakEven
              ? `The ball landed on a ${result.game_result.multiplier}x multiplier - you got your bet back!`
              : `The ball landed on a ${result.game_result.multiplier}x multiplier. Better luck next time!`
            }
          </p>
        </motion.div>

        {/* Result Statistics */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-tarkov-secondary/50 rounded-lg p-3">
            <div className="text-gray-400 text-sm mb-1">Multiplier</div>
            <div className="text-2xl font-bold text-tarkov-accent">
              {result.game_result.multiplier}x
            </div>
          </div>
          
          <div className="bg-tarkov-secondary/50 rounded-lg p-3">
            <div className="text-gray-400 text-sm mb-1">Bet Amount</div>
            <div className="text-2xl font-bold text-white">
              ₽{result.bet_amount.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-tarkov-secondary/50 rounded-lg p-3">
            <div className="text-gray-400 text-sm mb-1">Win Amount</div>
            <div className="text-2xl font-bold text-tarkov-success">
              ₽{result.win_amount.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-tarkov-secondary/50 rounded-lg p-3">
            <div className="text-gray-400 text-sm mb-1">Net Result</div>
            <div className={`text-2xl font-bold ${
              isWin ? 'text-tarkov-success' :
              isBreakEven ? 'text-tarkov-warning' :
              'text-tarkov-danger'
            }`}>
              {result.net_result > 0 ? '+' : ''}₽{result.net_result.toLocaleString()}
            </div>
          </div>
        </motion.div>

        {/* Game Details */}
        <motion.div
          className="bg-tarkov-secondary/30 rounded-lg p-4 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h4 className="font-medium text-gray-300 mb-3">Game Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-left">
              <div className="text-gray-400">Risk Level:</div>
              <div className="text-white capitalize font-medium">
                {result.game_result.risk_level}
              </div>
            </div>
            <div className="text-left">
              <div className="text-gray-400">Landing Slot:</div>
              <div className="text-white font-medium">
                Slot {result.game_result.landing_slot}
              </div>
            </div>
            <div className="text-left">
              <div className="text-gray-400">New Balance:</div>
              <div className="text-tarkov-accent font-medium">
                ₽{result.new_balance.toLocaleString()}
              </div>
            </div>
            <div className="text-left">
              <div className="text-gray-400">Game ID:</div>
              <div className="text-gray-300 font-mono text-xs">
                {result.game_id.slice(-8)}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Ball Path Visualization */}
        <motion.div
          className="bg-tarkov-secondary/30 rounded-lg p-4 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h4 className="font-medium text-gray-300 mb-3">Ball Path</h4>
          <div className="flex justify-center items-center space-x-2">
            <span className="text-gray-400 text-sm">Start</span>
            {result.game_result.ball_path.map((direction, index) => (
              <React.Fragment key={index}>
                <motion.div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    direction === 0 ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  {direction === 0 ? '←' : '→'}
                </motion.div>
                {index < result.game_result.ball_path.length - 1 && (
                  <div className="w-2 h-0.5 bg-gray-600"></div>
                )}
              </React.Fragment>
            ))}
            <span className="text-gray-400 text-sm">End</span>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Ball bounced {result.game_result.ball_path.filter(d => d === 0).length} times left, {' '}
            {result.game_result.ball_path.filter(d => d === 1).length} times right
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {onPlayAgain && (
            <motion.button
              className="px-6 py-3 bg-tarkov-accent text-tarkov-dark font-bold rounded-lg hover:bg-tarkov-accent/90 transition-colors"
              onClick={onPlayAgain}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Play Again
            </motion.button>
          )}
          
          <motion.button
            className="px-6 py-3 bg-tarkov-secondary text-white font-medium rounded-lg hover:bg-tarkov-secondary/80 transition-colors"
            onClick={() => {
              // Copy game ID to clipboard
              navigator.clipboard.writeText(result.game_id)
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Copy Game ID
          </motion.button>
        </motion.div>

        {/* Win Celebration Animation */}
        {isWin && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Confetti-like particles */}
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-tarkov-accent rounded-full"
                initial={{
                  x: '50%',
                  y: '50%',
                  scale: 0,
                }}
                animate={{
                  x: `${50 + (Math.random() - 0.5) * 200}%`,
                  y: `${50 + (Math.random() - 0.5) * 200}%`,
                  scale: [0, 1, 0],
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
    </AnimatePresence>
  )
}

export default PlinkoResult