/**
 * Real-time Game Service
 * Handles real-time game state updates
 * NOTE: Migrated to Appwrite - Supabase realtime removed
 */

import { GameResult } from './game-engine/types'
import { GameHistory, RouletteResult } from '../types/database'

export interface GameStateUpdate {
  userId: string
  gameType: 'roulette' | 'stock_market' | 'case_opening'
  gameId?: string
  status: 'betting' | 'playing' | 'completed'
  data?: any
}

export interface RouletteStateUpdate extends GameStateUpdate {
  gameType: 'roulette'
  data?: {
    betAmount?: number
    betType?: string
    betValue?: number | string
    winningNumber?: number
    multiplier?: number
    winAmount?: number
    spinInProgress?: boolean
  }
}



export class RealtimeGameService {
  private static instance: RealtimeGameService
  private channels: Map<string, any> = new Map()

  private constructor() {}

  static getInstance(): RealtimeGameService {
    if (!RealtimeGameService.instance) {
      RealtimeGameService.instance = new RealtimeGameService()
    }
    return RealtimeGameService.instance
  }

  /**
   * Subscribe to game updates for a specific user
   * NOTE: Disabled for Appwrite migration - use Appwrite Realtime on client side
   */
  async subscribeToUserGames(userId: string, callback: (update: GameStateUpdate) => void) {
    const channelName = `user-games-${userId}`
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)
    }

    // Appwrite realtime is handled client-side, not server-side
    console.log(`Game subscription requested for user ${userId} - handled by Appwrite client`)
    return null
  }

  /**
   * Subscribe to global game events (for leaderboards, etc.)
   * NOTE: Disabled for Appwrite migration - use Appwrite Realtime on client side
   */
  async subscribeToGlobalGames(callback: (update: GameStateUpdate) => void) {
    console.log('Global game subscription requested - handled by Appwrite client')
    return null
  }

  /**
   * Broadcast game state update to user's channel
   * NOTE: Disabled for Appwrite - broadcasting handled by client-side Appwrite Realtime
   */
  async broadcastGameUpdate(update: GameStateUpdate) {
    // No-op: Appwrite Realtime subscriptions are client-side only
    // Game updates are reflected through database document updates
    console.log('Game update broadcast (no-op for Appwrite):', update.gameType)
  }

  /**
   * Broadcast global game event (big wins, etc.)
   * NOTE: Disabled for Appwrite - broadcasting handled by client-side Appwrite Realtime
   */
  async broadcastGlobalGameEvent(update: GameStateUpdate) {
    // No-op: Appwrite Realtime subscriptions are client-side only
    console.log('Global game event (no-op for Appwrite):', update.gameType)
  }

  /**
   * Handle roulette game start
   */
  async handleRouletteGameStart(userId: string, betAmount: number, betType: string, betValue: number | string) {
    const update: RouletteStateUpdate = {
      userId,
      gameType: 'roulette',
      status: 'betting',
      data: {
        betAmount,
        betType,
        betValue,
        spinInProgress: false
      }
    }

    await this.broadcastGameUpdate(update)
  }

  /**
   * Handle roulette spin start
   */
  async handleRouletteSpinStart(userId: string, gameId: string) {
    const update: RouletteStateUpdate = {
      userId,
      gameType: 'roulette',
      gameId,
      status: 'playing',
      data: {
        spinInProgress: true
      }
    }

    await this.broadcastGameUpdate(update)
  }

  /**
   * Handle roulette game completion
   */
  async handleRouletteGameComplete(userId: string, gameId: string, result: GameResult) {
    const rouletteResult = result.resultData as RouletteResult
    
    const update: RouletteStateUpdate = {
      userId,
      gameType: 'roulette',
      gameId,
      status: 'completed',
      data: {
        winningNumber: rouletteResult.winning_number,
        multiplier: rouletteResult.multiplier,
        winAmount: result.winAmount,
        spinInProgress: false
      }
    }

    await this.broadcastGameUpdate(update)

    // Broadcast big wins globally (wins over 1000)
    if (result.winAmount > 1000) {
      await this.broadcastGlobalGameEvent({
        userId,
        gameType: 'roulette',
        gameId,
        status: 'completed',
        data: {
          winAmount: result.winAmount,
          gameType: 'roulette'
        }
      })
    }
  }

  /**
   * Handle stock market game start (legacy method, kept for compatibility)
   */
  async handleBlackjackGameStart(userId: string, betAmount: number, gameId: string) {
    const update: GameStateUpdate = {
      userId,
      gameType: 'stock_market',
      gameId,
      status: 'betting',
      data: {
        betAmount,
        gameStarted: true
      }
    }

    await this.broadcastGameUpdate(update)
  }

  /**
   * Handle stock market action update (legacy method, kept for compatibility)
   */
  async handleBlackjackActionUpdate(userId: string, gameId: string, action: string, gameState: any) {
    const update: GameStateUpdate = {
      userId,
      gameType: 'stock_market',
      gameId,
      status: 'playing',
      data: {
        action,
        gameState
      }
    }

    await this.broadcastGameUpdate(update)
  }

  /**
   * Handle stock market game completion (legacy method, kept for compatibility)
   */
  async handleBlackjackGameComplete(userId: string, gameId: string, result: GameResult) {
    const update: GameStateUpdate = {
      userId,
      gameType: 'stock_market',
      gameId,
      status: 'completed',
      data: {
        result: result.resultData,
        winAmount: result.winAmount
      }
    }

    await this.broadcastGameUpdate(update)

    // Broadcast big wins globally (wins over 1000)
    if (result.winAmount > 1000) {
      await this.broadcastGlobalGameEvent({
        userId,
        gameType: 'stock_market',
        gameId,
        status: 'completed',
        data: {
          winAmount: result.winAmount,
          gameType: 'stock_market'
        }
      })
    }
  }



  /**
   * Handle balance updates
   */
  async handleBalanceUpdate(userId: string, newBalance: number, previousBalance: number) {
    const update: GameStateUpdate = {
      userId,
      gameType: 'roulette', // This could be made generic
      status: 'completed',
      data: {
        balanceUpdate: {
          newBalance,
          previousBalance,
          change: newBalance - previousBalance
        }
      }
    }

    await this.broadcastGameUpdate(update)
  }

  /**
   * Subscribe to database changes for game history
   * NOTE: Disabled for Appwrite migration - use Appwrite Realtime on client side
   */
  async subscribeToGameHistory(userId: string, callback: (gameHistory: GameHistory) => void) {
    const channelName = `game-history-${userId}`
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)
    }

    // Appwrite realtime is handled client-side, not server-side
    console.log(`Game history subscription requested for user ${userId} - handled by Appwrite client`)
    return null
  }

  /**
   * Unsubscribe from a channel
   * NOTE: Disabled for Appwrite migration
   */
  async unsubscribe(channelName: string) {
    // No-op: Appwrite Realtime subscriptions are client-side only
    this.channels.delete(channelName)
  }

  /**
   * Unsubscribe from all channels
   * NOTE: Disabled for Appwrite migration
   */
  async unsubscribeAll() {
    // No-op: Appwrite Realtime subscriptions are client-side only
    this.channels.clear()
  }

  /**
   * Get active channel count
   */
  getActiveChannelCount(): number {
    return this.channels.size
  }

  /**
   * Get channel names
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys())
  }
}

// Export singleton instance
export const realtimeGameService = RealtimeGameService.getInstance()