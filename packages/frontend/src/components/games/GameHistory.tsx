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

interface GameHistoryProps {
  history: RouletteResult[]
  getNumberColor: (num: number) => 'red' | 'black' | 'green'
}

const GameHistory: React.FC<GameHistoryProps> = ({ history, getNumberColor }) => {
  if (history.length === 0) {
    return (
      <div className="bg-tarkov-dark rounded-lg p-6">
        <h3 className="text-xl font-tarkov font-bold text-tarkov-accent mb-4">
          Recent Results
        </h3>
        <div className="text-center text-gray-400 py-8">
          No games played yet
        </div>
      </div>
    )
  }

  return (
    <div className="bg-tarkov-dark rounded-lg p-6">
      <h3 className="text-xl font-tarkov font-bold text-tarkov-accent mb-4">
        Recent Results
      </h3>
      
      {/* Recent Numbers */}
      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-2">Last 10 Numbers</div>
        <div className="flex flex-wrap gap-2">
          {history.slice(0, 10).map((result, index) => {
            const number = result.game_result.winning_number
            const color = getNumberColor(number)
            
            return (
              <motion.div
                key={index}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                  color === 'red' ? 'bg-red-600 border-red-400 text-white' :
                  color === 'black' ? 'bg-gray-900 border-gray-600 text-white' :
                  'bg-green-600 border-green-400 text-white'
                }`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {number}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Detailed History */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {history.slice(0, 5).map((result, index) => {
          const isWin = result.win_amount > 0
          const number = result.game_result.winning_number
          const color = getNumberColor(number)
          
          return (
            <motion.div
              key={index}
              className="bg-tarkov-secondary/50 rounded-lg p-3 border-l-4 border-l-tarkov-accent/50"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    color === 'red' ? 'bg-red-600 text-white' :
                    color === 'black' ? 'bg-gray-900 text-white' :
                    'bg-green-600 text-white'
                  }`}>
                    {number}
                  </div>
                  <div className="text-sm">
                    <div className="text-white font-medium capitalize">
                      {result.game_result.bet_type === 'number' 
                        ? `Number ${result.game_result.bet_value}`
                        : typeof result.game_result.bet_value === 'string' 
                          ? result.game_result.bet_value
                          : `${result.game_result.bet_type} ${result.game_result.bet_value}`
                      }
                    </div>
                  </div>
                </div>
                
                <div className={`text-sm font-bold ${
                  isWin ? 'text-tarkov-success' : 'text-tarkov-danger'
                }`}>
                  {isWin ? '+' : '-'}₽{Math.abs(result.win_amount).toLocaleString()}
                </div>
              </div>
              
              {isWin && (
                <div className="text-xs text-gray-400">
                  Multiplier: {result.game_result.multiplier}x
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Statistics */}
      <div className="mt-6 pt-4 border-t border-gray-600">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-tarkov-success">
              {history.filter(r => r.win_amount > 0).length}
            </div>
            <div className="text-xs text-gray-400">Wins</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-tarkov-danger">
              {history.filter(r => r.win_amount === 0).length}
            </div>
            <div className="text-xs text-gray-400">Losses</div>
          </div>
        </div>
        
        {history.length > 0 && (
          <div className="mt-3 text-center">
            <div className="text-sm text-gray-400">Win Rate</div>
            <div className="text-lg font-bold text-tarkov-accent">
              {Math.round((history.filter(r => r.win_amount > 0).length / history.length) * 100)}%
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GameHistory