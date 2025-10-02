import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { supabase } from '../lib/supabase';

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
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          chat_rules_accepted_at: new Date().toISOString() 
        })
        .eq('id', user.id);

      if (error) throw error;
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
