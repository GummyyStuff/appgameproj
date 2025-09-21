import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'

interface UserProfile {
  id: string
  username: string
  display_name: string
  balance: number
}

export const useProfile = () => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['profile-basic', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username, display_name, balance')
        .eq('id', user.id)
        .single()
      
      if (error) throw error
      return data as UserProfile
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  })
}

export const useUsername = () => {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  
  // Return profile username if available, fallback to auth metadata, then email
  return profile?.username || user?.user_metadata?.username || user?.email || 'User'
}