/**
 * Stock Market API Service
 * 
 * Handles all API calls for the stock market trading game
 */

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
  const response = await fetch(`${API_URL}/games/stock-market/position`, {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get position');
  }

  const data = await response.json();
  return data.position;
}

/**
 * Get user's trade history
 */
export async function getUserTradeHistory(limit: number = 50): Promise<Trade[]> {
  const response = await fetch(`${API_URL}/games/stock-market/history?limit=${limit}`, {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
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
  const response = await fetch(`${API_URL}/games/stock-market/buy`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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
  const response = await fetch(`${API_URL}/games/stock-market/sell`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ shares }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to execute sell order');
  }

  const data = await response.json();
  return data.result;
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

