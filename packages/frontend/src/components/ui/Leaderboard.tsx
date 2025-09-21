import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TarkovIcons, TarkovButton, TarkovCard } from './index'

interface LeaderboardEntry {
  rank: number
  username: string
  avatar?: string
  stats: {
    totalWinnings: number
    gamesPlayed: number
    winRate: number
    biggestWin: number
    favoriteGame: string
  }
  isCurrentUser?: boolean
  badges?: string[]
}

interface LeaderboardProps {
  isOpen: boolean
  onClose: () => void
  currentUser?: string
}

const leaderboardCategories = [
  { id: 'winnings', label: 'Total Winnings', icon: TarkovIcons.Roubles },
  { id: 'winrate', label: 'Win Rate', icon: TarkovIcons.Health },
  { id: 'games', label: 'Games Played', icon: TarkovIcons.Weapon },
  { id: 'biggest', label: 'Biggest Win', icon: TarkovIcons.Energy }
]

const timeFilters = [
  { id: 'all', label: 'All Time' },
  { id: 'month', label: 'This Month' },
  { id: 'week', label: 'This Week' },
  { id: 'today', label: 'Today' }
]

// Mock leaderboard data
const mockLeaderboardData: LeaderboardEntry[] = [
  {
    rank: 1,
    username: 'TarkovLegend',
    stats: {
      totalWinnings: 2500000,
      gamesPlayed: 1250,
      winRate: 68.5,
      biggestWin: 150000,
      favoriteGame: 'Blackjack'
    },
    badges: ['High Roller', 'Lucky Seven', 'Blackjack Ace']
  },
  {
    rank: 2,
    username: 'RaidMaster',
    stats: {
      totalWinnings: 1800000,
      gamesPlayed: 980,
      winRate: 72.1,
      biggestWin: 120000,
      favoriteGame: 'Roulette'
    },
    badges: ['Roulette Master', 'First Extract']
  },
  {
    rank: 3,
    username: 'SurvivorPro',
    stats: {
      totalWinnings: 1650000,
      gamesPlayed: 1100,
      winRate: 65.8,
      biggestWin: 95000,
      favoriteGame: 'Roulette'
    },
    badges: ['Roulette Master']
  },
  {
    rank: 4,
    username: 'ExtractKing',
    stats: {
      totalWinnings: 1400000,
      gamesPlayed: 850,
      winRate: 70.2,
      biggestWin: 85000,
      favoriteGame: 'Blackjack'
    },
    badges: ['High Roller']
  },
  {
    rank: 5,
    username: 'CurrentUser',
    stats: {
      totalWinnings: 1200000,
      gamesPlayed: 750,
      winRate: 64.3,
      biggestWin: 75000,
      favoriteGame: 'Roulette'
    },
    isCurrentUser: true,
    badges: ['First Extract', 'Lucky Seven']
  }
]

