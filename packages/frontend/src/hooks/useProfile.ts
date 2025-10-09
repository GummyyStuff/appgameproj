import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface UserProfile {
  id: string
  username: string
  displayName?: string
  balance: number
  is_moderator: boolean
  avatar_path?: string
  created_at: string
}

export const useProfile = () => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['profile-basic', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      const response = await fetch(`${API_URL}/user/profile`, {
        credentials: 'include', // Include HTTP-only cookies
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const result = await response.json();
      return result.user as UserProfile;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  })
}

export const useUsername = () => {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  
  // Return profile username if available, fallback to display name or email
  return profile?.username || profile?.displayName || user?.name || user?.email || 'User'
}