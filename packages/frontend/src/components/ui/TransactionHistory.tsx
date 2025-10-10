import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
// Supabase import removed - using Appwrite backend API
import { FontAwesomeSVGIcons } from './FontAwesomeSVG'

interface Transaction {
  id: string
  game_type: string
  bet_amount: number
  win_amount: number
  net_result: number
  created_at: string
  result_data?: any
}

interface TransactionHistoryProps {
  limit?: number
  showFilters?: boolean
  compact?: boolean
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  limit = 20,
  showFilters = true,
  compact = false
}) => {
  const { user } = useAuth()
  const [gameFilter, setGameFilter] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['transactions', user?.id, gameFilter, sortOrder, limit],
    queryFn: async () => {
      if (!user) return []
      
      let query = supabase
        .from('game_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: sortOrder === 'asc' })
        .limit(limit)
      
      if (gameFilter !== 'all') {
        query = query.eq('game_type', gameFilter)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data as Transaction[]
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (compact) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case 'roulette': return <FontAwesomeSVGIcons.Circle size={16} />
      case 'blackjack': return <FontAwesomeSVGIcons.Spade size={16} />
      case 'admin': return <FontAwesomeSVGIcons.Shield size={16} />
      default: return <FontAwesomeSVGIcons.Gamepad size={16} />
    }
  }

  const getGameName = (gameType: string) => {
    switch (gameType) {
      case 'roulette': return 'Roulette'
      case 'blackjack': return 'Blackjack'

      case 'admin': return 'Admin'
      default: return gameType.charAt(0).toUpperCase() + gameType.slice(1)
    }
  }

  if (!user) return null

  if (isLoading) {
    return (
      <div className="bg-tarkov-dark rounded-lg p-6">
        <div className="text-center py-8">
          <FontAwesomeSVGIcons.AlarmClock className="text-tarkov-accent mx-auto mb-4 animate-spin" size={48} />
          <p className="text-gray-400">Loading transaction history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-tarkov-dark rounded-lg p-6">
        <div className="text-center py-8">
          <FontAwesomeSVGIcons.Times className="text-tarkov-danger mx-auto mb-4" size={48} />
          <p className="text-tarkov-danger">Failed to load transaction history</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-tarkov-dark rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-tarkov font-bold text-white flex items-center space-x-2">
          <FontAwesomeSVGIcons.AlarmClock className="text-tarkov-accent" size={24} />
          <span>Transaction History</span>
        </h3>
        
        {showFilters && (
          <div className="flex items-center space-x-4">
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="bg-tarkov-secondary border border-tarkov-primary rounded-md px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-tarkov-accent"
            >
              <option value="all">All Games</option>
              <option value="roulette">Roulette</option>
              <option value="blackjack">Blackjack</option>

            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="bg-tarkov-secondary hover:bg-tarkov-primary border border-tarkov-primary rounded-md px-3 py-1 text-white text-sm transition-colors"
            >
              {sortOrder === 'desc' ? '↓ Newest' : '↑ Oldest'}
            </button>
          </div>
        )}
      </div>

      {!transactions || transactions.length === 0 ? (
        <div className="text-center py-8">
          <FontAwesomeSVGIcons.Gamepad className="text-gray-400 mx-auto mb-4" size={48} />
          <p className="text-gray-400">No transactions found. Start playing to see your history!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className={`
                bg-tarkov-secondary rounded-lg p-4 transition-all duration-200 hover:bg-tarkov-primary
                ${compact ? 'p-3' : 'p-4'}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getGameIcon(transaction.game_type)}</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white">
                        {getGameName(transaction.game_type)}
                      </span>
                      {!compact && (
                        <span className="text-xs text-gray-400">
                          {formatDate(transaction.created_at)}
                        </span>
                      )}
                    </div>
                    {compact && (
                      <div className="text-xs text-gray-400">
                        {formatDate(transaction.created_at)}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-400">
                      Bet: ₽{formatCurrency(transaction.bet_amount)}
                    </div>
                    <div className="text-sm text-gray-400">
                      Won: ₽{formatCurrency(transaction.win_amount)}
                    </div>
                    <div className={`font-bold ${
                      transaction.net_result > 0 
                        ? 'text-tarkov-success' 
                        : transaction.net_result < 0 
                        ? 'text-tarkov-danger' 
                        : 'text-gray-400'
                    }`}>
                      {transaction.net_result > 0 ? '+' : ''}₽{formatCurrency(transaction.net_result)}
                    </div>
                  </div>
                </div>
              </div>
              
              {!compact && transaction.result_data && (
                <div className="mt-2 pt-2 border-t border-tarkov-primary">
                  <div className="text-xs text-gray-400">
                    {transaction.game_type === 'roulette' && transaction.result_data.winning_number !== undefined && (
                      <span>Winning Number: {transaction.result_data.winning_number}</span>
                    )}
                    {transaction.game_type === 'blackjack' && transaction.result_data.player_hand && (
                      <span>Player: {transaction.result_data.player_hand.join(', ')} | Dealer: {transaction.result_data.dealer_hand?.join(', ')}</span>
                    )}

                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {transactions && transactions.length >= limit && (
        <div className="text-center mt-6">
          <p className="text-sm text-gray-400">
            Showing last {limit} transactions
          </p>
        </div>
      )}
    </div>
  )
}

export default TransactionHistory