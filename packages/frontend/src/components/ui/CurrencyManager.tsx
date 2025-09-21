import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import CurrencyDisplay from './CurrencyDisplay'

interface DailyBonusStatus {
  canClaim: boolean
  bonusAmount: number
  lastClaimedDate?: string
  nextAvailableDate?: string
  cooldownHours?: number
}

interface CurrencyStats {
  currentBalance: number
  totalWagered: number
  totalWon: number
  netProfit: number
  gamesPlayed: number
}

const CurrencyManager: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [countdown, setCountdown] = useState('')

  // Fetch daily bonus status
  const { data: bonusStatus, isLoading: bonusLoading } = useQuery({
    queryKey: ['dailyBonus', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      try {
        const { data, error } = await supabase
          .rpc('get_daily_bonus_status', { user_uuid: user.id })
        
        if (error) throw error
        return data as DailyBonusStatus
      } catch (error) {
        // Fallback: check last_daily_bonus from profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('last_daily_bonus')
          .eq('id', user.id)
          .single()
        
        if (profileError) throw profileError
        
        const today = new Date().toISOString().split('T')[0]
        const lastBonusDate = profile.last_daily_bonus ? profile.last_daily_bonus.split('T')[0] : null
        
        return {
          canClaim: !lastBonusDate || lastBonusDate !== today,
          bonusAmount: 1000,
          lastClaimedDate: profile.last_daily_bonus,
        } as DailyBonusStatus
      }
    },
    enabled: !!user,
    refetchInterval: 60000, // Check every minute
  })

  // Fetch currency stats
  const { data: currencyStats } = useQuery({
    queryKey: ['currencyStats', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('balance, total_wagered, total_won, games_played')
        .eq('id', user.id)
        .single()
      
      if (error) throw error
      
      return {
        currentBalance: profile.balance || 0,
        totalWagered: profile.total_wagered || 0,
        totalWon: profile.total_won || 0,
        netProfit: (profile.total_won || 0) - (profile.total_wagered || 0),
        gamesPlayed: profile.games_played || 0,
      } as CurrencyStats
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  })

  // Claim daily bonus mutation
  const claimBonusMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user')
      
      try {
        const { data, error } = await supabase
          .rpc('claim_daily_bonus', { user_uuid: user.id })
        
        if (error) throw error
        return data
      } catch (error) {
        // Fallback: manual bonus claim
        const today = new Date().toISOString().split('T')[0]
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ 
            balance: (currencyStats?.currentBalance || 0) + 1000,
            last_daily_bonus: today
          })
          .eq('id', user.id)
        
        if (updateError) throw updateError
        return { bonus_amount: 1000 }
      }
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['balance', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['dailyBonus', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['currencyStats', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
    },
  })

  // Countdown timer effect
  React.useEffect(() => {
    if (!bonusStatus?.nextAvailableDate || bonusStatus.canClaim) {
      setCountdown('')
      return
    }

    const updateCountdown = () => {
      const now = new Date()
      const nextBonus = new Date(bonusStatus.nextAvailableDate!)
      const timeDiff = nextBonus.getTime() - now.getTime()
      
      if (timeDiff <= 0) {
        setCountdown('Available now!')
        queryClient.invalidateQueries({ queryKey: ['dailyBonus', user?.id] })
        return
      }
      
      const hours = Math.floor(timeDiff / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)
      
      setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [bonusStatus, queryClient, user?.id])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      {/* Current Balance Display */}
      <div className="bg-tarkov-dark rounded-lg p-6 shadow-lg">
        <h3 className="text-xl font-tarkov font-bold text-white mb-4 flex items-center space-x-2">
          <span className="text-2xl">💰</span>
          <span>Currency Balance</span>
        </h3>
        
        <div className="flex items-center justify-between mb-4">
          <CurrencyDisplay size="large" animated={true} />
          <div className="text-right">
            <div className="text-sm text-gray-400">Net Profit</div>
            <div className={`text-lg font-bold ${
              (currencyStats?.netProfit || 0) >= 0 ? 'text-tarkov-success' : 'text-tarkov-danger'
            }`}>
              {(currencyStats?.netProfit || 0) >= 0 ? '+' : ''}₽{formatCurrency(currencyStats?.netProfit || 0)}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-tarkov-secondary rounded-lg p-3">
            <div className="text-lg font-bold text-white">₽{formatCurrency(currencyStats?.totalWagered || 0)}</div>
            <div className="text-xs text-gray-400">Total Wagered</div>
          </div>
          <div className="bg-tarkov-secondary rounded-lg p-3">
            <div className="text-lg font-bold text-white">₽{formatCurrency(currencyStats?.totalWon || 0)}</div>
            <div className="text-xs text-gray-400">Total Won</div>
          </div>
          <div className="bg-tarkov-secondary rounded-lg p-3">
            <div className="text-lg font-bold text-white">{currencyStats?.gamesPlayed || 0}</div>
            <div className="text-xs text-gray-400">Games Played</div>
          </div>
        </div>
      </div>

      {/* Daily Bonus Section */}
      <div className={`rounded-lg p-6 shadow-lg transition-all duration-300 ${
        bonusStatus?.canClaim 
          ? 'bg-tarkov-dark border-2 border-tarkov-accent pulse-glow' 
          : 'bg-tarkov-dark border-2 border-tarkov-secondary'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`text-4xl ${bonusStatus?.canClaim ? 'animate-bounce' : ''}`}>
              {bonusStatus?.canClaim ? '🎁' : '⏰'}
            </div>
            <div>
              <h3 className="text-xl font-tarkov font-bold text-white mb-2 flex items-center space-x-3">
                <span>Daily Bonus</span>
                {!bonusStatus?.canClaim && (
                  <span className="text-xs bg-tarkov-success text-tarkov-dark px-3 py-1 rounded-full font-bold shadow-md">
                    CLAIMED
                  </span>
                )}
              </h3>
              
              {bonusStatus?.canClaim ? (
                <p className="text-tarkov-accent font-medium">
                  🎰 Your daily ₽{formatCurrency(bonusStatus.bonusAmount)} bonus is ready!
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="text-gray-300 font-medium">
                    Next bonus available in:
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="bg-tarkov-secondary px-3 py-1 rounded-md">
                      <span className="text-tarkov-accent font-mono text-lg font-bold">
                        {countdown || 'Calculating...'}
                      </span>
                    </div>
                    <span className="text-gray-400 text-sm">
                      (HH:MM:SS)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {bonusStatus?.canClaim ? (
            <button
              onClick={() => claimBonusMutation.mutate()}
              disabled={claimBonusMutation.isPending || bonusLoading}
              className="px-8 py-4 bg-tarkov-accent hover:bg-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-tarkov-dark font-bold text-lg rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              {claimBonusMutation.isPending ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Claiming...</span>
                </span>
              ) : (
                `Claim ₽${formatCurrency(bonusStatus?.bonusAmount || 1000)}`
              )}
            </button>
          ) : (
            <div className="px-6 py-4 bg-tarkov-secondary border border-tarkov-accent text-white font-bold rounded-lg flex items-center space-x-3">
              <span className="text-tarkov-accent text-xl">✨</span>
              <span>Bonus Claimed!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CurrencyManager