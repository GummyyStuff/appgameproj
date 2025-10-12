import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
// Supabase import removed - using Appwrite backend API
import { motion } from 'framer-motion'
import { SkeletonTable } from './Skeleton'
import { useToastContext } from '../providers/ToastProvider'
import { FontAwesomeSVGIcons } from './FontAwesomeSVG'

interface GameHistory {
  id: string
  game_type: string
  bet_amount: number
  win_amount: number
  net_result: number
  created_at: string
  result_data?: any
}

interface GameHistoryFilters {
  gameType: string
  dateFrom: string
  dateTo: string
  minBet: string
  maxBet: string
  resultType: 'all' | 'wins' | 'losses'
  sortBy: 'date' | 'bet' | 'win' | 'profit'
  sortOrder: 'asc' | 'desc'
}

interface GameHistoryTableProps {
  showFilters?: boolean
  showExport?: boolean
  pageSize?: number
}

const GameHistoryTable: React.FC<GameHistoryTableProps> = ({
  showFilters = true,
  showExport = true,
  pageSize = 20
}) => {
  const { user } = useAuth()
  const toast = useToastContext()
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<GameHistoryFilters>({
    gameType: 'all',
    dateFrom: '',
    dateTo: '',
    minBet: '',
    maxBet: '',
    resultType: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  })

  const { data: allGameHistory, isLoading, error } = useQuery({
    queryKey: ['allGameHistory', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const response = await fetch('/api/user/history?limit=1000&order=desc', {
        credentials: 'include',
        headers: {
          'X-Appwrite-User-Id': user.id,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch game history');
      
      const result = await response.json();
      return result.history as GameHistory[];
    },
    enabled: !!user,
    staleTime: 60000, // Cache for 1 minute
  })

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!allGameHistory) return []

    let filtered = [...allGameHistory]

    // Apply filters
    if (filters.gameType !== 'all') {
      filtered = filtered.filter(game => game.game_type === filters.gameType)
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      filtered = filtered.filter(game => new Date(game.created_at) >= fromDate)
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo)
      toDate.setHours(23, 59, 59, 999) // End of day
      filtered = filtered.filter(game => new Date(game.created_at) <= toDate)
    }

    if (filters.minBet) {
      const minBet = parseFloat(filters.minBet)
      if (!isNaN(minBet)) {
        filtered = filtered.filter(game => game.bet_amount >= minBet)
      }
    }

    if (filters.maxBet) {
      const maxBet = parseFloat(filters.maxBet)
      if (!isNaN(maxBet)) {
        filtered = filtered.filter(game => game.bet_amount <= maxBet)
      }
    }

    if (filters.resultType === 'wins') {
      filtered = filtered.filter(game => game.win_amount > game.bet_amount)
    } else if (filters.resultType === 'losses') {
      filtered = filtered.filter(game => game.win_amount <= game.bet_amount)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (filters.sortBy) {
        case 'date':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'bet':
          aValue = a.bet_amount
          bValue = b.bet_amount
          break
        case 'win':
          aValue = a.win_amount
          bValue = b.win_amount
          break
        case 'profit':
          aValue = a.net_result ?? (a.win_amount - a.bet_amount)
          bValue = b.net_result ?? (b.win_amount - b.bet_amount)
          // Handle NaN values by treating them as 0
          aValue = isNaN(aValue) ? 0 : aValue
          bValue = isNaN(bValue) ? 0 : bValue
          break
        default:
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
      }

      if (filters.sortOrder === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })

    return filtered
  }, [allGameHistory, filters])

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize)
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case 'roulette': return <FontAwesomeSVGIcons.Circle size={16} />
      case 'blackjack': return <FontAwesomeSVGIcons.Spade size={16} />
      case 'case_opening': return <FontAwesomeSVGIcons.Square size={16} />
      default: return <FontAwesomeSVGIcons.Gamepad size={16} />
    }
  }

  const getGameName = (gameType: string) => {
    switch (gameType) {
      case 'roulette': return 'Roulette'
      case 'blackjack': return 'Blackjack'
      case 'case_opening': return 'Case Opening'
      default: return gameType.charAt(0).toUpperCase() + gameType.slice(1)
    }
  }

  const exportToCSV = () => {
    if (!filteredData.length) {
      toast.warning('No data to export', 'Apply different filters to see more results')
      return
    }

    try {
      const headers = ['Date', 'Game', 'Bet Amount', 'Win Amount', 'Net Result', 'Details']
      const csvData = filteredData.map(game => [
        formatDate(game.created_at),
        getGameName(game.game_type),
        game.bet_amount,
        game.win_amount,
        game.net_result ?? (game.win_amount - game.bet_amount),
        JSON.stringify(game.result_data || {})
      ])

      const csvContent = [headers, ...csvData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `game-history-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Export successful', `Downloaded ${filteredData.length} games as CSV`)
    } catch (error) {
      toast.error('Export failed', 'Unable to export game history')
    }
  }

  const exportToJSON = () => {
    if (!filteredData.length) return

    const jsonContent = JSON.stringify(filteredData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `game-history-${new Date().toISOString().split('T')[0]}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetFilters = () => {
    setFilters({
      gameType: 'all',
      dateFrom: '',
      dateTo: '',
      minBet: '',
      maxBet: '',
      resultType: 'all',
      sortBy: 'date',
      sortOrder: 'desc'
    })
    setCurrentPage(1)
  }

  if (!user) return null

  if (isLoading) {
    return (
      <div className="bg-tarkov-dark rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-tarkov-secondary/50 rounded w-48 animate-pulse" />
          <div className="h-8 bg-tarkov-secondary/50 rounded w-24 animate-pulse" />
        </div>
        <SkeletonTable rows={pageSize} columns={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-tarkov-dark rounded-lg p-6">
        <div className="text-center py-8">
          <FontAwesomeSVGIcons.Times className="text-tarkov-danger mx-auto mb-4" size={48} />
          <p className="text-tarkov-danger">Failed to load game history</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-tarkov-dark rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-tarkov font-bold text-white flex items-center space-x-2">
          <FontAwesomeSVGIcons.History className="text-tarkov-accent" size={24} />
          <span>Game History</span>
          <span className="text-sm text-gray-400 font-normal">
            ({filteredData.length} {filteredData.length === 1 ? 'game' : 'games'})
          </span>
        </h3>
        
        {showExport && filteredData.length > 0 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={exportToCSV}
              className="bg-tarkov-secondary hover:bg-tarkov-primary border border-tarkov-primary rounded-md px-3 py-2 text-white text-sm transition-colors flex items-center space-x-1"
            >
              <FontAwesomeSVGIcons.AlarmClock className="mr-1" size={16} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={exportToJSON}
              className="bg-tarkov-secondary hover:bg-tarkov-primary border border-tarkov-primary rounded-md px-3 py-2 text-white text-sm transition-colors flex items-center space-x-1"
            >
              <FontAwesomeSVGIcons.Square className="mr-1" size={16} />
              <span>Export JSON</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          className="bg-tarkov-secondary rounded-lg p-4 mb-6"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Game Type</label>
              <select
                value={filters.gameType}
                onChange={(e) => setFilters(prev => ({ ...prev, gameType: e.target.value }))}
                className="w-full bg-tarkov-dark border border-tarkov-primary rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-tarkov-accent"
              >
                <option value="all">All Games</option>
                <option value="roulette">Roulette</option>
                <option value="blackjack">Blackjack</option>
                <option value="case_opening">Case Opening</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Result Type</label>
              <select
                value={filters.resultType}
                onChange={(e) => setFilters(prev => ({ ...prev, resultType: e.target.value as any }))}
                className="w-full bg-tarkov-dark border border-tarkov-primary rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-tarkov-accent"
              >
                <option value="all">All Results</option>
                <option value="wins">Wins Only</option>
                <option value="losses">Losses Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full bg-tarkov-dark border border-tarkov-primary rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-tarkov-accent"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full bg-tarkov-dark border border-tarkov-primary rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-tarkov-accent"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Min Bet</label>
              <input
                type="number"
                placeholder="0"
                value={filters.minBet}
                onChange={(e) => setFilters(prev => ({ ...prev, minBet: e.target.value }))}
                className="w-full bg-tarkov-dark border border-tarkov-primary rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-tarkov-accent"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Max Bet</label>
              <input
                type="number"
                placeholder="∞"
                value={filters.maxBet}
                onChange={(e) => setFilters(prev => ({ ...prev, maxBet: e.target.value }))}
                className="w-full bg-tarkov-dark border border-tarkov-primary rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-tarkov-accent"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                className="w-full bg-tarkov-dark border border-tarkov-primary rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-tarkov-accent"
              >
                <option value="date">Date</option>
                <option value="bet">Bet Amount</option>
                <option value="win">Win Amount</option>
                <option value="profit">Net Profit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Sort Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                className="w-full bg-tarkov-dark border border-tarkov-primary rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-tarkov-accent"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={resetFilters}
              className="bg-tarkov-primary hover:bg-tarkov-accent text-white px-4 py-2 rounded-md text-sm transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </motion.div>
      )}

      {/* Table */}
      {filteredData.length === 0 ? (
        <div className="text-center py-8">
          <FontAwesomeSVGIcons.Gamepad className="text-gray-400 mx-auto mb-4" size={48} />
          <p className="text-gray-400">
            {allGameHistory?.length === 0 
              ? "No games played yet. Start playing to see your history!"
              : "No games match your current filters."
            }
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-tarkov-primary">
                  <th className="text-left py-3 px-2 text-gray-400 font-medium">Game</th>
                  <th className="text-left py-3 px-2 text-gray-400 font-medium">Date</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-medium">Bet</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-medium">Win</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-medium">Profit</th>
                  <th className="text-left py-3 px-2 text-gray-400 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((game, index) => (
                  <motion.tr
                    key={game.id}
                    className="border-b border-tarkov-secondary hover:bg-tarkov-secondary/50 transition-colors"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getGameIcon(game.game_type)}</span>
                        <span className="text-white font-medium">{getGameName(game.game_type)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-gray-400 text-sm">
                      {formatDate(game.created_at)}
                    </td>
                    <td className="py-3 px-2 text-right text-white">
                      ₽{formatCurrency(game.bet_amount)}
                    </td>
                    <td className="py-3 px-2 text-right text-white">
                      ₽{formatCurrency(game.win_amount)}
                    </td>
                    <td className={`py-3 px-2 text-right font-bold ${
                      (() => {
                        const netResult = game.net_result ?? (game.win_amount - game.bet_amount)
                        return netResult > 0 
                          ? 'text-tarkov-success' 
                          : netResult < 0 
                          ? 'text-tarkov-danger' 
                          : 'text-gray-400'
                      })()
                    }`}>
                      {(() => {
                        const netResult = game.net_result ?? (game.win_amount - game.bet_amount)
                        const safeNetResult = isNaN(netResult) ? 0 : netResult
                        return `${safeNetResult > 0 ? '+' : ''}₽${formatCurrency(safeNetResult)}`
                      })()}
                    </td>
                    <td className="py-3 px-2 text-gray-400 text-sm">
                      {game.result_data && (
                        <>
                          {game.game_type === 'roulette' && game.result_data.winning_number !== undefined && (
                            <span>Number: {game.result_data.winning_number}</span>
                          )}
                          {game.game_type === 'blackjack' && game.result_data.player_hand && (
                            <span>Player: {game.result_data.player_hand.join(', ')}</span>
                          )}
                          {game.game_type === 'case_opening' && game.result_data.item_name && (
                            <span>Item: {game.result_data.item_name}</span>
                          )}
                        </>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-400">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} games
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="bg-tarkov-secondary hover:bg-tarkov-primary disabled:opacity-50 disabled:cursor-not-allowed border border-tarkov-primary rounded-md px-3 py-2 text-white text-sm transition-colors"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-md text-sm transition-colors ${
                          currentPage === page
                            ? 'bg-tarkov-accent text-white'
                            : 'bg-tarkov-secondary hover:bg-tarkov-primary text-gray-400'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                  
                  {totalPages > 5 && (
                    <>
                      <span className="text-gray-400">...</span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className={`w-8 h-8 rounded-md text-sm transition-colors ${
                          currentPage === totalPages
                            ? 'bg-tarkov-accent text-white'
                            : 'bg-tarkov-secondary hover:bg-tarkov-primary text-gray-400'
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-tarkov-secondary hover:bg-tarkov-primary disabled:opacity-50 disabled:cursor-not-allowed border border-tarkov-primary rounded-md px-3 py-2 text-white text-sm transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default GameHistoryTable