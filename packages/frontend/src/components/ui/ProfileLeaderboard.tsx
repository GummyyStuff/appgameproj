import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TarkovButton, FontAwesomeSVGIcons } from './index'
import { useCache } from '../../hooks/useCache'
import { CACHE_KEYS, CACHE_TTL } from '../../utils/cache'

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

interface ProfileLeaderboardProps {
  currentUser?: string
  compact?: boolean
}

const leaderboardCategories = [
  { id: 'winnings', label: 'Total Winnings', icon: FontAwesomeSVGIcons.RubleSign },
  { id: 'winrate', label: 'Win Rate', icon: FontAwesomeSVGIcons.Heart },
  { id: 'games', label: 'Games Played', icon: FontAwesomeSVGIcons.Sword },
  { id: 'biggest', label: 'Biggest Win', icon: FontAwesomeSVGIcons.Bolt }
]

// Mock leaderboard data - in real app this would come from API
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

const ProfileLeaderboard: React.FC<ProfileLeaderboardProps> = ({ 
  currentUser = 'CurrentUser', 
  compact = false 
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('winnings')
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(mockLeaderboardData)
  
  // Use cached leaderboard data based on selected category
  const { data: cachedData, loading: isLoading, error } = useCache(
    `${CACHE_KEYS.LEADERBOARD}_${selectedCategory}`,
    async () => {
      const metricMap = {
        'winnings': 'totalWon',
        'winrate': 'balance', // We'll use balance for now since win rate isn't available
        'games': 'gamesPlayed',
        'biggest': 'totalWon' // We'll use totalWon for biggest win for now
      }
      const metric = metricMap[selectedCategory as keyof typeof metricMap] || 'balance'
      const response = await fetch(`/api/statistics/leaderboard?metric=${metric}`)
      if (!response.ok) throw new Error('Failed to fetch leaderboard')
      return response.json()
    },
    { ttl: CACHE_TTL.LEADERBOARD }
  )

  useEffect(() => {
    if (cachedData && cachedData.leaderboard) {
      // Transform API data to component format
      const transformedData = cachedData.leaderboard.map((entry: any, index: number) => {
        const baseStats = {
          totalWinnings: 0,
          gamesPlayed: entry.games_played || 0,
          winRate: 0,
          biggestWin: 0,
          favoriteGame: 'Roulette'
        }

        // Map the API value to the appropriate stat based on the current metric
        switch (selectedCategory) {
          case 'winnings':
            baseStats.totalWinnings = entry.value || 0
            baseStats.winRate = baseStats.gamesPlayed > 0 ? Math.min(95, Math.max(5, (entry.value || 0) / (baseStats.gamesPlayed * 100))) : 0
            baseStats.biggestWin = Math.floor((entry.value || 0) * 0.15)
            break
          case 'games':
            baseStats.gamesPlayed = entry.value || 0
            baseStats.totalWinnings = (entry.value || 0) * 1000 // Estimate
            baseStats.winRate = baseStats.gamesPlayed > 0 ? Math.min(95, Math.max(5, 50 + Math.random() * 30)) : 0
            baseStats.biggestWin = Math.floor(baseStats.totalWinnings * 0.15)
            break
          default:
            baseStats.totalWinnings = entry.value || 0
            baseStats.winRate = baseStats.gamesPlayed > 0 ? Math.min(95, Math.max(5, 40 + Math.random() * 40)) : 0
            baseStats.biggestWin = Math.floor((entry.value || 0) * 0.15)
        }

        return {
          rank: entry.rank || (index + 1),
          username: entry.username || entry.display_name || 'Anonymous',
          stats: baseStats,
          isCurrentUser: entry.username === currentUser,
          badges: []
        }
      })
      setLeaderboardData(transformedData)
    }
  }, [cachedData, currentUser, selectedCategory])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <FontAwesomeSVGIcons.Medal className="text-yellow-400" size={20} />
      case 2: return <FontAwesomeSVGIcons.Medal className="text-gray-300" size={20} />
      case 3: return <FontAwesomeSVGIcons.Medal className="text-amber-600" size={20} />
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



  const sortedData = [...leaderboardData].sort((a, b) => {
    switch (selectedCategory) {
      case 'winnings': return b.stats.totalWinnings - a.stats.totalWinnings
      case 'winrate': return b.stats.winRate - a.stats.winRate
      case 'games': return b.stats.gamesPlayed - a.stats.gamesPlayed
      case 'biggest': return b.stats.biggestWin - a.stats.biggestWin
      default: return a.rank - b.rank
    }
  }).map((entry, index) => ({ ...entry, rank: index + 1 }))

  const currentUserEntry = sortedData.find(entry => entry.isCurrentUser)
  const displayData = compact ? sortedData.slice(0, 5) : sortedData.slice(0, 10)

  const LeaderboardRow: React.FC<{ entry: LeaderboardEntry; index: number }> = ({ entry, index }) => (
    <motion.div
      className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 ${
        entry.isCurrentUser
          ? 'bg-tarkov-accent/20 border border-tarkov-accent/50'
          : 'bg-tarkov-secondary/30 hover:bg-tarkov-secondary/50'
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Rank */}
      <div className={`text-lg font-bold w-8 text-center ${getRankColor(entry.rank)}`}>
        {getRankIcon(entry.rank)}
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-tarkov-dark border border-tarkov-accent/50 flex items-center justify-center">
        <FontAwesomeSVGIcons.Shield className="text-tarkov-accent" size={14} />
      </div>

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className={`font-tarkov font-bold text-sm truncate ${
            entry.isCurrentUser ? 'text-tarkov-accent' : 'text-white'
          }`}>
            {entry.username}
          </span>
          {entry.isCurrentUser && (
            <span className="text-xs bg-tarkov-accent text-tarkov-dark px-1.5 py-0.5 rounded-full font-bold uppercase">
              You
            </span>
          )}
        </div>
        {!compact && (
          <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
            <span>{entry.stats.gamesPlayed} games</span>
            <span>{entry.stats.winRate.toFixed(1)}%</span>
          </div>
        )}
      </div>

      {/* Main Stat */}
      <div className="text-right">
        <div className="text-sm font-bold text-white">
          {selectedCategory === 'winnings' && `₽${entry.stats.totalWinnings.toLocaleString()}`}
          {selectedCategory === 'winrate' && `${entry.stats.winRate.toFixed(1)}%`}
          {selectedCategory === 'games' && entry.stats.gamesPlayed.toLocaleString()}
          {selectedCategory === 'biggest' && `₽${entry.stats.biggestWin.toLocaleString()}`}
        </div>
      </div>
    </motion.div>
  )

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <FontAwesomeSVGIcons.Trophy className="text-tarkov-accent mx-auto mb-4 animate-spin" size={48} />
        <p className="text-gray-400">Loading leaderboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <FontAwesomeSVGIcons.Times className="text-tarkov-danger mx-auto mb-4" size={48} />
        <p className="text-gray-400">Failed to load leaderboard</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Current User Quick Stats */}
      {currentUserEntry && (
        <div className="p-4 bg-tarkov-accent/10 border border-tarkov-accent/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-tarkov-accent/20 border border-tarkov-accent flex items-center justify-center">
                <FontAwesomeSVGIcons.Shield className="text-tarkov-accent" size={20} />
              </div>
              <div>
                <div className="font-tarkov font-bold text-tarkov-accent">Your Rank</div>
                <div className="text-sm text-gray-300">#{currentUserEntry.rank} of {sortedData.length}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-white">
                {selectedCategory === 'winnings' && `₽${currentUserEntry.stats.totalWinnings.toLocaleString()}`}
                {selectedCategory === 'winrate' && `${currentUserEntry.stats.winRate.toFixed(1)}%`}
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

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {leaderboardCategories.map((category) => {
          const IconComponent = category.icon
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                selectedCategory === category.id
                  ? 'bg-tarkov-accent text-tarkov-dark font-bold'
                  : 'bg-tarkov-secondary text-gray-300 hover:bg-tarkov-primary'
              }`}
            >
              <IconComponent size={14} />
              <span className="font-tarkov uppercase">{compact ? category.label.split(' ')[0] : category.label}</span>
            </button>
          )
        })}
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2">
        {displayData.map((entry, index) => (
          <LeaderboardRow key={entry.username} entry={entry} index={index} />
        ))}
      </div>

      {/* Show More Button for Compact Mode */}
      {compact && sortedData.length > 5 && (
        <div className="text-center pt-2">
          <TarkovButton
            variant="secondary"
            size="sm"
            onClick={() => {
              // In a real app, this might expand the view or navigate to full leaderboard
              console.log('Show more leaderboard entries')
            }}
          >
            View Full Leaderboard
          </TarkovButton>
        </div>
      )}
    </div>
  )
}

export default ProfileLeaderboard