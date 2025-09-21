import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { asyncHandler } from '../middleware/error'
import { RouletteGame } from '../services/game-engine/roulette-game'
import { BlackjackGame } from '../services/game-engine/blackjack-game'
import { PlinkoGame } from '../services/game-engine/plinko-game'
import { gameEngine } from '../services/game-engine'
import { CurrencyService } from '../services/currency'
import { realtimeGameService } from '../services/realtime-game'
import { isValidBetAmount } from '../types/database'

export const gameRoutes = new Hono()

// All game routes require authentication
gameRoutes.use('*', authMiddleware)

// Games overview endpoint
gameRoutes.get('/', asyncHandler(async (c) => {
  return c.json({
    message: 'Tarkov Casino Games API',
    available_games: {
      roulette: '/api/games/roulette',
      blackjack: '/api/games/blackjack',
      plinko: '/api/games/plinko'
    },
    status: 'Games API ready'
  })
}))

// Roulette game endpoints
gameRoutes.get('/roulette', asyncHandler(async (c) => {
  return c.json({
    message: 'Roulette game information',
    bet_types: RouletteGame.getBetTypes(),
    wheel_layout: RouletteGame.getWheelLayout(),
    min_bet: 1,
    max_bet: 10000
  })
}))

gameRoutes.post('/roulette/bet', asyncHandler(async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const body = await c.req.json()
  const { amount, betType, betValue } = body

  // Validate input
  if (!amount || !betType || betValue === undefined) {
    return c.json({ error: 'Missing required fields: amount, betType, betValue' }, 400)
  }

  if (!isValidBetAmount(amount)) {
    return c.json({ error: 'Invalid bet amount' }, 400)
  }

  // Check user balance
  const balance = await CurrencyService.getBalance(user.id)
  if (balance < amount) {
    return c.json({ error: 'Insufficient balance' }, 400)
  }

  try {
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
gameRoutes.get('/blackjack', asyncHandler(async (c) => {
  return c.json({
    message: 'Blackjack game information',
    game_info: BlackjackGame.getGameInfo(),
    min_bet: 1,
    max_bet: 10000
  })
}))

gameRoutes.post('/blackjack/start', asyncHandler(async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const body = await c.req.json()
  const { amount } = body

  // Validate input
  if (!amount) {
    return c.json({ error: 'Missing required field: amount' }, 400)
  }

  if (!isValidBetAmount(amount)) {
    return c.json({ error: 'Invalid bet amount' }, 400)
  }

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

gameRoutes.post('/blackjack/action', asyncHandler(async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const body = await c.req.json()
  const { gameId, action, handIndex } = body

  // Validate input
  if (!gameId || !action) {
    return c.json({ error: 'Missing required fields: gameId, action' }, 400)
  }

  const validActions = ['hit', 'stand', 'double', 'split']
  if (!validActions.includes(action)) {
    return c.json({ error: 'Invalid action' }, 400)
  }

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

// Plinko game endpoints
gameRoutes.get('/plinko', asyncHandler(async (c) => {
  return c.json({
    message: 'Plinko game information',
    board_config: PlinkoGame.getBoardConfig(),
    risk_levels: PlinkoGame.getRiskLevelInfo(),
    multiplier_table: PlinkoGame.getMultiplierTable(),
    peg_positions: PlinkoGame.getPegPositions(),
    min_bet: 1,
    max_bet: 10000
  })
}))

gameRoutes.post('/plinko/drop', asyncHandler(async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const body = await c.req.json()
  const { amount, riskLevel } = body

  // Validate input
  if (!amount || !riskLevel) {
    return c.json({ error: 'Missing required fields: amount, riskLevel' }, 400)
  }

  if (!isValidBetAmount(amount)) {
    return c.json({ error: 'Invalid bet amount' }, 400)
  }

  const validRiskLevels = ['low', 'medium', 'high']
  if (!validRiskLevels.includes(riskLevel)) {
    return c.json({ error: 'Invalid risk level. Must be: low, medium, or high' }, 400)
  }

  // Check user balance
  const balance = await CurrencyService.getBalance(user.id)
  if (balance < amount) {
    return c.json({ error: 'Insufficient balance' }, 400)
  }

  try {
    // Broadcast game start
    const gameId = `plinko-${Date.now()}-${user.id}`
    await realtimeGameService.handlePlinkoGameStart(user.id, amount, riskLevel, gameId)

    // Create plinko game instance
    const plinkoGame = new PlinkoGame()

    // Create bet object
    const bet = {
      userId: user.id,
      amount,
      gameType: 'plinko' as const,
      riskLevel
    }

    // Play the game
    const result = await plinkoGame.play(bet)

    if (!result.success) {
      return c.json({ error: result.error || 'Game failed' }, 400)
    }

    // Process currency transaction
    const transactionResult = await CurrencyService.processGameTransaction(
      user.id,
      'plinko',
      amount,
      result.winAmount,
      result.resultData
    )

    if (!transactionResult.success) {
      return c.json({ error: 'Transaction failed' }, 500)
    }

    // Broadcast game completion
    await realtimeGameService.handlePlinkoGameComplete(user.id, gameId, result)

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
    console.error('Plinko drop error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
}))