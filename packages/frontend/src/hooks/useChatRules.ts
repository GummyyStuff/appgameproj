import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const useChatRules = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAcceptedRules = profile?.chat_rules_accepted_at !== null;

  const acceptRules = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use backend API to update profile with chat rules acceptance
      const response = await fetch(`${API_URL}/user/profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatRulesAcceptedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to accept chat rules');
      }
    } catch (err) {
      console.error('Failed to accept chat rules:', err);
      setError('Failed to accept chat rules');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    hasAcceptedRules,
    acceptRules,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};
