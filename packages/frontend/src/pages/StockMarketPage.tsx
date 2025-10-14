/**
 * Stock Market Page
 * 
 * Main page for the stock market trading game
 * Combines chart, trading interface, and leaderboard
 */

import { useState, useEffect, useCallback } from 'react';
import { StockMarketChart } from '../components/games/StockMarketChart';
import { StockMarketTrading } from '../components/games/StockMarketTrading';
import { StockMarketLeaderboard } from '../components/games/StockMarketLeaderboard';
import { useStockMarketRealtime } from '../hooks/useStockMarketRealtime';
import { getMarketState, getHistoricalCandles, type MarketState, type Candle } from '../services/stock-market-api';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { RealtimeDiagnostic } from '../components/debug/RealtimeDiagnostic';

export default function StockMarketPage() {
  const [marketState, setMarketState] = useState<MarketState | null>(null)
  const [candles, setCandles] = useState<Candle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [state, historicalCandles] = await Promise.all([
        getMarketState(),
        getHistoricalCandles(100)
      ])
      setMarketState(state)
      setCandles(historicalCandles)
      setError(null)
    } catch (err) {
      console.error('Failed to load initial data:', err)
      setError('Failed to load market data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // Subscribe to realtime updates
  useStockMarketRealtime({
    onPriceUpdate: (newState) => {
      setMarketState(newState)
    },
    onCandleUpdate: (newCandle) => {
      setCandles((prev) => {
        // Add new candle and keep last 100
        const updated = [...prev, newCandle]
        return updated.slice(-100)
      })
    },
    enabled: true
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tarkov-darker flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-tarkov-accent mx-auto mb-4"></div>
          <p className="text-tarkov-accent text-lg">Loading Stock Market...</p>
        </div>
      </div>
    )
  }

  if (error || !marketState) {
    return (
      <div className="min-h-screen bg-tarkov-darker flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error || 'Failed to load market data'}</p>
          <button
            onClick={loadInitialData}
            className="px-4 py-2 bg-tarkov-accent text-tarkov-dark rounded-lg hover:bg-tarkov-accent/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const trendIcon = marketState.trend === 'up' ? 
    <TrendingUp className="w-5 h-5 text-green-500" /> : 
    marketState.trend === 'down' ? 
    <TrendingDown className="w-5 h-5 text-red-500" /> : 
    <Minus className="w-5 h-5 text-gray-500" />

  return (
    <div className="min-h-screen bg-tarkov-darker p-4 md:p-8">
      <RealtimeDiagnostic />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-tarkov-text flex items-center gap-3">
              <Activity className="w-8 h-8" />
              Stock Market Trading
            </h1>
            <p className="text-tarkov-text-secondary mt-1">
              Real-time trading with provably fair price movements
            </p>
          </div>

          {/* Market Stats */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-tarkov-text-secondary">Current Price</p>
              <p className={`text-2xl font-bold flex items-center gap-2 ${
                marketState.trend === 'up' ? 'text-green-500' : 
                marketState.trend === 'down' ? 'text-red-500' : 
                'text-gray-400'
              }`}>
                {trendIcon}
                ${marketState.current_price.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-tarkov-text-secondary">Volatility</p>
              <p className="text-xl font-semibold text-tarkov-text">
                {(marketState.volatility * 100).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <StockMarketChart
              candles={candles}
              currentPrice={marketState.current_price}
              trend={marketState.trend}
            />
          </div>

          {/* Trading Panel - Takes 1 column on large screens */}
          <div>
            <StockMarketTrading
              currentPrice={marketState.current_price}
            />
          </div>
        </div>

        {/* Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            <StockMarketLeaderboard timeframe="all" />
          </div>
        </div>

        {/* Info Footer */}
        <div className="bg-tarkov-dark border border-tarkov-border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-tarkov-text-secondary">Market Status</p>
              <p className="font-semibold text-green-500">Active</p>
            </div>
            <div>
              <p className="text-sm text-tarkov-text-secondary">Price Updates</p>
              <p className="font-semibold text-tarkov-text">Real-time</p>
            </div>
            <div>
              <p className="text-sm text-tarkov-text-secondary">Total Trades</p>
              <p className="font-semibold text-tarkov-text">24/7</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

