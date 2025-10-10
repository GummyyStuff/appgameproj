/**
 * Real-time Game Service
 * Handles real-time game state updates
 * NOTE: Migrated to Appwrite - Supabase realtime removed
 */

import { GameResult } from './game-engine/types'
import { GameHistory, RouletteResult } from '../types/database'

export interface GameStateUpdate {
  userId: string
  gameType: 'roulette' | 'blackjack'
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
   * Handle blackjack game start
   */
  async handleBlackjackGameStart(userId: string, betAmount: number, gameId: string) {
    const update: GameStateUpdate = {
      userId,
      gameType: 'blackjack',
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
   * Handle blackjack action update
   */
  async handleBlackjackActionUpdate(userId: string, gameId: string, action: string, gameState: any) {
    const update: GameStateUpdate = {
      userId,
      gameType: 'blackjack',
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
   * Handle blackjack game completion
   */
  async handleBlackjackGameComplete(userId: string, gameId: string, result: GameResult) {
    const update: GameStateUpdate = {
      userId,
      gameType: 'blackjack',
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
        gameType: 'blackjack',
        gameId,
        status: 'completed',
        data: {
          winAmount: result.winAmount,
          gameType: 'blackjack'
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
   */
  async subscribeToGameHistory(userId: string, callback: (gameHistory: GameHistory) => void) {
    const channelName = `game-history-${userId}`
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_history',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as GameHistory)
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName)
    if (channel) {
      await supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  /**
   * Unsubscribe from all channels
   */
  async unsubscribeAll() {
    for (const [channelName, channel] of this.channels.entries()) {
      await supabase.removeChannel(channel)
    }
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