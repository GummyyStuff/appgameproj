import { useState, useEffect, useCallback } from 'react';
import { account } from '../lib/appwrite';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'gameplay' | 'progression' | 'special' | 'social';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: string;
  claimed: boolean;
  claimedAt?: string;
  reward?: {
    type: 'currency' | 'title' | 'cosmetic';
    amount?: number;
    item?: string;
  };
}

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Hook for managing achievement system with backend persistence
 * 
 * Features:
 * - Load achievements from backend API
 * - Track achievement progress with server sync
 * - Unlock achievements when conditions are met
 * - Claim rewards for unlocked achievements
 * - Proper error handling and loading states
 */
export const useAchievements = () => {
  const [showAchievements, setShowAchievements] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get authentication headers for API requests
   */
  const getAuthHeaders = useCallback(async () => {
    try {
      const user = await account.get();
      return {
        'Content-Type': 'application/json',
        'X-Appwrite-User-Id': user.$id,
      };
    } catch (error) {
      console.error('Failed to get user for auth headers:', error);
      throw new Error('Not authenticated');
    }
  }, []);

  /**
   * Fetch achievements from backend
   */
  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_URL}/achievements`, {
        method: 'GET',
        credentials: 'include',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch achievements' }));
        throw new Error(errorData.error || errorData.message || 'Failed to fetch achievements');
      }

      const data = await response.json();
      setAchievements(data.achievements || []);
    } catch (err: any) {
      console.error('Failed to fetch achievements:', err);
      setError(err.message || 'Failed to load achievements');
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  /**
   * Update achievement progress
   */
  const updateAchievementProgress = useCallback(async (achievementId: string, progressToAdd: number) => {
    if (progressToAdd <= 0) return;
    
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_URL}/achievements/progress`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          achievementId,
          progress: progressToAdd,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to update achievement');
      }

      const data = await response.json();
      
      // Refresh achievements to get latest data
      await fetchAchievements();
      
      // Dispatch event if newly unlocked
      if (data.newlyUnlocked) {
        const achievement = achievements.find(a => a.id === achievementId);
        if (achievement) {
          window.dispatchEvent(new CustomEvent('achievementUnlocked', {
            detail: { achievement }
          }));
        }
      }
    } catch (err: any) {
      console.error(`Failed to update achievement ${achievementId}:`, err);
      // Don't throw - achievement updates are not critical
    }
  }, [getAuthHeaders, fetchAchievements, achievements]);

  /**
   * Claim achievement reward
   */
  const claimAchievementReward = useCallback(async (achievementId: string) => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_URL}/achievements/claim`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ achievementId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to claim reward');
      }

      const data = await response.json();
      
      // Refresh achievements and trigger balance refresh
      await fetchAchievements();
      window.dispatchEvent(new Event('balanceUpdate'));
      
      return data.reward;
    } catch (err: any) {
      console.error(`Failed to claim reward for ${achievementId}:`, err);
      throw err;
    }
  }, [getAuthHeaders, fetchAchievements]);

  /**
   * Track a game session and update relevant achievements
   */
  const trackGamePlayed = useCallback(async (
    betAmount: number,
    winAmount: number,
    gameType?: 'roulette' | 'blackjack'
  ) => {
    // Track wins
    if (winAmount > 0) {
      await updateAchievementProgress('lucky-seven', 1);
    }
    
    // Track high roller
    if (betAmount >= 10000) {
      await updateAchievementProgress('high-roller', betAmount);
    }

    // Game-specific tracking
    if (gameType === 'roulette' && winAmount > 0) {
      await updateAchievementProgress('roulette-master', 1);
    }
  }, [updateAchievementProgress]);

  /**
   * Track a case opening and update relevant achievements
   */
  const trackCaseOpening = useCallback(async (
    caseType: 'scav' | 'pmc' | 'labs',
    itemRarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary',
    itemValue: number,
    itemCategory: 'medical' | 'electronics' | 'valuables' | 'keycards' | 'consumables'
  ) => {
    // Track total cases opened
    await Promise.all([
      updateAchievementProgress('first-case', 1),
      updateAchievementProgress('case-opener-10', 1),
      updateAchievementProgress('case-master-50', 1),
      updateAchievementProgress('case-legend-100', 1),
      updateAchievementProgress('case-god-500', 1),
    ]);

    // Track case type specific
    if (caseType === 'scav') {
      await updateAchievementProgress('scav-collector', 1);
    } else if (caseType === 'pmc') {
      await updateAchievementProgress('pmc-veteran', 1);
    } else if (caseType === 'labs') {
      await updateAchievementProgress('labs-elite', 1);
    }

    // Track rarity achievements
    if (itemRarity === 'rare') {
      await Promise.all([
        updateAchievementProgress('rare-finder', 1),
        updateAchievementProgress('first-rare', 1),
      ]);
    } else if (itemRarity === 'epic') {
      await Promise.all([
        updateAchievementProgress('epic-hunter', 1),
        updateAchievementProgress('first-epic', 1),
      ]);
    } else if (itemRarity === 'legendary') {
      await Promise.all([
        updateAchievementProgress('legendary-pull', 1),
        updateAchievementProgress('legendary-collector', 1),
      ]);
    }

    // Track value achievements
    if (itemValue >= 10000) {
      await updateAchievementProgress('big-win', 1);
    }
    if (itemValue >= 50000) {
      await updateAchievementProgress('jackpot', 1);
    }

    // Track category achievements
    const categoryMap: Record<typeof itemCategory, string> = {
      medical: 'medical-supplies',
      electronics: 'tech-collector',
      valuables: 'valuables-hoarder',
      keycards: 'key-master',
      consumables: '', // No achievement for consumables
    };
    
    const achievementId = categoryMap[itemCategory];
    if (achievementId) {
      await updateAchievementProgress(achievementId, 1);
    }
  }, [updateAchievementProgress]);

  // Load achievements on mount
  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return {
    // UI State
    showAchievements,
    openAchievements: () => setShowAchievements(true),
    closeAchievements: () => setShowAchievements(false),
    
    // Achievement Data
    achievements,
    loading,
    error,
    
    // Achievement Actions
    updateAchievementProgress,
    claimAchievementReward,
    refreshAchievements: fetchAchievements,
    
    // Game Tracking
    trackGamePlayed,
    trackCaseOpening,
  };
};
