/**
 * Stock Market Realtime Hook
 * 
 * Subscribes to Appwrite Realtime for stock market updates:
 * - Price updates (market state document)
 * - Trade feed (trades collection)
 * - Candles (candles collection)
 * 
 * Uses Appwrite Client.subscribe() for Web/JavaScript
 * See: https://appwrite.io/docs/apis/realtime
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { appwriteClient } from '../lib/appwrite';
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
   * Uses client.subscribe() for Web/JavaScript
   * Channel format: databases.<DATABASE_ID>.tables.<TABLE_ID>.rows.<ROW_ID>
   */
  const subscribeToMarketState = useCallback(() => {
    if (!onPriceUpdate) return

    const unsubscribe = appwriteClient.subscribe(
      `databases.${DATABASE_ID}.tables.stock_market_state.rows.current`,
      (response: any) => {
        // Check for update events
        if (response.events && (
          response.events.includes('databases.*.tables.*.rows.*.update') ||
          response.events.includes(`databases.${DATABASE_ID}.tables.stock_market_state.rows.current.update`)
        )) {
          console.log('📊 Market state updated:', response.payload)
          onPriceUpdate(response.payload as MarketState)
        }
      }
    )

    unsubscribeRefs.current.push(unsubscribe)
    console.log('✅ Subscribed to market state updates')
  }, [onPriceUpdate])

  /**
   * Subscribe to trade feed updates
   * Uses client.subscribe() for Web/JavaScript
   */
  const subscribeToTrades = useCallback(() => {
    if (!onTradeUpdate) return

    const unsubscribe = appwriteClient.subscribe(
      `databases.${DATABASE_ID}.tables.stock_market_trades.rows`,
      (response: any) => {
        // Check for create events
        if (response.events && (
          response.events.includes('databases.*.tables.*.rows.*.create') ||
          response.events.includes(`databases.${DATABASE_ID}.tables.stock_market_trades.rows.*.create`)
        )) {
          console.log('💹 New trade:', response.payload)
          onTradeUpdate(response.payload as Trade)
        }
      }
    )

    unsubscribeRefs.current.push(unsubscribe)
    console.log('✅ Subscribed to trade feed updates')
  }, [onTradeUpdate])

  /**
   * Subscribe to candle updates
   * Uses client.subscribe() for Web/JavaScript
   */
  const subscribeToCandles = useCallback(() => {
    if (!onCandleUpdate) return

    const unsubscribe = appwriteClient.subscribe(
      `databases.${DATABASE_ID}.tables.stock_market_candles.rows`,
      (response: any) => {
        // Check for create events
        if (response.events && (
          response.events.includes('databases.*.tables.*.rows.*.create') ||
          response.events.includes(`databases.${DATABASE_ID}.tables.stock_market_candles.rows.*.create`)
        )) {
          console.log('🕯️ New candle:', response.payload)
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

