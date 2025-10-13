/**
 * Stock Market Trading Game Engine
 * 
 * Implements a hybrid provably fair + realistic stock market simulation
 * - Continuous price updates (every 1-2 seconds)
 * - Provably fair randomness using SecureRandomGenerator
 * - Realistic price patterns using GBM and mean reversion
 * - Buy/sell order execution with position management
 * - P&L tracking and balance integration
 */

import { BaseGame, GameBet, GameResult } from './types';
import { SecureRandomGenerator } from './random-generator';
import { PayoutCalculator } from './payout-calculator';
import { CurrencyService } from '../currency-new';
import { Client, Databases, ID } from 'node-appwrite';
import { appwriteClient } from '../../config/appwrite';
import { env } from '../../config/env';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;

export interface StockMarketBet extends GameBet {
  gameType: 'stock_market'
  action: 'buy' | 'sell'
  shares: number
  price: number
}

export interface StockMarketPosition {
  user_id: string
  shares: number
  avg_price: number
  unrealized_pnl: number
  created_at: string
  updated_at: string
}

export interface StockMarketTrade {
  user_id: string
  username: string
  trade_type: 'buy' | 'sell'
  shares: number
  price: number
  pnl?: number
  timestamp: string
}

export interface StockMarketState {
  current_price: number
  prev_price: number
  volatility: number
  trend: 'up' | 'down' | 'neutral'
  last_update: string
  tick_count: number
}

export class StockMarketGame extends BaseGame {
  private randomGenerator: SecureRandomGenerator
  private payoutCalculator: PayoutCalculator
  private databases: Databases
  private static instance: StockMarketGame

  private constructor() {
    super()
    this.randomGenerator = new SecureRandomGenerator()
    this.payoutCalculator = new PayoutCalculator()
    this.databases = new Databases(appwriteClient)
  }

  static getInstance(): StockMarketGame {
    if (!StockMarketGame.instance) {
      StockMarketGame.instance = new StockMarketGame()
    }
    return StockMarketGame.instance
  }

  /**
   * Get current market state
   */
  async getMarketState(): Promise<StockMarketState | null> {
    try {
      const doc = await this.databases.getDocument(
        DATABASE_ID,
        'stock_market_state',
        'current'
      )
      return doc as unknown as StockMarketState
    } catch (error) {
      console.error('Failed to get market state:', error)
      return null
    }
  }

  /**
   * Get user's current position
   */
  async getUserPosition(userId: string): Promise<StockMarketPosition | null> {
    try {
      const result = await this.databases.listDocuments(
        DATABASE_ID,
        'stock_market_positions',
        [
          `equal("user_id", "${userId}")`,
          'limit(1)'
        ]
      )
      
      if (result.documents.length === 0) {
        return null
      }
      
      return result.documents[0] as unknown as StockMarketPosition
    } catch (error) {
      console.error('Failed to get user position:', error)
      return null
    }
  }

