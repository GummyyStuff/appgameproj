import React from 'react'
import { motion } from 'framer-motion'

interface BlackjackGameResult {
  success: boolean
  game_result: {
    player_hand: Array<{ suit: string; value: string }>
    dealer_hand: Array<{ suit: string; value: string }>
    player_value: number
    dealer_value: number
    result: 'player_win' | 'dealer_win' | 'push' | 'blackjack' | 'dealer_blackjack' | 'bust'
    actions_taken: string[]
  }
  bet_amount: number
  win_amount: number
  net_result: number
  new_balance: number
  game_id: string
}

interface BlackjackResultProps {
  result: BlackjackGameResult
  onNewGame: () => void
}

const BlackjackResult: React.FC<BlackjackResultProps> = ({ result, onNewGame }) => {
  const getResultInfo = () => {
    const { result: gameResult } = result.game_result
    const isWin = result.win_amount > result.bet_amount
    const isPush = gameResult === 'push'
    const isBlackjack = gameResult === 'blackjack'

    let title = ''
    let emoji = ''
    let color = ''
    let description = ''

    switch (gameResult) {
      case 'blackjack':
        title = 'BLACKJACK!'
        emoji = '🎉'
        color = 'text-tarkov-success'
        description = 'Natural 21! You win 3:2'
        break
      case 'player_win':
        title = 'YOU WIN!'
        emoji = '🎊'
        color = 'text-tarkov-success'
        description = 'Your hand beats the dealer'
        break
      case 'dealer_win':
        title = 'DEALER WINS'
        emoji = '😔'
        color = 'text-tarkov-danger'
        description = 'Dealer\'s hand beats yours'
        break
      case 'dealer_blackjack':
        title = 'DEALER BLACKJACK'
        emoji = '💸'
        color = 'text-tarkov-danger'
        description = 'Dealer got natural 21'
        break
      case 'bust':
        title = 'BUST!'
        emoji = '💥'
        color = 'text-tarkov-danger'
        description = 'Your hand went over 21'
        break
      case 'push':
        title = 'PUSH'
        emoji = '🤝'
        color = 'text-tarkov-warning'
        description = 'It\'s a tie! Bet returned'
        break
      default:
        title = 'GAME OVER'
        emoji = '🎲'
        color = 'text-gray-400'
        description = 'Game completed'
    }

    return { title, emoji, color, description, isWin, isPush, isBlackjack }
  }

  const resultInfo = getResultInfo()

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`bg-tarkov-dark rounded-xl p-8 max-w-md w-full mx-4 border-2 ${
          resultInfo.isWin ? 'border-tarkov-success' : 
          resultInfo.isPush ? 'border-tarkov-warning' : 
          'border-tarkov-danger'
        }`}
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.5, y: 50 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Result Header */}
        <div className="text-center mb-6">
          <motion.div
            className={`text-6xl mb-4`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
          >
            {resultInfo.emoji}
          </motion.div>
          
          <motion.h2
            className={`text-3xl font-bold ${resultInfo.color}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {resultInfo.title}
          </motion.h2>
          
          <motion.p
            className="text-gray-300 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {resultInfo.description}
          </motion.p>
        </div>

        {/* Hand Values */}
        <motion.div
          className="bg-tarkov-secondary/50 rounded-lg p-4 mb-6 space-y-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Your Hand:</span>
            <span className={`text-lg font-bold ${
              result.game_result.player_value > 21 ? 'text-tarkov-danger' :
              result.game_result.player_value === 21 ? 'text-tarkov-success' :
              'text-white'
            }`}>
              {result.game_result.player_value}
              {result.game_result.result === 'blackjack' && (
                <span className="text-tarkov-success ml-1">(BJ)</span>
              )}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Dealer Hand:</span>
            <span className={`text-lg font-bold ${
              result.game_result.dealer_value > 21 ? 'text-tarkov-danger' :
              result.game_result.dealer_value === 21 ? 'text-tarkov-success' :
              'text-white'
            }`}>
              {result.game_result.dealer_value}
              {result.game_result.result === 'dealer_blackjack' && (
                <span className="text-tarkov-success ml-1">(BJ)</span>
              )}
            </span>
          </div>

          {/* Actions Taken */}
          {result.game_result.actions_taken.length > 0 && (
            <div className="pt-2 border-t border-gray-600">
              <span className="text-gray-400 text-sm">Actions: </span>
              <span className="text-tarkov-accent text-sm capitalize">
                {result.game_result.actions_taken.join(', ')}
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
            {resultInfo.isWin ? 'You Won' : resultInfo.isPush ? 'Push' : 'You Lost'}
          </div>
          <div className={`text-4xl font-bold ${
            resultInfo.isWin ? 'text-tarkov-success' : 
            resultInfo.isPush ? 'text-tarkov-warning' : 
            'text-tarkov-danger'
          }`}>
            {resultInfo.isPush ? '±' : resultInfo.isWin ? '+' : '-'}₽{Math.abs(result.net_result).toLocaleString()}
          </div>
          
          {resultInfo.isBlackjack && (
            <div className="text-sm text-tarkov-success mt-1">
              Blackjack Bonus! (3:2 payout)
            </div>
          )}
        </motion.div>

        {/* New Balance */}
        <motion.div
          className="text-center mb-6 text-gray-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <div className="text-sm mb-1">New Balance</div>
          <div className="text-xl font-bold text-tarkov-accent">
            ₽{result.new_balance.toLocaleString()}
          </div>
        </motion.div>

        {/* New Game Button */}
        <motion.button
          className="w-full py-3 bg-tarkov-accent text-tarkov-dark font-bold rounded-lg hover:bg-tarkov-accent/90 transition-all"
          onClick={onNewGame}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Play Again
        </motion.button>

        {/* Celebration Animation for Wins */}
        {resultInfo.isWin && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[...Array(15)].map((_, i) => (
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

export default BlackjackResult