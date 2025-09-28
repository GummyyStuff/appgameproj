import { Hono, type Context } from 'hono'
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth'
import { asyncHandler } from '../middleware/error'
import { gameRateLimit } from '../middleware/rate-limit'
import { validationMiddleware, commonSchemas } from '../middleware/validation'
import { auditGame, auditLog } from '../middleware/audit'
import { z } from 'zod'
import { RouletteGame } from '../services/game-engine/roulette-game'
import { BlackjackGame } from '../services/game-engine/blackjack-game'
import { CaseOpeningService } from '../services/case-opening'

import { CurrencyService } from '../services/currency'
import { realtimeGameService } from '../services/realtime-game'

export const gameRoutes = new Hono()

// Apply optional auth to all routes first (allows GET requests without auth)
gameRoutes.use('*', optionalAuthMiddleware)

// Apply strict auth only to game action routes that require authentication
gameRoutes.use('/blackjack/start', authMiddleware)
gameRoutes.use('/blackjack/action', authMiddleware)
gameRoutes.use('/roulette/bet', authMiddleware)
gameRoutes.use('/case-opening/open', authMiddleware)
gameRoutes.use('/case-opening/purchase', authMiddleware)

// Apply rate limiting to all routes
gameRoutes.use('*', gameRateLimit)

// Game validation schemas
const rouletteBetSchema = z.object({
  amount: commonSchemas.betAmount,
  betType: z.string().min(1).max(20),
  betValue: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? val : val.toString()
  )
})

const blackjackStartSchema = z.object({
  amount: commonSchemas.betAmount
})

const blackjackActionSchema = z.object({
  gameId: commonSchemas.gameId,
  action: commonSchemas.blackjackAction,
  handIndex: z.number().int().min(0).max(3).optional()
})

const caseOpeningSchema = z.object({
  caseTypeId: z.string().min(1, 'Case type ID is required')
})



// Games overview endpoint
gameRoutes.get('/', asyncHandler(async (c: Context) => {
  return c.json({
    message: 'Tarkov Casino Games API',
    available_games: {
      roulette: '/api/games/roulette',
      blackjack: '/api/games/blackjack',
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

// Blackjack game endpoints
gameRoutes.get('/blackjack', asyncHandler(async (c: Context) => {
  return c.json({
    message: 'Blackjack game information',
    game_info: BlackjackGame.getGameInfo(),
    min_bet: 1,
    max_bet: 10000
  })
}))

gameRoutes.post('/blackjack/start',
  validationMiddleware(blackjackStartSchema),
  auditGame('blackjack_start'),
  asyncHandler(async (c: Context) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const { amount } = c.get('validatedData')

  // Check user balance
  const balance = await CurrencyService.getBalance(user.id)
  if (balance < amount) {
    return c.json({ error: 'Insufficient balance' }, 400)
  }

  try {
    // Create blackjack game instance
    const blackjackGame = new BlackjackGame()

    // Create bet object
    const bet = {
      userId: user.id,
      amount,
      gameType: 'blackjack' as const
    }

    // Start the game
    const result = await blackjackGame.play(bet)

    if (!result.success) {
      return c.json({ error: result.error || 'Game failed to start' }, 400)
    }

    // Note: For blackjack, we'll handle the full transaction when the game completes
    // This is different from roulette which processes immediately

    // Log game start
    const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')
    await auditLog.gamePlayStarted(user.id, 'blackjack', amount, ip)
    
    // Broadcast game start
    await realtimeGameService.handleBlackjackGameStart(user.id, amount, result.gameId!)

    return c.json({
      success: true,
      game_id: result.gameId,
      game_state: result.resultData,
      bet_amount: amount,
      current_balance: balance
    })
  } catch (error) {
    console.error('Blackjack start error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
}))

gameRoutes.post('/blackjack/action',
  validationMiddleware(blackjackActionSchema),
  asyncHandler(async (c: Context) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const validatedData = c.get('validatedData')
  console.log('Blackjack action - validated data:', validatedData)
  
  const { gameId, action, handIndex } = validatedData

  try {
    // Create blackjack game instance
    const blackjackGame = new BlackjackGame()

    // Create action object
    const blackjackAction = {
      userId: user.id,
      gameId,
      action,
      handIndex
    }

    // Process the action
    const result = await blackjackGame.processAction(blackjackAction)

    if (!result.success) {
      return c.json({ error: result.error || 'Action failed' }, 400)
    }

    // Check if game is completed
    const gameState = blackjackGame.getGameState(gameId)
    const isGameComplete = !gameState || gameState.gameStatus === 'completed'

    if (isGameComplete) {
      // Process the complete game transaction
      const transactionResult = await CurrencyService.processGameTransaction(
        user.id,
        'blackjack',
        result.betAmount || 0,
        result.winAmount,
        result.resultData
      )

      // Log game completion
      const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')
      await auditLog.gameCompleted(user.id, 'blackjack', result.betAmount || 0, result.winAmount, ip)
      
      // Broadcast game completion
      await realtimeGameService.handleBlackjackGameComplete(user.id, gameId, result)

      // Broadcast balance update
      await realtimeGameService.handleBalanceUpdate(
        user.id,
        transactionResult.newBalance,
        transactionResult.previousBalance
      )

      return c.json({
        success: true,
        game_complete: true,
        game_result: result.resultData,
        bet_amount: result.betAmount || 0,
        win_amount: result.winAmount,
        net_result: result.winAmount - (result.betAmount || 0),
        new_balance: transactionResult.newBalance,
        game_id: gameId
      })
    } else {
      // Game still in progress
      await realtimeGameService.handleBlackjackActionUpdate(user.id, gameId, action, result.resultData)

      return c.json({
        success: true,
        game_complete: false,
        game_state: result.resultData,
        game_id: gameId
      })
    }
  } catch (error) {
    console.error('Blackjack action error:', error)
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

// Step 1: Start case opening (deduct price)
gameRoutes.post('/cases/start',
  validationMiddleware(caseOpeningSchema),
  auditGame('case_opening'),
  asyncHandler(async (c: Context) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const { caseTypeId } = c.get('validatedData')

  try {
    // Validate case opening request
    const validation = await CaseOpeningService.validateCaseOpening(user.id, caseTypeId)
    if (!validation.isValid) {
      return c.json({ error: validation.error }, 400)
    }

    const caseType = validation.caseType!

    // Log game start
    const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')
    await auditLog.gamePlayStarted(user.id, 'case_opening', caseType.price, ip)

    // Deduct case price
    const deductionResult = await CurrencyService.deductCasePrice(
      user.id,
      caseType.price,
      {
        case_type_id: caseType.id,
        case_name: caseType.name,
        case_price: caseType.price,
        transaction_type: 'case_price_deduction'
      }
    )

    // Broadcast balance update (deduction)
    await realtimeGameService.handleBalanceUpdate(
      user.id,
      deductionResult.newBalance,
      deductionResult.previousBalance
    )

    return c.json({
      success: true,
      case_type: caseType,
      case_price: caseType.price,
      balance_after_deduction: deductionResult.newBalance,
      transaction_id: deductionResult.gameId,
      opening_id: `case_start_${Date.now()}_${user.id.slice(-8)}`
    })
  } catch (error) {
    console.error('Case opening start error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
}))

// Step 2: Complete case opening (determine winnings and credit)
gameRoutes.post('/cases/complete',
  asyncHandler(async (c: Context) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const { caseTypeId, openingId, delayCredit, predeterminedWinner } = await c.req.json()

  if (!caseTypeId) {
    return c.json({ error: 'caseTypeId is required' }, 400)
  }

  try {
    let openingResult

    if (predeterminedWinner) {
      // Use predetermined winner (for delayed credit scenario)
      openingResult = {
        case_type: predeterminedWinner.case_type,
        item_won: predeterminedWinner.item_won,
        currency_awarded: predeterminedWinner.currency_awarded,
        opening_id: predeterminedWinner.opening_id,
        timestamp: new Date().toISOString()
      }
    } else {
      // Open the case (determine what item is won)
      openingResult = await CaseOpeningService.openCase(user.id, caseTypeId)
    }

    let creditResult = null
    if (!delayCredit) {
      // Credit the winnings (only if not delaying)
      creditResult = await CurrencyService.creditCaseWinnings(
      user.id,
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
        original_opening_id: openingId
      }
      )

      // Log game completion and broadcast balance update only if credit happened
      const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')
      await auditLog.gameCompleted(
        user.id,
        'case_opening',
        openingResult.case_type.price,
        openingResult.currency_awarded,
        ip
      )

      // Broadcast final balance update (winnings credited)
      await realtimeGameService.handleBalanceUpdate(
        user.id,
        creditResult.newBalance,
        creditResult.previousBalance
      )
    }

    return c.json({
      success: true,
      opening_result: {
        case_type: openingResult.case_type,
        item_won: openingResult.item_won,
        currency_awarded: openingResult.currency_awarded,
        opening_id: openingResult.opening_id,
        timestamp: openingResult.timestamp
      },
      currency_awarded: openingResult.currency_awarded,
      balance_after_credit: delayCredit ? null : creditResult?.newBalance,
      credit_transaction_id: delayCredit ? null : creditResult?.gameId,
      net_result: openingResult.currency_awarded - openingResult.case_type.price,
      credit_delayed: delayCredit || false
    })
  } catch (error) {
    console.error('Case opening completion error:', error)
    return c.json({ error: 'Internal server error' }, 500)
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
  auditGame('case_opening'),
  asyncHandler(async (c: Context) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const { caseTypeId, previewOnly, requestId } = c.get('validatedData')

  // Request deduplication check
  if (requestId) {
    const dedupKey = `case_open_${user.id}_${requestId}`
    // Simple in-memory deduplication (in production, use Redis or similar)
    if (global.requestCache?.[dedupKey]) {
      return c.json({ error: 'Request already in progress' }, 429)
    }
    global.requestCache = global.requestCache || {}
    global.requestCache[dedupKey] = true

    // Clean up cache after 30 seconds
    setTimeout(() => {
      delete global.requestCache?.[dedupKey]
    }, 30000)
  }

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

    // Log game start
    const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')
    await auditLog.gamePlayStarted(user.id, 'case_opening', caseType.price, ip)

    // Open the case
    const openingResult = await CaseOpeningService.openCase(user.id, caseTypeId)

    // Process currency transaction atomically
    const transactionResult = await CurrencyService.processGameTransaction(
      user.id,
      'case_opening',
      caseType.price, // bet amount (case price)
      openingResult.currency_awarded, // win amount
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
        request_id: requestId
      }
    )

    if (!transactionResult.success) {
      return c.json({ error: 'Transaction failed' }, 500)
    }

    // Log game completion
    await auditLog.gameCompleted(
      user.id,
      'case_opening',
      caseType.price,
      openingResult.currency_awarded,
      ip
    )

    // Broadcast balance update
    await realtimeGameService.handleBalanceUpdate(
      user.id,
      transactionResult.newBalance,
      transactionResult.previousBalance
    )

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
      net_result: openingResult.currency_awarded - caseType.price,
      new_balance: transactionResult.newBalance,
      transaction_id: transactionResult.gameId
    })
  } catch (error) {
    console.error('Case opening error:', error)
    return c.json({ error: 'Internal server error' }, 500)
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

