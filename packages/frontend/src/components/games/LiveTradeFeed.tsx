/**
 * Live Trade Feed Component
 * 
 * Real-time ticker showing recent trades from all players
 * Updates via Appwrite Realtime subscriptions
 */

import { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useStockMarketRealtime } from '../../hooks/useStockMarketRealtime';
import type { Trade } from '../../services/stock-market-api';

interface LiveTradeFeedProps {
  maxTrades?: number
}

export function LiveTradeFeed({ maxTrades = 20 }: LiveTradeFeedProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const feedRef = useRef<HTMLDivElement>(null)
  const [isAutoScroll, setIsAutoScroll] = useState(true)

  // Subscribe to trade updates
  useStockMarketRealtime({
    onTradeUpdate: (newTrade) => {
      // Validate trade data before adding
      if (!newTrade || !newTrade.user_id || !newTrade.timestamp) {
        console.warn('Invalid trade data received:', newTrade)
        return
      }

      setTrades((prev) => {
        const updated = [newTrade, ...prev]
        return updated.slice(0, maxTrades)
      })

      // Auto-scroll to top if enabled
      if (isAutoScroll && feedRef.current) {
        feedRef.current.scrollTop = 0
      }
    },
    enabled: true
  })

  // Load initial trades
  useEffect(() => {
    const loadInitialTrades = async () => {
      try {
        const response = await fetch('/api/games/stock-market/trades?limit=20')
        if (response.ok) {
          const data = await response.json()
          // Filter out any invalid trades
          const validTrades = (data.trades || []).filter((trade: any) => 
            trade && trade.user_id && trade.timestamp && trade.price !== null && trade.price !== undefined
          )
          setTrades(validTrades)
        }
      } catch (error) {
        console.error('Failed to load initial trades:', error)
      }
    }

    loadInitialTrades()
  }, [])

  const formatTime = (timestamp: string | null | undefined) => {
    if (!timestamp) return '--:--:--'
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return '--:--:--'
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    } catch {
      return '--:--:--'
    }
  }

  const formatUsername = (username: string | null | undefined) => {
    if (!username) return 'Anonymous'
    if (username.length > 12) {
      return username.substring(0, 12) + '...'
    }
    return username
  }

  return (
    <div className="bg-tarkov-dark rounded-lg border border-tarkov-secondary overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-tarkov-secondary bg-tarkov-darker">
        <h3 className="text-sm font-bold text-tarkov-text uppercase tracking-wide font-tarkov">
          📡 LIVE TRADE FEED
        </h3>
        <p className="text-xs text-tarkov-text-secondary mt-0.5">
          Real-time multiplayer activity
        </p>
      </div>

      {/* Trade Feed */}
      <div
        ref={feedRef}
        className="h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-tarkov-secondary scrollbar-track-tarkov-darker"
        onScroll={(e) => {
          const target = e.target as HTMLDivElement
          setIsAutoScroll(target.scrollTop < 10)
        }}
      >
        {trades.length === 0 ? (
          <div className="flex items-center justify-center h-full text-tarkov-text-secondary text-sm">
            Waiting for trades...
          </div>
        ) : (
          <div className="divide-y divide-tarkov-secondary/30">
            {trades.filter(trade => trade && trade.user_id && trade.timestamp).map((trade, index) => (
              <div
                key={`${trade.user_id}-${trade.timestamp}-${index}`}
                className={`px-4 py-2 hover:bg-tarkov-darker/50 transition-colors ${
                  index === 0 ? 'animate-pulse-once' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Trade Type Icon */}
                  <div className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center ${
                    trade.trade_type === 'buy'
                      ? 'bg-tarkov-success/20'
                      : 'bg-tarkov-danger/20'
                  }`}>
                    {trade.trade_type === 'buy' ? (
                      <TrendingUp className="w-4 h-4 text-tarkov-success" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-tarkov-danger" />
                    )}
                  </div>

                  {/* Trade Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-tarkov-text truncate">
                        {formatUsername(trade.username)}
                      </span>
                      <span className={`text-xs font-bold ${
                        trade.trade_type === 'buy' ? 'text-tarkov-success' : 'text-tarkov-danger'
                      }`}>
                        {trade.trade_type.toUpperCase()}
                      </span>
                      <span className="text-xs text-tarkov-text-secondary">
                        {trade.shares ? trade.shares.toFixed(0) : '0'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-tarkov-accent font-mono">
                        @${trade.price ? trade.price.toFixed(2) : '0.00'}
                      </span>
                      {trade.pnl !== undefined && trade.pnl !== null && trade.pnl !== 0 && (
                        <span className={`text-xs font-semibold ${
                          trade.pnl >= 0 ? 'text-tarkov-success' : 'text-tarkov-danger'
                        }`}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="text-xs text-tarkov-text-secondary font-mono flex-shrink-0">
                    {formatTime(trade.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-scroll indicator */}
      {!isAutoScroll && trades.length > 0 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
          <button
            onClick={() => {
              if (feedRef.current) {
                feedRef.current.scrollTop = 0
                setIsAutoScroll(true)
              }
            }}
            className="px-3 py-1 bg-tarkov-accent text-tarkov-dark text-xs font-bold rounded-full shadow-lg hover:bg-tarkov-accent/90"
          >
            ↑ New Trades
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse-once {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(246, 173, 85, 0.1); }
        }
        .animate-pulse-once {
          animation: pulse-once 0.6s ease-in-out;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thumb-tarkov-secondary::-webkit-scrollbar-thumb {
          background-color: #4A5568;
          border-radius: 3px;
        }
        .scrollbar-track-tarkov-darker::-webkit-scrollbar-track {
          background-color: #171923;
        }
      `}</style>
    </div>
  )
}

