import { Hono, type Context } from 'hono'
import { authMiddleware, optionalAuthMiddleware, criticalAuthMiddleware } from '../middleware/auth'
import { asyncHandler } from '../middleware/error'
import { gameBetRateLimit } from '../middleware/rate-limit'
import { validationMiddleware, commonSchemas } from '../middleware/validation'
import { auditGame, auditLog } from '../middleware/audit'
import { z } from 'zod'
import { Databases } from 'node-appwrite'
import { RouletteGame } from '../services/game-engine/roulette-game'
import { CaseOpeningService } from '../services/case-opening-appwrite'
import { StockMarketGame } from '../services/game-engine/stock-market-game'
import { stockMarketStateService } from '../services/stock-market-state'

import { CurrencyService } from '../services/currency-new'
import { realtimeGameService } from '../services/realtime-game'
import { appwriteClient } from '../config/appwrite'

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!
const databases = new Databases(appwriteClient)

export const gameRoutes = new Hono()

// Apply optional auth to all routes first (allows GET requests without auth)
gameRoutes.use('*', optionalAuthMiddleware)

// Apply critical auth with session validation to game betting endpoints (money operations)
gameRoutes.use('/roulette/bet', criticalAuthMiddleware)
gameRoutes.use('/case-opening/open', criticalAuthMiddleware)
gameRoutes.use('/case-opening/purchase', criticalAuthMiddleware)
gameRoutes.use('/stock-market/buy', criticalAuthMiddleware)
gameRoutes.use('/stock-market/sell', criticalAuthMiddleware)

// Apply stricter rate limiting to betting routes
gameRoutes.use('/roulette/bet', gameBetRateLimit)
gameRoutes.use('/case-opening/open', gameBetRateLimit)
gameRoutes.use('/case-opening/purchase', gameBetRateLimit)
gameRoutes.use('/stock-market/buy', gameBetRateLimit)
gameRoutes.use('/stock-market/sell', gameBetRateLimit)

// Game validation schemas
const rouletteBetSchema = z.object({
  amount: commonSchemas.betAmount,
  betType: z.string().min(1).max(20),
  betValue: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? val : val.toString()
  )
})

const stockMarketBuySchema = z.object({
  shares: z.number().positive().max(1000000)
})

const stockMarketSellSchema = z.object({
  shares: z.number().positive().max(1000000)
})




// Games overview endpoint
gameRoutes.get('/', asyncHandler(async (c: Context) => {
  return c.json({
    message: 'Tarkov Casino Games API',
    available_games: {
      roulette: '/api/games/roulette',
      stock_market: '/api/games/stock-market',
      case_opening: '/api/games/cases'
    },
    status: 'Games API ready'
  })
}))

// Roulette game endpoints
gameRoutes.get('/roulette', asyncHandler(async (c: Context) => {
  return c.json({
    message: 'Roulette game information',
    bet_types: RouletteGame.getBetTypes(),
    wheel_layout: RouletteGame.getWheelLayout(),
    min_bet: 1,
    max_bet: 10000
  })
}))

gameRoutes.post('/roulette/bet',
  validationMiddleware(rouletteBetSchema),
  auditGame('roulette_bet'),
  asyncHandler(async (c: Context) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const { amount, betType, betValue } = c.get('validatedData')

  // Check user balance
  const balance = await CurrencyService.getBalance(user.id)
  if (balance < amount) {
    return c.json({ error: 'Insufficient balance' }, 400)
  }

  try {
    // Log game start
    const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')
    await auditLog.gamePlayStarted(user.id, 'roulette', amount, ip)
    
    // Broadcast game start
    await realtimeGameService.handleRouletteGameStart(user.id, amount, betType, betValue)

    // Create roulette game instance
    const rouletteGame = new RouletteGame()

    // Create bet object
    const bet = {
      userId: user.id,
      amount,
      gameType: 'roulette' as const,
      betType,
      betValue
    }

    // Broadcast spin start
    const gameId = `roulette-${Date.now()}-${user.id}`
    await realtimeGameService.handleRouletteSpinStart(user.id, gameId)

    // Play the game
    const result = await rouletteGame.play(bet)

    if (!result.success) {
      return c.json({ error: result.error || 'Game failed' }, 400)
    }

    // Process currency transaction
    const transactionResult = await CurrencyService.processGameTransaction(
      user.id,
      'roulette',
      amount,
      result.winAmount,
      result.resultData
    )

    if (!transactionResult.success) {
      return c.json({ error: 'Transaction failed' }, 500)
    }

    // Broadcast game completion
    await realtimeGameService.handleRouletteGameComplete(user.id, gameId, result)

    // Log game completion
    await auditLog.gameCompleted(user.id, 'roulette', amount, result.winAmount, ip)
    
    // Broadcast balance update
    await realtimeGameService.handleBalanceUpdate(
      user.id,
      transactionResult.newBalance,
      transactionResult.previousBalance
    )

    return c.json({
      success: true,
      game_result: result.resultData,
      bet_amount: amount,
      win_amount: result.winAmount,
      net_result: result.winAmount - amount,
      new_balance: transactionResult.newBalance,
      game_id: gameId
    })
  } catch (error) {
    console.error('Roulette bet error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
}))

// Case Opening game endpoints
gameRoutes.get('/cases', asyncHandler(async (c: Context) => {
  try {
    const caseTypes = await CaseOpeningService.getCaseTypes()
    
    return c.json({
      message: 'Case opening game information',
      case_types: caseTypes,
      total_cases: caseTypes.length
    })
  } catch (error) {
    console.error('Error fetching case types:', error)
    return c.json({ error: 'Failed to fetch case types' }, 500)
  }
}))

gameRoutes.get('/cases/:caseTypeId', asyncHandler(async (c: Context) => {
  const caseTypeId = c.req.param('caseTypeId')
  
  if (!caseTypeId) {
    return c.json({ error: 'Case type ID is required' }, 400)
  }

  try {
    const caseType = await CaseOpeningService.getCaseType(caseTypeId)
    
    if (!caseType) {
      return c.json({ error: 'Case type not found' }, 404)
    }

    const itemPool = await CaseOpeningService.getItemPool(caseTypeId)
    
    return c.json({
      case_type: caseType,
      item_pool: itemPool,
      total_items: itemPool.length
    })
  } catch (error) {
    console.error('Error fetching case type details:', error)
    return c.json({ error: 'Failed to fetch case type details' }, 500)
  }
}))


// Simplified case opening endpoint (single transaction with optional preview)
const simplifiedCaseOpeningSchema = z.object({
  caseTypeId: z.string().min(1, 'Case type ID is required'),
  previewOnly: z.boolean().optional().default(false),
  requestId: z.string().optional() // For request deduplication
})

gameRoutes.post('/cases/open',
  validationMiddleware(simplifiedCaseOpeningSchema),
  // Removed auditGame middleware - using single audit log at completion
  asyncHandler(async (c: Context) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const { caseTypeId, previewOnly, requestId } = c.get('validatedData')

    // Request deduplication using promise-based approach (prevents race conditions)
    const dedupKey = requestId ? `case_open_${user.id}_${requestId}` : null
    const requestPromises = (global as any).requestPromises as Map<string, Promise<any>> | undefined
    
    if (dedupKey && requestPromises) {
      // If request is already in flight, wait for it and return same result
      const existingPromise = requestPromises.get(dedupKey)
      if (existingPromise) {
        console.log(`🔄 Deduplicating request: ${dedupKey}`)
        return await existingPromise
      }
    }

  // Wrap the entire request processing in a function
  const processRequest = async () => {
  try {
    // Validate case opening request
    const validation = await CaseOpeningService.validateCaseOpening(user.id, caseTypeId)
    if (!validation.isValid) {
      return c.json({ error: validation.error }, 400)
    }

    const caseType = validation.caseType!

    // For preview mode, just determine the result without processing transaction
    if (previewOnly) {
      const previewResult = await CaseOpeningService.previewCase(user.id, caseTypeId)

      return c.json({
        success: true,
        preview: true,
        opening_result: {
          case_type: caseType,
          item_won: previewResult.item_won,
          currency_awarded: previewResult.currency_awarded,
          opening_id: previewResult.opening_id,
          timestamp: previewResult.timestamp
        },
        case_price: caseType.price,
        estimated_net_result: previewResult.currency_awarded - caseType.price
      })
    }

    const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')

    // Open the case and process transaction in parallel where possible
    const openingResult = await CaseOpeningService.openCase(user.id, caseTypeId)

    // Process case opening as a single atomic transaction
    const transactionResult = await CurrencyService.processCaseOpening(
      user.id,
      caseType.price,
      openingResult.currency_awarded,
      {
        case_type_id: openingResult.case_type.id,
        case_name: openingResult.case_type.name,
        case_price: openingResult.case_type.price,
        item_id: openingResult.item_won.id,
        item_name: openingResult.item_won.name,
        item_rarity: openingResult.item_won.rarity,
        item_category: openingResult.item_won.category,
        item_value: openingResult.item_won.base_value,
        currency_awarded: openingResult.currency_awarded,
        opening_id: openingResult.opening_id,
        request_id: requestId,
        transaction_type: 'case_opening_complete'
      }
    )

    if (!transactionResult.success) {
      return c.json({ error: 'Transaction failed' }, 500)
    }

    // Run non-critical operations in parallel (fire and forget)
    Promise.all([
      // Single audit log for completion (removed redundant start log)
      auditLog.gameCompleted(
        user.id,
        'case_opening',
        caseType.price,
        openingResult.currency_awarded,
        ip
      ),
      // Broadcast balance update
      realtimeGameService.handleBalanceUpdate(
        user.id,
        transactionResult.newBalance,
        transactionResult.previousBalance
      )
    ]).catch(err => console.error('Non-critical operation failed:', err))

    return c.json({
      success: true,
      opening_result: {
        case_type: openingResult.case_type,
        item_won: openingResult.item_won,
        currency_awarded: openingResult.currency_awarded,
        opening_id: openingResult.opening_id,
        timestamp: openingResult.timestamp
      },
      case_price: caseType.price,
      currency_awarded: openingResult.currency_awarded,
      net_result: transactionResult.netResult,
      new_balance: transactionResult.newBalance,
      transaction_id: transactionResult.gameId
    })
  } catch (error: any) {
    console.error('❌ Case opening error:', error)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    return c.json({ error: error?.message || 'Internal server error' }, 500)
  }
  }

  // Store promise for deduplication and execute
  if (dedupKey) {
    // Initialize cache if needed
    if (!(global as any).requestPromises) {
      (global as any).requestPromises = new Map<string, Promise<any>>()
    }
    
    const promiseCache = (global as any).requestPromises as Map<string, Promise<any>>
    
    // Execute and store promise
    const requestPromise = processRequest().finally(() => {
      // Clean up after request completes (success or failure)
      setTimeout(() => {
        promiseCache.delete(dedupKey)
      }, 30000) // Keep for 30s to handle retries
    })
    
    promiseCache.set(dedupKey, requestPromise)
    return await requestPromise
  } else {
    // No deduplication requested, execute directly
    return await processRequest()
  }
}))

gameRoutes.get('/cases/stats/:userId?', asyncHandler(async (c: Context) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  // Allow users to only view their own stats (userId param ignored for security)
  const userId = user.id

  try {
    const stats = await CaseOpeningService.getCaseOpeningStats(userId)

    return c.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Error fetching case opening stats:', error)
    return c.json({ error: 'Failed to fetch case opening statistics' }, 500)
  }
}))

// ============================================
// STOCK MARKET GAME ENDPOINTS
// ============================================

// Get stock market game info
gameRoutes.get('/stock-market', asyncHandler(async (c: Context) => {
  return c.json({
    message: 'Stock Market Trading Game',
    game_info: StockMarketGame.getGameInfo(),
    min_bet: 1,
    max_bet: 100000
  })
}))

// Get current market state
gameRoutes.get('/stock-market/state', asyncHandler(async (c: Context) => {
  try {
    const state = await stockMarketStateService.getCurrentState()
    return c.json({
      success: true,
      state
    })
  } catch (error) {
    console.error('Failed to get market state:', error)
    return c.json({ error: 'Failed to get market state' }, 500)
  }
}))

// Get historical candles
gameRoutes.get('/stock-market/candles', asyncHandler(async (c: Context) => {
  const limit = parseInt(c.req.query('limit') || '100')
  
  try {
    const candles = await stockMarketStateService.getHistoricalCandles(limit)
    return c.json({
      success: true,
      candles
    })
  } catch (error) {
    console.error('Failed to get candles:', error)
    return c.json({ error: 'Failed to get candles' }, 500)
  }
}))

// Get user's position
gameRoutes.get('/stock-market/position', asyncHandler(async (c: Context) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  try {
    const game = StockMarketGame.getInstance()
    const position = await game.getUserPosition(user.id)
    
    return c.json({
      success: true,
      position: position || {
        shares: 0,
        avg_price: 0,
        unrealized_pnl: 0
      }
    })
  } catch (error) {
    console.error('Failed to get position:', error)
    return c.json({ error: 'Failed to get position' }, 500)
  }
}))

// Get user's trade history
gameRoutes.get('/stock-market/history', asyncHandler(async (c: Context) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const limit = parseInt(c.req.query('limit') || '50')

  try {
    const game = StockMarketGame.getInstance()
    const trades = await game.getUserTradeHistory(user.id, limit)
    
    return c.json({
      success: true,
      trades
    })
  } catch (error) {
    console.error('Failed to get trade history:', error)
    return c.json({ error: 'Failed to get trade history' }, 500)
  }
}))

// Get recent trades feed
gameRoutes.get('/stock-market/trades', asyncHandler(async (c: Context) => {
  const limit = parseInt(c.req.query('limit') || '20')

  try {
    const game = StockMarketGame.getInstance()
    const trades = await game.getRecentTrades(limit)
    
    return c.json({
      success: true,
      trades
    })
  } catch (error) {
    console.error('Failed to get recent trades:', error)
    return c.json({ error: 'Failed to get recent trades' }, 500)
  }
}))

// Buy shares
gameRoutes.post('/stock-market/buy',
  validationMiddleware(stockMarketBuySchema),
  auditGame('stock_market_buy'),
  asyncHandler(async (c: Context) => {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const { shares } = c.get('validatedData')

    try {
      // Get current market price
      const state = await stockMarketStateService.getCurrentState()
      const currentPrice = state.current_price

      // Execute buy order
      const game = StockMarketGame.getInstance()
      const result = await game.executeBuy(user.id, user.username || user.email, shares, currentPrice)

      if (!result.success) {
        return c.json({ error: result.error || 'Failed to execute buy order' }, 400)
      }

      // Log game activity
      const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')
      await auditLog.gamePlayStarted(user.id, 'stock_market', shares * currentPrice, ip)

      return c.json({
        success: true,
        result: result.resultData
      })
    } catch (error) {
      console.error('Buy order error:', error)
      return c.json({ error: 'Failed to execute buy order' }, 500)
    }
  })
)

// Sell shares
gameRoutes.post('/stock-market/sell',
  validationMiddleware(stockMarketSellSchema),
  auditGame('stock_market_sell'),
  asyncHandler(async (c: Context) => {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const { shares } = c.get('validatedData')

    try {
      // Get current market price
      const state = await stockMarketStateService.getCurrentState()
      const currentPrice = state.current_price

      // Execute sell order
      const game = StockMarketGame.getInstance()
      const result = await game.executeSell(user.id, user.username || user.email, shares, currentPrice)

      if (!result.success) {
        return c.json({ error: result.error || 'Failed to execute sell order' }, 400)
      }

      // Log game activity
      const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')
      await auditLog.gamePlayStarted(user.id, 'stock_market', shares * currentPrice, ip)

      return c.json({
        success: true,
        result: result.resultData
      })
    } catch (error) {
      console.error('Sell order error:', error)
      return c.json({ error: 'Failed to execute sell order' }, 500)
    }
  })
)

// Get leaderboard
gameRoutes.get('/stock-market/leaderboard', asyncHandler(async (c: Context) => {
  const timeframe = c.req.query('timeframe') || 'all' // all, daily, weekly
  const limit = parseInt(c.req.query('limit') || '10')
  
  try {
    // Calculate date filter based on timeframe
    let dateFilter: Date | null = null
    if (timeframe === 'daily') {
      dateFilter = new Date()
      dateFilter.setHours(0, 0, 0, 0)
    } else if (timeframe === 'weekly') {
      dateFilter = new Date()
      dateFilter.setDate(dateFilter.getDate() - 7)
    }

    // Get all trades within timeframe
    const tradesQuery = [
      'orderDesc("timestamp")',
      `limit(10000)` // Get enough trades to calculate stats
    ]

    const tradesResult = await databases.listDocuments(
      DATABASE_ID,
      'stock_market_trades',
      tradesQuery
    )

    const trades = tradesResult.documents as any[]

    // Filter trades by timeframe if specified
    const filteredTrades = dateFilter
      ? trades.filter(trade => new Date(trade.timestamp) >= dateFilter!)
      : trades

    // Calculate stats per user
    const userStats = new Map<string, {
      userId: string
      username: string
      totalProfit: number
      totalTrades: number
      totalSharesBought: number
      totalSharesSold: number
      totalCostBasis: number
      totalProceeds: number
    }>()

    // Process trades to calculate stats
    for (const trade of filteredTrades) {
      const { user_id, username, trade_type, shares, price, pnl } = trade
      
      if (!userStats.has(user_id)) {
        userStats.set(user_id, {
          userId: user_id,
          username: username,
          totalProfit: 0,
          totalTrades: 0,
          totalSharesBought: 0,
          totalSharesSold: 0,
          totalCostBasis: 0,
          totalProceeds: 0
        })
      }

      const stats = userStats.get(user_id)!
      stats.totalTrades++

      if (trade_type === 'buy') {
        stats.totalSharesBought += shares
        stats.totalCostBasis += shares * price
      } else if (trade_type === 'sell') {
        stats.totalSharesSold += shares
        stats.totalProceeds += shares * price
        if (pnl) {
          stats.totalProfit += pnl
        }
      }
    }

    // Calculate ROI and prepare leaderboard entries
    const leaderboard = Array.from(userStats.values())
      .map(stats => {
        // Calculate ROI based on realized profits and cost basis
        const roi = stats.totalCostBasis > 0
          ? (stats.totalProfit / stats.totalCostBasis) * 100
          : 0

        return {
          rank: 0, // Will be set after sorting
          username: stats.username,
          totalProfit: Math.round(stats.totalProfit * 100) / 100,
          roi: Math.round(roi * 100) / 100,
          trades: stats.totalTrades,
          sharesBought: Math.round(stats.totalSharesBought * 100) / 100,
          sharesSold: Math.round(stats.totalSharesSold * 100) / 100
        }
      })
      .sort((a, b) => b.totalProfit - a.totalProfit) // Sort by profit descending
      .slice(0, limit)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }))

    return c.json({
      success: true,
      leaderboard,
      timeframe,
      generated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return c.json({ error: 'Failed to get leaderboard' }, 500)
  }
}))

