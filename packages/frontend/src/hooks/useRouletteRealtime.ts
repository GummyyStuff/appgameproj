import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'

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
    isConnected: false,
    activeGames: [],
    gameEvents: []
  })

  useEffect(() => {
    if (!user) return

    // Subscribe to roulette game events
    const channel = supabase
      .channel('roulette-games')
      .on('broadcast', { event: 'roulette-game-start' }, (payload: any) => {
        setState(prev => ({
          ...prev,
          gameEvents: [...prev.gameEvents, {
            type: 'game_start' as const,
            userId: payload.userId,
            data: payload
          }].slice(-10) // Keep last 10 events
        }))
      })
      .on('broadcast', { event: 'roulette-spin-start' }, (payload: any) => {
        setState(prev => ({
          ...prev,
          activeGames: [...prev.activeGames, payload.gameId],
          gameEvents: [...prev.gameEvents, {
            type: 'spin_start' as const,
            userId: payload.userId,
            gameId: payload.gameId,
            data: payload
          }].slice(-10)
        }))
      })
      .on('broadcast', { event: 'roulette-game-complete' }, (payload: any) => {
        setState(prev => ({
          ...prev,
          activeGames: prev.activeGames.filter(id => id !== payload.gameId),
          gameEvents: [...prev.gameEvents, {
            type: 'game_complete' as const,
            userId: payload.userId,
            gameId: payload.gameId,
            data: payload
          }].slice(-10)
        }))
      })
      .subscribe((status) => {
        setState(prev => ({
          ...prev,
          isConnected: status === 'SUBSCRIBED'
        }))
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const broadcastGameStart = async (amount: number, betType: string, betValue: string | number) => {
    if (!user) return

    await supabase.channel('roulette-games').send({
      type: 'broadcast',
      event: 'roulette-game-start',
      payload: {
        userId: user.id,
        amount,
        betType,
        betValue,
        timestamp: new Date().toISOString()
      }
    })
  }

  return {
    ...state,
    broadcastGameStart
  }
}

// Hook for listening to global roulette activity (for lobby/spectator features)
export const useRouletteSpectator = () => {
  const [recentGames, setRecentGames] = useState<RouletteGameEvent[]>([])
  const [activePlayersCount, setActivePlayersCount] = useState(0)

  useEffect(() => {
    const channel = supabase
      .channel('roulette-spectator')
      .on('broadcast', { event: 'roulette-game-start' }, (payload: any) => {
        setRecentGames(prev => [
          { type: 'game_start' as const, userId: payload.userId, data: payload },
          ...prev.slice(0, 19) // Keep last 20 games
        ])
      })
      .on('broadcast', { event: 'roulette-game-complete' }, (payload: any) => {
        setRecentGames(prev => [
          { type: 'game_complete' as const, userId: payload.userId, data: payload },
          ...prev.slice(0, 19)
        ])
      })
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState()
        setActivePlayersCount(Object.keys(newState).length)
      })
      .subscribe()

    // Track presence
    channel.track({
      user_id: 'spectator',
      online_at: new Date().toISOString()
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return {
    recentGames,
    activePlayersCount
  }
}