const Leaderboard: React.FC<LeaderboardProps> = ({ isOpen, onClose, currentUser = 'CurrentUser' }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('winnings')
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>('all')
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardEntry | null>(null)

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-500'
      case 2: return 'text-gray-400'
      case 3: return 'text-yellow-700'
      default: return 'text-gray-500'
    }
  }

  const getFavoriteGameIcon = (game: string) => {
    switch (game.toLowerCase()) {
      case 'roulette': return <TarkovIcons.Roulette size={16} />
      case 'blackjack': return <TarkovIcons.Blackjack size={16} />

      default: return <TarkovIcons.Weapon size={16} />
    }
  }

  const sortedData = [...mockLeaderboardData].sort((a, b) => {
    switch (selectedCategory) {
      case 'winnings': return b.stats.totalWinnings - a.stats.totalWinnings
      case 'winrate': return b.stats.winRate - a.stats.winRate
      case 'games': return b.stats.gamesPlayed - a.stats.gamesPlayed
      case 'biggest': return b.stats.biggestWin - a.stats.biggestWin
      default: return a.rank - b.rank
    }
  }).map((entry, index) => ({ ...entry, rank: index + 1 }))

  const currentUserEntry = sortedData.find(entry => entry.isCurrentUser)

  const LeaderboardRow: React.FC<{ entry: LeaderboardEntry; index: number }> = ({ entry, index }) => (
    <motion.div
      className={`flex items-center space-x-4 p-4 rounded-lg cursor-pointer transition-all duration-300 ${
        entry.isCurrentUser
          ? 'bg-tarkov-accent/20 border-2 border-tarkov-accent/50 shadow-lg'
          : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      onClick={() => setSelectedPlayer(entry)}
    >
      {/* Rank */}
      <div className={`text-2xl font-bold w-12 text-center ${getRankColor(entry.rank)}`}>
        {getRankIcon(entry.rank)}
      </div>

      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-tarkov-dark border-2 border-tarkov-accent/50 flex items-center justify-center">
        <TarkovIcons.Helmet className="text-tarkov-accent" size={20} />
      </div>

      {/* Player Info */}
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span className={`font-tarkov font-bold ${entry.isCurrentUser ? 'text-tarkov-accent' : 'text-white'}`}>
            {entry.username}
          </span>
          {entry.isCurrentUser && (
            <span className="text-xs bg-tarkov-accent text-tarkov-dark px-2 py-1 rounded-full font-bold uppercase">
              You
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
          <span>Games: {entry.stats.gamesPlayed}</span>
          <span>Win Rate: {entry.stats.winRate}%</span>
          <div className="flex items-center space-x-1">
            {getFavoriteGameIcon(entry.stats.favoriteGame)}
            <span>{entry.stats.favoriteGame}</span>
          </div>
        </div>
      </div>

      {/* Main Stat */}
      <div className="text-right">
        <div className="text-lg font-bold text-white">
          {selectedCategory === 'winnings' && `₽${entry.stats.totalWinnings.toLocaleString()}`}
          {selectedCategory === 'winrate' && `${entry.stats.winRate}%`}
          {selectedCategory === 'games' && entry.stats.gamesPlayed.toLocaleString()}
          {selectedCategory === 'biggest' && `₽${entry.stats.biggestWin.toLocaleString()}`}
        </div>
        <div className="text-xs text-gray-400">
          {selectedCategory === 'winnings' && 'Total Winnings'}
          {selectedCategory === 'winrate' && 'Win Rate'}
          {selectedCategory === 'games' && 'Games Played'}
          {selectedCategory === 'biggest' && 'Biggest Win'}
        </div>
      </div>

      {/* Badges */}
      {entry.badges && entry.badges.length > 0 && (
        <div className="flex space-x-1">
          {entry.badges.slice(0, 2).map((badge, i) => (
            <div
              key={i}
              className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center text-xs font-bold text-black"
              title={badge}
            >
              {i + 1}
            </div>
          ))}
          {entry.badges.length > 2 && (
            <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs text-white">
              +{entry.badges.length - 2}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <TarkovCard className="p-8" glow>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <TarkovIcons.Weapon className="text-tarkov-accent" size={32} />
                  <h2 className="text-2xl font-tarkov font-bold text-tarkov-accent uppercase">
                    Leaderboard
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <TarkovIcons.Close size={24} />
                </button>
              </div>

              {/* Current User Quick Stats */}
              {currentUserEntry && (
                <div className="mb-6 p-4 bg-tarkov-accent/10 border border-tarkov-accent/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-tarkov-accent/20 border border-tarkov-accent flex items-center justify-center">
                        <TarkovIcons.Helmet className="text-tarkov-accent" size={20} />
                      </div>
                      <div>
                        <div className="font-tarkov font-bold text-tarkov-accent">Your Rank</div>
                        <div className="text-sm text-gray-300">#{currentUserEntry.rank} of {sortedData.length}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">
                        {selectedCategory === 'winnings' && `₽${currentUserEntry.stats.totalWinnings.toLocaleString()}`}
                        {selectedCategory === 'winrate' && `${currentUserEntry.stats.winRate}%`}
                        {selectedCategory === 'games' && currentUserEntry.stats.gamesPlayed.toLocaleString()}
                        {selectedCategory === 'biggest' && `₽${currentUserEntry.stats.biggestWin.toLocaleString()}`}
                      </div>
                      <div className="text-xs text-gray-400">
                        {leaderboardCategories.find(c => c.id === selectedCategory)?.label}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                {/* Category Filter */}
                <div className="flex flex-wrap gap-2">
                  {leaderboardCategories.map((category) => {
                    const IconComponent = category.icon
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                          selectedCategory === category.id
                            ? 'bg-tarkov-accent text-tarkov-dark font-bold'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        <IconComponent size={16} />
                        <span className="font-tarkov text-sm uppercase">{category.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Time Filter */}
                <div className="flex gap-2">
                  {timeFilters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setSelectedTimeFilter(filter.id)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedTimeFilter === filter.id
                          ? 'bg-tarkov-accent/20 text-tarkov-accent border border-tarkov-accent/50'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leaderboard List */}
              <div className="space-y-3">
                {sortedData.map((entry, index) => (
                  <LeaderboardRow key={entry.username} entry={entry} index={index} />
                ))}
              </div>

              {/* Player Detail Modal */}
              <AnimatePresence>
                {selectedPlayer && (
                  <motion.div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-60"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedPlayer(null)}
                  >
                    <motion.div
                      className="max-w-lg w-full mx-4"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TarkovCard className="p-6" glow>
                        <div className="text-center mb-6">
                          <div className="w-20 h-20 rounded-full bg-tarkov-dark border-4 border-tarkov-accent/50 flex items-center justify-center mx-auto mb-4">
                            <TarkovIcons.Helmet className="text-tarkov-accent" size={32} />
                          </div>
                          
                          <div className="flex items-center justify-center space-x-2 mb-2">
                            <span className={`text-2xl ${getRankColor(selectedPlayer.rank)}`}>
                              {getRankIcon(selectedPlayer.rank)}
                            </span>
                            <h3 className="text-xl font-tarkov font-bold text-white uppercase">
                              {selectedPlayer.username}
                            </h3>
                          </div>
                          
                          {selectedPlayer.isCurrentUser && (
                            <span className="inline-block bg-tarkov-accent text-tarkov-dark px-3 py-1 rounded-full text-sm font-bold uppercase">
                              Your Profile
                            </span>
                          )}
                        </div>

                        {/* Detailed Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <TarkovCard className="p-4 text-center">
                            <TarkovIcons.Roubles className="text-green-500 mx-auto mb-2" size={24} />
                            <div className="text-lg font-bold text-white">₽{selectedPlayer.stats.totalWinnings.toLocaleString()}</div>
                            <div className="text-xs text-gray-400">Total Winnings</div>
                          </TarkovCard>
                          
                          <TarkovCard className="p-4 text-center">
                            <TarkovIcons.Health className="text-green-500 mx-auto mb-2" size={24} />
                            <div className="text-lg font-bold text-white">{selectedPlayer.stats.winRate}%</div>
                            <div className="text-xs text-gray-400">Win Rate</div>
                          </TarkovCard>
                          
                          <TarkovCard className="p-4 text-center">
                            <TarkovIcons.Weapon className="text-tarkov-accent mx-auto mb-2" size={24} />
                            <div className="text-lg font-bold text-white">{selectedPlayer.stats.gamesPlayed}</div>
                            <div className="text-xs text-gray-400">Games Played</div>
                          </TarkovCard>
                          
                          <TarkovCard className="p-4 text-center">
                            <TarkovIcons.Energy className="text-yellow-500 mx-auto mb-2" size={24} />
                            <div className="text-lg font-bold text-white">₽{selectedPlayer.stats.biggestWin.toLocaleString()}</div>
                            <div className="text-xs text-gray-400">Biggest Win</div>
                          </TarkovCard>
                        </div>

                        {/* Favorite Game */}
                        <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center justify-center space-x-2">
                            {getFavoriteGameIcon(selectedPlayer.stats.favoriteGame)}
                            <span className="font-tarkov font-bold text-tarkov-accent uppercase">
                              Favorite Game: {selectedPlayer.stats.favoriteGame}
                            </span>
                          </div>
                        </div>

                        {/* Badges */}
                        {selectedPlayer.badges && selectedPlayer.badges.length > 0 && (
                          <div className="mb-6">
                            <h4 className="font-tarkov font-bold text-tarkov-accent uppercase text-sm mb-3 text-center">
                              Achievements
                            </h4>
                            <div className="flex flex-wrap justify-center gap-2">
                              {selectedPlayer.badges.map((badge, index) => (
                                <div
                                  key={index}
                                  className="px-3 py-1 bg-yellow-600 text-black rounded-full text-xs font-bold uppercase"
                                >
                                  {badge}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-center space-x-4">
                          {!selectedPlayer.isCurrentUser && (
                            <TarkovButton
                              variant="primary"
                              size="sm"
                              icon={<TarkovIcons.Ammo size={16} />}
                              onClick={() => {
                                // In real app, this would open a challenge/friend request
                                alert(`Challenge ${selectedPlayer.username} to a game!`)
                              }}
                            >
                              Challenge
                            </TarkovButton>
                          )}
                          <TarkovButton
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedPlayer(null)}
                          >
                            Close
                          </TarkovButton>
                        </div>
                      </TarkovCard>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </TarkovCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Leaderboard