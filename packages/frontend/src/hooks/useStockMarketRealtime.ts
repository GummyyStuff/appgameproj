/**
 * Stock Market Realtime Hook
 * 
 * Subscribes to Appwrite Realtime for stock market updates:
 * - Price updates (market state document)
 * - Trade feed (trades collection)
 * - Candles (candles collection)
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeResponseEvent } from 'appwrite';
import { client } from '../lib/appwrite';
import type { MarketState, Trade, Candle } from '../services/stock-market-api';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID!;

interface UseStockMarketRealtimeOptions {
  onPriceUpdate?: (state: MarketState) => void
  onTradeUpdate?: (trade: Trade) => void
  onCandleUpdate?: (candle: Candle) => void
  enabled?: boolean
}

export function useStockMarketRealtime({
  onPriceUpdate,
  onTradeUpdate,
  onCandleUpdate,
  enabled = true
}: UseStockMarketRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unsubscribeRefs = useRef<(() => void)[]>([])

  /**
   * Subscribe to market state updates
   */
  const subscribeToMarketState = useCallback(() => {
    if (!onPriceUpdate) return

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.stock_market_state.documents.current`,
      (response: RealtimeResponseEvent<MarketState>) => {
        if (response.events.includes('databases.*.collections.*.documents.*.update')) {
          onPriceUpdate(response.payload as MarketState)
        }
      }
    )

    unsubscribeRefs.current.push(unsubscribe)
    console.log('✅ Subscribed to market state updates')
  }, [onPriceUpdate])

  /**
   * Subscribe to trade feed updates
   */
  const subscribeToTrades = useCallback(() => {
    if (!onTradeUpdate) return

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.stock_market_trades.documents`,
      (response: RealtimeResponseEvent<Trade>) => {
        if (response.events.includes('databases.*.collections.*.documents.*.create')) {
          onTradeUpdate(response.payload as Trade)
        }
      }
    )

    unsubscribeRefs.current.push(unsubscribe)
    console.log('✅ Subscribed to trade feed updates')
  }, [onTradeUpdate])

  /**
   * Subscribe to candle updates
   */
  const subscribeToCandles = useCallback(() => {
    if (!onCandleUpdate) return

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.stock_market_candles.documents`,
      (response: RealtimeResponseEvent<Candle>) => {
        if (response.events.includes('databases.*.collections.*.documents.*.create')) {
          onCandleUpdate(response.payload as Candle)
        }
      }
    )

    unsubscribeRefs.current.push(unsubscribe)
    console.log('✅ Subscribed to candle updates')
  }, [onCandleUpdate])

  /**
   * Subscribe to all realtime channels
   */
  const subscribeAll = useCallback(() => {
    if (!enabled) return

    try {
      subscribeToMarketState()
      subscribeToTrades()
      subscribeToCandles()
      setIsConnected(true)
      setError(null)
      console.log('✅ All stock market subscriptions active')
    } catch (err) {
      console.error('❌ Failed to subscribe to stock market realtime:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect to realtime')
      setIsConnected(false)
    }
  }, [enabled, subscribeToMarketState, subscribeToTrades, subscribeToCandles])

  /**
   * Unsubscribe from all channels
   */
  const unsubscribeAll = useCallback(() => {
    unsubscribeRefs.current.forEach(unsubscribe => {
      try {
        unsubscribe()
      } catch (err) {
        console.error('Error unsubscribing:', err)
      }
    })
    unsubscribeRefs.current = []
    setIsConnected(false)
    console.log('✅ Unsubscribed from all stock market channels')
  }, [])

  // Subscribe on mount and when enabled changes
  useEffect(() => {
    if (enabled) {
      subscribeAll()
    } else {
      unsubscribeAll()
    }

    // Cleanup on unmount
    return () => {
      unsubscribeAll()
    }
  }, [enabled, subscribeAll, unsubscribeAll])

  return {
    isConnected,
    error,
    subscribe: subscribeAll,
    unsubscribe: unsubscribeAll
  }
}

