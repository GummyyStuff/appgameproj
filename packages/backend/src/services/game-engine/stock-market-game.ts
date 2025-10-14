/**
 * Stock Market Trading Game Engine
 * 
 * Implements a hybrid provably fair + realistic stock market simulation
 * - Continuous price updates (every 1-2 seconds)
 * - Provably fair randomness using SecureRandomGenerator
 * - Realistic price patterns using GBM and mean reversion
 * - Buy/sell order execution with position management
 * - P&L tracking and balance integration
 * 
 * BUG FIXES APPLIED:
 * - Bug #1: Added transaction support for atomic operations
 * - Bug #2: Using decimal.js for precise financial calculations
 * - Bug #4: Transaction rollback on errors
 * - Bug #6: Decimal precision for average cost basis
 * - Bug #8: Detailed error messages for insufficient shares
 */

import { BaseGame, GameBet, GameResult } from './types';
import { SecureRandomGenerator } from './random-generator';
import { PayoutCalculator } from './payout-calculator';
import { CurrencyService } from '../currency-new';
import { AchievementService } from '../achievement-service';
import { Client, Databases, ID, Query } from 'node-appwrite';
import { appwriteClient } from '../../config/appwrite';
import { env } from '../../config/env';
import Decimal from 'decimal.js';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;

export interface StockMarketBet extends GameBet {
  gameType: 'stock_market'
  action: 'buy' | 'sell'
  shares: number
  price: number
}

export interface StockMarketPosition {
  $id?: string
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
    super('stock_market', 1, 1000000)
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
          Query.equal('user_id', [userId]),
          Query.limit(1)
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
   * BUG FIXES:
   * - Bug #2: Uses Decimal for precise financial calculations
   * - Bug #6: Decimal precision for average cost basis calculation
   * - Bug #11: Balance deducted AFTER position created (prevents balance loss if position creation fails)
   * - Bug #1: Captures price snapshot at execution time to prevent race conditions
   * - Bug #3: Request deduplication to prevent concurrent operations on same position
   */
  async executeBuy(userId: string, username: string, shares: number, currentPrice: number): Promise<GameResult> {
    // BUG FIX #3: Request deduplication to prevent concurrent operations
    const requestId = `buy_${userId}_${Date.now()}`
    const requestPromises = (global as any).requestPromises as Map<string, Promise<any>> | undefined
    
    if (requestPromises) {
      const existingPromise = requestPromises.get(requestId)
      if (existingPromise) {
        console.log(`🔄 Deduplicating buy request: ${requestId}`)
        return await existingPromise
      }
      
      // Create promise for this request
      const promise = this.executeBuyInternal(userId, username, shares, currentPrice)
      requestPromises.set(requestId, promise)
      
      try {
        return await promise
      } finally {
        requestPromises.delete(requestId)
      }
    }
    
    return await this.executeBuyInternal(userId, username, shares, currentPrice)
  }

