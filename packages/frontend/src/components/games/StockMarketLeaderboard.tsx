/**
 * Stock Market Leaderboard Component
 * 
 * Displays top traders and rankings
 */

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Trophy, TrendingUp, TrendingDown, Award, RefreshCw, Medal } from 'lucide-react';
import { getLeaderboard } from '../../services/stock-market-api';

interface LeaderboardEntry {
  rank: number
  username: string
  totalProfit: number
  roi: number
  trades: number
}

interface StockMarketLeaderboardProps {
  timeframe?: 'all' | 'daily' | 'weekly'
}

export function StockMarketLeaderboard({ timeframe = 'all' }: StockMarketLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getLeaderboard(timeframe)
      setLeaderboard(data.leaderboard || [])
    } catch (err) {
      console.error('Failed to load leaderboard:', err)
      setError('Failed to load leaderboard')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLeaderboard()
  }, [timeframe])

  const timeframeLabels = {
    all: 'All Time',
    daily: 'Today',
    weekly: 'This Week'
  }

  return (
    <Card className="p-6 bg-tarkov-dark border-tarkov-border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-tarkov-text flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Leaderboard
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-tarkov-text-secondary">
            {timeframeLabels[timeframe]}
          </span>
          <button
            onClick={loadLeaderboard}
            disabled={isLoading}
            className="text-tarkov-text-secondary hover:text-tarkov-accent transition-colors disabled:opacity-50"
            title="Refresh leaderboard"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tarkov-accent mx-auto mb-3"></div>
          <p className="text-tarkov-text-secondary">Loading leaderboard...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-500 mb-3">{error}</p>
          <button
            onClick={loadLeaderboard}
            className="px-4 py-2 bg-tarkov-accent text-tarkov-dark rounded-lg hover:bg-tarkov-accent/90"
          >
            Retry
          </button>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-8">
          <Award className="w-12 h-12 text-tarkov-text-secondary mx-auto mb-3" />
          <p className="text-tarkov-text-secondary">No data available yet</p>
          <p className="text-sm text-tarkov-text-secondary mt-1">
            Start trading to see the leaderboard!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.rank}
              className={`flex items-center gap-4 p-4 rounded-lg ${
                index === 0
                  ? 'bg-yellow-500/10 border border-yellow-500/30'
                  : index === 1
                  ? 'bg-gray-500/10 border border-gray-500/30'
                  : index === 2
                  ? 'bg-orange-500/10 border border-orange-500/30'
                  : 'bg-tarkov-darker border border-tarkov-border'
              }`}
            >
              {/* Rank with Medal Icon for Top 3 */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                index === 0 ? 'bg-yellow-500' :
                index === 1 ? 'bg-gray-400' :
                index === 2 ? 'bg-orange-500' :
                'bg-tarkov-accent'
              }`}>
                {index < 3 ? (
                  <Medal className={`w-6 h-6 ${
                    index === 0 ? 'text-yellow-900' :
                    index === 1 ? 'text-gray-900' :
                    'text-orange-900'
                  }`} />
                ) : (
                  <span className="text-sm font-bold text-tarkov-dark">
                    {entry.rank}
                  </span>
                )}
              </div>

              {/* Username */}
              <div className="flex-1">
                <p className="font-semibold text-tarkov-text">{entry.username}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-tarkov-text-secondary">
                    {entry.trades} trades
                  </span>
                  <Badge variant={entry.roi >= 0 ? 'default' : 'destructive'}>
                    {entry.roi >= 0 ? '+' : ''}{entry.roi.toFixed(2)}% ROI
                  </Badge>
                </div>
              </div>

              {/* Profit/Loss */}
              <div className="text-right">
                <p className={`font-bold text-lg ${entry.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {entry.totalProfit >= 0 ? '+' : ''}
                  ${entry.totalProfit.toFixed(2)}
                </p>
                <p className="text-xs text-tarkov-text-secondary mt-0.5">
                  Total Profit
                </p>
              </div>

              {/* Trend Icon */}
              <div className="flex-shrink-0">
                {entry.totalProfit >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-tarkov-border">
        <p className="text-xs text-center text-tarkov-text-secondary">
          Leaderboard updates every 5 minutes
        </p>
      </div>
    </Card>
  )
}

