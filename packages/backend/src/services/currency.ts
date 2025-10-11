/**
 * Currency Service for Tarkov Casino Website - DEPRECATED
 * 
 * ⚠️ WARNING: This file is DEPRECATED and should not be used in new code.
 * Please use currency-new.ts instead, which uses Appwrite.
 * 
 * This file is kept for reference only and imports non-existent modules.
 * All production code has been migrated to currency-new.ts
 */

// DEPRECATED: These imports reference old Supabase-based services
// import { DatabaseService } from './database'  // Does not exist
// import { supabaseAdmin } from '../config/supabase'  // Deprecated
import { env } from '../config/env'

export interface CurrencyTransaction {
  userId: string
  amount: number
  type: 'debit' | 'credit'
  reason: string
  metadata?: any
}

export interface BalanceValidationResult {
  isValid: boolean
  currentBalance: number
  requiredAmount: number
  shortfall?: number
}

export interface DailyBonusStatus {
  canClaim: boolean
  bonusAmount: number
  lastClaimedDate?: string
  nextAvailableDate?: string
  cooldownHours?: number
}

export class CurrencyService {
  private static readonly DAILY_BONUS_AMOUNT = parseInt(env.DAILY_BONUS)
  private static readonly STARTING_BALANCE = parseInt(env.STARTING_BALANCE)

  /**
   * Get user's current balance
   */
  static async getBalance(userId: string): Promise<number> {
    try {
      return await DatabaseService.getUserBalance(userId)
    } catch (error) {
      console.error('Error getting user balance:', error)
      throw new Error('Failed to retrieve balance')
    }
  }

  /**
   * Validate if user has sufficient balance for a transaction
   */
  static async validateBalance(userId: string, requiredAmount: number): Promise<BalanceValidationResult> {
    if (requiredAmount <= 0) {
      throw new Error('Required amount must be positive')
    }

    const currentBalance = await this.getBalance(userId)
    const isValid = currentBalance >= requiredAmount
    
    return {
      isValid,
      currentBalance,
      requiredAmount,
      shortfall: isValid ? undefined : requiredAmount - currentBalance
    }
  }

