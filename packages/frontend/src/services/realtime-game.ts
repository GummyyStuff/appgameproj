/**
 * Real-time Game Service
 * Handles real-time game state synchronization and updates
 */

import { supabase } from '../lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface GameStateUpdate {
  userId: string
  gameType: 'roulette' | 'blackjack' | 'plinko'
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
  private channels: Map<string, RealtimeChannel> = new Map()
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
   */
  async subscribeToGame(
    gameType: 'roulette' | 'blackjack' | 'plinko',
    userId: string,
    onUpdate: (update: GameStateUpdate) => void
  ): Promise<void> {
    const channelName = `game-${gameType}-${userId}`
    
    if (this.channels.has(channelName)) {
      // Update callback
      this.gameStateCallbacks.set(channelName, onUpdate)
      return
    }

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: userId }
      }
    })

    channel
      .on('broadcast', { event: 'game-update' }, (payload) => {
        const update = payload.payload as GameStateUpdate
        if (update.userId === userId && update.gameType === gameType) {
          onUpdate(update)
        }
      })
      .on('broadcast', { event: 'game-state' }, (payload) => {
        const update = payload.payload as GameStateUpdate
        if (update.userId === userId && update.gameType === gameType) {
          onUpdate(update)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to ${gameType} game updates for user ${userId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ ${gameType} game channel error for user ${userId}`)
        }
      })

    this.channels.set(channelName, channel)
    this.gameStateCallbacks.set(channelName, onUpdate)
  }

  /**
   * Subscribe to game room updates (all players in a game)
   */
  async subscribeToGameRoom(
    gameType: 'roulette' | 'blackjack' | 'plinko',
    onRoomUpdate: (state: GameRoomState) => void
  ): Promise<void> {
    const channelName = `game-room-${gameType}`
    
    if (this.channels.has(channelName)) {
      // Update callback
      this.gameRoomCallbacks.set(channelName, onRoomUpdate)
      return
    }

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: 'game-room' }
      }
    })

    channel
      .on('broadcast', { event: 'room-update' }, (payload) => {
        const roomState = payload.payload as GameRoomState
        onRoomUpdate(roomState)
      })
      .on('broadcast', { event: 'player-joined' }, (payload) => {
        console.log(`Player joined ${gameType} room:`, payload.payload)
      })
      .on('broadcast', { event: 'player-left' }, (payload) => {
        console.log(`Player left ${gameType} room:`, payload.payload)
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState()
        const onlineUsers = Object.keys(presenceState).length
        
        // Update room state with online user count
        const currentCallback = this.gameRoomCallbacks.get(channelName)
        if (currentCallback) {
          // This would typically come from the server, but we can estimate
          currentCallback({
            activeGames: 0, // Would be provided by server
            recentWins: [], // Would be provided by server
            onlineUsers
          })
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to ${gameType} room updates`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ ${gameType} room channel error`)
        }
      })

    this.channels.set(channelName, channel)
    this.gameRoomCallbacks.set(channelName, onRoomUpdate)
  }

  /**
   * Broadcast game action to other players
   */
  async broadcastGameAction(
    gameType: 'roulette' | 'blackjack' | 'plinko',
    userId: string,
    action: string,
    data?: any
  ): Promise<void> {
    const channelName = `game-room-${gameType}`
    const channel = this.channels.get(channelName)

    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'player-action',
        payload: {
          userId,
          action,
          data,
          timestamp: Date.now()
        }
      })
    }
  }

  /**
   * Send game state update
   */
  async sendGameUpdate(update: GameStateUpdate): Promise<void> {
    const userChannelName = `game-${update.gameType}-${update.userId}`
    const roomChannelName = `game-room-${update.gameType}`

    // Send to user-specific channel
    const userChannel = this.channels.get(userChannelName)
    if (userChannel) {
      await userChannel.send({
        type: 'broadcast',
        event: 'game-update',
        payload: update
      })
    }

    // Send to room channel (for spectators or other players)
    const roomChannel = this.channels.get(roomChannelName)
    if (roomChannel) {
      await roomChannel.send({
        type: 'broadcast',
        event: 'game-update',
        payload: {
          ...update,
          // Remove sensitive user data for room broadcast
          userId: update.userId.substring(0, 8) + '...'
        }
      })
    }
  }

  /**
   * Join game room presence
   */
  async joinGameRoom(
    gameType: 'roulette' | 'blackjack' | 'plinko',
    userId: string,
    username: string
  ): Promise<void> {
    const channelName = `game-room-${gameType}`
    const channel = this.channels.get(channelName)

    if (channel) {
      await channel.track({
        user_id: userId,
        username,
        joined_at: Date.now()
      })

      // Broadcast player joined event
      await channel.send({
        type: 'broadcast',
        event: 'player-joined',
        payload: {
          userId,
          username,
          gameType,
          timestamp: Date.now()
        }
      })
    }
  }

  /**
   * Leave game room presence
   */
  async leaveGameRoom(
    gameType: 'roulette' | 'blackjack' | 'plinko',
    userId: string,
    username: string
  ): Promise<void> {
    const channelName = `game-room-${gameType}`
    const channel = this.channels.get(channelName)

    if (channel) {
      await channel.untrack()

      // Broadcast player left event
      await channel.send({
        type: 'broadcast',
        event: 'player-left',
        payload: {
          userId,
          username,
          gameType,
          timestamp: Date.now()
        }
      })
    }
  }

  /**
   * Unsubscribe from game updates
   */
  async unsubscribeFromGame(
    gameType: 'roulette' | 'blackjack' | 'plinko',
    userId: string
  ): Promise<void> {
    const channelName = `game-${gameType}-${userId}`
    const channel = this.channels.get(channelName)

    if (channel) {
      await supabase.removeChannel(channel)
      this.channels.delete(channelName)
      this.gameStateCallbacks.delete(channelName)
      console.log(`✅ Unsubscribed from ${gameType} game updates for user ${userId}`)
    }
  }

  /**
   * Unsubscribe from game room updates
   */
  async unsubscribeFromGameRoom(gameType: 'roulette' | 'blackjack' | 'plinko'): Promise<void> {
    const channelName = `game-room-${gameType}`
    const channel = this.channels.get(channelName)

    if (channel) {
      await supabase.removeChannel(channel)
      this.channels.delete(channelName)
      this.gameRoomCallbacks.delete(channelName)
      console.log(`✅ Unsubscribed from ${gameType} room updates`)
    }
  }

  /**
   * Get active channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys())
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    totalChannels: number
    gameChannels: number
    roomChannels: number
    isConnected: boolean
  } {
    const channels = Array.from(this.channels.keys())
    const gameChannels = channels.filter(name => name.startsWith('game-') && !name.includes('room')).length
    const roomChannels = channels.filter(name => name.includes('room')).length

    return {
      totalChannels: this.channels.size,
      gameChannels,
      roomChannels,
      isConnected: this.channels.size > 0
    }
  }

  /**
   * Cleanup all subscriptions
   */
  async cleanup(): Promise<void> {
    console.log('🔌 Cleaning up real-time game subscriptions...')

    for (const [name, channel] of this.channels) {
      try {
        await supabase.removeChannel(channel)
        console.log(`✅ Removed channel: ${name}`)
      } catch (error) {
        console.error(`❌ Error removing channel ${name}:`, error)
      }
    }

    this.channels.clear()
    this.gameStateCallbacks.clear()
    this.gameRoomCallbacks.clear()
    console.log('🔌 Real-time game service cleanup complete')
  }
}

// Export singleton instance
export const realtimeGameService = RealtimeGameService.getInstance()