import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'

interface UserProfile {
  id: string
  username: string
  display_name: string
  balance: number
  is_moderator: boolean
  avatar_path: string | null
  chat_rules_version: number
  chat_rules_accepted_at: string | null
  is_active: boolean
}

export const useProfile = () => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['profile-basic', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username, display_name, balance, is_moderator, avatar_path, chat_rules_version, chat_rules_accepted_at, is_active')
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