  /**
   * Process a game transaction atomically (deduct bet, add winnings)
   */
  static async processGameTransaction(
    userId: string,
    gameType: string,
    betAmount: number,
    winAmount: number,
    gameResultData: any,
    gameDuration?: number
  ) {
    // Validate bet amount
    if (betAmount <= 0) {
      throw new Error('Bet amount must be positive')
    }

    if (winAmount < 0) {
      throw new Error('Win amount cannot be negative')
    }

    // Validate balance before processing
    const balanceCheck = await this.validateBalance(userId, betAmount)
    if (!balanceCheck.isValid) {
      throw new Error(`Insufficient balance. Required: ${betAmount}, Available: ${balanceCheck.currentBalance}`)
    }

    try {
      const result = await DatabaseService.processGameTransaction(
        userId,
        gameType,
        betAmount,
        winAmount,
        gameResultData,
        gameDuration
      )

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed')
      }

      return {
        success: true,
        gameId: result.game_id,
        previousBalance: result.previous_balance,
        newBalance: result.new_balance,
        betAmount: result.bet_amount,
        winAmount: result.win_amount,
        netResult: result.win_amount - result.bet_amount
      }
    } catch (error) {
      console.error('Error processing game transaction:', error)
      throw new Error('Failed to process game transaction')
    }
  }

  /**
   * Process case opening as a single atomic transaction
   */
  static async processCaseOpening(userId: string, casePrice: number, winAmount: number, caseData: any) {
    if (casePrice <= 0) {
      throw new Error('Case price must be positive')
    }

    if (winAmount < 0) {
      throw new Error('Win amount cannot be negative')
    }

    // Validate balance before processing
    const balanceCheck = await this.validateBalance(userId, casePrice)
    if (!balanceCheck.isValid) {
      throw new Error(`Insufficient balance. Required: ${casePrice}, Available: ${balanceCheck.currentBalance}`)
    }

    try {
      const result = await DatabaseService.processGameTransaction(
        userId,
        'case_opening',
        casePrice, // bet amount (deducted)
        winAmount, // winnings credited
        {
          ...caseData,
          transaction_type: 'case_opening_complete',
          timestamp: new Date().toISOString()
        }
      )

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed')
      }

      return {
        success: true,
        gameId: result.game_id,
        previousBalance: result.previous_balance,
        newBalance: result.new_balance,
        betAmount: result.bet_amount,
        winAmount: result.win_amount,
        netResult: result.win_amount - result.bet_amount
      }
    } catch (error) {
      console.error('Error processing case opening:', error)
      throw new Error('Failed to process case opening')
    }
  }

  /**
   * Get daily bonus status for user
   */
  static async getDailyBonusStatus(userId: string): Promise<DailyBonusStatus> {
    try {
      const profile = await DatabaseService.getUserProfile(userId)
      if (!profile) {
        throw new Error('User profile not found')
      }

      const today = new Date()
      const todayDateString = today.toDateString()
      
      let canClaim = true
      let lastClaimedDate: string | undefined
      let nextAvailableDate: string | undefined
      let cooldownHours: number | undefined

      if (profile.last_daily_bonus) {
        const lastBonusDate = new Date(profile.last_daily_bonus)
        const lastBonusDateString = lastBonusDate.toDateString()
        
        if (lastBonusDateString === todayDateString) {
          canClaim = false
          lastClaimedDate = lastBonusDate.toISOString()
          
          // Calculate next available date (tomorrow)
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          tomorrow.setHours(0, 0, 0, 0)
          nextAvailableDate = tomorrow.toISOString()
          
          // Calculate cooldown hours
          const hoursUntilTomorrow = Math.ceil((tomorrow.getTime() - today.getTime()) / (1000 * 60 * 60))
          cooldownHours = hoursUntilTomorrow
        } else {
          lastClaimedDate = lastBonusDate.toISOString()
        }
      }

      return {
        canClaim,
        bonusAmount: this.DAILY_BONUS_AMOUNT,
        lastClaimedDate,
        nextAvailableDate,
        cooldownHours
      }
    } catch (error) {
      console.error('Error getting daily bonus status:', error)
      throw new Error('Failed to get daily bonus status')
    }
  }

  /**
   * Claim daily bonus for user
   */
  static async claimDailyBonus(userId: string) {
    try {
      // Check if user can claim bonus
      const bonusStatus = await this.getDailyBonusStatus(userId)
      if (!bonusStatus.canClaim) {
        throw new Error(`Daily bonus already claimed. Next bonus available: ${bonusStatus.nextAvailableDate}`)
      }

      const result = await DatabaseService.claimDailyBonus(userId)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to claim daily bonus')
      }

      return {
        success: true,
        bonusAmount: result.bonus_amount,
        previousBalance: result.previous_balance,
        newBalance: result.new_balance,
        nextBonusAvailable: result.next_bonus_available
      }
    } catch (error) {
      console.error('Error claiming daily bonus:', error)
      throw error // Re-throw to preserve the specific error message
    }
  }

  /**
   * Add currency to user balance (admin function)
   */
  static async addCurrency(userId: string, amount: number, reason: string = 'Admin credit') {
    if (amount <= 0) {
      throw new Error('Amount must be positive')
    }

    try {
      // Use the game transaction function with 0 bet and the amount as winnings
      const result = await this.processGameTransaction(
        userId,
        'admin', // Special game type for admin transactions
        0, // No bet
        amount, // Win amount
        { reason, timestamp: new Date().toISOString() }
      )

      return {
        success: true,
        amount,
        newBalance: result.newBalance,
        reason
      }
    } catch (error) {
      console.error('Error adding currency:', error)
      throw new Error('Failed to add currency')
    }
  }

  /**
   * Deduct currency from user balance (admin function)
   */
  static async deductCurrency(userId: string, amount: number, reason: string = 'Admin debit') {
    if (amount <= 0) {
      throw new Error('Amount must be positive')
    }

    // Validate balance
    const balanceCheck = await this.validateBalance(userId, amount)
    if (!balanceCheck.isValid) {
      throw new Error(`Insufficient balance. Required: ${amount}, Available: ${balanceCheck.currentBalance}`)
    }

    try {
      // Use the game transaction function with the amount as bet and 0 winnings
      const result = await this.processGameTransaction(
        userId,
        'admin', // Special game type for admin transactions
        amount, // Bet amount (deducted)
        0, // No winnings
        { reason, timestamp: new Date().toISOString() }
      )

      return {
        success: true,
        amount,
        newBalance: result.newBalance,
        reason
      }
    } catch (error) {
      console.error('Error deducting currency:', error)
      throw new Error('Failed to deduct currency')
    }
  }

  /**
   * Get currency transaction history for user
   */
  static async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    gameTypeFilter?: string
  ) {
    try {
      const history = await DatabaseService.getGameHistory(userId, limit, offset, gameTypeFilter)
      
      if (!(history as any).success) {
        throw new Error('Failed to fetch transaction history')
      }

      // Transform the data to focus on currency aspects
      const transactions = history.games.map((game: any) => ({
        id: game.id,
        type: game.game_type,
        betAmount: game.bet_amount,
        winAmount: game.win_amount,
        netResult: game.net_result,
        balance: game.balance_after, // This would need to be added to the RPC function
        timestamp: game.created_at,
        gameData: game.result_data
      }))

      return {
        success: true,
        transactions,
        pagination: {
          total: history.total_count,
          limit: history.limit,
          offset: history.offset,
          hasMore: history.has_more
        }
      }
    } catch (error) {
      console.error('Error getting transaction history:', error)
      throw new Error('Failed to get transaction history')
    }
  }

  /**
   * Get currency statistics for user
   */
  static async getCurrencyStats(userId: string) {
    try {
      const stats = await DatabaseService.getUserStatistics(userId)
      
      if (!(stats as any).success) {
        throw new Error('Failed to fetch currency statistics')
      }

      return {
        currentBalance: stats.balance,
        totalWagered: stats.total_wagered,
        totalWon: stats.total_won,
        netProfit: stats.net_profit,
        gamesPlayed: stats.games_played,
        dailyBonusStatus: await this.getDailyBonusStatus(userId),
        gameBreakdown: stats.game_statistics
      }
    } catch (error) {
      console.error('Error getting currency stats:', error)
      throw new Error('Failed to get currency statistics')
    }
  }

  /**
   * Format currency amount for display (Tarkov themed)
   */
  static formatCurrency(amount: number, currency: 'roubles' | 'dollars' | 'euros' = 'roubles'): string {
    const symbols = {
      roubles: '₽',
      dollars: '$',
      euros: '€'
    }

    const symbol = symbols[currency]
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)

    return `${symbol}${formatted}`
  }

  /**
   * Get starting balance for new users
   */
  static getStartingBalance(): number {
    return this.STARTING_BALANCE
  }

  /**
   * Get daily bonus amount
   */
  static getDailyBonusAmount(): number {
    return this.DAILY_BONUS_AMOUNT
  }
}