import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

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
      const { data, error } = await supabase
        .rpc('get_user_quick_stats', { 
          target_user_id: userId, 
          days: 7 
        });

      if (error) throw error;

      if (data && data.length > 0) {
        const userStats = data[0];
        setStats({
          total_wagered: parseFloat(userStats.total_wagered) || 0,
          total_won: parseFloat(userStats.total_won) || 0,
          wins: userStats.wins || 0,
          losses: userStats.losses || 0,
          win_loss_ratio: parseFloat(userStats.win_loss_ratio) || 0,
          profit_series: userStats.profit_series || []
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
