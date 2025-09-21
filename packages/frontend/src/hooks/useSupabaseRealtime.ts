/**
 * Supabase Realtime Hook
 * Manages real-time subscriptions for game events, balance updates, and notifications
 */

import { useEffect, useRef, useCallback } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

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

export interface RealtimeCallbacks {
  onGameUpdate?: (update: GameStateUpdate) => void
  onBalanceUpdate?: (update: BalanceUpdate) => void
  onNotification?: (notification: GameNotification) => void
  onBigWin?: (data: any) => void
  onGameComplete?: (data: any) => void
}

export function useSupabaseRealtime(callbacks: RealtimeCallbacks = {}) {
  const { user } = useAuth()
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map())
  const isConnectedRef = useRef(false)
  const retryCountRef = useRef(0)
  const maxRetries = 3
  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Feature flag to disable realtime if needed
  const realtimeEnabled = import.meta.env.VITE_REALTIME_ENABLED !== 'false'

  const {
    onGameUpdate,
    onBalanceUpdate,
    onNotification,
    onBigWin,
    onGameComplete
  } = callbacks

  /**
   * Subscribe to global game events channel
   */
  const subscribeToGameEvents = useCallback(() => {
    if (channelsRef.current.has('game-events')) return

    const channel = supabase.channel('game-events', {
      config: {
        broadcast: { self: false },
        presence: { key: 'game-presence' }
      }
    })

    channel
      .on('broadcast', { event: 'game-update' }, (payload) => {
        if (onGameUpdate) {
          onGameUpdate(payload.payload as GameStateUpdate)
        }
      })
      .on('broadcast', { event: 'game-complete' }, (payload) => {
        if (onGameComplete) {
          onGameComplete(payload.payload)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to game events channel')
          retryCountRef.current = 0
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️  Game events channel error - realtime may not be configured')
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++
            console.log(`🔄 Retrying connection (${retryCountRef.current}/${maxRetries})`)
          }
        }
      })

    channelsRef.current.set('game-events', channel)
  }, [onGameUpdate, onGameComplete])

  /**
   * Subscribe to balance updates channel
   */
  const subscribeToBalanceUpdates = useCallback(() => {
    if (channelsRef.current.has('balance-updates')) return

    const channel = supabase.channel('balance-updates', {
      config: {
        broadcast: { self: false }
      }
    })

    channel
      .on('broadcast', { event: 'balance-update' }, (payload) => {
        const update = payload.payload as BalanceUpdate
        
        // Only process updates for current user
        if (user && update.userId === user.id && onBalanceUpdate) {
          onBalanceUpdate(update)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to balance updates channel')
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️  Balance updates channel error - realtime may not be configured')
        }
      })

    channelsRef.current.set('balance-updates', channel)
  }, [user, onBalanceUpdate])

  /**
   * Subscribe to notifications channel
   */
  const subscribeToNotifications = useCallback(() => {
    if (channelsRef.current.has('notifications')) return

    const channel = supabase.channel('notifications', {
      config: {
        broadcast: { self: false }
      }
    })

    channel
      .on('broadcast', { event: 'notification' }, (payload) => {
        const notification = payload.payload as GameNotification
        
        // Process global notifications or user-specific ones
        if (!notification.userId || (user && notification.userId === user.id)) {
          if (onNotification) {
            onNotification(notification)
          }

          // Handle specific notification types
          if (notification.type === 'big_win' && onBigWin) {
            onBigWin(notification.data)
          }
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to notifications channel')
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️  Notifications channel error - realtime may not be configured')
        }
      })

    channelsRef.current.set('notifications', channel)
  }, [user, onNotification, onBigWin])

  /**
   * Subscribe to user-specific channel for private updates
   */
  const subscribeToUserChannel = useCallback(() => {
    if (!user || channelsRef.current.has(`user-${user.id}`)) return

    const channel = supabase.channel(`user-${user.id}`, {
      config: {
        broadcast: { self: false },
        presence: { key: user.id }
      }
    })

    channel
      .on('broadcast', { event: 'balance-update' }, (payload) => {
        if (onBalanceUpdate) {
          onBalanceUpdate(payload.payload as BalanceUpdate)
        }
      })
      .on('broadcast', { event: 'game-update' }, (payload) => {
        if (onGameUpdate) {
          onGameUpdate(payload.payload as GameStateUpdate)
        }
      })
      .on('broadcast', { event: 'notification' }, (payload) => {
        if (onNotification) {
          onNotification(payload.payload as GameNotification)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to user channel: ${user.id}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.warn(`⚠️  User channel error: ${user.id} - realtime may not be configured`)
        }
      })

    channelsRef.current.set(`user-${user.id}`, channel)
  }, [user, onBalanceUpdate, onGameUpdate, onNotification])

  /**
   * Subscribe to database changes for real-time updates
   */
  const subscribeToDatabaseChanges = useCallback(() => {
    if (!user || channelsRef.current.has('db-changes')) return

    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          const { new: newRecord, old: oldRecord } = payload
          
          if (newRecord && oldRecord && newRecord.balance !== oldRecord.balance) {
            const balanceUpdate: BalanceUpdate = {
              userId: newRecord.id,
              newBalance: parseFloat(newRecord.balance),
              previousBalance: parseFloat(oldRecord.balance),
              change: parseFloat(newRecord.balance) - parseFloat(oldRecord.balance),
              reason: 'database_update',
              timestamp: Date.now()
            }

            if (onBalanceUpdate) {
              onBalanceUpdate(balanceUpdate)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_history',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const gameRecord = payload.new
          
          if (gameRecord) {
            const gameUpdate: GameStateUpdate = {
              userId: gameRecord.user_id,
              gameType: gameRecord.game_type,
              gameId: gameRecord.id,
              status: 'completed',
              data: {
                betAmount: parseFloat(gameRecord.bet_amount),
                winAmount: parseFloat(gameRecord.win_amount),
                netResult: parseFloat(gameRecord.win_amount) - parseFloat(gameRecord.bet_amount),
                resultData: gameRecord.result_data
              },
              timestamp: Date.now()
            }

            if (onGameUpdate) {
              onGameUpdate(gameUpdate)
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to database changes')
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️  Database changes channel error - realtime may not be configured')
        }
      })

    channelsRef.current.set('db-changes', channel)
  }, [user, onBalanceUpdate, onGameUpdate])

  /**
   * Initialize all subscriptions
   */
  const connect = useCallback(() => {
    if (isConnectedRef.current || !realtimeEnabled) {
      if (!realtimeEnabled) {
        console.log('⚠️  Realtime is disabled via VITE_REALTIME_ENABLED=false')
      }
      return
    }

    // Clear any pending connection timeout
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current)
    }

    subscribeToGameEvents()
    subscribeToBalanceUpdates()
    subscribeToNotifications()
    
    if (user) {
      subscribeToUserChannel()
      subscribeToDatabaseChanges()
    }

    isConnectedRef.current = true
    console.log('🔌 Supabase Realtime connected')
  }, [
    subscribeToGameEvents,
    subscribeToBalanceUpdates,
    subscribeToNotifications,
    subscribeToUserChannel,
    subscribeToDatabaseChanges,
    user
  ])

  /**
   * Disconnect all subscriptions
   */
  const disconnect = useCallback(() => {
    if (!isConnectedRef.current) return
    
    console.log('🔌 Disconnecting Supabase Realtime...')

    // Clear any pending connection timeout
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current)
      connectTimeoutRef.current = null
    }

    for (const [name, channel] of channelsRef.current) {
      supabase.removeChannel(channel)
      console.log(`✅ Removed channel: ${name}`)
    }

    channelsRef.current.clear()
    isConnectedRef.current = false
    console.log('🔌 Supabase Realtime disconnected')
  }, [])

  /**
   * Send message to user channel
   */
  const sendToUser = useCallback(async (event: string, data: any) => {
    if (!user) return

    const channel = channelsRef.current.get(`user-${user.id}`)
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event,
        payload: {
          ...data,
          timestamp: Date.now()
        }
      })
    }
  }, [user])

  /**
   * Get connection status
   */
  const getConnectionStatus = useCallback(() => {
    return {
      isConnected: isConnectedRef.current,
      channelCount: channelsRef.current.size,
      channels: Array.from(channelsRef.current.keys())
    }
  }, [])

  // Auto-connect when user is available (debounced)
  useEffect(() => {
    if (user && !isConnectedRef.current && realtimeEnabled) {
      // Clear any existing timeout
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current)
      }
      
      // Debounce connection to avoid rapid reconnections in development
      connectTimeoutRef.current = setTimeout(() => {
        if (user && !isConnectedRef.current && realtimeEnabled) {
          console.log('🔌 Connecting to Supabase Realtime...')
          connect()
        }
      }, import.meta.env.DEV ? 500 : 0) // 500ms delay in development, immediate in production
    }
    
    return () => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current)
      }
    }
  }, [user, realtimeEnabled])

  // Cleanup on unmount - only in production or when actually unmounting
  useEffect(() => {
    return () => {
      // In development mode, don't disconnect immediately to avoid Strict Mode issues
      if (import.meta.env.DEV) {
        console.log('🔌 Development mode: Keeping realtime connection alive')
        return
      }
      
      // In production, disconnect normally
      if (isConnectedRef.current) {
        console.log('🔌 Production mode: Disconnecting realtime on unmount')
        disconnect()
      }
    }
  }, [])

  return {
    connect,
    disconnect,
    sendToUser,
    getConnectionStatus,
    isConnected: isConnectedRef.current
  }
}