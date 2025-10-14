/**
 * Real-time Game Hook
 * React hook for managing real-time game state and room updates
 */

import { useEffect, useRef, useCallback } from 'react'
import { realtimeGameService, GameStateUpdate, GameRoomState } from '../services/realtime-game'
import { useAuth } from './useAuth'
import { useUsername } from './useProfile'

export interface UseRealtimeGameOptions {
  gameType: 'roulette' | 'stock_market' | 'case_opening' | 'blackjack'
  onGameUpdate?: (update: GameStateUpdate) => void
  onRoomUpdate?: (state: GameRoomState) => void
  autoJoinRoom?: boolean
  enablePresence?: boolean
}

export function useRealtimeGame({
  gameType,
  onGameUpdate,
  onRoomUpdate,
  autoJoinRoom = true,
  enablePresence = true
}: UseRealtimeGameOptions) {
  const { user } = useAuth()
  const username = useUsername()
  const isSubscribedRef = useRef(false)
  const isInRoomRef = useRef(false)

  /**
   * Subscribe to game updates
   */
  const subscribeToGame = useCallback(async () => {
    if (!user || isSubscribedRef.current) return

    try {
      if (onGameUpdate) {
        await realtimeGameService.subscribeToGame(gameType, user.id, onGameUpdate)
      }

      if (onRoomUpdate) {
        await realtimeGameService.subscribeToGameRoom(gameType, onRoomUpdate)
      }

      isSubscribedRef.current = true
      console.log(`✅ Subscribed to ${gameType} real-time updates`)
    } catch (error) {
      console.error(`❌ Failed to subscribe to ${gameType} updates:`, error)
    }
  }, [user, gameType, onGameUpdate, onRoomUpdate])

  /**
   * Unsubscribe from game updates
   */
  const unsubscribeFromGame = useCallback(async () => {
    if (!user || !isSubscribedRef.current) return

    try {
      await realtimeGameService.unsubscribeFromGame(gameType, user.id)
      await realtimeGameService.unsubscribeFromGameRoom(gameType)
      
      isSubscribedRef.current = false
      console.log(`✅ Unsubscribed from ${gameType} real-time updates`)
    } catch (error) {
      console.error(`❌ Failed to unsubscribe from ${gameType} updates:`, error)
    }
  }, [user, gameType])

  /**
   * Join game room
   */
  const joinRoom = useCallback(async () => {
    if (!user || !username || !enablePresence || isInRoomRef.current) return

    try {
      await realtimeGameService.joinGameRoom(gameType, user.id, username)
      isInRoomRef.current = true
      console.log(`✅ Joined ${gameType} room`)
    } catch (error) {
      console.error(`❌ Failed to join ${gameType} room:`, error)
    }
  }, [user, username, gameType, enablePresence])

  /**
   * Leave game room
   */
  const leaveRoom = useCallback(async () => {
    if (!user || !username || !isInRoomRef.current) return

    try {
      await realtimeGameService.leaveGameRoom(gameType, user.id, username)
      isInRoomRef.current = false
      console.log(`✅ Left ${gameType} room`)
    } catch (error) {
      console.error(`❌ Failed to leave ${gameType} room:`, error)
    }
  }, [user, username, gameType])

  /**
   * Broadcast game action
   */
  const broadcastAction = useCallback(async (action: string, data?: any) => {
    if (!user) return

    try {
      await realtimeGameService.broadcastGameAction(gameType, user.id, action, data)
    } catch (error) {
      console.error(`❌ Failed to broadcast ${action} action:`, error)
    }
  }, [user, gameType])

  /**
   * Send game state update
   */
  const sendGameUpdate = useCallback(async (update: Omit<GameStateUpdate, 'userId'>) => {
    if (!user) return

    try {
      await realtimeGameService.sendGameUpdate({
        ...update,
        userId: user.id
      })
    } catch (error) {
      console.error(`❌ Failed to send game update:`, error)
    }
  }, [user])

  /**
   * Get connection status
   */
  const getConnectionStatus = useCallback(() => {
    return realtimeGameService.getConnectionStatus()
  }, [])

  // Auto-subscribe when user is available
  useEffect(() => {
    if (user && !isSubscribedRef.current) {
      subscribeToGame()
    }
  }, [user, subscribeToGame])

  // Auto-join room if enabled
  useEffect(() => {
    if (user && username && autoJoinRoom && enablePresence && !isInRoomRef.current) {
      joinRoom()
    }
  }, [user, username, autoJoinRoom, enablePresence, joinRoom])

  // Cleanup on unmount or when user changes
  useEffect(() => {
    return () => {
      if (isInRoomRef.current) {
        leaveRoom()
      }
      if (isSubscribedRef.current) {
        unsubscribeFromGame()
      }
    }
  }, [leaveRoom, unsubscribeFromGame])

  return {
    // Connection management
    subscribeToGame,
    unsubscribeFromGame,
    joinRoom,
    leaveRoom,
    
    // Communication
    broadcastAction,
    sendGameUpdate,
    
    // Status
    isSubscribed: isSubscribedRef.current,
    isInRoom: isInRoomRef.current,
    getConnectionStatus,
    
    // User info
    userId: user?.id,
    username
  }
}

export default useRealtimeGame