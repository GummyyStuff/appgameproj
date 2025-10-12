import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
// Supabase import removed - using Appwrite backend API
import { FontAwesomeSVGIcons } from './FontAwesomeSVG'
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { motion } from 'framer-motion'
import WinLossPattern from './WinLossPattern'

interface GameHistory {
  id: string
  game_type: string
  bet_amount: number
  win_amount: number
  net_result: number
  created_at: string
  result_data?: any
}

interface StatisticsData {
  overview: {
    totalGames: number
    totalWagered: number
    totalWon: number
    netProfit: number
    winRate: number
    biggestWin: number
    biggestLoss: number
  }
  gameBreakdown: Array<{
    gameType: string
    games: number
    wagered: number
    won: number
    profit: number
    winRate: number
  }>
  timeSeriesData: Array<{
    date: string
    games: number
    wagered: number
    won: number
    profit: number
  }>
  winStreaks: {
    current: number
    longest: number
    longestLoss: number
  }
}

const StatisticsDashboard: React.FC = () => {
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [selectedChart, setSelectedChart] = useState<'profit' | 'volume' | 'games'>('profit')

  const { data: gameHistory, isLoading } = useQuery({
    queryKey: ['gameHistory', user?.id, timeRange],
    queryFn: async () => {
      if (!user) return []
      
      const params = new URLSearchParams({
        limit: '1000',
        order: 'desc',
      });
      
      // Apply time range filter
      if (timeRange !== 'all') {
        const days = parseInt(timeRange.replace('d', ''));
        params.append('days', days.toString());
      }
      
      const response = await fetch(`/api/user/history?${params}`, {
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

  // Calculate statistics from game history
  const statistics: StatisticsData | null = React.useMemo(() => {
    if (!gameHistory || gameHistory.length === 0) return null

    // Overview calculations
    const totalGames = gameHistory.length
    const totalWagered = gameHistory.reduce((sum, game) => sum + game.bet_amount, 0)
    const totalWon = gameHistory.reduce((sum, game) => sum + game.win_amount, 0)
    const netProfit = totalWon - totalWagered
    const wins = gameHistory.filter(game => game.win_amount > game.bet_amount).length
    const winRate = (wins / totalGames) * 100
    const biggestWin = Math.max(...gameHistory.map(game => game.win_amount))
    const biggestLoss = Math.max(...gameHistory.map(game => game.bet_amount - game.win_amount))

    // Game type breakdown
    const gameTypes = ['roulette', 'blackjack', 'case_opening']
    const gameBreakdown = gameTypes.map(gameType => {
      const games = gameHistory.filter(game => game.game_type === gameType)
      const gamesCount = games.length
      const wagered = games.reduce((sum, game) => sum + game.bet_amount, 0)
      const won = games.reduce((sum, game) => sum + game.win_amount, 0)
      const profit = won - wagered
      const gameWins = games.filter(game => game.win_amount > game.bet_amount).length
      const gameWinRate = gamesCount > 0 ? (gameWins / gamesCount) * 100 : 0

      return {
        gameType,
        games: gamesCount,
        wagered,
        won,
        profit,
        winRate: gameWinRate
      }
    }).filter(item => item.games > 0)

    // Time series data (daily aggregation)
    const dailyData = new Map<string, { games: number; wagered: number; won: number; profit: number }>()
    
    gameHistory.forEach(game => {
      const date = new Date(game.created_at).toISOString().split('T')[0]
      
      if (!dailyData.has(date)) {
        dailyData.set(date, { games: 0, wagered: 0, won: 0, profit: 0 })
      }
      
      const dayData = dailyData.get(date)!
      dayData.games += 1
      dayData.wagered += game.bet_amount
      dayData.won += game.win_amount
      dayData.profit += game.net_result
    })

    const timeSeriesData = Array.from(dailyData.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30) // Last 30 days

    console.log('Time series data:', timeSeriesData) // Debug log

    // Win streaks calculation
    let currentStreak = 0
    let longestWinStreak = 0
    let longestLossStreak = 0
    let tempWinStreak = 0
    let tempLossStreak = 0

    const sortedGames = [...gameHistory].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    sortedGames.forEach((game) => {
      const isWin = game.win_amount > game.bet_amount

      if (isWin) {
        tempWinStreak += 1
        tempLossStreak = 0
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak)
      } else {
        tempLossStreak += 1
        tempWinStreak = 0
        longestLossStreak = Math.max(longestLossStreak, tempLossStreak)
      }
    })

    // Calculate current streak from most recent games
    for (let i = 0; i < Math.min(gameHistory.length, 10); i++) {
      const game = gameHistory[i]
      const isWin = game.win_amount > game.bet_amount
      
      if (i === 0) {
        currentStreak = isWin ? 1 : -1
      } else {
        const prevWin = currentStreak > 0
        if ((isWin && prevWin) || (!isWin && !prevWin)) {
          currentStreak = isWin ? currentStreak + 1 : currentStreak - 1
        } else {
          break
        }
      }
    }

    return {
      overview: {
        totalGames,
        totalWagered,
        totalWon,
        netProfit,
        winRate,
        biggestWin,
        biggestLoss
      },
      gameBreakdown,
      timeSeriesData,
      winStreaks: {
        current: currentStreak,
        longest: longestWinStreak,
        longestLoss: longestLossStreak
      }
    }
  }, [gameHistory])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case 'roulette': return <FontAwesomeSVGIcons.Circle size={16} />
      case 'blackjack': return <FontAwesomeSVGIcons.Spade size={16} />
      case 'case_opening': return <FontAwesomeSVGIcons.Square size={16} />
      default: return <FontAwesomeSVGIcons.Gamepad size={16} />
    }
  }

  const getGameColor = (gameType: string) => {
    switch (gameType) {
      case 'roulette': return '#ef4444'
      case 'blackjack': return '#3b82f6'
      case 'case_opening': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  if (!user) return null

  if (isLoading) {
    return (
      <div className="bg-tarkov-dark rounded-lg p-6">
        <div className="text-center py-8">
          <FontAwesomeSVGIcons.AlarmClock className="text-tarkov-accent mx-auto mb-4 animate-spin" size={48} />
          <p className="text-gray-400">Loading statistics...</p>
        </div>
      </div>
    )
  }

  if (!statistics) {
    return (
      <div className="bg-tarkov-dark rounded-lg p-6">
        <div className="text-center py-8">
          <FontAwesomeSVGIcons.Gamepad className="text-gray-400 mx-auto mb-4" size={48} />
          <p className="text-gray-400">Start playing to see your statistics!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-tarkov-dark rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-tarkov font-bold text-tarkov-accent flex items-center space-x-2">
            <FontAwesomeSVGIcons.ChartBar className="text-tarkov-accent" size={32} />
            <span>Statistics Dashboard</span>
          </h2>
          
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="bg-tarkov-secondary border border-tarkov-primary rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-tarkov-accent"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
            
            <select
              value={selectedChart}
              onChange={(e) => setSelectedChart(e.target.value as any)}
              className="bg-tarkov-secondary border border-tarkov-primary rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-tarkov-accent"
            >
              <option value="profit">Profit Trend</option>
              <option value="volume">Volume Trend</option>
              <option value="games">Games Played</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          className="bg-tarkov-dark rounded-lg p-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-3xl font-bold text-white">{statistics.overview.totalGames}</div>
          <div className="text-sm text-gray-400">Total Games</div>
        </motion.div>
        
        <motion.div
          className="bg-tarkov-dark rounded-lg p-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className={`text-3xl font-bold ${
            statistics.overview.winRate >= 50 ? 'text-tarkov-success' : 'text-tarkov-danger'
          }`}>
            {statistics.overview.winRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-400">Win Rate</div>
        </motion.div>
        
        <motion.div
          className="bg-tarkov-dark rounded-lg p-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-3xl font-bold text-tarkov-accent">
            ₽{formatCurrency(statistics.overview.totalWagered)}
          </div>
          <div className="text-sm text-gray-400">Total Wagered</div>
        </motion.div>
        
        <motion.div
          className="bg-tarkov-dark rounded-lg p-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className={`text-3xl font-bold ${
            statistics.overview.netProfit >= 0 ? 'text-tarkov-success' : 'text-tarkov-danger'
          }`}>
            {statistics.overview.netProfit >= 0 ? '+' : ''}₽{formatCurrency(statistics.overview.netProfit)}
          </div>
          <div className="text-sm text-gray-400">Net Profit</div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series Chart */}
        <motion.div
          className="bg-tarkov-dark rounded-lg p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-xl font-tarkov font-bold text-white mb-4">
            {selectedChart === 'profit' ? 'Daily Profit' : 
             selectedChart === 'volume' ? 'Daily Volume' : 'Daily Games'}
            {statistics.timeSeriesData.length > 0 && (
              <span className="text-sm text-gray-400 ml-2">
                ({statistics.timeSeriesData.length} data points)
              </span>
            )}
          </h3>
          
          <ResponsiveContainer width="100%" height={300}>
            {statistics.timeSeriesData.length > 0 ? (
              <AreaChart data={statistics.timeSeriesData} key={selectedChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }}
                  formatter={(value: any, name: string) => [
                    selectedChart === 'games' ? value : `₽${formatCurrency(value)}`,
                    name === 'profit' ? 'Profit' : name === 'wagered' ? 'Wagered' : name === 'won' ? 'Won' : 'Games'
                  ]}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Area
                  type="monotone"
                  dataKey={selectedChart}
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.3}
                  connectNulls={false}
                />
              </AreaChart>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FontAwesomeSVGIcons.ChartBar className="text-gray-400 mx-auto mb-2" size={48} />
                  <p className="text-gray-400">No data available for the selected time range</p>
                </div>
              </div>
            )}
          </ResponsiveContainer>
        </motion.div>

        {/* Game Type Breakdown */}
        <motion.div
          className="bg-tarkov-dark rounded-lg p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-xl font-tarkov font-bold text-white mb-4">Game Breakdown</h3>
          
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statistics.gameBreakdown}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="games"
                label={({ gameType, games }) => `${gameType}: ${games}`}
              >
                {statistics.gameBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getGameColor(entry.gameType)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
                formatter={(value: any) => [value, 'Games']}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Game Performance Details */}
      <motion.div
        className="bg-tarkov-dark rounded-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <h3 className="text-xl font-tarkov font-bold text-white mb-6">Game Performance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statistics.gameBreakdown.map((game) => (
            <div key={game.gameType} className="bg-tarkov-secondary rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">{getGameIcon(game.gameType)}</span>
                <h4 className="text-lg font-bold text-white capitalize">{game.gameType}</h4>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Games:</span>
                  <span className="text-white">{game.games}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Win Rate:</span>
                  <span className={game.winRate >= 50 ? 'text-tarkov-success' : 'text-tarkov-danger'}>
                    {game.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Wagered:</span>
                  <span className="text-tarkov-accent">₽{formatCurrency(game.wagered)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Profit:</span>
                  <span className={game.profit >= 0 ? 'text-tarkov-success' : 'text-tarkov-danger'}>
                    {game.profit >= 0 ? '+' : ''}₽{formatCurrency(game.profit)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Win Streaks */}
      <motion.div
        className="bg-tarkov-dark rounded-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <h3 className="text-xl font-tarkov font-bold text-white mb-6">Win Streaks</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-tarkov-secondary rounded-lg p-4 text-center">
            <div className={`text-3xl font-bold mb-2 ${
              statistics.winStreaks.current > 0 ? 'text-tarkov-success' : 
              statistics.winStreaks.current < 0 ? 'text-tarkov-danger' : 'text-gray-400'
            }`}>
              {statistics.winStreaks.current > 0 ? '+' : ''}{statistics.winStreaks.current}
            </div>
            <div className="text-sm text-gray-400">Current Streak</div>
          </div>
          
          <div className="bg-tarkov-secondary rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-tarkov-success mb-2">
              {statistics.winStreaks.longest}
            </div>
            <div className="text-sm text-gray-400">Longest Win Streak</div>
          </div>
          
          <div className="bg-tarkov-secondary rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-tarkov-danger mb-2">
              {statistics.winStreaks.longestLoss}
            </div>
            <div className="text-sm text-gray-400">Longest Loss Streak</div>
          </div>
        </div>
      </motion.div>

      {/* Win/Loss Pattern Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <WinLossPattern gameHistory={gameHistory || []} maxResults={100} />
      </motion.div>
    </div>
  )
}

export default StatisticsDashboard