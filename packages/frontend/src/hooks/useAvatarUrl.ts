import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

export const useAvatarUrl = (avatarPath: string | null) => {
  const { session } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvatarUrl = useCallback(async () => {
    if (!avatarPath || !session?.access_token) {
      setAvatarUrl(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/functions/v1/proxy-avatar?path=${encodeURIComponent(avatarPath)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch avatar: ${response.status}`);
      }

      // Convert blob to object URL
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      setAvatarUrl(prevUrl => {
        // Clean up previous URL
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl);
        }
        return url;
      });
    } catch (err) {
      console.error('Failed to fetch avatar:', err);
      setError('Failed to load avatar');
      setAvatarUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [avatarPath, session?.access_token]);

  useEffect(() => {
    fetchAvatarUrl();
  }, [fetchAvatarUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (avatarUrl) {
        URL.revokeObjectURL(avatarUrl);
      }
    };
  }, [avatarUrl]);

  return {
    avatarUrl,
    isLoading,
    error,
    refetch: fetchAvatarUrl
  };
};
