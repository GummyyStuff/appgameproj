/**
 * Game Realtime Hook
 * Tracks recent game activity using Appwrite Realtime
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { subscribeToGameHistory } from '../services/appwrite-realtime';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface RecentGame {
  id: string;
  user_id: string;
  game_type: string;
  bet_amount: number;
  win_amount: number;
  result_data: any;
  created_at: string;
  net_result: number;
}

export const useGameRealtime = (options: {
  limit?: number;
  gameType?: string;
} = {}) => {
  const { limit = 10, gameType } = options;
  const { user } = useAuth();
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch initial recent games
  const fetchRecentGames = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        ...(gameType && { game_type: gameType }),
      });

      const response = await fetch(`${API_URL}/user/history?${queryParams}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch game history');
      }

      const result = await response.json();
      const games: RecentGame[] = (result.history || []).map((game: any) => ({
        id: game.$id || game.id,
        user_id: game.userId || game.user_id,
        game_type: game.gameType || game.game_type,
        bet_amount: game.betAmount || game.bet_amount,
        win_amount: game.winAmount || game.win_amount,
        result_data: game.result_data,
        created_at: game.createdAt || game.created_at,
        net_result: (game.winAmount || game.win_amount) - (game.betAmount || game.bet_amount),
      }));

      setRecentGames(games);
    } catch (err) {
      console.error('Error fetching recent games:', err);
    }
  }, [limit, gameType]);

  // Load initial games
  useEffect(() => {
    if (user) {
      fetchRecentGames();
    }
  }, [user, fetchRecentGames]);

  // Subscribe to new game activity
  useEffect(() => {
    if (!user) return;

    console.log('Setting up game activity realtime subscription...');

    const unsubscribe = subscribeToGameHistory({
      onNewGame: (game: any) => {
        console.log('New game played:', game);

        // Only show if it matches our filters
        if (gameType && game.gameType !== gameType) {
          return;
        }

        const recentGame: RecentGame = {
          id: game.$id,
          user_id: game.userId,
          game_type: game.gameType,
          bet_amount: game.betAmount,
          win_amount: game.winAmount,
          result_data: JSON.parse(game.resultData || '{}'),
          created_at: game.createdAt,
          net_result: game.winAmount - game.betAmount,
        };

        setRecentGames(prev => {
          const newGames = [recentGame, ...prev];
          return newGames.slice(0, limit); // Keep only the limit
        });
      },
    });

    setIsConnected(true);

    return () => {
      console.log('Cleaning up game realtime subscription');
      unsubscribe();
      setIsConnected(false);
    };
  }, [user, gameType, limit]);

  return {
    recentGames,
    isConnected,
    refresh: fetchRecentGames,
  };
};

