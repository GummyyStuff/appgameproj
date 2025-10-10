import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
// Supabase import removed - using Appwrite backend API
import CurrencyManager from '../components/ui/CurrencyManager'
import TransactionHistory from '../components/ui/TransactionHistory'
import { AchievementSystem, TarkovButton, TarkovCard, ProfileLeaderboard, FontAwesomeSVGIcons } from '../components/ui'
import { useAdvancedFeatures } from '../hooks/useAdvancedFeatures'
import { formatCurrency } from '../utils/currency'



interface UserProfile {
  id: string
  username: string
  display_name: string
  balance: number
  created_at: string
  last_daily_bonus: string | null
  total_wagered: number
  total_won: number
  games_played: number
}

interface GameStats {
  game_type: string
  games_played: number
  total_wagered: number
  total_won: number
  biggest_win: number
}

const ProfilePage: React.FC = () => {
  const { user, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  
  // Advanced features for achievements
  const {
    showAchievements,
    achievements,
    openAchievements,
    closeAchievements,
    claimAchievementReward
  } = useAdvancedFeatures()
  // Fetch user profile with optimized caching
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error) throw error
      return data as UserProfile
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    retry: 2,
  })

  // Fetch game statistics - using fallback approach since RPC might not exist
  const { data: gameStats, isLoading: statsLoading } = useQuery({
    queryKey: ['gameStats', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      try {
        // Try the RPC function first
        const { data, error } = await supabase
          .rpc('get_user_statistics', { user_uuid: user.id })
        
        if (error) throw error
        return data as GameStats[]
      } catch (error) {
        // Fallback: return empty array if RPC doesn't exist
        console.warn('Game stats RPC not available:', error)
        return []
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1, // Only retry once
  })

  // Update username mutation
  const updateUsernameMutation = useMutation({
    mutationFn: async (username: string) => {
      if (!user) throw new Error('No user')
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ username })
        .eq('id', user.id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setIsEditing(false)
      setNewUsername('')
    },
  })

  const handleUsernameUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (newUsername.trim()) {
      updateUsernameMutation.mutate(newUsername.trim())
    }
  }



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCurrencyAmount = (amount: number) => {
    return formatCurrency(amount, 'roubles', { showSymbol: false })
  }

  const getWinRate = (wagered: number, won: number): string => {
    if (wagered === 0) return '0.0'
    return ((won / wagered) * 100).toFixed(1)
  }

  const formatAchievementDate = (date: Date | string | undefined): string => {
    if (!date) return ''
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      return dateObj.toLocaleDateString()
    } catch {
      return ''
    }
  }

  // Show loading only for profile, let stats load separately
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <FontAwesomeSVGIcons.Clock className="text-tarkov-accent mx-auto mb-4 animate-spin" size={48} />
          <p className="text-gray-400">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (profileError || !profile) {
    return (
      <div className="text-center py-12">
        <FontAwesomeSVGIcons.Times className="text-tarkov-danger mx-auto mb-4" size={64} />
        <h2 className="text-2xl font-tarkov text-tarkov-danger mb-4">Profile Not Found</h2>
        <p className="text-gray-400">Unable to load your profile information.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-tarkov-accent hover:bg-orange-500 text-tarkov-dark rounded-md transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-tarkov-dark rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-tarkov-accent rounded-full flex items-center justify-center text-2xl font-bold text-tarkov-dark">
              {profile.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-tarkov font-bold text-white">
                {profile.username || 'Anonymous Operator'}
              </h1>
              <p className="text-gray-400">Member since {formatDate(profile.created_at)}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-tarkov-danger hover:bg-red-600 text-white rounded-md transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Currency Management */}
        <CurrencyManager />
      </div>

      {/* Username Edit */}
      <div className="bg-tarkov-dark rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-tarkov font-bold text-white mb-4">Account Settings</h2>
        
        {isEditing ? (
          <form onSubmit={handleUsernameUpdate} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={profile.username || 'Enter username'}
                className="w-full px-3 py-2 bg-tarkov-secondary border border-tarkov-primary rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-tarkov-accent focus:border-transparent"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={updateUsernameMutation.isPending}
                className="px-4 py-2 bg-tarkov-accent hover:bg-orange-500 disabled:bg-gray-600 text-tarkov-dark font-semibold rounded-md transition-colors"
              >
                {updateUsernameMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setNewUsername('')
                }}
                className="px-4 py-2 bg-tarkov-secondary hover:bg-tarkov-primary text-white rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400">Username</p>
              <p className="text-white font-medium">{profile.username || 'Not set'}</p>
            </div>
            <button
              onClick={() => {
                setIsEditing(true)
                setNewUsername(profile.username || '')
              }}
              className="px-4 py-2 bg-tarkov-secondary hover:bg-tarkov-primary text-white rounded-md transition-colors"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Game Statistics */}
      <div className="bg-tarkov-dark rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-tarkov font-bold text-white mb-4">Game Statistics</h2>
        
        {statsLoading ? (
          <div className="text-center py-8">
            <FontAwesomeSVGIcons.AlarmClock className="text-tarkov-accent mx-auto mb-4 animate-pulse" size={48} />
            <p className="text-gray-400">Loading game statistics...</p>
          </div>
        ) : gameStats && gameStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gameStats.map((stat) => (
              <div key={stat.game_type} className="bg-tarkov-secondary rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <FontAwesomeSVGIcons.Gamepad className="text-tarkov-accent" size={24} />
                  <h3 className="text-lg font-medium text-white capitalize">
                    {stat.game_type}
                  </h3>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Games Played:</span>
                    <span className="text-white font-medium">{stat.games_played}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Wagered:</span>
                    <span className="text-white font-medium">₽{formatCurrencyAmount(stat.total_wagered)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Won:</span>
                    <span className="text-white font-medium">₽{formatCurrencyAmount(stat.total_won)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Win Rate:</span>
                    <span className={`font-medium ${
                      parseFloat(getWinRate(stat.total_wagered, stat.total_won)) > 50 
                        ? 'text-tarkov-success' 
                        : 'text-tarkov-danger'
                    }`}>
                      {getWinRate(stat.total_wagered, stat.total_won)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Biggest Win:</span>
                    <span className="text-tarkov-accent font-medium">₽{formatCurrencyAmount(stat.biggest_win || 0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FontAwesomeSVGIcons.Gamepad className="text-gray-400 mx-auto mb-4" size={48} />
            <p className="text-gray-400">No games played yet. Start playing to see your statistics!</p>
          </div>
        )}
      </div>

      {/* Achievements Section */}
      <div className="bg-tarkov-dark rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <FontAwesomeSVGIcons.Shield className="text-tarkov-accent" size={24} />
            <h2 className="text-xl font-tarkov font-bold text-white uppercase tracking-wide">
              Achievements
            </h2>
          </div>
          <TarkovButton
            variant="secondary"
            size="sm"
            onClick={openAchievements}
            icon={<FontAwesomeSVGIcons.Bolt size={16} />}
          >
            View All
          </TarkovButton>
        </div>

        {/* Achievement Progress Overview */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Overall Progress</span>
            <span>{achievements.filter(a => a.unlocked).length}/{achievements.length} unlocked</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-tarkov-accent to-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(achievements.filter(a => a.unlocked).length / achievements.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Recent Achievements */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {achievements
            .filter(achievement => achievement.unlocked)
            .slice(0, 3)
            .map((achievement) => {
              const getAchievementIcon = (achievementId: string) => {
                const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
                  'first-win': FontAwesomeSVGIcons.Heart,
                  'high-roller': FontAwesomeSVGIcons.RubleSign,
                  'lucky-seven': FontAwesomeSVGIcons.Bolt,
                  'roulette-master': FontAwesomeSVGIcons.Circle,
                  'blackjack-ace': FontAwesomeSVGIcons.Spade
                }
                return iconMap[achievementId] || FontAwesomeSVGIcons.Shield
              }
              
              const IconComponent = getAchievementIcon(achievement.id)
              
              return (
                <TarkovCard key={achievement.id} className="p-4" hover>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      achievement.rarity === 'common' ? 'bg-gray-600/50' :
                      achievement.rarity === 'rare' ? 'bg-blue-600/50' :
                      achievement.rarity === 'epic' ? 'bg-purple-600/50' :
                      'bg-yellow-600/50'
                    }`}>
                      <IconComponent className="text-white" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-tarkov font-bold text-white text-sm uppercase truncate">
                        {achievement.title}
                      </h4>
                      <p className="text-xs text-gray-400 truncate">
                        {achievement.description}
                      </p>
                      {achievement.unlockedAt && (
                        <p className="text-xs text-green-400 mt-1">
                          Unlocked {formatAchievementDate(achievement.unlockedAt)}
                        </p>
                      )}
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      achievement.rarity === 'common' ? 'bg-gray-500' :
                      achievement.rarity === 'rare' ? 'bg-blue-500' :
                      achievement.rarity === 'epic' ? 'bg-purple-500' :
                      'bg-yellow-500'
                    }`} />
                  </div>
                </TarkovCard>
              )
            })}
        </div>

        {/* No achievements unlocked state */}
        {achievements.filter(a => a.unlocked).length === 0 && (
          <div className="text-center py-8">
            <FontAwesomeSVGIcons.Shield className="text-gray-600 mx-auto mb-4" size={48} />
            <p className="text-gray-400 mb-4">No achievements unlocked yet</p>
            <p className="text-sm text-gray-500">Start playing games to earn your first achievements!</p>
          </div>
        )}

        {/* Progress on current achievements */}
        {achievements.filter(a => !a.unlocked && a.progress > 0).length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-tarkov font-bold text-tarkov-accent uppercase mb-3">
              In Progress
            </h3>
            <div className="space-y-3">
              {achievements
                .filter(a => !a.unlocked && a.progress > 0)
                .slice(0, 2)
                .map((achievement) => {
                  const getAchievementIcon = (achievementId: string) => {
                    const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
                      'first-win': FontAwesomeSVGIcons.Heart,
                      'high-roller': FontAwesomeSVGIcons.RubleSign,
                      'lucky-seven': FontAwesomeSVGIcons.Bolt,
                      'roulette-master': FontAwesomeSVGIcons.Circle,
                      'blackjack-ace': FontAwesomeSVGIcons.Spade
                    }
                    return iconMap[achievementId] || FontAwesomeSVGIcons.Shield
                  }
                  
                  const IconComponent = getAchievementIcon(achievement.id)
                  const progressPercentage = (achievement.progress / achievement.maxProgress) * 100
                  
                  return (
                    <div key={achievement.id} className="flex items-center space-x-3 p-3 bg-tarkov-secondary/50 rounded-lg">
                      <div className="p-2 rounded-lg bg-gray-700/50">
                        <IconComponent className="text-gray-400" size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-tarkov font-bold text-white text-sm uppercase">
                            {achievement.title}
                          </h4>
                          <span className="text-xs text-gray-400">
                            {achievement.progress}/{achievement.maxProgress}
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-tarkov-accent h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      {/* Leaderboards Section */}
      <div className="bg-tarkov-dark rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <FontAwesomeSVGIcons.Sword className="text-tarkov-accent" size={24} />
            <h2 className="text-xl font-tarkov font-bold text-white uppercase tracking-wide">
              Leaderboards
            </h2>
          </div>
        </div>
        <ProfileLeaderboard currentUser={profile.username} compact={false} />
      </div>

      {/* Recent Transactions */}
      <div className="bg-tarkov-dark rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-tarkov font-bold text-white">Recent Activity</h2>
          <a 
            href="/history" 
            className="text-tarkov-accent hover:text-orange-500 text-sm font-medium transition-colors"
          >
            View All →
          </a>
        </div>
        <TransactionHistory limit={5} showFilters={false} compact={true} />
      </div>

      {/* Achievement System Modal */}
      <AchievementSystem
        isOpen={showAchievements}
        onClose={closeAchievements}
        achievements={achievements}
        onClaimReward={claimAchievementReward}
      />
    </div>
  )
}

export default ProfilePage