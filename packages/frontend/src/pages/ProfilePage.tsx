import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useSearchParams } from 'react-router-dom'
// Supabase import removed - using Appwrite backend API
import CurrencyManager from '../components/ui/CurrencyManager'
import TransactionHistory from '../components/ui/TransactionHistory'
import StatisticsDashboard from '../components/ui/StatisticsDashboard'
import GameHistoryTable from '../components/ui/GameHistoryTable'
import { AchievementSystem, TarkovButton, TarkovCard, ProfileLeaderboard, FontAwesomeSVGIcons, TarkovTabs } from '../components/ui'
import type { Tab } from '../components/ui'
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

interface DailyBonusStatus {
  can_claim: boolean
  bonus_amount: number
  formatted_bonus: string
  next_available?: string
  cooldown_hours?: number
}

const ProfilePage: React.FC = () => {
  const { user, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Get active tab from URL or default to 'overview'
  const activeTab = searchParams.get('tab') || 'overview'
  
  // Advanced features for achievements
  const {
    showAchievements,
    achievements,
    openAchievements,
    closeAchievements,
    claimAchievementReward
  } = useAdvancedFeatures()
  
  // Handle tab change and update URL
  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId })
  }
  
  // Fetch daily bonus status
  const { data: bonusData, refetch: refetchBonus } = useQuery({
    queryKey: ['dailyBonus', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      const response = await fetch('/api/user/balance', {
        credentials: 'include',
        headers: {
          'X-Appwrite-User-Id': user.id,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch bonus status');
      
      const result = await response.json();
      return result.daily_bonus as DailyBonusStatus;
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // Cache for 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute to update countdown
  })
  
  // Claim daily bonus mutation
  const claimBonusMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user')
      
      const response = await fetch('/api/user/daily-bonus', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Appwrite-User-Id': user.id,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to claim daily bonus');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['dailyBonus'] })
      refetchBonus()
    },
  })
  
  // Fetch user profile with optimized caching
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      const response = await fetch('/api/user/profile', {
        credentials: 'include',
        headers: {
          'X-Appwrite-User-Id': user.id,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch profile');
      
      const result = await response.json();
      return result.user as UserProfile;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    retry: 2,
  })

  // Fetch game statistics from backend API
  const { data: gameStats, isLoading: statsLoading } = useQuery({
    queryKey: ['gameStats', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      try {
        const response = await fetch('/api/statistics/user', {
          credentials: 'include',
          headers: {
            'X-Appwrite-User-Id': user.id,
          },
        });
        
        if (!response.ok) {
          console.warn('Game stats endpoint not available');
          return [];
        }
        
        const result = await response.json();
        return result.statistics as GameStats[];
      } catch (error) {
        console.warn('Game stats not available:', error);
        return [];
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
      
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-User-Id': user.id,
        },
        body: JSON.stringify({ username }),
      });
      
      if (!response.ok) throw new Error('Failed to update username');
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

  // Define tabs
  const tabs: Tab[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <FontAwesomeSVGIcons.Shield size={16} />,
      content: (
        <div className="space-y-6">
          {/* Currency Management */}
          <div className="bg-tarkov-dark rounded-lg p-6 shadow-lg">
            <CurrencyManager />
          </div>

          {/* Daily Bonus Section */}
          <div className="bg-tarkov-dark rounded-lg p-6 shadow-lg border-2 border-tarkov-accent/30">
            <div className="flex items-center space-x-3 mb-4">
              <FontAwesomeSVGIcons.Gift className="text-tarkov-accent" size={28} />
              <h2 className="text-xl font-tarkov font-bold text-white">Daily Bonus</h2>
            </div>
            
            {bonusData ? (
              <div className="space-y-4">
                <div className="bg-tarkov-secondary rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Bonus Amount</p>
                      <div className="flex items-center space-x-2">
                        <FontAwesomeSVGIcons.RubleSign className="text-tarkov-accent" size={24} />
                        <span className="text-2xl font-tarkov font-bold text-white">
                          {bonusData.formatted_bonus || formatCurrency(bonusData.bonus_amount, 'roubles', { showSymbol: false })}
                        </span>
                      </div>
                    </div>
                    
                    {bonusData.can_claim ? (
                      <button
                        onClick={() => claimBonusMutation.mutate()}
                        disabled={claimBonusMutation.isPending}
                        className="px-6 py-3 bg-gradient-to-r from-tarkov-accent to-orange-600 hover:from-orange-500 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-tarkov font-bold rounded-md transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
                      >
                        {claimBonusMutation.isPending ? (
                          <span className="flex items-center space-x-2">
                            <FontAwesomeSVGIcons.Clock className="animate-spin" size={16} />
                            <span>Claiming...</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-2">
                            <FontAwesomeSVGIcons.Gift size={16} />
                            <span>CLAIM NOW</span>
                          </span>
                        )}
                      </button>
                    ) : (
                      <div className="text-center">
                        <div className="px-4 py-2 bg-gray-700 rounded-md border border-gray-600">
                          <FontAwesomeSVGIcons.Clock className="text-gray-400 mx-auto mb-2" size={24} />
                          <p className="text-sm text-gray-400 mb-1">Next bonus in:</p>
                          <p className="text-lg font-tarkov font-bold text-white">
                            {bonusData.cooldown_hours ? `${bonusData.cooldown_hours}h` : 'Tomorrow'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {claimBonusMutation.isSuccess && (
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 flex items-center space-x-3">
                    <FontAwesomeSVGIcons.Check className="text-green-400" size={20} />
                    <div>
                      <p className="text-green-400 font-medium">Daily bonus claimed successfully!</p>
                      <p className="text-sm text-gray-300">
                        Your balance has been updated with {bonusData.formatted_bonus || formatCurrency(bonusData.bonus_amount, 'roubles')}
                      </p>
                    </div>
                  </div>
                )}
                
                {claimBonusMutation.isError && (
                  <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 flex items-center space-x-3">
                    <FontAwesomeSVGIcons.Times className="text-red-400" size={20} />
                    <div>
                      <p className="text-red-400 font-medium">Failed to claim bonus</p>
                      <p className="text-sm text-gray-300">
                        {claimBonusMutation.error?.message || 'Please try again later'}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="text-center text-sm text-gray-400">
                  <p>Come back daily to claim your free bonus!</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <FontAwesomeSVGIcons.Clock className="text-tarkov-accent mx-auto mb-2 animate-pulse" size={32} />
                <p className="text-gray-400">Loading bonus status...</p>
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
            </div>
            <TransactionHistory limit={10} showFilters={false} compact={true} />
          </div>
        </div>
      )
    },
    {
      id: 'statistics',
      label: 'Statistics',
      icon: <FontAwesomeSVGIcons.ChartBar size={16} />,
      content: <StatisticsDashboard />
    },
    {
      id: 'history',
      label: 'Game History',
      icon: <FontAwesomeSVGIcons.History size={16} />,
      content: (
        <div className="bg-tarkov-dark rounded-lg p-6">
          <GameHistoryTable showFilters={true} showExport={true} pageSize={25} />
        </div>
      )
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <FontAwesomeSVGIcons.Cog size={16} />,
      content: (
        <div className="space-y-6">
          {/* Account Settings */}
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

          {/* Logout Section */}
          <div className="bg-tarkov-dark rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-tarkov font-bold text-white mb-4">Account Actions</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Sign out of your account</p>
                <p className="text-sm text-gray-500">You can sign back in anytime</p>
              </div>
              <button
                onClick={signOut}
                className="px-4 py-2 bg-tarkov-danger hover:bg-red-600 text-white rounded-md transition-colors"
              >
                <FontAwesomeSVGIcons.DoorOpen className="mr-2" size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-tarkov-accent rounded-full flex items-center justify-center text-3xl font-bold text-tarkov-dark shadow-lg">
              {profile.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-3xl font-tarkov font-bold text-white">
                {profile.username || 'Anonymous Operator'}
              </h1>
              <p className="text-gray-400">Member since {formatDate(profile.created_at)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Interface */}
      <TarkovTabs 
        tabs={tabs} 
        defaultTab={activeTab}
        onChange={handleTabChange}
      />

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