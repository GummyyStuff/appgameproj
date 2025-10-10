/**
 * Real-time Game Service (Appwrite Version)
 * Handles real-time game state synchronization and updates
 * NOTE: Migrated from Supabase to Appwrite Realtime
 */

export interface GameStateUpdate {
  userId: string
  gameType: 'roulette' | 'blackjack'
  gameId?: string
  status: 'betting' | 'playing' | 'completed'
  data?: any
  timestamp: number
}

export interface GameRoomState {
  activeGames: number
  recentWins: Array<{
    username: string
    amount: number
    gameType: string
    timestamp: number
  }>
  onlineUsers: number
}

export class RealtimeGameService {
  private static instance: RealtimeGameService
  private gameStateCallbacks: Map<string, (update: GameStateUpdate) => void> = new Map()
  private gameRoomCallbacks: Map<string, (state: GameRoomState) => void> = new Map()

  private constructor() {}

  static getInstance(): RealtimeGameService {
    if (!RealtimeGameService.instance) {
      RealtimeGameService.instance = new RealtimeGameService()
    }
    return RealtimeGameService.instance
  }

  /**
   * Subscribe to game-specific updates
   * NOTE: Appwrite Realtime subscriptions are handled in individual hooks
   * This service just maintains callback registry for compatibility
   */
  async subscribeToGame(
    gameType: 'roulette' | 'blackjack',
    userId: string,
    onUpdate: (update: GameStateUpdate) => void
  ) {
    const key = `${gameType}-${userId}`
    this.gameStateCallbacks.set(key, onUpdate)
    
    console.log(`Subscribed to ${gameType} updates for user ${userId}`)
    
    return () => {
      this.gameStateCallbacks.delete(key)
      console.log(`Unsubscribed from ${gameType} updates for user ${userId}`)
    }
  }

  /**
   * Subscribe to game room updates (global game feed)
   * NOTE: Now handled by Appwrite Realtime in components
   */
  async subscribeToGameRoom(
    gameType: 'roulette' | 'blackjack',
    onUpdate: (state: GameRoomState) => void
  ) {
    const key = `room-${gameType}`
    this.gameRoomCallbacks.set(key, onUpdate)
    
    console.log(`Subscribed to ${gameType} room updates`)
    
    return () => {
      this.gameRoomCallbacks.delete(key)
      console.log(`Unsubscribed from ${gameType} room updates`)
    }
  }

  /**
   * Broadcast a game update
   * NOTE: No-op for Appwrite - updates propagate through database document changes
   */
  async broadcastGameUpdate(update: GameStateUpdate) {
    console.log('Game update (handled by Appwrite):', update.gameType)
  }

  /**
   * Broadcast a game room state update
   * NOTE: No-op for Appwrite - state updates handled through database
   */
  async broadcastGameRoomUpdate(gameType: string, state: GameRoomState) {
    console.log('Game room update (handled by Appwrite):', gameType)
  }

  /**
   * Unsubscribe all channels
   */
  async unsubscribeAll() {
    this.gameStateCallbacks.clear()
    this.gameRoomCallbacks.clear()
    console.log('Unsubscribed from all realtime channels')
  }
}

// Export singleton instance
export const realtimeGameService = RealtimeGameService.getInstance()
