/**
 * Stock Market API Service
 * 
 * Handles all API calls for the stock market trading game
 */

import { account } from '../lib/appwrite'
import * as Sentry from '@sentry/react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface MarketState {
  current_price: number
  prev_price: number
  volatility: number
  trend: 'up' | 'down' | 'neutral'
  last_update: string
  tick_count: number
}

export interface Candle {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Position {
  shares: number
  avg_price: number
  unrealized_pnl: number
}

export interface Trade {
  user_id: string
  username: string
  trade_type: 'buy' | 'sell'
  shares: number
  price: number
  pnl?: number
  timestamp: string
}

export interface BuyOrderResult {
  action: 'buy'
  shares: number
  price: number
  total_cost: number
  new_balance: number
}

export interface SellOrderResult {
  action: 'sell'
  shares: number
  price: number
  proceeds: number
  realized_pnl: number
}

/**
 * Get current market state
 */
export async function getMarketState(): Promise<MarketState> {
  const response = await fetch(`${API_URL}/games/stock-market/state`, {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get market state');
  }

  const data = await response.json();
  return data.state;
}

/**
 * Get historical candles
 */
export async function getHistoricalCandles(limit: number = 100): Promise<Candle[]> {
  const response = await fetch(`${API_URL}/games/stock-market/candles?limit=${limit}`, {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get historical candles');
  }

  const data = await response.json();
  return data.candles;
}

/**
 * Get user's current position
 */
export async function getUserPosition(): Promise<Position> {
  // Start Sentry span for position API call
  return Sentry.startSpan({
    op: 'stock_market.get_position',
    name: 'Get User Position',
  }, async () => {
    try {
      // Get current user for authentication header
      const user = await account.get();
      
      // Log position API call attempt
      Sentry.addBreadcrumb({
        message: 'Making position API call',
        category: 'stock_market',
        level: 'info',
        data: {
          userId: user.$id,
          apiUrl: `${API_URL}/games/stock-market/position`,
          timestamp: new Date().toISOString()
        }
      })
      
      const response = await fetch(`${API_URL}/games/stock-market/position`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-Appwrite-User-Id': user.$id, // Required for auth
        },
      });

      if (!response.ok) {
        const errorText = await response.text()
        
        // Log API error
        Sentry.addBreadcrumb({
          message: 'Position API call failed',
          category: 'stock_market',
          level: 'error',
          data: {
            userId: user.$id,
            status: response.status,
            statusText: response.statusText,
            errorText,
            timestamp: new Date().toISOString()
          }
        })
        
        throw new Error(`Failed to get position: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Log successful position API call
      Sentry.addBreadcrumb({
        message: 'Position API call successful',
        category: 'stock_market',
        level: 'info',
        data: {
          userId: user.$id,
          position: data.position,
          hasPosition: !!data.position,
          shares: data.position?.shares || 0,
          timestamp: new Date().toISOString()
        }
      })
      
      return data.position;
    } catch (error) {
      // Log position API error
      Sentry.captureException(error, {
        tags: {
          operation: 'get_user_position',
          api_endpoint: 'stock-market/position'
        },
        extra: {
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      
      throw error;
    }
  });
}

/**
 * Get user's trade history
 */
export async function getUserTradeHistory(limit: number = 50): Promise<Trade[]> {
  // Get current user for authentication header
  const user = await account.get();
  
  const response = await fetch(`${API_URL}/games/stock-market/history?limit=${limit}`, {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'X-Appwrite-User-Id': user.$id, // Required for auth
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get trade history');
  }

  const data = await response.json();
  return data.trades;
}

/**
 * Get recent trades feed
 */
export async function getRecentTrades(limit: number = 20): Promise<Trade[]> {
  const response = await fetch(`${API_URL}/games/stock-market/trades?limit=${limit}`, {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get recent trades');
  }

  const data = await response.json();
  return data.trades;
}

/**
 * Buy shares
 */
export async function buyShares(shares: number): Promise<BuyOrderResult> {
  // Get current user for authentication header
  const user = await account.get();
  
  const response = await fetch(`${API_URL}/games/stock-market/buy`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Appwrite-User-Id': user.$id, // Required for auth
    },
    body: JSON.stringify({ shares }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to execute buy order');
  }

  const data = await response.json();
  return data.result;
}

/**
 * Sell shares
 */
export async function sellShares(shares: number): Promise<SellOrderResult> {
  // Start Sentry span for sell API call
  return Sentry.startSpan({
    op: 'stock_market.sell_shares',
    name: 'Sell Shares API Call',
    data: {
      shares
    }
  }, async () => {
    try {
      // Get current user for authentication header
      const user = await account.get();
      
      // Log sell API call attempt
      Sentry.addBreadcrumb({
        message: 'Making sell shares API call',
        category: 'stock_market',
        level: 'info',
        data: {
          userId: user.$id,
          shares,
          apiUrl: `${API_URL}/games/stock-market/sell`,
          timestamp: new Date().toISOString()
        }
      })
      
      const response = await fetch(`${API_URL}/games/stock-market/sell`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Appwrite-User-Id': user.$id, // Required for auth
        },
        body: JSON.stringify({ shares }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Log sell API error
        Sentry.addBreadcrumb({
          message: 'Sell shares API call failed',
          category: 'stock_market',
          level: 'error',
          data: {
            userId: user.$id,
            shares,
            status: response.status,
            statusText: response.statusText,
            error,
            timestamp: new Date().toISOString()
          }
        })
        
        throw new Error(error.error || 'Failed to execute sell order');
      }

      const data = await response.json();
      
      // Log successful sell API call
      Sentry.addBreadcrumb({
        message: 'Sell shares API call successful',
        category: 'stock_market',
        level: 'info',
        data: {
          userId: user.$id,
          shares,
          result: data.result,
          timestamp: new Date().toISOString()
        }
      })
      
      return data.result;
    } catch (error) {
      // Log sell API error
      Sentry.captureException(error, {
        tags: {
          operation: 'sell_shares',
          api_endpoint: 'stock-market/sell',
          shares
        },
        extra: {
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      
      throw error;
    }
  });
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(timeframe: 'all' | 'daily' | 'weekly' = 'all') {
  const response = await fetch(`${API_URL}/games/stock-market/leaderboard?timeframe=${timeframe}`, {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get leaderboard');
  }

  const data = await response.json();
  return data;
}