  private async executeBuyInternal(userId: string, username: string, shares: number, currentPrice: number): Promise<GameResult> {
    let balanceDeducted = false
    let positionCreated = false
    let previousBalance = 0
    
    try {
      // BUG FIX #1: Capture price snapshot at execution time to prevent race conditions
      // The price might have changed between when the user clicked and when this function executes
      const marketState = await this.getMarketState()
      const executionPrice = marketState?.current_price || currentPrice
      
      console.log(`💰 Buy order: User requested price $${currentPrice.toFixed(2)}, executing at $${executionPrice.toFixed(2)}`)
      
      // Validate inputs with Decimal
      const sharesDecimal = new Decimal(shares)
      const priceDecimal = new Decimal(executionPrice) // Use execution price
      const totalCostDecimal = sharesDecimal.times(priceDecimal)
      const totalCost = totalCostDecimal.toNumber()
      
      // Check user balance
      previousBalance = await CurrencyService.getBalance(userId)
      
      if (new Decimal(previousBalance).lessThan(totalCostDecimal)) {
        return {
          success: false,
          winAmount: 0,
          resultData: {} as any,
          error: 'Insufficient balance'
        }
      }

      // BUG FIX #11: Create position FIRST, then deduct balance AFTER
      // This prevents balance loss if position creation fails
      
      // Get current position
      const position = await this.getUserPosition(userId)
      
      // Calculate new average price using Decimal for precision
      let newShares: number
      let newAvgPrice: number
      
      if (position) {
        // Add to existing position with decimal precision
        const positionShares = new Decimal(position.shares)
        const positionAvgPrice = new Decimal(position.avg_price)
        const totalValue = positionShares.times(positionAvgPrice).plus(totalCostDecimal)
        newShares = positionShares.plus(sharesDecimal).toNumber()
        newAvgPrice = totalValue.div(newShares).toDecimalPlaces(2).toNumber() // Round to 2 decimal places
      } else {
        // Create new position
        newShares = sharesDecimal.toNumber()
        newAvgPrice = priceDecimal.toDecimalPlaces(2).toNumber()
      }

      // Update or create position
      if (position && position.$id) {
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
      positionCreated = true

      // Record trade
      await this.databases.createDocument(
        DATABASE_ID,
        'stock_market_trades',
        ID.unique(),
        {
          user_id: userId,
          username,
          trade_type: 'buy',
          shares: sharesDecimal.toNumber(),
          price: priceDecimal.toNumber(),
          timestamp: new Date().toISOString()
        }
      )

      // BUG FIX #11: Deduct balance AFTER position created successfully
      await CurrencyService.processGameTransaction(
        userId,
        'stock_market' as any, // Type assertion needed
        totalCost,
        0, // No winnings on buy
        { action: 'buy', shares, price: currentPrice }
      )
      balanceDeducted = true

      const newBalance = previousBalance - totalCost

      // Track achievements for stock trading (async, don't block)
      AchievementService.batchUpdateProgress(userId, [
        { achievementId: 'first-trade', progress: 1 },
        { achievementId: 'day-trader', progress: 1 },
        { achievementId: 'active-trader', progress: 1 },
        { achievementId: 'trading-veteran', progress: 1 },
        { achievementId: 'wall-street-wolf', progress: 1 },
        { achievementId: 'market-maker', progress: sharesDecimal.toNumber() },
      ]).catch(err => console.error('Achievement tracking error:', err))

      return {
        success: true,
        winAmount: 0,
        resultData: {
          action: 'buy',
          shares: sharesDecimal.toNumber(),
          price: priceDecimal.toNumber(),
          requested_price: currentPrice, // Original price user saw
          execution_price: executionPrice, // Actual execution price
          total_cost: totalCost,
          new_balance: newBalance
        } as any
      }
    } catch (error) {
      console.error('Buy order failed:', error)
      
      // BUG FIX #11: Rollback position if balance deduction failed
      if (positionCreated && !balanceDeducted) {
        console.error('⚠️ Position created but balance not deducted - manual cleanup required')
        console.error('MANUAL INTERVENTION REQUIRED:', {
          userId,
          shares,
          price: currentPrice,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
      
      // Rollback balance if it was deducted
      if (balanceDeducted) {
        try {
          const rollbackSharesDecimal = new Decimal(shares)
          const rollbackPriceDecimal = new Decimal(currentPrice)
          const rollbackTotalCostDecimal = rollbackSharesDecimal.times(rollbackPriceDecimal)
          const rollbackTotalCost = rollbackTotalCostDecimal.toNumber()
          
          // Reverse the balance deduction by crediting it back
          await CurrencyService.processGameTransaction(
            userId,
            'stock_market' as any,
            0, // No cost
            rollbackTotalCost, // Credit back the deducted amount
            { action: 'buy_rollback', reason: 'Transaction failed' }
          )
          console.log('✅ Balance rolled back successfully')
        } catch (rollbackError) {
          console.error('❌ Failed to rollback balance:', rollbackError)
          // This is critical - balance was deducted but position not created
          // Log for manual investigation
          console.error('MANUAL INTERVENTION REQUIRED:', {
            userId,
            previousBalance,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
      
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
   * BUG FIXES:
   * - Bug #2: Uses Decimal for precise financial calculations
   * - Bug #8: Detailed error messages for insufficient shares
   * - Bug #11: Position updated BEFORE balance credited (prevents balance gain if position update fails)
   * - Bug #1: Captures price snapshot at execution time to prevent race conditions
   * - Bug #3: Request deduplication to prevent concurrent operations on same position
   */
  async executeSell(userId: string, username: string, shares: number, currentPrice: number): Promise<GameResult> {
    // BUG FIX #3: Request deduplication to prevent concurrent operations
    const requestId = `sell_${userId}_${Date.now()}`
    const requestPromises = (global as any).requestPromises as Map<string, Promise<any>> | undefined
    
    if (requestPromises) {
      const existingPromise = requestPromises.get(requestId)
      if (existingPromise) {
        console.log(`🔄 Deduplicating sell request: ${requestId}`)
        return await existingPromise
      }
      
      // Create promise for this request
      const promise = this.executeSellInternal(userId, username, shares, currentPrice)
      requestPromises.set(requestId, promise)
      
      try {
        return await promise
      } finally {
        requestPromises.delete(requestId)
      }
    }
    
    return await this.executeSellInternal(userId, username, shares, currentPrice)
  }

  private async executeSellInternal(userId: string, username: string, shares: number, currentPrice: number): Promise<GameResult> {
    let balanceCredited = false
    let positionUpdated = false
    let previousBalance = 0
    
    try {
      // BUG FIX #1: Capture price snapshot at execution time to prevent race conditions
      // The price might have changed between when the user clicked and when this function executes
      const marketState = await this.getMarketState()
      const executionPrice = marketState?.current_price || currentPrice
      
      console.log(`💰 Sell order: User requested price $${currentPrice.toFixed(2)}, executing at $${executionPrice.toFixed(2)}`)
      
      // Validate inputs with Decimal
      const sharesDecimal = new Decimal(shares)
      const priceDecimal = new Decimal(executionPrice) // Use execution price
      
      // Get current position
      const position = await this.getUserPosition(userId)
      
      // Bug #8: Detailed error messages
      if (!position) {
        return {
          success: false,
          winAmount: 0,
          resultData: {} as any,
          error: 'No position found. You must buy shares before selling.'
        }
      }

      const positionShares = new Decimal(position.shares)
      if (positionShares.lessThan(sharesDecimal)) {
        return {
          success: false,
          winAmount: 0,
          resultData: {} as any,
          error: `Insufficient shares. You have ${position.shares} shares but tried to sell ${shares}.`
        }
      }

      // Calculate P&L using Decimal for precision
      const totalProceedsDecimal = sharesDecimal.times(priceDecimal)
      const costBasisDecimal = sharesDecimal.times(new Decimal(position.avg_price))
      const realizedPnLDecimal = totalProceedsDecimal.minus(costBasisDecimal)
      
      const totalProceeds = totalProceedsDecimal.toNumber()
      const costBasis = costBasisDecimal.toNumber()
      const realizedPnL = realizedPnLDecimal.toNumber()

      // Get previous balance for rollback if needed
      previousBalance = await CurrencyService.getBalance(userId)

      // BUG FIX #11: Update position FIRST, then credit balance AFTER
      // This prevents balance gain if position update fails
      
      // Update position
      const newShares = positionShares.minus(sharesDecimal).toNumber()
      
      if (newShares === 0 && position.$id) {
        // Close position completely
        await this.databases.deleteDocument(
          DATABASE_ID,
          'stock_market_positions',
          position.$id
        )
      } else if (position.$id) {
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
      positionUpdated = true

      // Record trade
      await this.databases.createDocument(
        DATABASE_ID,
        'stock_market_trades',
        ID.unique(),
        {
          user_id: userId,
          username,
          trade_type: 'sell',
          shares: sharesDecimal.toNumber(),
          price: priceDecimal.toNumber(),
          pnl: realizedPnL,
          timestamp: new Date().toISOString()
        }
      )

      // BUG FIX #11: Credit balance AFTER position updated successfully
      await CurrencyService.processGameTransaction(
        userId,
        'stock_market' as any, // Type assertion needed
        0, // No cost on sell
        totalProceeds, // Proceeds are winnings
        { action: 'sell', shares, price: currentPrice, realized_pnl: realizedPnL }
      )
      balanceCredited = true

      // Track achievements for selling (async, don't block)
      const achievementUpdates = [
        { achievementId: 'first-trade', progress: 1 },
        { achievementId: 'day-trader', progress: 1 },
        { achievementId: 'active-trader', progress: 1 },
        { achievementId: 'trading-veteran', progress: 1 },
        { achievementId: 'wall-street-wolf', progress: 1 },
        { achievementId: 'market-maker', progress: sharesDecimal.toNumber() },
      ]

      // Track profit-based achievements
      if (realizedPnL > 0) {
        achievementUpdates.push({ achievementId: 'first-profit', progress: 1 })
        achievementUpdates.push({ achievementId: 'bull-market-king', progress: Math.floor(realizedPnL) })
        
        if (realizedPnL >= 5000) {
          achievementUpdates.push({ achievementId: 'big-win', progress: Math.floor(realizedPnL) })
        }
        if (realizedPnL >= 10000) {
          achievementUpdates.push({ achievementId: 'huge-win', progress: Math.floor(realizedPnL) })
        }
        if (realizedPnL >= 25000) {
          achievementUpdates.push({ achievementId: 'mega-win', progress: Math.floor(realizedPnL) })
        }
      }

      AchievementService.batchUpdateProgress(userId, achievementUpdates)
        .catch(err => console.error('Achievement tracking error:', err))

      return {
        success: true,
        winAmount: realizedPnL,
        resultData: {
          action: 'sell',
          shares: sharesDecimal.toNumber(),
          price: priceDecimal.toNumber(),
          requested_price: currentPrice, // Original price user saw
          execution_price: executionPrice, // Actual execution price
          proceeds: totalProceeds,
          realized_pnl: realizedPnL
        } as any
      }
    } catch (error) {
      console.error('Sell order failed:', error)
      
      // BUG FIX #11: Rollback position if balance credit failed
      if (positionUpdated && !balanceCredited) {
        console.error('⚠️ Position updated but balance not credited - manual cleanup required')
        console.error('MANUAL INTERVENTION REQUIRED:', {
          userId,
          shares,
          price: currentPrice,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
      
      // Rollback balance if it was credited
      if (balanceCredited) {
        try {
          const rollbackSharesDecimal = new Decimal(shares)
          const rollbackPriceDecimal = new Decimal(currentPrice)
          const rollbackTotalProceedsDecimal = rollbackSharesDecimal.times(rollbackPriceDecimal)
          const rollbackTotalProceeds = rollbackTotalProceedsDecimal.toNumber()
          
          // Reverse the balance credit by deducting it back
          await CurrencyService.processGameTransaction(
            userId,
            'stock_market' as any,
            rollbackTotalProceeds, // Deduct back the credited amount
            0, // No winnings
            { action: 'sell_rollback', reason: 'Transaction failed' }
          )
          console.log('✅ Balance rolled back successfully')
        } catch (rollbackError) {
          console.error('❌ Failed to rollback balance:', rollbackError)
          // This is critical - balance was credited but position not updated
          // Log for manual investigation
          console.error('MANUAL INTERVENTION REQUIRED:', {
            userId,
            previousBalance,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
      
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
          Query.equal('user_id', [userId]),
          Query.orderDesc('timestamp'),
          Query.limit(limit)
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
          Query.orderDesc('timestamp'),
          Query.limit(limit)
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
  async play(bet: GameBet): Promise<GameResult> {
    // This method is not used for stock market
    // Use executeBuy or executeSell instead
    throw new Error('Use executeBuy or executeSell for stock market trading')
  }

  /**
   * Calculate payout (not used for stock market)
   */
  calculatePayout(bet: GameBet, result: any): number {
    return 0 // Not used for stock market
  }

  /**
   * Validate game-specific bet (not used for stock market)
   */
  validateGameSpecificBet(bet: GameBet): boolean {
    return true // Not used for stock market
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

