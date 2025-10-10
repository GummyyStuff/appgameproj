/**
 * Roulette Realtime Hook (Appwrite Version)
 * Simplified - game events tracked locally, no server-side broadcasting needed
 */

import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'

interface RouletteGameEvent {
  type: 'game_start' | 'spin_start' | 'game_complete'
  userId: string
  gameId?: string
  data?: any
}

interface RouletteRealtimeState {
  isConnected: boolean
  activeGames: string[]
  gameEvents: RouletteGameEvent[]
}

export const useRouletteRealtime = () => {
  const { user } = useAuth()
  const [state, setState] = useState<RouletteRealtimeState>({
    isConnected: true, // Always connected for local events
    activeGames: [],
    gameEvents: []
  })

  // Simplified: No server-side broadcasting needed for single-player roulette
  // Events are tracked locally in component state

  const broadcastGameStart = async (betAmount: number, betType: string, betValue: any) => {
    if (!user) return

    const event: RouletteGameEvent = {
      type: 'game_start',
      userId: user.id,
      data: { betAmount, betType, betValue }
    }

    setState(prev => ({
      ...prev,
      gameEvents: [...prev.gameEvents, event].slice(-10)
    }))
  }

  const broadcastSpinStart = async (gameId: string) => {
    if (!user) return

    const event: RouletteGameEvent = {
      type: 'spin_start',
      userId: user.id,
      gameId,
      data: { gameId }
    }

    setState(prev => ({
      ...prev,
      activeGames: [...prev.activeGames, gameId],
      gameEvents: [...prev.gameEvents, event].slice(-10)
    }))
  }

  const broadcastGameComplete = async (gameId: string, result: any) => {
    if (!user) return

    const event: RouletteGameEvent = {
      type: 'game_complete',
      userId: user.id,
      gameId,
      data: result
    }

    setState(prev => ({
      ...prev,
      activeGames: prev.activeGames.filter(id => id !== gameId),
      gameEvents: [...prev.gameEvents, event].slice(-10)
    }))
  }

  return {
    ...state,
    broadcastGameStart,
    broadcastSpinStart,
    broadcastGameComplete
  }
}