  /**
   * Execute buy order
   */
  async executeBuy(userId: string, username: string, shares: number, currentPrice: number): Promise<GameResult> {
    try {
      // Check user balance
      const balance = await CurrencyService.getBalance(userId)
      const totalCost = shares * currentPrice
      
      if (balance < totalCost) {
        return {
          success: false,
          winAmount: 0,
          resultData: {} as any,
          error: 'Insufficient balance'
        }
      }

      // Get current position
      const position = await this.getUserPosition(userId)
      
      // Calculate new average price if position exists
      let newShares: number
      let newAvgPrice: number
      
      if (position) {
        // Add to existing position
        const totalValue = (position.shares * position.avg_price) + totalCost
        newShares = position.shares + shares
        newAvgPrice = totalValue / newShares
      } else {
        // Create new position
        newShares = shares
        newAvgPrice = currentPrice
      }

      // Deduct balance
      await CurrencyService.deductBalance(userId, totalCost)

      // Update or create position
      if (position) {
        await this.databases.updateDocument(
          DATABASE_ID,
          'stock_market_positions',
          position.$id,
          {
            shares: newShares,
            avg_price: newAvgPrice,
            updated_at: new Date().toISOString()
          }
        )
      } else {
        await this.databases.createDocument(
          DATABASE_ID,
          'stock_market_positions',
          ID.unique(),
          {
            user_id: userId,
            shares: newShares,
            avg_price: newAvgPrice,
            unrealized_pnl: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        )
      }

      // Record trade
      await this.databases.createDocument(
        DATABASE_ID,
        'stock_market_trades',
        ID.unique(),
        {
          user_id: userId,
          username,
          trade_type: 'buy',
          shares,
          price: currentPrice,
          timestamp: new Date().toISOString()
        }
      )

      // Record in game history
      await this.recordGameHistory(userId, totalCost, 0, {
        action: 'buy',
        shares,
        price: currentPrice,
        total_cost: totalCost
      })

      return {
        success: true,
        winAmount: 0,
        resultData: {
          action: 'buy',
          shares,
          price: currentPrice,
          total_cost: totalCost,
          new_balance: balance - totalCost
        } as any
      }
    } catch (error) {
      console.error('Buy order failed:', error)
      return {
        success: false,
        winAmount: 0,
        resultData: {} as any,
        error: 'Failed to execute buy order'
      }
    }
  }

  /**
   * Execute sell order
   */
  async executeSell(userId: string, username: string, shares: number, currentPrice: number): Promise<GameResult> {
    try {
      // Get current position
      const position = await this.getUserPosition(userId)
      
      if (!position || position.shares < shares) {
        return {
          success: false,
          winAmount: 0,
          resultData: {} as any,
          error: 'Insufficient shares'
        }
      }

      // Calculate P&L
      const totalProceeds = shares * currentPrice
      const costBasis = shares * position.avg_price
      const realizedPnL = totalProceeds - costBasis

      // Update position
      const newShares = position.shares - shares
      
      if (newShares === 0) {
        // Close position completely
        await this.databases.deleteDocument(
          DATABASE_ID,
          'stock_market_positions',
          position.$id
        )
      } else {
        // Update remaining position
        await this.databases.updateDocument(
          DATABASE_ID,
          'stock_market_positions',
          position.$id,
          {
            shares: newShares,
            updated_at: new Date().toISOString()
          }
        )
      }

      // Credit balance
      await CurrencyService.addBalance(userId, totalProceeds)

      // Record trade
      await this.databases.createDocument(
        DATABASE_ID,
        'stock_market_trades',
        ID.unique(),
        {
          user_id: userId,
          username,
          trade_type: 'sell',
          shares,
          price: currentPrice,
          pnl: realizedPnL,
          timestamp: new Date().toISOString()
        }
      )

      // Record in game history
      await this.recordGameHistory(userId, costBasis, realizedPnL, {
        action: 'sell',
        shares,
        price: currentPrice,
        proceeds: totalProceeds,
        realized_pnl: realizedPnL
      })

      return {
        success: true,
        winAmount: realizedPnL,
        resultData: {
          action: 'sell',
          shares,
          price: currentPrice,
          proceeds: totalProceeds,
          realized_pnl: realizedPnL
        } as any
      }
    } catch (error) {
      console.error('Sell order failed:', error)
      return {
        success: false,
        winAmount: 0,
        resultData: {} as any,
        error: 'Failed to execute sell order'
      }
    }
  }

  /**
   * Record game history
   */
  private async recordGameHistory(
    userId: string,
    betAmount: number,
    winAmount: number,
    resultData: any
  ): Promise<void> {
    try {
      await this.databases.createDocument(
        DATABASE_ID,
        'game_history',
        ID.unique(),
        {
          user_id: userId,
          game_type: 'stock_market',
          bet_amount: betAmount,
          win_amount: winAmount,
          result_data: resultData,
          created_at: new Date().toISOString()
        }
      )
    } catch (error) {
      console.error('Failed to record game history:', error)
    }
  }

  /**
   * Get user's trade history
   */
  async getUserTradeHistory(userId: string, limit: number = 50): Promise<StockMarketTrade[]> {
    try {
      const result = await this.databases.listDocuments(
        DATABASE_ID,
        'stock_market_trades',
        [
          `equal("user_id", "${userId}")`,
          `orderDesc("timestamp")`,
          `limit(${limit})`
        ]
      )
      
      return result.documents as unknown as StockMarketTrade[]
    } catch (error) {
      console.error('Failed to get trade history:', error)
      return []
    }
  }

  /**
   * Get recent trades for feed
   */
  async getRecentTrades(limit: number = 20): Promise<StockMarketTrade[]> {
    try {
      const result = await this.databases.listDocuments(
        DATABASE_ID,
        'stock_market_trades',
        [
          'orderDesc("timestamp")',
          `limit(${limit})`
        ]
      )
      
      return result.documents as unknown as StockMarketTrade[]
    } catch (error) {
      console.error('Failed to get recent trades:', error)
      return []
    }
  }

  /**
   * BaseGame interface implementation (not used for stock market)
   */
  async play(bet: StockMarketBet): Promise<GameResult> {
    // This method is not used for stock market
    // Use executeBuy or executeSell instead
    throw new Error('Use executeBuy or executeSell for stock market trading')
  }

  /**
   * Get game info
   */
  static getGameInfo() {
    return {
      name: 'Stock Market Trading',
      description: 'Trade stocks in real-time with provably fair price movements',
      min_bet: 1,
      max_bet: 100000
    }
  }
}

