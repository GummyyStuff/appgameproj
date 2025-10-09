import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface UserStats {
  total_wagered: number;
  total_won: number;
  wins: number;
  losses: number;
  win_loss_ratio: number;
  profit_series: Array<{
    date: string;
    profit: number;
  }>;
}

export const useUserStats = (userId: string | null) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserStats = useCallback(async () => {
    if (!userId) {
      setStats(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/user/stats`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user stats');
      }

      const result = await response.json();
      const statsData = result.stats;

      if (statsData) {
        // Calculate wins/losses from game breakdown
        let wins = 0;
        let losses = 0;
        
        if (statsData.game_breakdown && statsData.game_breakdown.stats) {
          const gameStats = statsData.game_breakdown.stats;
          wins = Object.values(gameStats).reduce((sum: number, game: any) => 
            sum + (game.wins || 0), 0);
          losses = statsData.games_played - wins;
        }

        setStats({
          total_wagered: statsData.total_wagered || 0,
          total_won: statsData.total_won || 0,
          wins,
          losses,
          win_loss_ratio: wins > 0 ? (wins / (wins + losses)) : 0,
          profit_series: [] // TODO: Calculate from game history if needed
        });
      } else {
        setStats({
          total_wagered: 0,
          total_won: 0,
          wins: 0,
          losses: 0,
          win_loss_ratio: 0,
          profit_series: []
        });
      }
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
      setError('Failed to load user statistics');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchUserStats
  };
};
