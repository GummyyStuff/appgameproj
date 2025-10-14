/**
 * Stock Market State Service
 * 
 * Manages global market state and generates continuous price updates
 * - Generates new price every 1-2 seconds
 * - Uses hybrid provably fair + realistic algorithms
 * - Stores OHLC candles for historical data
 * - Broadcasts updates via Appwrite Realtime
 */

import { Client, Databases, ID, Query } from 'node-appwrite';
import { appwriteClient } from '../config/appwrite';
import { SecureRandomGenerator } from './game-engine/random-generator';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;

interface MarketState {
  current_price: number
  prev_price: number
  volatility: number
  trend: 'up' | 'down' | 'neutral'
  last_update: string
  tick_count: number
}

interface Candle {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export class StockMarketStateService {
  private static instance: StockMarketStateService
  private databases: Databases
  private randomGenerator: SecureRandomGenerator
  private priceUpdateInterval: NodeJS.Timeout | null = null
  private candleUpdateInterval: NodeJS.Timeout | null = null
  
  // Market parameters
  private readonly STARTING_PRICE = 100.0
  private readonly MIN_PRICE = 50.0
  private readonly MAX_PRICE = 150.0
  private readonly BASE_VOLATILITY = 0.02 // 2% volatility
  private readonly MEAN_REVERSION_RATE = 0.1 // Mean reversion strength
  private readonly MOMENTUM_FACTOR = 0.3 // Trend continuation strength
  
  // Current market state
  private currentPrice: number = this.STARTING_PRICE
  private prevPrice: number = this.STARTING_PRICE  // Bug #3: Track previous price correctly
  private trend: 'up' | 'down' | 'neutral' = 'neutral'
  private volatility: number = this.BASE_VOLATILITY
  private tickCount: number = 0
  
  // Candle tracking
  private currentCandle: Partial<Candle> | null = null
  private candleStartTime: number = Date.now()
  private readonly CANDLE_INTERVAL_MS = 60000 // 1 minute candles

  private constructor() {
    this.databases = new Databases(appwriteClient)
    this.randomGenerator = new SecureRandomGenerator()
  }

  static getInstance(): StockMarketStateService {
    if (!StockMarketStateService.instance) {
      StockMarketStateService.instance = new StockMarketStateService()
    }
    return StockMarketStateService.instance
  }

  /**
   * Initialize the service and load last state
   */
  async initialize(): Promise<void> {
    console.log('📊 Initializing Stock Market State Service...')
    
    try {
      // Load last state from database
      const lastState = await this.loadLastState()
      if (lastState) {
        this.currentPrice = lastState.current_price
        this.trend = lastState.trend
        this.volatility = lastState.volatility
        this.tickCount = lastState.tick_count
        console.log(`✅ Loaded last state: $${this.currentPrice.toFixed(2)} (${this.trend})`)
      } else {
        console.log('✅ Starting with default state')
      }
      
      // Start price generation
      this.startPriceGeneration()
      
      console.log('✅ Stock Market State Service initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Stock Market State Service:', error)
      throw error
    }
  }

  /**
   * Load last state from database
   */
  private async loadLastState(): Promise<MarketState | null> {
    try {
      const doc = await this.databases.getDocument(
        DATABASE_ID,
        'stock_market_state',
        'current'
      )
      return doc as unknown as MarketState
    } catch (error) {
      console.log('No previous state found, starting fresh')
      return null
    }
  }

  /**
   * Start continuous price generation
   */
  private startPriceGeneration(): void {
    // Generate new price every 1-2 seconds (random interval)
    const generatePrice = async () => {
      await this.generateNewPrice()
      
      // Schedule next update (1-2 seconds)
      const nextInterval = 1000 + Math.random() * 1000
      this.priceUpdateInterval = setTimeout(generatePrice, nextInterval)
    }
    
    // Start immediately
    generatePrice()
    
    // Start candle generation (every minute)
    this.candleUpdateInterval = setInterval(() => {
      this.closeCandle()
    }, this.CANDLE_INTERVAL_MS)
    
    console.log('✅ Price generation started')
  }

