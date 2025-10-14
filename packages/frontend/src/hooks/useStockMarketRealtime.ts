/**
 * Stock Market Realtime Hook
 * 
 * Subscribes to Appwrite Realtime for stock market updates:
 * - Price updates (market state document)
 * - Trade feed (trades collection)
 * - Candles (candles collection)
 * 
 * Uses Appwrite Client.subscribe() for Web/JavaScript
 * Channel format: databases.<DATABASE_ID>.collections.<COLLECTION_ID>.documents.<DOCUMENT_ID>
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
   * Channel format: databases.<DATABASE_ID>.collections.<COLLECTION_ID>.documents.<DOCUMENT_ID>
   */
  const subscribeToMarketState = useCallback(() => {
    if (!onPriceUpdate) {
      console.log('[STOCK_MARKET] Skipping market state subscription - no callback')
      return
    }

    const channel = `databases.${DATABASE_ID}.collections.stock_market_state.documents.current`
    console.log('[STOCK_MARKET] Subscribing to channel:', channel)

    const unsubscribe = appwriteClient.subscribe(
      channel,
      (response: any) => {
        console.log('[STOCK_MARKET] Received update:', response)
        // Check for update events
        if (response.events && (
          response.events.includes('databases.*.collections.*.documents.*.update') ||
          response.events.includes(`databases.${DATABASE_ID}.collections.stock_market_state.documents.current.update`)
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
    if (!onTradeUpdate) {
      console.log('[STOCK_MARKET] Skipping trades subscription - no callback')
      return
    }

    const channel = `databases.${DATABASE_ID}.collections.stock_market_trades.documents`
    console.log('[STOCK_MARKET] Subscribing to channel:', channel)

    const unsubscribe = appwriteClient.subscribe(
      channel,
      (response: any) => {
        console.log('[STOCK_MARKET] Received trade update:', response)
        // Check for create events
        if (response.events && (
          response.events.includes('databases.*.collections.*.documents.*.create') ||
          response.events.includes(`databases.${DATABASE_ID}.collections.stock_market_trades.documents.*.create`)
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
    if (!onCandleUpdate) {
      console.log('[STOCK_MARKET] Skipping candles subscription - no callback')
      return
    }

    const channel = `databases.${DATABASE_ID}.collections.stock_market_candles.documents`
    console.log('[STOCK_MARKET] Subscribing to channel:', channel)

    const unsubscribe = appwriteClient.subscribe(
      channel,
      (response: any) => {
        console.log('[STOCK_MARKET] Received candle update:', response)
        // Check for create events
        if (response.events && (
          response.events.includes('databases.*.collections.*.documents.*.create') ||
          response.events.includes(`databases.${DATABASE_ID}.collections.stock_market_candles.documents.*.create`)
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
    console.log('[STOCK_MARKET] subscribeAll called, enabled:', enabled)
    
    if (!enabled) {
      console.log('[STOCK_MARKET] Subscriptions disabled, skipping')
      return
    }

    try {
      console.log('[STOCK_MARKET] Starting subscriptions...')
      console.log('[STOCK_MARKET] Database ID:', DATABASE_ID)
      
      subscribeToMarketState()
      subscribeToTrades()
      subscribeToCandles()
      
      setIsConnected(true)
      setError(null)
      console.log('✅ All stock market subscriptions active')
      
      // Production logging
      if (import.meta.env.PROD) {
        console.log('[STOCK_MARKET_REALTIME] Connected and subscribed to all channels')
      }
    } catch (err) {
      console.error('❌ Failed to subscribe to stock market realtime:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect to realtime')
      setIsConnected(false)
      
      // Production logging
      if (import.meta.env.PROD) {
        console.error('[STOCK_MARKET_REALTIME] Connection failed:', err)
      }
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

