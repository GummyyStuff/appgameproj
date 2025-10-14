/**
 * Real-time Game Service (Appwrite Version)
 * Handles real-time game state synchronization and updates
 * NOTE: Migrated from Supabase to Appwrite Realtime
 * 
 * Uses Appwrite Client.subscribe() for Web/JavaScript
 * See: https://appwrite.io/docs/apis/realtime
 */

import { appwriteClient } from '../lib/appwrite'

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID!

export interface GameStateUpdate {
  userId: string
  gameType: 'roulette' | 'blackjack' | 'stock_market' | 'case_opening'
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
  private unsubscribeFunctions: Map<string, () => void> = new Map()
  private isConnected: boolean = false

  private constructor() {}

  static getInstance(): RealtimeGameService {
    if (!RealtimeGameService.instance) {
      RealtimeGameService.instance = new RealtimeGameService()
    }
    return RealtimeGameService.instance
  }

  /**
   * Subscribe to game-specific updates using Appwrite Realtime
   * Uses client.subscribe() for Web/JavaScript
   */
  async subscribeToGame(
    gameType: 'roulette' | 'blackjack' | 'stock_market' | 'case_opening',
    userId: string,
    onUpdate: (update: GameStateUpdate) => void
  ) {
    const key = `${gameType}-${userId}`
    
    // Store callback
    this.gameStateCallbacks.set(key, onUpdate)
    
    try {
      // Subscribe to user-specific game updates using client.subscribe()
      const unsubscribe = appwriteClient.subscribe(
        `databases.${DATABASE_ID}.collections.game_updates.documents`,
        (response: any) => {
          if (
            response.events.includes('databases.*.collections.*.documents.*.update') ||
            response.events.includes('databases.*.collections.*.documents.*.create')
          ) {
            const update = response.payload as GameStateUpdate
            // Only trigger callback if this update is for the current user and game type
            if (update.userId === userId && update.gameType === gameType) {
              onUpdate(update)
            }
          }
        }
      )
      
      this.unsubscribeFunctions.set(key, unsubscribe)
      this.isConnected = true
      
      console.log(`✅ Subscribed to ${gameType} updates for user ${userId}`)
      
      return () => {
        this.unsubscribe(key)
      }
    } catch (error) {
      console.error(`❌ Failed to subscribe to ${gameType} updates:`, error)
      this.gameStateCallbacks.delete(key)
      throw error
    }
  }

  /**
   * Unsubscribe from game-specific updates
   */
  async unsubscribeFromGame(
    gameType: 'roulette' | 'blackjack' | 'stock_market' | 'case_opening',
    userId: string
  ) {
    const key = `${gameType}-${userId}`
    this.unsubscribe(key)
  }

  /**
   * Subscribe to game room updates (global game feed) using Appwrite Realtime
   * Uses client.subscribe() for Web/JavaScript
   */
  async subscribeToGameRoom(
    gameType: 'roulette' | 'blackjack' | 'stock_market' | 'case_opening',
    onUpdate: (state: GameRoomState) => void
  ) {
    const key = `room-${gameType}`
    
    // Store callback
    this.gameRoomCallbacks.set(key, onUpdate)
    
    try {
      // Subscribe to room state updates using client.subscribe()
      const unsubscribe = appwriteClient.subscribe(
        `databases.${DATABASE_ID}.collections.game_rooms.documents`,
        (response: any) => {
          if (
            response.events.includes('databases.*.collections.*.documents.*.update') ||
            response.events.includes('databases.*.collections.*.documents.*.create')
          ) {
            const state = response.payload as GameRoomState
            onUpdate(state)
          }
        }
      )
      
      this.unsubscribeFunctions.set(key, unsubscribe)
      this.isConnected = true
      
      console.log(`✅ Subscribed to ${gameType} room updates`)
      
      return () => {
        this.unsubscribe(key)
      }
    } catch (error) {
      console.error(`❌ Failed to subscribe to ${gameType} room updates:`, error)
      this.gameRoomCallbacks.delete(key)
      throw error
    }
  }

