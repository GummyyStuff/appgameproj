/**
 * Supabase Realtime Service
 * Handles real-time communication using Supabase Realtime channels
 * Replaces Socket.io for game events, balance updates, and notifications
 */

import { supabaseAdmin } from '../config/supabase'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface GameStateUpdate {
  userId: string
  gameType: 'roulette' | 'blackjack'
  gameId?: string
  status: 'betting' | 'playing' | 'completed'
  data?: any
  timestamp: number
}

export interface BalanceUpdate {
  userId: string
  newBalance: number
  previousBalance: number
  change: number
  reason: string
  timestamp: number
}

export interface GameNotification {
  type: 'big_win' | 'game_complete' | 'system_message' | 'balance_update'
  userId?: string
  message: string
  data?: any
  timestamp: number
}

export class SupabaseRealtimeService {
  private static instance: SupabaseRealtimeService
  private channels: Map<string, RealtimeChannel> = new Map()
  private isInitialized = false

  private constructor() {}

  static getInstance(): SupabaseRealtimeService {
    if (!SupabaseRealtimeService.instance) {
      SupabaseRealtimeService.instance = new SupabaseRealtimeService()
    }
    return SupabaseRealtimeService.instance
  }

  /**
   * Initialize Supabase Realtime channels
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Create global game events channel
      await this.createGameEventsChannel()
      
      // Create balance updates channel
      await this.createBalanceUpdatesChannel()
      
      // Create notifications channel
      await this.createNotificationsChannel()

      this.isInitialized = true
      console.log('🔌 Supabase Realtime service initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Supabase Realtime:', error)
      throw error
    }
  }

  /**
   * Create game events channel for real-time game updates
   */
  private async createGameEventsChannel(): Promise<void> {
    const channel = supabaseAdmin.channel('game-events', {
      config: {
        broadcast: { self: true },
        presence: { key: 'game-presence' }
      }
    })

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Game events channel subscribed')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Game events channel error')
      }
    })

    this.channels.set('game-events', channel)
  }

  /**
   * Create balance updates channel for real-time balance synchronization
   */
  private async createBalanceUpdatesChannel(): Promise<void> {
    const channel = supabaseAdmin.channel('balance-updates', {
      config: {
        broadcast: { self: true }
      }
    })

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Balance updates channel subscribed')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Balance updates channel error')
      }
    })

    this.channels.set('balance-updates', channel)
  }

  /**
   * Create notifications channel for system messages and alerts
   */
  private async createNotificationsChannel(): Promise<void> {
    const channel = supabaseAdmin.channel('notifications', {
      config: {
        broadcast: { self: true }
      }
    })

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Notifications channel subscribed')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Notifications channel error')
      }
    })

    this.channels.set('notifications', channel)
  }

  /**
   * Broadcast game state update to specific user or game room
   */
  async broadcastGameUpdate(update: GameStateUpdate): Promise<void> {
    const channel = this.channels.get('game-events')
    if (!channel) {
      console.error('Game events channel not initialized')
      return
    }

    try {
      await channel.send({
        type: 'broadcast',
        event: 'game-update',
        payload: {
          ...update,
          timestamp: Date.now()
        }
      })

      console.log(`📡 Game update broadcasted for user ${update.userId}:`, update.gameType, update.status)
    } catch (error) {
      console.error('❌ Failed to broadcast game update:', error)
    }
  }

  /**
   * Broadcast balance update to specific user
   */
  async broadcastBalanceUpdate(update: BalanceUpdate): Promise<void> {
    const channel = this.channels.get('balance-updates')
    if (!channel) {
      console.error('Balance updates channel not initialized')
      return
    }

    try {
      await channel.send({
        type: 'broadcast',
        event: 'balance-update',
        payload: {
          ...update,
          timestamp: Date.now()
        }
      })

      console.log(`💰 Balance update broadcasted for user ${update.userId}: ${update.previousBalance} -> ${update.newBalance}`)
    } catch (error) {
      console.error('❌ Failed to broadcast balance update:', error)
    }
  }

  /**
   * Broadcast notification to specific user or globally
   */
  async broadcastNotification(notification: GameNotification): Promise<void> {
    const channel = this.channels.get('notifications')
    if (!channel) {
      console.error('Notifications channel not initialized')
      return
    }

    try {
      await channel.send({
        type: 'broadcast',
        event: 'notification',
        payload: {
          ...notification,
          timestamp: Date.now()
        }
      })

      console.log(`🔔 Notification broadcasted:`, notification.type, notification.message)
    } catch (error) {
      console.error('❌ Failed to broadcast notification:', error)
    }
  }

  /**
   * Broadcast big win announcement to all users
   */
  async broadcastBigWin(userId: string, username: string, gameType: string, winAmount: number, gameData?: any): Promise<void> {
    const notification: GameNotification = {
      type: 'big_win',
      message: `🎉 ${username} just won ${winAmount} coins on ${gameType}!`,
      data: {
        userId,
        username,
        gameType,
        winAmount,
        gameData
      },
      timestamp: Date.now()
    }

    await this.broadcastNotification(notification)
  }

  /**
   * Subscribe to database changes for real-time updates
   */
  async subscribeToTableChanges(): Promise<void> {
    // Subscribe to user_profiles changes for balance updates
    const profilesChannel = supabaseAdmin
      .channel('user-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: 'balance=neq.prev(balance)'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          this.handleBalanceChange(payload)
        }
      )
      .subscribe()

    // Subscribe to game_history changes for game completion events
    const gameHistoryChannel = supabaseAdmin
      .channel('game-history-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_history'
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          this.handleGameCompletion(payload)
        }
      )
      .subscribe()

    this.channels.set('profiles-changes', profilesChannel)
    this.channels.set('game-history-changes', gameHistoryChannel)

    console.log('✅ Database change subscriptions established')
  }

  /**
   * Handle balance changes from database triggers
   */
  private async handleBalanceChange(payload: RealtimePostgresChangesPayload<any>): Promise<void> {
    const { new: newRecord, old: oldRecord } = payload

    if (!newRecord || !oldRecord) return

    const balanceUpdate: BalanceUpdate = {
      userId: newRecord.id,
      newBalance: parseFloat(newRecord.balance),
      previousBalance: parseFloat(oldRecord.balance),
      change: parseFloat(newRecord.balance) - parseFloat(oldRecord.balance),
      reason: 'game_transaction',
      timestamp: Date.now()
    }

    await this.broadcastBalanceUpdate(balanceUpdate)
  }

  /**
   * Handle game completion events from database triggers
   */
  private async handleGameCompletion(payload: RealtimePostgresChangesPayload<any>): Promise<void> {
    const { new: gameRecord } = payload

    if (!gameRecord) return

    // Check if it's a big win (win amount > 5x bet amount)
    const winAmount = parseFloat(gameRecord.win_amount)
    const betAmount = parseFloat(gameRecord.bet_amount)
    const isBigWin = winAmount > betAmount * 5

    if (isBigWin) {
      // Get user info for big win announcement
      const { data: userProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('username')
        .eq('id', gameRecord.user_id)
        .single()

      if (userProfile) {
        await this.broadcastBigWin(
          gameRecord.user_id,
          userProfile.username,
          gameRecord.game_type,
          winAmount,
          gameRecord.result_data
        )
      }
    }

    // Broadcast game completion
    const gameUpdate: GameStateUpdate = {
      userId: gameRecord.user_id,
      gameType: gameRecord.game_type,
      gameId: gameRecord.id,
      status: 'completed',
      data: {
        betAmount,
        winAmount,
        netResult: winAmount - betAmount,
        resultData: gameRecord.result_data
      },
      timestamp: Date.now()
    }

    await this.broadcastGameUpdate(gameUpdate)
  }

  /**
   * Create user-specific channel for private updates
   */
  async createUserChannel(userId: string): Promise<RealtimeChannel> {
    const channelName = `user-${userId}`
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!
    }

    const channel = supabaseAdmin.channel(channelName, {
      config: {
        broadcast: { self: true },
        presence: { key: userId }
      }
    })

    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ User channel created for ${userId}`)
          resolve()
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ User channel error for ${userId}`)
          reject(new Error(`Failed to create user channel for ${userId}`))
        }
      })
    })

    this.channels.set(channelName, channel)
    return channel
  }

  /**
   * Send message to specific user channel
   */
  async sendToUser(userId: string, event: string, data: any): Promise<void> {
    const channelName = `user-${userId}`
    let channel = this.channels.get(channelName)

    if (!channel) {
      channel = await this.createUserChannel(userId)
    }

    try {
      await channel.send({
        type: 'broadcast',
        event,
        payload: {
          ...data,
          timestamp: Date.now()
        }
      })

      console.log(`📤 Message sent to user ${userId}:`, event)
    } catch (error) {
      console.error(`❌ Failed to send message to user ${userId}:`, error)
    }
  }

  /**
   * Get channel statistics
   */
  getChannelStats(): {
    totalChannels: number
    activeChannels: string[]
    isInitialized: boolean
  } {
    return {
      totalChannels: this.channels.size,
      activeChannels: Array.from(this.channels.keys()),
      isInitialized: this.isInitialized
    }
  }

  /**
   * Shutdown all channels
   */
  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down Supabase Realtime service...')

    for (const [name, channel] of this.channels) {
      try {
        await supabaseAdmin.removeChannel(channel)
        console.log(`✅ Channel ${name} removed`)
      } catch (error) {
        console.error(`❌ Error removing channel ${name}:`, error)
      }
    }

    this.channels.clear()
    this.isInitialized = false
    console.log('🔌 Supabase Realtime service shutdown complete')
  }
}

// Export singleton instance
export const supabaseRealtimeService = SupabaseRealtimeService.getInstance()