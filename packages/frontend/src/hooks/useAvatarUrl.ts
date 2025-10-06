import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export const useAvatarUrl = (avatarPath: string | null) => {
  const { session } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvatarUrl = useCallback(async () => {
    console.log('[useAvatarUrl] fetchAvatarUrl called with avatarPath:', avatarPath);
    console.log('[useAvatarUrl] Session exists:', !!session);
    console.log('[useAvatarUrl] Access token exists:', !!session?.access_token);
    console.log('[useAvatarUrl] Access token length:', session?.access_token?.length || 0);
    
    if (!session?.access_token) {
      console.log('[useAvatarUrl] No session access token, setting avatarUrl to null');
      setAvatarUrl(null);
      return;
    }

    // Use default avatar path if no avatar path is provided
    const pathToFetch = avatarPath || 'defaults/default-avatar.svg';
    console.log('[useAvatarUrl] Path to fetch:', pathToFetch);

    setIsLoading(true);
    setError(null);

    try {
      const url = `/functions/v1/proxy-avatar?path=${encodeURIComponent(pathToFetch)}`;
      console.log('[useAvatarUrl] Fetching from URL:', url);
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('[useAvatarUrl] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useAvatarUrl] Response error:', errorText);
        throw new Error(`Failed to fetch avatar: ${response.status} - ${errorText}`);
      }

      // Convert blob to object URL
      const blob = await response.blob();
      console.log('[useAvatarUrl] Blob received, size:', blob.size, 'type:', blob.type);
      
      const objectUrl = URL.createObjectURL(blob);
      console.log('[useAvatarUrl] Object URL created:', objectUrl);
      
      setAvatarUrl(prevUrl => {
        // Clean up previous URL
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl);
        }
        return objectUrl;
      });
    } catch (err) {
      console.error('[useAvatarUrl] Failed to fetch avatar:', err);
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