  /**
   * Unsubscribe from game room updates
   */
  async unsubscribeFromGameRoom(
    gameType: 'roulette' | 'blackjack' | 'stock_market' | 'case_opening'
  ) {
    const key = `room-${gameType}`
    this.unsubscribe(key)
  }

  /**
   * Join a game room (presence)
   */
  async joinGameRoom(
    gameType: 'roulette' | 'blackjack' | 'stock_market' | 'case_opening',
    userId: string,
    username: string
  ) {
    try {
      // This would typically update a presence document in the database
      // For now, we'll just log it
      console.log(`✅ User ${username} joined ${gameType} room`)
    } catch (error) {
      console.error(`❌ Failed to join ${gameType} room:`, error)
      throw error
    }
  }

  /**
   * Leave a game room (presence)
   */
  async leaveGameRoom(
    gameType: 'roulette' | 'blackjack' | 'stock_market' | 'case_opening',
    userId: string,
    username: string
  ) {
    try {
      // This would typically update a presence document in the database
      // For now, we'll just log it
      console.log(`✅ User ${username} left ${gameType} room`)
    } catch (error) {
      console.error(`❌ Failed to leave ${gameType} room:`, error)
      throw error
    }
  }

  /**
   * Broadcast a game action
   */
  async broadcastGameAction(
    gameType: 'roulette' | 'blackjack' | 'stock_market' | 'case_opening',
    userId: string,
    action: string,
    data?: any
  ) {
    try {
      // This would typically create or update a document in the database
      // For now, we'll just log it
      console.log(`📢 Broadcasting ${action} for ${gameType} by user ${userId}`)
    } catch (error) {
      console.error(`❌ Failed to broadcast ${action}:`, error)
      throw error
    }
  }

  /**
   * Send a game state update
   */
  async sendGameUpdate(update: GameStateUpdate) {
    try {
      // This would typically create or update a document in the database
      // For now, we'll just log it
      console.log(`📤 Sending game update for ${update.gameType}`)
    } catch (error) {
      console.error(`❌ Failed to send game update:`, error)
      throw error
    }
  }

  /**
   * Broadcast a game update
   */
  async broadcastGameUpdate(update: GameStateUpdate) {
    try {
      // This would typically create or update a document in the database
      // For now, we'll just log it
      console.log(`📢 Broadcasting game update for ${update.gameType}`)
    } catch (error) {
      console.error(`❌ Failed to broadcast game update:`, error)
      throw error
    }
  }

  /**
   * Broadcast a game room state update
   */
  async broadcastGameRoomUpdate(gameType: string, state: GameRoomState) {
    try {
      // This would typically update a room document in the database
      // For now, we'll just log it
      console.log(`📢 Broadcasting room update for ${gameType}`)
    } catch (error) {
      console.error(`❌ Failed to broadcast room update:`, error)
      throw error
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected
  }

  /**
   * Unsubscribe from a specific subscription
   */
  private unsubscribe(key: string) {
    const unsubscribeFn = this.unsubscribeFunctions.get(key)
    if (unsubscribeFn) {
      try {
        unsubscribeFn()
        this.unsubscribeFunctions.delete(key)
        console.log(`✅ Unsubscribed from ${key}`)
      } catch (error) {
        console.error(`❌ Error unsubscribing from ${key}:`, error)
      }
    }
    
    // Clean up callbacks
    this.gameStateCallbacks.delete(key)
    this.gameRoomCallbacks.delete(key)
  }

  /**
   * Unsubscribe all channels
   */
  async unsubscribeAll() {
    // Unsubscribe from all active subscriptions
    this.unsubscribeFunctions.forEach((unsubscribeFn, key) => {
      try {
        unsubscribeFn()
        console.log(`✅ Unsubscribed from ${key}`)
      } catch (error) {
        console.error(`❌ Error unsubscribing from ${key}:`, error)
      }
    })
    
    // Clear all maps
    this.unsubscribeFunctions.clear()
    this.gameStateCallbacks.clear()
    this.gameRoomCallbacks.clear()
    this.isConnected = false
    
    console.log('✅ Unsubscribed from all realtime channels')
  }
}

// Export singleton instance
export const realtimeGameService = RealtimeGameService.getInstance()
