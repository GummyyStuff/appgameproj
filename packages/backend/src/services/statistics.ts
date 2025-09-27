/**
 * Statistics service for game history and analytics
 * Provides comprehensive statistics calculation and data visualization preparation
 */

import { supabaseAdmin } from '../config/supabase'
import { DatabaseService } from './database'
import {
  GameHistory,
  UserStatistics,
  GameHistoryResponse,
  TABLE_NAMES,
  RPC_FUNCTIONS
} from '../types/database'

export interface GameStatistics {
  totalGames: number
  totalWagered: number
  totalWon: number
  netProfit: number
  winRate: number
  biggestWin: number
  biggestLoss: number
  averageBet: number
  averageWin: number
  profitMargin: number
}

export interface TimeSeriesData {
  date: string
  games: number
  wagered: number
  won: number
  profit: number
}

export interface GameTypeBreakdown {
  gameType: string
  statistics: GameStatistics
  recentTrend: 'up' | 'down' | 'stable'
  popularityRank: number
}

export interface StatisticsFilters {
  gameType?: string
  dateFrom?: string
  dateTo?: string
  minBet?: number
  maxBet?: number
  winOnly?: boolean
  lossOnly?: boolean
}

export interface AdvancedStatistics {
  overview: GameStatistics
  gameBreakdown: GameTypeBreakdown[]
  timeSeriesData: TimeSeriesData[]
  winStreaks: {
    current: number
    longest: number
    longestLoss: number
  }
  betPatterns: {
    mostCommonBet: number
    betDistribution: { range: string; count: number; percentage: number }[]
  }
  playingHabits: {
    mostActiveHour: number
    mostActiveDay: string
    averageSessionLength: number
    totalPlayTime: number
  }
}

export class StatisticsService {
  /**
   * Get comprehensive user statistics with data visualization preparation
   */
  static async getAdvancedStatistics(
    userId: string,
    filters: StatisticsFilters = {}
  ): Promise<AdvancedStatistics> {
    const gameHistory = await this.getFilteredGameHistory(userId, filters)
    
    if (gameHistory.length === 0) {
      return this.getEmptyStatistics()
    }

    const overview = this.calculateOverviewStatistics(gameHistory)
    const gameBreakdown = this.calculateGameTypeBreakdown(gameHistory)
    const timeSeriesData = this.calculateTimeSeriesData(gameHistory)
    const winStreaks = this.calculateWinStreaks(gameHistory)
    const betPatterns = this.calculateBetPatterns(gameHistory)
    const playingHabits = this.calculatePlayingHabits(gameHistory)

    return {
      overview,
      gameBreakdown,
      timeSeriesData,
      winStreaks,
      betPatterns,
      playingHabits
    }
  }

  /**
   * Get filtered game history based on criteria
   */
  static async getFilteredGameHistory(
    userId: string,
    filters: StatisticsFilters
  ): Promise<GameHistory[]> {
    let query = supabaseAdmin
      .from(TABLE_NAMES.GAME_HISTORY)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters.gameType) {
      query = query.eq('game_type', filters.gameType)
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    if (filters.minBet) {
      query = query.gte('bet_amount', filters.minBet)
    }

    if (filters.maxBet) {
      query = query.lte('bet_amount', filters.maxBet)
    }

    if (filters.winOnly) {
      query = query.gt('win_amount', 0)
    }

    if (filters.lossOnly) {
      query = query.eq('win_amount', 0)
    }

    const { data, error } = await query.limit(1000) // Reasonable limit for statistics

    if (error) {
      console.error('Error fetching filtered game history:', error)
      throw new Error('Failed to fetch game history')
    }

    return data || []
  }

  /**
   * Calculate overview statistics
   */
  static calculateOverviewStatistics(games: GameHistory[]): GameStatistics {
    if (games.length === 0) {
      return this.getEmptyGameStatistics()
    }

    const totalGames = games.length
    const totalWagered = games.reduce((sum, game) => sum + game.bet_amount, 0)
    const totalWon = games.reduce((sum, game) => sum + game.win_amount, 0)
    const netProfit = totalWon - totalWagered
    const wins = games.filter(game => game.win_amount > game.bet_amount).length
    const winRate = (wins / totalGames) * 100
    const biggestWin = Math.max(...games.map(game => game.win_amount))
    const biggestLoss = Math.max(...games.map(game => game.bet_amount - game.win_amount))
    const averageBet = totalWagered / totalGames
    const averageWin = totalWon / totalGames
    const profitMargin = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0

    return {
      totalGames,
      totalWagered,
      totalWon,
      netProfit,
      winRate,
      biggestWin,
      biggestLoss,
      averageBet,
      averageWin,
      profitMargin
    }
  }

  /**
   * Calculate game type breakdown with trends
   */
  static calculateGameTypeBreakdown(games: GameHistory[]): GameTypeBreakdown[] {
    const gameTypes = ['roulette', 'blackjack', 'case_opening'] as const
    const breakdown: GameTypeBreakdown[] = []

    gameTypes.forEach((gameType, index) => {
      const gameTypeGames = games.filter(game => game.game_type === gameType)
      const statistics = this.calculateOverviewStatistics(gameTypeGames)
      
      // Calculate recent trend (last 10 games vs previous 10)
      const recentGames = gameTypeGames.slice(0, 10)
      const previousGames = gameTypeGames.slice(10, 20)
      const recentProfit = recentGames.reduce((sum, game) => sum + (game.win_amount - game.bet_amount), 0)
      const previousProfit = previousGames.reduce((sum, game) => sum + (game.win_amount - game.bet_amount), 0)
      
      let recentTrend: 'up' | 'down' | 'stable' = 'stable'
      if (recentProfit > previousProfit * 1.1) recentTrend = 'up'
      else if (recentProfit < previousProfit * 0.9) recentTrend = 'down'

      breakdown.push({
        gameType,
        statistics,
        recentTrend,
        popularityRank: index + 1 // Simple ranking for now
      })
    })

    // Sort by total games played for actual popularity ranking
    breakdown.sort((a, b) => b.statistics.totalGames - a.statistics.totalGames)
    breakdown.forEach((item, index) => {
      item.popularityRank = index + 1
    })

    return breakdown
  }

  /**
   * Calculate time series data for charts
   */
  static calculateTimeSeriesData(games: GameHistory[]): TimeSeriesData[] {
    const dailyData = new Map<string, TimeSeriesData>()

    games.forEach(game => {
      const date = new Date(game.created_at).toISOString().split('T')[0]
      
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          games: 0,
          wagered: 0,
          won: 0,
          profit: 0
        })
      }

      const dayData = dailyData.get(date)!
      dayData.games += 1
      dayData.wagered += game.bet_amount
      dayData.won += game.win_amount
      dayData.profit += (game.win_amount - game.bet_amount)
    })

    return Array.from(dailyData.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30) // Last 30 days
  }

  /**
   * Calculate win/loss streaks
   */
  static calculateWinStreaks(games: GameHistory[]) {
    let currentStreak = 0
    let longestWinStreak = 0
    let longestLossStreak = 0
    let tempWinStreak = 0
    let tempLossStreak = 0

    // Sort games by date (oldest first) for streak calculation
    const sortedGames = [...games].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    sortedGames.forEach(game => {
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
    for (let i = 0; i < Math.min(games.length, 10); i++) {
      const game = games[i]
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
      current: currentStreak,
      longest: longestWinStreak,
      longestLoss: longestLossStreak
    }
  }

  /**
   * Calculate betting patterns
   */
  static calculateBetPatterns(games: GameHistory[]) {
    const betAmounts = games.map(game => game.bet_amount)
    const betCounts = new Map<number, number>()

    betAmounts.forEach(amount => {
      betCounts.set(amount, (betCounts.get(amount) || 0) + 1)
    })

    const mostCommonBet = Array.from(betCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 0

    // Create bet distribution ranges
    const ranges = [
      { min: 0, max: 10, label: '1-10' },
      { min: 11, max: 50, label: '11-50' },
      { min: 51, max: 100, label: '51-100' },
      { min: 101, max: 500, label: '101-500' },
      { min: 501, max: 1000, label: '501-1000' },
      { min: 1001, max: Infinity, label: '1000+' }
    ]

    const betDistribution = ranges.map(range => {
      const count = betAmounts.filter(amount => 
        amount >= range.min && amount <= range.max
      ).length
      const percentage = games.length > 0 ? (count / games.length) * 100 : 0

      return {
        range: range.label,
        count,
        percentage: Math.round(percentage * 100) / 100
      }
    }).filter(item => item.count > 0)

    return {
      mostCommonBet,
      betDistribution
    }
  }

  /**
   * Calculate playing habits and patterns
   */
  static calculatePlayingHabits(games: GameHistory[]) {
    const hours = games.map(game => new Date(game.created_at).getHours())
    const days = games.map(game => new Date(game.created_at).toLocaleDateString('en-US', { weekday: 'long' }))
    
    // Most active hour
    const hourCounts = new Map<number, number>()
    hours.forEach(hour => {
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
    })
    const mostActiveHour = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 0

    // Most active day
    const dayCounts = new Map<string, number>()
    days.forEach(day => {
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1)
    })
    const mostActiveDay = Array.from(dayCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Monday'

    // Calculate session data (games within 1 hour of each other are considered same session)
    const sessions = this.calculateSessions(games)
    const averageSessionLength = sessions.length > 0 
      ? sessions.reduce((sum, session) => sum + session.duration, 0) / sessions.length 
      : 0
    const totalPlayTime = sessions.reduce((sum, session) => sum + session.duration, 0)

    return {
      mostActiveHour,
      mostActiveDay,
      averageSessionLength: Math.round(averageSessionLength),
      totalPlayTime: Math.round(totalPlayTime)
    }
  }

  /**
   * Calculate gaming sessions
   */
  static calculateSessions(games: GameHistory[]) {
    if (games.length === 0) return []

    const sortedGames = [...games].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const sessions: { start: Date; end: Date; games: number; duration: number }[] = []
    let currentSession = {
      start: new Date(sortedGames[0].created_at),
      end: new Date(sortedGames[0].created_at),
      games: 1
    }

    for (let i = 1; i < sortedGames.length; i++) {
      const gameTime = new Date(sortedGames[i].created_at)
      const timeDiff = gameTime.getTime() - currentSession.end.getTime()
      
      // If more than 1 hour gap, start new session
      if (timeDiff > 60 * 60 * 1000) {
        sessions.push({
          ...currentSession,
          duration: (currentSession.end.getTime() - currentSession.start.getTime()) / (1000 * 60) // minutes
        })
        
        currentSession = {
          start: gameTime,
          end: gameTime,
          games: 1
        }
      } else {
        currentSession.end = gameTime
        currentSession.games += 1
      }
    }

    // Add the last session
    sessions.push({
      ...currentSession,
      duration: (currentSession.end.getTime() - currentSession.start.getTime()) / (1000 * 60) // minutes
    })

    return sessions
  }

  /**
   * Get leaderboard with enhanced statistics
   */
  static async getLeaderboard(
    metric: 'balance' | 'total_won' | 'games_played' | 'total_wagered' = 'balance',
    limit: number = 10
  ) {
    const { data, error } = await supabaseAdmin
      .rpc(RPC_FUNCTIONS.GET_LEADERBOARD, {
        metric_param: metric,
        limit_param: limit
      })

    if (error) {
      console.error('Error fetching leaderboard:', error)
      throw new Error('Failed to fetch leaderboard')
    }

    return data
  }

  /**
   * Get global game statistics for admin/analytics
   */
  static async getGlobalStatistics(days: number = 30) {
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabaseAdmin
      .from(TABLE_NAMES.GAME_HISTORY)
      .select('game_type, bet_amount, win_amount, created_at')
      .gte('created_at', dateFrom)

    if (error) {
      console.error('Error fetching global statistics:', error)
      throw new Error('Failed to fetch global statistics')
    }

    const games = data || []
    const overview = this.calculateOverviewStatistics(games)
    const gameBreakdown = this.calculateGameTypeBreakdown(games)
    const timeSeriesData = this.calculateTimeSeriesData(games)

    return {
      overview,
      gameBreakdown,
      timeSeriesData,
      totalUsers: await this.getTotalActiveUsers(),
      period: `${days} days`
    }
  }

  /**
   * Get total active users count
   */
  static async getTotalActiveUsers(): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from(TABLE_NAMES.USER_PROFILES)
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if (error) {
      console.error('Error counting active users:', error)
      return 0
    }

    return count || 0
  }

  /**
   * Helper methods
   */
  static getEmptyStatistics(): AdvancedStatistics {
    return {
      overview: this.getEmptyGameStatistics(),
      gameBreakdown: [],
      timeSeriesData: [],
      winStreaks: { current: 0, longest: 0, longestLoss: 0 },
      betPatterns: { mostCommonBet: 0, betDistribution: [] },
      playingHabits: { mostActiveHour: 0, mostActiveDay: 'Monday', averageSessionLength: 0, totalPlayTime: 0 }
    }
  }

  static getEmptyGameStatistics(): GameStatistics {
    return {
      totalGames: 0,
      totalWagered: 0,
      totalWon: 0,
      netProfit: 0,
      winRate: 0,
      biggestWin: 0,
      biggestLoss: 0,
      averageBet: 0,
      averageWin: 0,
      profitMargin: 0
    }
  }
}