  /**
   * Generate new price using hybrid provably fair + realistic algorithm
   * BUG FIX #3: Now correctly tracks prev_price
   */
  private async generateNewPrice(): Promise<void> {
    try {
      // Bug #3: Save current price as previous before updating
      this.prevPrice = this.currentPrice
      
      // Generate provably fair random value
      const seed = {
        serverSeed: process.env.PROVABLY_FAIR_SERVER_SEED || 'default-seed',
        clientSeed: 'market',
        nonce: this.tickCount
      }
      
      const result = await this.randomGenerator.generateProvablyFairResult(seed)
      const randomValue = result.randomValue
      
      // Convert to standard normal distribution (Box-Muller transform)
      const u1 = randomValue
      const u2 = Math.random() // Second random for Box-Muller
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      
      // Calculate price change using Geometric Brownian Motion
      const drift = 0 // No drift (fair game)
      const diffusion = this.volatility * z
      
      // Apply momentum (trend continuation)
      let momentum = 0
      if (this.trend === 'up') {
        momentum = this.MOMENTUM_FACTOR * this.BASE_VOLATILITY
      } else if (this.trend === 'down') {
        momentum = -this.MOMENTUM_FACTOR * this.BASE_VOLATILITY
      }
      
      // Apply mean reversion (pull towards starting price)
      const meanReversion = -this.MEAN_REVERSION_RATE * (this.currentPrice - this.STARTING_PRICE) / this.STARTING_PRICE
      
      // Calculate new price
      const priceChange = drift + diffusion + momentum + meanReversion
      let newPrice = this.currentPrice * (1 + priceChange)
      
      // Apply bounds (soft boundaries)
      if (newPrice < this.MIN_PRICE) {
        newPrice = this.MIN_PRICE + (this.MIN_PRICE - newPrice) * 0.1
      } else if (newPrice > this.MAX_PRICE) {
        newPrice = this.MAX_PRICE - (newPrice - this.MAX_PRICE) * 0.1
      }
      
      // Update trend
      if (newPrice > this.currentPrice) {
        this.trend = 'up'
      } else if (newPrice < this.currentPrice) {
        this.trend = 'down'
      } else {
        this.trend = 'neutral'
      }
      
      // Update volatility based on recent price action
      const priceChangePercent = Math.abs((newPrice - this.currentPrice) / this.currentPrice)
      this.volatility = this.BASE_VOLATILITY * (1 + priceChangePercent * 2)
      
      // Update current price
      this.currentPrice = newPrice
      this.tickCount++
      
      // Update candle
      this.updateCandle(newPrice)
      
      // Save to database
      await this.saveState()
      
      // Log periodically
      if (this.tickCount % 10 === 0) {
        console.log(`📈 Tick ${this.tickCount}: $${newPrice.toFixed(2)} (${this.trend}, vol: ${(this.volatility * 100).toFixed(2)}%)`)
      }
    } catch (error) {
      console.error('Failed to generate new price:', error)
    }
  }

  /**
   * Update current candle with new price
   */
  private updateCandle(price: number): void {
    const now = Date.now()
    
    if (!this.currentCandle || now - this.candleStartTime >= this.CANDLE_INTERVAL_MS) {
      // Start new candle
      this.currentCandle = {
        timestamp: new Date(now).toISOString(),
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0
      }
      this.candleStartTime = now
    } else {
      // Update existing candle
      if (this.currentCandle) {
        this.currentCandle.high = Math.max(this.currentCandle.high, price)
        this.currentCandle.low = Math.min(this.currentCandle.low, price)
        this.currentCandle.close = price
        this.currentCandle.volume = (this.currentCandle.volume || 0) + 1
      }
    }
  }

  /**
   * Close current candle and save to database
   */
  private async closeCandle(): Promise<void> {
    if (!this.currentCandle) return
    
    try {
      await this.databases.createDocument(
        DATABASE_ID,
        'stock_market_candles',
        ID.unique(),
        this.currentCandle as Candle
      )
      
      console.log(`🕯️ Candle closed: O:$${this.currentCandle.open.toFixed(2)} H:$${this.currentCandle.high.toFixed(2)} L:$${this.currentCandle.low.toFixed(2)} C:$${this.currentCandle.close.toFixed(2)}`)
      
      // Clear current candle
      this.currentCandle = null
    } catch (error) {
      console.error('Failed to save candle:', error)
    }
  }

  /**
   * Save current state to database
   * BUG FIX #3: Now correctly saves prev_price
   */
  private async saveState(): Promise<void> {
    try {
      await this.databases.updateDocument(
        DATABASE_ID,
        'stock_market_state',
        'current',
        {
          current_price: this.currentPrice,
          prev_price: this.prevPrice,  // Bug #3: Now correctly tracks previous price
          volatility: this.volatility,
          trend: this.trend,
          last_update: new Date().toISOString(),
          tick_count: this.tickCount
        }
      )
    } catch (error) {
      console.error('Failed to save state:', error)
    }
  }

  /**
   * Get current market state
   * BUG FIX #3: Now correctly returns prev_price
   */
  async getCurrentState(): Promise<MarketState> {
    return {
      current_price: this.currentPrice,
      prev_price: this.prevPrice,  // Bug #3: Now correctly returns previous price
      volatility: this.volatility,
      trend: this.trend,
      last_update: new Date().toISOString(),
      tick_count: this.tickCount
    }
  }

  /**
   * Get historical candles
   */
  async getHistoricalCandles(limit: number = 100): Promise<Candle[]> {
    try {
      const result = await this.databases.listDocuments(
        DATABASE_ID,
        'stock_market_candles',
        [
          Query.orderDesc('timestamp'),
          Query.limit(limit)
        ]
      )
      
      return result.documents.reverse() as unknown as Candle[]
    } catch (error) {
      console.error('Failed to get historical candles:', error)
      return []
    }
  }

  /**
   * Shutdown the service
   */
  shutdown(): void {
    console.log('🛑 Shutting down Stock Market State Service...')
    
    if (this.priceUpdateInterval) {
      clearTimeout(this.priceUpdateInterval)
    }
    
    if (this.candleUpdateInterval) {
      clearInterval(this.candleUpdateInterval)
    }
    
    // Close final candle
    if (this.currentCandle) {
      this.closeCandle()
    }
    
    console.log('✅ Stock Market State Service shut down')
  }
}

// Export singleton instance
export const stockMarketStateService = StockMarketStateService.getInstance()

