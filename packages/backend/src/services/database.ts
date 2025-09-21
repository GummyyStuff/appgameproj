/**
 * Database service layer for Tarkov Casino Website
 * Provides high-level database operations using Supabase RPC functions
 */

import { supabaseAdmin } from '../config/supabase'
import { supabaseRealtimeService } from './realtime-supabase'
import {
  UserProfile,
  GameHistory,
  GameTransactionResult,
  DailyBonusResult,
  UserStatistics,
  GameHistoryResponse,
  GameResultData,
  RPC_FUNCTIONS,
  TABLE_NAMES,
  isValidGameType,
  isValidBetAmount
} from '../types/database'

export class DatabaseService {
  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE_NAMES.USER_PROFILES)
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  }

  /**
   * Get user balance using RPC function
   */
  static async getUserBalance(userId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .rpc(RPC_FUNCTIONS.GET_USER_BALANCE, { user_uuid: userId })

    if (error) {
      console.error('Error fetching user balance:', error)
      throw new Error('Failed to fetch user balance')
    }

    return data || 0
  }

  /**
   * Process a game transaction (bet and win in single atomic operation)
   */
  static async processGameTransaction(
    userId: string,
    gameType: string,
    betAmount: number,
    winAmount: number,
    resultData: GameResultData,
    gameDuration?: number
  ): Promise<GameTransactionResult> {
    // Validate inputs
    if (!isValidGameType(gameType)) {
      throw new Error(`Invalid game type: ${gameType}`)
    }

    if (!isValidBetAmount(betAmount)) {
      throw new Error(`Invalid bet amount: ${betAmount}`)
    }

    if (winAmount < 0) {
      throw new Error(`Invalid win amount: ${winAmount}`)
    }

    const { data, error } = await supabaseAdmin
      .rpc(RPC_FUNCTIONS.PROCESS_GAME_TRANSACTION, {
        user_uuid: userId,
        game_type_param: gameType,
        bet_amount_param: betAmount,
        win_amount_param: winAmount,
        result_data_param: resultData,
        game_duration_param: gameDuration
      })

    if (error) {
      console.error('Error processing game transaction:', error)
      throw new Error(error.message || 'Failed to process game transaction')
    }

    // Broadcast real-time updates via Supabase Realtime
    // The database triggers will handle the actual broadcasting
    // This ensures consistency between database state and real-time updates

    return data
  }

  /**
   * Claim daily bonus for user
   */
  static async claimDailyBonus(userId: string): Promise<DailyBonusResult> {
    const { data, error } = await supabaseAdmin
      .rpc(RPC_FUNCTIONS.CLAIM_DAILY_BONUS, { user_uuid: userId })

    if (error) {
      console.error('Error claiming daily bonus:', error)
      throw new Error(error.message || 'Failed to claim daily bonus')
    }

    // The database trigger will handle real-time notification for daily bonus
    return data
  }

  /**
   * Get comprehensive user statistics
   */
  static async getUserStatistics(userId: string): Promise<UserStatistics> {
    const { data, error } = await supabaseAdmin
      .rpc(RPC_FUNCTIONS.GET_USER_STATISTICS, { user_uuid: userId })

    if (error) {
      console.error('Error fetching user statistics:', error)
      throw new Error(error.message || 'Failed to fetch user statistics')
    }

    return data
  }

  /**
   * Get paginated game history for user
   */
  static async getGameHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    gameTypeFilter?: string
  ): Promise<GameHistoryResponse> {
    // Validate game type filter if provided
    if (gameTypeFilter && !isValidGameType(gameTypeFilter)) {
      throw new Error(`Invalid game type filter: ${gameTypeFilter}`)
    }

    const { data, error } = await supabaseAdmin
      .rpc(RPC_FUNCTIONS.GET_GAME_HISTORY, {
        user_uuid: userId,
        limit_param: limit,
        offset_param: offset,
        game_type_filter: gameTypeFilter || null
      })

    if (error) {
      console.error('Error fetching game history:', error)
      throw new Error(error.message || 'Failed to fetch game history')
    }

    return data
  }

  /**
   * Get recent games for user (convenience method)
   */
  static async getRecentGames(userId: string, limit: number = 10): Promise<GameHistory[]> {
    const history = await this.getGameHistory(userId, limit, 0)
    return history.games
  }

  /**
   * Update user profile (non-balance fields)
   */
  static async updateUserProfile(
    userId: string,
    updates: Partial<Pick<UserProfile, 'username' | 'display_name'>>
  ): Promise<UserProfile | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLE_NAMES.USER_PROFILES)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      throw new Error(error.message || 'Failed to update user profile')
    }

    return data
  }

  /**
   * Check if username is available
   */
  static async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    let query = supabaseAdmin
      .from(TABLE_NAMES.USER_PROFILES)
      .select('id')
      .eq('username', username)

    if (excludeUserId) {
      query = query.neq('id', excludeUserId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error checking username availability:', error)
      return false
    }

    return data.length === 0
  }

  /**
   * Get leaderboard data (top players by various metrics)
   */
  static async getLeaderboard(
    metric: 'balance' | 'total_won' | 'games_played' = 'balance',
    limit: number = 10
  ): Promise<Partial<UserProfile>[]> {
    const { data, error } = await supabaseAdmin
      .from(TABLE_NAMES.USER_PROFILES)
      .select('username, display_name, balance, total_won, games_played')
      .eq('is_active', true)
      .order(metric, { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching leaderboard:', error)
      throw new Error(error.message || 'Failed to fetch leaderboard')
    }

    return data
  }

  /**
   * Get game statistics across all users (for admin/analytics)
   */
  static async getGlobalGameStats(): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from(TABLE_NAMES.GAME_HISTORY)
      .select(`
        game_type,
        bet_amount,
        win_amount,
        created_at
      `)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

    if (error) {
      console.error('Error fetching global game stats:', error)
      throw new Error(error.message || 'Failed to fetch global game stats')
    }

    // Process the data to create statistics
    const stats = data.reduce((acc, game) => {
      const { game_type, bet_amount, win_amount } = game
      
      if (!acc[game_type]) {
        acc[game_type] = {
          total_games: 0,
          total_wagered: 0,
          total_won: 0,
          house_edge: 0
        }
      }

      acc[game_type].total_games += 1
      acc[game_type].total_wagered += bet_amount
      acc[game_type].total_won += win_amount

      return acc
    }, {} as any)

    // Calculate house edge for each game type
    Object.keys(stats).forEach(gameType => {
      const gameStats = stats[gameType]
      gameStats.house_edge = ((gameStats.total_wagered - gameStats.total_won) / gameStats.total_wagered) * 100
    })

    return stats
  }
}