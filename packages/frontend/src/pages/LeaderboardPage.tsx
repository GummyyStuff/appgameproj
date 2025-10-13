import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { FontAwesomeSVGIcons, TarkovCard } from '../components/ui'
import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrency } from '../utils/currency'

interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  value: number
  balance: number
  totalWagered: number
  totalWon: number
  gamesPlayed: number
}

type MetricType = 'balance' | 'totalWon' | 'gamesPlayed' | 'totalWagered'
type TimePeriod = 'all' | 'monthly' | 'weekly' | 'daily'
type GameType = 'all' | 'roulette' | 'blackjack' | 'case_opening'

const LeaderboardPage: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('totalWon')
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('all')
  const [selectedGame, setSelectedGame] = useState<GameType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardEntry | null>(null)
  const entriesPerPage = 50

  // Debounce search input (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      // Reset to first page when search changes
      if (searchQuery !== debouncedSearch) {
        setCurrentPage(1)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch leaderboard data
  const { data: leaderboardData, isLoading, error } = useQuery({
    queryKey: ['leaderboard', selectedMetric, selectedPeriod, selectedGame],
    queryFn: async () => {
      const params = new URLSearchParams({
        metric: selectedMetric,
        limit: '100' // Fetch top 100 for pagination
      })
      
      const response = await fetch(`/api/statistics/leaderboard?${params}`, {
        credentials: 'include'
      })
      
      if (!response.ok) throw new Error('Failed to fetch leaderboard')
      
      const result = await response.json()
      return result.leaderboard as LeaderboardEntry[]
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })

  // Filter and search leaderboard (using debounced search)
  const filteredData = useMemo(() => {
    if (!leaderboardData) return []
    
    let filtered = [...leaderboardData]
    
    // Search filter (debounced)
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase()
      filtered = filtered.filter(entry => 
        entry.username.toLowerCase().includes(query)
      )
    }
    
    return filtered
  }, [leaderboardData, debouncedSearch])

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage
    const endIndex = startIndex + entriesPerPage
    return filteredData.slice(startIndex, endIndex)
  }, [filteredData, currentPage])

  const totalPages = Math.ceil(filteredData.length / entriesPerPage)

  // Find current user's rank
  const currentUserEntry = filteredData.find(entry => entry.userId === user?.id)

  // Prefetch adjacent pages for smoother UX
  useEffect(() => {
    if (!leaderboardData || !filteredData.length) return

    // Prefetch next page
    if (currentPage < totalPages) {
      const nextPageStart = currentPage * entriesPerPage
      const nextPageEnd = nextPageStart + entriesPerPage
      const nextPageData = filteredData.slice(nextPageStart, nextPageEnd)
      
      // Only prefetch if there's data to prefetch
      if (nextPageData.length > 0) {
        queryClient.setQueryData(
          ['leaderboard-page', selectedMetric, currentPage + 1, debouncedSearch],
          nextPageData
        )
      }
    }

    // Prefetch previous page
    if (currentPage > 1) {
      const prevPageStart = (currentPage - 2) * entriesPerPage
      const prevPageEnd = prevPageStart + entriesPerPage
      const prevPageData = filteredData.slice(prevPageStart, prevPageEnd)
      
      if (prevPageData.length > 0) {
        queryClient.setQueryData(
          ['leaderboard-page', selectedMetric, currentPage - 1, debouncedSearch],
          prevPageData
        )
      }
    }
  }, [currentPage, filteredData, totalPages, selectedMetric, debouncedSearch, queryClient])

  // Metric configuration
  const metrics = [
    { id: 'totalWon' as MetricType, label: 'Total Winnings', icon: FontAwesomeSVGIcons.RubleSign, color: 'text-green-500' },
    { id: 'balance' as MetricType, label: 'Current Balance', icon: FontAwesomeSVGIcons.Wallet, color: 'text-tarkov-accent' },
    { id: 'gamesPlayed' as MetricType, label: 'Games Played', icon: FontAwesomeSVGIcons.Gamepad, color: 'text-blue-500' },
    { id: 'totalWagered' as MetricType, label: 'Total Wagered', icon: FontAwesomeSVGIcons.ChartBar, color: 'text-purple-500' }
  ]

  const periods = [
    { id: 'all' as TimePeriod, label: 'All Time' },
    { id: 'monthly' as TimePeriod, label: 'This Month' },
    { id: 'weekly' as TimePeriod, label: 'This Week' },
    { id: 'daily' as TimePeriod, label: 'Today' }
  ]

  const gameTypes = [
    { id: 'all' as GameType, label: 'All Games', icon: FontAwesomeSVGIcons.Gamepad },
    { id: 'roulette' as GameType, label: 'Roulette', icon: FontAwesomeSVGIcons.Circle },
    { id: 'blackjack' as GameType, label: 'Blackjack', icon: FontAwesomeSVGIcons.Spade },
    { id: 'case_opening' as GameType, label: 'Cases', icon: FontAwesomeSVGIcons.Box }
  ]

  // Helper functions
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <FontAwesomeSVGIcons.Medal className="text-yellow-400" size={28} />
      case 2: return <FontAwesomeSVGIcons.Medal className="text-gray-300" size={24} />
      case 3: return <FontAwesomeSVGIcons.Medal className="text-amber-600" size={20} />
      default: return `#${rank}`
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-600/30 to-yellow-500/30 border-yellow-500'
      case 2: return 'bg-gradient-to-r from-gray-500/30 to-gray-400/30 border-gray-400'
      case 3: return 'bg-gradient-to-r from-amber-700/30 to-amber-600/30 border-amber-600'
      default: return 'bg-tarkov-secondary/50 border-tarkov-primary/50'
    }
  }

  const formatValue = (value: number, metric: MetricType) => {
    if (metric === 'gamesPlayed') {
      return value.toLocaleString()
    }
    return `₽${formatCurrency(value, 'roubles', { showSymbol: false })}`
  }

  const getWinRate = (entry: LeaderboardEntry) => {
    if (entry.totalWagered === 0) return '0.0'
    return ((entry.totalWon / entry.totalWagered) * 100).toFixed(1)
  }

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="text-center">
          <FontAwesomeSVGIcons.Trophy className="text-tarkov-accent mx-auto mb-4 animate-spin" size={64} />
          <h2 className="text-2xl font-tarkov text-white mb-2">Loading Leaderboard...</h2>
          <p className="text-gray-400">Fetching top players</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <FontAwesomeSVGIcons.Times className="text-tarkov-danger mx-auto mb-4" size={64} />
        <h2 className="text-2xl font-tarkov text-tarkov-danger mb-2">Failed to Load Leaderboard</h2>
        <p className="text-gray-400">Please try again later</p>
      </div>
    )
  }

  return (
    <div className="py-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <FontAwesomeSVGIcons.Trophy className="text-tarkov-accent mx-auto mb-4" size={80} />
          <h1 className="text-5xl font-tarkov font-bold text-tarkov-accent mb-4 uppercase">
            Leaderboard
          </h1>
          <p className="text-xl text-gray-300">
            Compete with the best players and climb the ranks
          </p>
        </motion.div>
      </div>

      {/* Current User Rank Card */}
      {currentUserEntry && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <TarkovCard className="p-6 bg-gradient-to-r from-tarkov-accent/20 to-orange-600/20 border-2 border-tarkov-accent" glow>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-tarkov-accent/30 border-2 border-tarkov-accent flex items-center justify-center">
                  <FontAwesomeSVGIcons.Shield className="text-tarkov-accent" size={32} />
                </div>
                <div>
                  <div className="text-sm text-gray-300 uppercase tracking-wide">Your Rank</div>
                  <div className="text-3xl font-tarkov font-bold text-white">
                    #{currentUserEntry.rank}
                  </div>
                  <div className="text-sm text-gray-400">
                    out of {filteredData.length} players
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-300 uppercase tracking-wide">
                  {metrics.find(m => m.id === selectedMetric)?.label}
                </div>
                <div className="text-3xl font-tarkov font-bold text-tarkov-accent">
                  {formatValue(currentUserEntry.value, selectedMetric)}
                </div>
                <div className="text-sm text-gray-400">
                  Win Rate: {getWinRate(currentUserEntry)}%
                </div>
              </div>
            </div>
          </TarkovCard>
        </motion.div>
      )}

      {/* Filters */}
      <div className="space-y-4">
        {/* Metric Selection */}
        <div className="bg-tarkov-dark rounded-lg p-4">
          <h3 className="text-sm font-tarkov text-gray-400 uppercase mb-3">Sort By</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {metrics.map((metric) => {
              const IconComponent = metric.icon
              return (
                <button
                  key={metric.id}
                  onClick={() => setSelectedMetric(metric.id)}
                  className={`flex items-center justify-center space-x-2 p-3 rounded-lg transition-all ${
                    selectedMetric === metric.id
                      ? 'bg-tarkov-accent text-tarkov-dark font-bold shadow-lg'
                      : 'bg-tarkov-secondary text-gray-300 hover:bg-tarkov-primary'
                  }`}
                >
                  <IconComponent size={18} />
                  <span className="font-tarkov text-sm">{metric.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Time Period & Game Type & Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Time Period - Currently disabled as backend doesn't support it */}
          <div className="bg-tarkov-dark rounded-lg p-4 opacity-50 cursor-not-allowed">
            <h3 className="text-sm font-tarkov text-gray-400 uppercase mb-3">Time Period</h3>
            <div className="flex flex-wrap gap-2">
              {periods.map((period) => (
                <button
                  key={period.id}
                  disabled
                  className="px-3 py-2 rounded-md text-sm bg-tarkov-secondary text-gray-500 cursor-not-allowed"
                >
                  {period.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Coming soon</p>
          </div>

          {/* Game Type - Currently disabled as backend doesn't support it */}
          <div className="bg-tarkov-dark rounded-lg p-4 opacity-50 cursor-not-allowed">
            <h3 className="text-sm font-tarkov text-gray-400 uppercase mb-3">Game Type</h3>
            <div className="flex flex-wrap gap-2">
              {gameTypes.map((game) => {
                const IconComponent = game.icon
                return (
                  <button
                    key={game.id}
                    disabled
                    className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm bg-tarkov-secondary text-gray-500 cursor-not-allowed"
                  >
                    <IconComponent size={14} />
                    <span>{game.label}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">Coming soon</p>
          </div>

          {/* Search */}
          <div className="bg-tarkov-dark rounded-lg p-4">
            <h3 className="text-sm font-tarkov text-gray-400 uppercase mb-3">Search Player</h3>
            <div className="relative">
              <FontAwesomeSVGIcons.Search 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                size={16} 
              />
              <input
                type="text"
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-tarkov-secondary border border-tarkov-primary rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-tarkov-accent focus:border-transparent"
              />
              {searchQuery !== debouncedSearch && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <FontAwesomeSVGIcons.Clock className="text-gray-400 animate-spin" size={14} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      {!searchQuery && filteredData.length >= 3 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-4 max-w-4xl mx-auto"
        >
          {/* 2nd Place */}
          <div className="flex flex-col items-center justify-end">
            <TarkovCard className="w-full p-4 bg-gradient-to-b from-gray-500/30 to-gray-600/30 border-2 border-gray-400">
              <div className="text-center">
                <FontAwesomeSVGIcons.Medal className="text-gray-300 mx-auto mb-2" size={40} />
                <div className="w-16 h-16 rounded-full bg-gray-700 border-2 border-gray-400 flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-gray-300">
                    {filteredData[1]?.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h3 className="font-tarkov font-bold text-white text-lg truncate">
                  {filteredData[1]?.username}
                </h3>
                <p className="text-2xl font-bold text-gray-300 mt-2">
                  {formatValue(filteredData[1]?.value || 0, selectedMetric)}
                </p>
                <div className="text-sm text-gray-400 mt-1">
                  {filteredData[1]?.gamesPlayed} games
                </div>
              </div>
            </TarkovCard>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center justify-end -mt-8">
            <TarkovCard className="w-full p-6 bg-gradient-to-b from-yellow-500/30 to-yellow-600/30 border-2 border-yellow-500 shadow-2xl" glow>
              <div className="text-center">
                <FontAwesomeSVGIcons.Crown className="text-yellow-400 mx-auto mb-3 animate-pulse" size={48} />
                <div className="w-20 h-20 rounded-full bg-yellow-900 border-3 border-yellow-400 flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-3xl font-bold text-yellow-300">
                    {filteredData[0]?.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h3 className="font-tarkov font-bold text-white text-xl truncate">
                  {filteredData[0]?.username}
                </h3>
                <p className="text-3xl font-bold text-yellow-400 mt-3">
                  {formatValue(filteredData[0]?.value || 0, selectedMetric)}
                </p>
                <div className="text-sm text-gray-300 mt-2">
                  {filteredData[0]?.gamesPlayed} games
                </div>
              </div>
            </TarkovCard>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center justify-end">
            <TarkovCard className="w-full p-4 bg-gradient-to-b from-amber-700/30 to-amber-800/30 border-2 border-amber-600">
              <div className="text-center">
                <FontAwesomeSVGIcons.Medal className="text-amber-600 mx-auto mb-2" size={36} />
                <div className="w-16 h-16 rounded-full bg-amber-900 border-2 border-amber-600 flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-amber-400">
                    {filteredData[2]?.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h3 className="font-tarkov font-bold text-white text-lg truncate">
                  {filteredData[2]?.username}
                </h3>
                <p className="text-2xl font-bold text-amber-400 mt-2">
                  {formatValue(filteredData[2]?.value || 0, selectedMetric)}
                </p>
                <div className="text-sm text-gray-400 mt-1">
                  {filteredData[2]?.gamesPlayed} games
                </div>
              </div>
            </TarkovCard>
          </div>
        </motion.div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-tarkov-dark rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-tarkov font-bold text-white">
            {searchQuery ? `Search Results (${filteredData.length})` : `Top ${filteredData.length} Players`}
          </h2>
          <div className="text-sm text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        <div className="space-y-2">
          {paginatedData.map((entry, index) => (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`flex items-center space-x-4 p-4 rounded-lg border transition-all cursor-pointer ${
                entry.userId === user?.id
                  ? 'bg-tarkov-accent/20 border-tarkov-accent/50 shadow-lg'
                  : getRankColor(entry.rank)
              } hover:scale-[1.02]`}
              onClick={() => setSelectedPlayer(entry)}
            >
              {/* Rank */}
              <div className="w-12 text-center font-tarkov font-bold text-lg">
                {getRankIcon(entry.rank)}
              </div>

              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-tarkov-primary border-2 border-tarkov-accent flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {entry.username.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Player Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`font-tarkov font-bold text-lg ${
                    entry.userId === user?.id ? 'text-tarkov-accent' : 'text-white'
                  }`}>
                    {entry.username}
                  </span>
                  {entry.userId === user?.id && (
                    <span className="text-xs bg-tarkov-accent text-tarkov-dark px-2 py-1 rounded-full font-bold uppercase">
                      You
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                  <span>{entry.gamesPlayed} games</span>
                  <span>Win Rate: {getWinRate(entry)}%</span>
                </div>
              </div>

              {/* Stats */}
              <div className="text-right">
                <div className="text-xl font-tarkov font-bold text-white">
                  {formatValue(entry.value, selectedMetric)}
                </div>
                <div className="text-sm text-gray-400">
                  Balance: ₽{formatCurrency(entry.balance, 'roubles', { showSymbol: false })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-tarkov-secondary hover:bg-tarkov-primary disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            >
              <FontAwesomeSVGIcons.ChevronLeft size={16} />
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    currentPage === pageNum
                      ? 'bg-tarkov-accent text-tarkov-dark font-bold'
                      : 'bg-tarkov-secondary text-white hover:bg-tarkov-primary'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-tarkov-secondary hover:bg-tarkov-primary disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            >
              <FontAwesomeSVGIcons.ChevronRight size={16} />
            </button>
          </div>
        )}

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <FontAwesomeSVGIcons.Search className="text-gray-400 mx-auto mb-4" size={48} />
            <p className="text-gray-400">No players found</p>
          </div>
        )}
      </div>

      {/* Player Detail Modal */}
      <AnimatePresence>
        {selectedPlayer && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPlayer(null)}
          >
            <motion.div
              className="max-w-lg w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <TarkovCard className="p-6" glow>
                <div className="text-center mb-6">
                  <div className="w-24 h-24 rounded-full bg-tarkov-primary border-4 border-tarkov-accent flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl font-bold text-white">
                      {selectedPlayer.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <div className="text-2xl">
                      {getRankIcon(selectedPlayer.rank)}
                    </div>
                    <h3 className="text-2xl font-tarkov font-bold text-white">
                      {selectedPlayer.username}
                    </h3>
                  </div>
                  {selectedPlayer.userId === user?.id && (
                    <span className="inline-block bg-tarkov-accent text-tarkov-dark px-3 py-1 rounded-full text-sm font-bold uppercase">
                      Your Profile
                    </span>
                  )}
                </div>

                {/* Detailed Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-tarkov-secondary/50 rounded-lg p-4 text-center">
                    <FontAwesomeSVGIcons.RubleSign className="text-green-500 mx-auto mb-2" size={24} />
                    <div className="text-lg font-bold text-white">
                      ₽{formatCurrency(selectedPlayer.totalWon, 'roubles', { showSymbol: false })}
                    </div>
                    <div className="text-xs text-gray-400">Total Won</div>
                  </div>
                  
                  <div className="bg-tarkov-secondary/50 rounded-lg p-4 text-center">
                    <FontAwesomeSVGIcons.Wallet className="text-tarkov-accent mx-auto mb-2" size={24} />
                    <div className="text-lg font-bold text-white">
                      ₽{formatCurrency(selectedPlayer.balance, 'roubles', { showSymbol: false })}
                    </div>
                    <div className="text-xs text-gray-400">Balance</div>
                  </div>
                  
                  <div className="bg-tarkov-secondary/50 rounded-lg p-4 text-center">
                    <FontAwesomeSVGIcons.Gamepad className="text-blue-500 mx-auto mb-2" size={24} />
                    <div className="text-lg font-bold text-white">{selectedPlayer.gamesPlayed}</div>
                    <div className="text-xs text-gray-400">Games Played</div>
                  </div>
                  
                  <div className="bg-tarkov-secondary/50 rounded-lg p-4 text-center">
                    <FontAwesomeSVGIcons.Heart className="text-red-500 mx-auto mb-2" size={24} />
                    <div className="text-lg font-bold text-white">{getWinRate(selectedPlayer)}%</div>
                    <div className="text-xs text-gray-400">Win Rate</div>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setSelectedPlayer(null)}
                    className="px-6 py-2 bg-tarkov-accent hover:bg-orange-500 text-tarkov-dark font-tarkov font-bold rounded-md transition-colors"
                  >
                    Close
                  </button>
                </div>
              </TarkovCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LeaderboardPage

