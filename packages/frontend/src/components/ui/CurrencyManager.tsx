import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
// Supabase import removed - using Appwrite backend API
import CurrencyDisplay from './CurrencyDisplay'
import { FontAwesomeSVGIcons } from './FontAwesomeSVG'

interface CurrencyStats {
  currentBalance: number
  totalWagered: number
  totalWon: number
  netProfit: number
  gamesPlayed: number
}

const CurrencyManager: React.FC = () => {
  const { user } = useAuth()

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
          <FontAwesomeSVGIcons.Wallet className="text-tarkov-accent" size={24} />
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
    </div>
  )
}

export default CurrencyManager