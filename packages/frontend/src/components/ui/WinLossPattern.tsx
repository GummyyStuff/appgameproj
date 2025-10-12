import React from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeSVGIcons } from './FontAwesomeSVG'

interface GameResult {
  id: string
  game_type: string
  bet_amount: number
  win_amount: number
  net_result: number
  created_at: string
}

interface WinLossPatternProps {
  gameHistory: GameResult[]
  maxResults?: number
}

const WinLossPattern: React.FC<WinLossPatternProps> = ({ 
  gameHistory, 
  maxResults = 50 
}) => {
  // Get the most recent games for pattern display
  const recentGames = gameHistory.slice(0, maxResults)

  const getResultType = (game: GameResult): 'win' | 'loss' | 'break-even' => {
    if (game.win_amount > game.bet_amount) return 'win'
    if (game.win_amount < game.bet_amount) return 'loss'
    return 'break-even'
  }

  const getResultColor = (resultType: 'win' | 'loss' | 'break-even') => {
    switch (resultType) {
      case 'win': return 'bg-tarkov-success border-tarkov-success'
      case 'loss': return 'bg-tarkov-danger border-tarkov-danger'
      case 'break-even': return 'bg-gray-500 border-gray-400'
    }
  }

  const getResultIcon = (resultType: 'win' | 'loss' | 'break-even') => {
    switch (resultType) {
      case 'win': return '✓'
      case 'loss': return '✗'
      case 'break-even': return '='
    }
  }

  // Calculate streaks
  const calculateStreaks = () => {
    const streaks: Array<{ type: 'win' | 'loss'; length: number; games: GameResult[] }> = []
    let currentStreak: { type: 'win' | 'loss'; length: number; games: GameResult[] } | null = null

    // Sort games chronologically (oldest first) for streak calculation
    const sortedGames = [...recentGames].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    sortedGames.forEach(game => {
      const resultType = getResultType(game)
      
      // Skip break-even games for streak calculation
      if (resultType === 'break-even') return

      if (!currentStreak || currentStreak.type !== resultType) {
        // Start new streak
        if (currentStreak) {
          streaks.push(currentStreak)
        }
        currentStreak = {
          type: resultType,
          length: 1,
          games: [game]
        }
      } else {
        // Continue current streak
        currentStreak.length += 1
        currentStreak.games.push(game)
      }
    })

    // Add the last streak
    if (currentStreak) {
      streaks.push(currentStreak)
    }

    return streaks.slice(-10) // Show last 10 streaks
  }

  const streaks = calculateStreaks()

  if (recentGames.length === 0) {
    return (
      <div className="bg-tarkov-dark rounded-lg p-6">
        <h3 className="text-xl font-tarkov font-bold text-white mb-4 flex items-center space-x-2">
          <FontAwesomeSVGIcons.ChartLine className="text-tarkov-accent" size={24} />
          <span>Win/Loss Pattern</span>
        </h3>
        <div className="text-center py-8">
          <FontAwesomeSVGIcons.Gamepad className="text-gray-400 mx-auto mb-4" size={48} />
          <p className="text-gray-400">No games played yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-tarkov-dark rounded-lg p-6">
      <h3 className="text-xl font-tarkov font-bold text-white mb-6 flex items-center space-x-2">
        <FontAwesomeSVGIcons.ChartLine className="text-tarkov-accent" size={24} />
        <span>Win/Loss Pattern</span>
        <span className="text-sm text-gray-400 font-normal">
          (Last {recentGames.length} games)
        </span>
      </h3>

      {/* Recent Results Grid */}
      <div className="mb-8">
        <h4 className="text-lg font-bold text-white mb-4">Recent Results</h4>
        <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-20 lg:grid-cols-25 gap-1">
          {recentGames.map((game, index) => {
            const resultType = getResultType(game)
            const isRecent = index < 5

            return (
              <motion.div
                key={game.id}
                className={`
                  relative w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white cursor-pointer
                  ${getResultColor(resultType)}
                  ${isRecent ? 'ring-2 ring-tarkov-accent ring-opacity-50' : ''}
                `}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                whileHover={{ scale: 1.2, zIndex: 10 }}
                title={`
                  ${game.game_type ? game.game_type.charAt(0).toUpperCase() + game.game_type.slice(1) : 'Unknown'} - 
                  ${resultType === 'win' ? 'Win' : resultType === 'loss' ? 'Loss' : 'Break Even'} - 
                  Bet: ₽${(game.bet_amount || 0).toLocaleString()} - 
                  Win: ₽${(game.win_amount || 0).toLocaleString()} - 
                  ${game.created_at ? (() => { const d = new Date(game.created_at); return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString(); })() : 'N/A'}
                `}
              >
                {getResultIcon(resultType)}
              </motion.div>
            )
          })}
        </div>
        
        <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-tarkov-success border-2 border-tarkov-success flex items-center justify-center text-xs text-white">
              ✓
            </div>
            <span className="text-gray-400">Win</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-tarkov-danger border-2 border-tarkov-danger flex items-center justify-center text-xs text-white">
              ✗
            </div>
            <span className="text-gray-400">Loss</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-gray-500 border-2 border-gray-400 flex items-center justify-center text-xs text-white">
              =
            </div>
            <span className="text-gray-400">Break Even</span>
          </div>
        </div>
      </div>

      {/* Streak Analysis */}
      {streaks.length > 0 && (
        <div>
          <h4 className="text-lg font-bold text-white mb-4">Recent Streaks</h4>
          <div className="space-y-3">
            {streaks.map((streak, index) => (
              <motion.div
                key={index}
                className="bg-tarkov-secondary rounded-lg p-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-white font-bold
                      ${streak.type === 'win' ? 'bg-tarkov-success' : 'bg-tarkov-danger'}
                    `}>
                      {streak.type === 'win' ? '✓' : '✗'}
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        {streak.length} {streak.type === 'win' ? 'Win' : 'Loss'} Streak
                      </div>
                      <div className="text-sm text-gray-400">
                        {streak.games.length} game{streak.games.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      streak.type === 'win' ? 'text-tarkov-success' : 'text-tarkov-danger'
                    }`}>
                      {streak.type === 'win' ? '+' : ''}₽{
                        streak.games.reduce((sum, game) => {
                          const netResult = game.net_result ?? (game.win_amount - game.bet_amount)
                          return sum + (isNaN(netResult) ? 0 : netResult)
                        }, 0).toLocaleString()
                      }
                    </div>
                    <div className="text-sm text-gray-400">Total Impact</div>
                  </div>
                </div>
                
                {/* Streak visualization */}
                <div className="mt-3 flex space-x-1">
                  {streak.games.map((game) => (
                    <div
                      key={game.id}
                      className={`
                        w-3 h-3 rounded-full
                        ${streak.type === 'win' ? 'bg-tarkov-success' : 'bg-tarkov-danger'}
                      `}
                      title={`${game.game_type} - Bet: ₽${(game.bet_amount || 0).toLocaleString()} - Win: ₽${(game.win_amount || 0).toLocaleString()}`}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Pattern Statistics */}
      <div className="mt-8 pt-6 border-t border-tarkov-primary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-tarkov-success">
              {recentGames.filter(game => getResultType(game) === 'win').length}
            </div>
            <div className="text-sm text-gray-400">Wins</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-tarkov-danger">
              {recentGames.filter(game => getResultType(game) === 'loss').length}
            </div>
            <div className="text-sm text-gray-400">Losses</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-400">
              {recentGames.filter(game => getResultType(game) === 'break-even').length}
            </div>
            <div className="text-sm text-gray-400">Break Even</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-tarkov-accent">
              {recentGames.length > 0 
                ? Math.round((recentGames.filter(game => getResultType(game) === 'win').length / recentGames.length) * 100)
                : 0
              }%
            </div>
            <div className="text-sm text-gray-400">Win Rate</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WinLossPattern