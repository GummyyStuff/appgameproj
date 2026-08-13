import { Hono, type Context } from 'hono'
import { authMiddleware, optionalAuthMiddleware, criticalAuthMiddleware } from '../middleware/auth'
import { asyncHandler } from '../middleware/error'
import { gameBetRateLimit } from '../middleware/rate-limit'
import { validationMiddleware, commonSchemas } from '../middleware/validation'
import { auditGame, auditLog } from '../middleware/audit'
import { z } from 'zod'
import { WheelOfChanceGame } from '../services/game-engine/wheel-of-chance-game'
import {
  generateWheelLayout,
  signWheelLayout,
  verifyWheelLayoutSignature,
  validateWheelLayout
} from '../services/game-engine/wheel-layout'
import { provablyFairService } from '../services/game-engine/provably-fair-service'
import { CaseOpeningService } from '../services/case-opening-appwrite'
import { Sentry, logger, startSpan } from '../lib/sentry'
import { CurrencyService } from '../services/currency'
import { realtimeGameService } from '../services/realtime-game'
import { appwriteClient } from '../config/appwrite'
import { requestDeduplication } from '../services/request-deduplication'
import { wheelEnvironmentStateService } from '../services/wheel-environment-state'

export const gameRoutes = new Hono()

gameRoutes.use('*', optionalAuthMiddleware)

gameRoutes.use('/cases/open', criticalAuthMiddleware)
gameRoutes.use('/wheel-of-chance/spin', criticalAuthMiddleware)

gameRoutes.use('/cases/open', gameBetRateLimit)
gameRoutes.use('/wheel-of-chance/spin', gameBetRateLimit)

const wheelBetSchema = z.object({
  amount: commonSchemas.betAmount,
  bets: z.array(z.object({
    segmentIndex: z.number().int().min(0).max(9),
    amount: z.number().int().min(1)
  })).min(1).max(10),
  wheel_layout: z.array(z.object({
    index: z.number().int(),
    type: z.string(),
    label: z.string(),
    multiplier: z.number(),
    color: z.string(),
    startAngle: z.number(),
    endAngle: z.number(),
    bettable: z.boolean()
  })).length(10),
  layout_signature: z.string().min(16)
})





// Games overview endpoint
gameRoutes.get('/', asyncHandler(async (c: Context) => {
  return c.json({
    message: 'Tarkov Casino Games API',
    available_games: {
      wheel_of_chance: '/api/games/wheel-of-chance',
      case_opening: '/api/games/cases'
    },
    status: 'Games API ready'
  })
}))


gameRoutes.get('/wheel-of-chance', asyncHandler(async (c: Context) => {
  const wheelLayout = generateWheelLayout()
  const signature = signWheelLayout(wheelLayout)

  const user = c.get('user')
  let environmentState: unknown = null
  if (user?.id) {
    try {
      environmentState = await wheelEnvironmentStateService.getWheelEnvironment(user.id)
    } catch (error) {
      logger.error('Failed to load environment for wheel info', {
        user_id: user.id,
        error: error instanceof Error ? error.message : 'unknown'
      })
    }
  }

  return c.json({
    message: 'Wheel of Chance game information',
    wheel_layout: wheelLayout,
    layout_signature: signature,
    environment_state: environmentState,
    segment_count: WheelOfChanceGame.getSegmentCount(),
    multiplier_pool: WheelOfChanceGame.getMultiplierPool(),
    min_bet: 1,
    max_bet: 10000
  })
}))

gameRoutes.post('/wheel-of-chance/spin',
  validationMiddleware(wheelBetSchema),
  auditGame('wheel_spin'),
  asyncHandler(async (c: Context) => {
  const user = c.get('user')
  if (!user) {
    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Wheel spin attempted without authentication',
      level: 'warning'
    });
    return c.json({ error: 'Authentication required' }, 401)
  }

  const { amount, bets, wheel_layout, layout_signature } = c.get('validatedData')

  if (!verifyWheelLayoutSignature(wheel_layout, layout_signature)) {
    Sentry.captureMessage('Wheel spin rejected: invalid layout signature', {
      level: 'warning',
      tags: { game: 'wheel_of_chance', action: 'invalid_layout_signature' },
      extra: { user_id: user.id }
    });
    return c.json({ error: 'Invalid wheel layout signature' }, 400)
  }

  if (!validateWheelLayout(wheel_layout)) {
    Sentry.captureMessage('Wheel spin rejected: invalid layout structure', {
      level: 'warning',
      tags: { game: 'wheel_of_chance', action: 'invalid_layout_structure' },
      extra: { user_id: user.id }
    });
    return c.json({ error: 'Invalid wheel layout' }, 400)
  }

  const totalBets = bets.reduce((sum: number, b: { amount: number }) => sum + b.amount, 0)
  if (totalBets !== amount) {
    return c.json({ error: 'Sum of bets must equal declared amount' }, 400)
  }

  Sentry.addBreadcrumb({
    category: 'game',
    message: 'Wheel spin initiated',
    level: 'info',
    data: {
      user_id: user.id,
      bet_count: bets.length,
      total_bet: amount
    }
  });

  const balance = await startSpan(
    { op: 'db.query', name: 'Get User Balance' },
    async (span) => {
      span?.setAttribute('db.operation', 'GET_BALANCE');
      span?.setAttribute('db.user_id', user.id);
      return await CurrencyService.getBalance(user.id);
    }
  );

  if (balance < amount) {
    Sentry.captureMessage('Insufficient balance for wheel spin', {
      level: 'warning',
      tags: { game: 'wheel_of_chance', action: 'insufficient_balance' },
      extra: { user_id: user.id, balance, required_amount: amount, shortfall: amount - balance }
    });
    return c.json({ error: 'Insufficient balance' }, 400)
  }

  try {
    const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP')

    return await startSpan(
      { op: 'game.wheel_of_chance', name: 'Wheel Spin' },
      async (gameSpan) => {
        gameSpan?.setAttribute('game.type', 'wheel_of_chance');
        gameSpan?.setAttribute('game.bet_amount', amount);
        gameSpan?.setAttribute('game.user_id', user.id);

        await auditLog.gamePlayStarted(user.id, 'wheel_of_chance', amount, ip)

        const environmentState = await wheelEnvironmentStateService.getWheelEnvironment(user.id)

        const wheelGame = new WheelOfChanceGame()

        const bet = {
          userId: user.id,
          amount,
          gameType: 'wheel_of_chance' as const,
          bets,
          wheel_layout,
          environment_state: environmentState
        }

        const gameId = `wheel-${Date.now()}-${user.id}`

        const result = await startSpan(
          { op: 'game.play', name: 'Play Wheel' },
          async (playSpan) => {
            try {
              playSpan?.setAttribute('game_id', gameId);
              const gameResult = await wheelGame.play(bet);

              if (!gameResult.success) {
                playSpan?.setStatus({ code: 2 });
                playSpan?.setAttribute('error', gameResult.error || 'unknown');
              } else {
                playSpan?.setStatus({ code: 1 });
              }

              return gameResult;
            } catch (error) {
              playSpan?.setStatus({ code: 2 });
              if (error instanceof Error) {
                playSpan?.setAttribute('error.message', error.message);
                playSpan?.setAttribute('error.name', error.name);
              }
              throw error;
            }
          }
        );

        if (!result.success) {
          logger.error('Wheel game failed', {
            user_id: user.id,
            error: result.error
          });
          return c.json({ error: result.error || 'Game failed' }, 400)
        }

        const updatedEnvironment = (result.resultData as { environment_state?: unknown }).environment_state
        if (updatedEnvironment && typeof updatedEnvironment === 'object') {
          await wheelEnvironmentStateService.saveWheelEnvironment(
            user.id,
            updatedEnvironment as Parameters<typeof wheelEnvironmentStateService.saveWheelEnvironment>[1]
          )
        }

        const transactionResult = await startSpan(
          { op: 'currency.transaction', name: 'Process Wheel Transaction' },
          async (txSpan) => {
            try {
              txSpan?.setAttribute('transaction.type', 'game');
              txSpan?.setAttribute('game.type', 'wheel_of_chance');

              const txResult = await CurrencyService.processGameTransaction(
                user.id,
                'wheel_of_chance',
                amount,
                result.winAmount,
                result.resultData
              );

              if (!txResult.success) {
                txSpan?.setStatus({ code: 2 });
                txSpan?.setAttribute('transaction.error', txResult.error || 'unknown');
              } else {
                txSpan?.setStatus({ code: 1 });
              }

              return txResult;
            } catch (error) {
              txSpan?.setStatus({ code: 2 });
              if (error instanceof Error) {
                txSpan?.setAttribute('error.message', error.message);
                txSpan?.setAttribute('error.name', error.name);
              }
              throw error;
            }
          }
        );

        if (!transactionResult.success) {
          Sentry.captureMessage('Currency transaction failed for wheel', {
            level: 'error',
            tags: { game: 'wheel_of_chance', action: 'transaction_failed' },
            extra: { user_id: user.id, bet_amount: amount }
          });
          return c.json({ error: 'Transaction failed' }, 500)
        }

        Sentry.addBreadcrumb({
          category: 'game',
          message: 'Wheel spin completed successfully',
          level: 'info',
          data: {
            user_id: user.id,
            win_amount: result.winAmount,
            net_result: result.winAmount - amount
          }
        });

        await auditLog.gameCompleted(user.id, 'wheel_of_chance', amount, result.winAmount, ip)

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
      }
    );

  } catch (error) {
    Sentry.captureException(error, {
      tags: { game: 'wheel_of_chance', action: 'spin' },
      extra: { user_id: user.id, bet_amount: amount }
    });
    logger.error('Wheel spin error', { error, user_id: user.id });
    return c.json({ error: 'Internal server error' }, 500)
  }
}))

// Provably fair verification endpoint
const provablyFairVerifySchema = z.object({
  server_seed: z.string().min(16),
  client_seed: z.string().min(8),
  nonce: z.number().int().min(0)
})

gameRoutes.post('/provably-fair/verify',
  validationMiddleware(provablyFairVerifySchema),
  asyncHandler(async (c: Context) => {
    const { server_seed, client_seed, nonce } = c.get('validatedData')

    const outcome = await provablyFairService.generateOutcome({
      serverSeed: server_seed,
      clientSeed: client_seed,
      nonce
    })

    return c.json({
      hash: outcome.hash,
      random_value: outcome.randomValue,
      server_seed_hash: provablyFairService.hashServerSeed(server_seed)
    })
  })
)

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
  requestId: z.string().optional(), // For request deduplication
  delayCredit: z.boolean().optional() // Frontend UX pattern - backend always processes atomically
})

gameRoutes.post('/cases/open',
  validationMiddleware(simplifiedCaseOpeningSchema),
  // Removed auditGame middleware - using single audit log at completion
  asyncHandler(async (c: Context) => {
  const user = c.get('user')
  if (!user) {
    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Case opening attempted without authentication',
      level: 'warning'
    });
    return c.json({ error: 'Authentication required' }, 401)
  }

  const { caseTypeId, previewOnly, requestId } = c.get('validatedData')

  // Add breadcrumb for case opening attempt
  Sentry.addBreadcrumb({
    category: 'game',
    message: 'Case opening initiated',
    level: 'info',
    data: {
      user_id: user.id,
      case_type_id: caseTypeId,
      preview_only: previewOnly,
      request_id: requestId
    }
  });

    // Request deduplication using RequestDeduplicationService
    const dedupKey = requestId ? `case_open_${user.id}_${requestId}` : null
    
    if (dedupKey) {
      const existingResult = await requestDeduplication.getInFlight<any>(dedupKey)
      if (existingResult) {
        return existingResult
      }
    }

  // Wrap the entire request processing with span
  const processRequest = async () => {
  return await startSpan(
    {
      op: 'game.case_opening',
      name: 'Case Opening Request'
    },
    async (mainSpan) => {
      try {
        mainSpan?.setAttribute('user.id', user.id);
        mainSpan?.setAttribute('case.type_id', caseTypeId);
        mainSpan?.setAttribute('preview.only', previewOnly);
        
        // Validate case opening request with span
        const validation = await startSpan(
          {
            op: 'game.validation',
            name: 'Validate Case Opening'
          },
          async (validSpan) => {
            validSpan?.setAttribute('validation.type', 'case_opening');
            return await CaseOpeningService.validateCaseOpening(user.id, caseTypeId);
          }
        );
        
        if (!validation.isValid) {
          Sentry.captureMessage('Case opening validation failed', {
            level: 'warning',
            tags: { game: 'case_opening', action: 'validation_failed' },
            extra: { user_id: user.id, case_type_id: caseTypeId, error: validation.error }
          });
          return c.json({ error: validation.error }, 400)
        }

        const caseType = validation.caseType!

        // For preview mode, just determine the result without processing transaction
        if (previewOnly) {
          const previewResult = await startSpan(
            {
              op: 'game.preview',
              name: 'Preview Case Opening'
            },
            async (previewSpan) => {
              previewSpan?.setAttribute('case.type_id', caseTypeId);
              return await CaseOpeningService.previewCase(user.id, caseTypeId);
            }
          );

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

        // Pre-check balance to avoid wasted computation on item selection
        const balanceCheck = await CurrencyService.validateBalance(user.id, caseType.price)
        if (!balanceCheck.isValid) {
          Sentry.captureMessage('Insufficient balance for case opening', {
            level: 'warning',
            tags: { game: 'case_opening', action: 'balance_check_failed' },
            extra: { user_id: user.id, case_type_id: caseTypeId, required: caseType.price, current: balanceCheck.currentBalance }
          })
          return c.json({
            error: `Insufficient balance. Required: ${caseType.price}, Current: ${balanceCheck.currentBalance}`
          }, 400)
        }

        // Open the case with span
        const openingResult = await startSpan(
          {
            op: 'game.open_case',
            name: 'Open Case'
          },
          async (openSpan) => {
            try {
              openSpan?.setAttribute('case.type_id', caseTypeId);
              openSpan?.setAttribute('case.price', caseType.price);
              
              const result = await CaseOpeningService.openCase(user.id, caseTypeId);
              
              // Set span status based on result
              if (!result.success) {
                openSpan?.setStatus({ code: 2 }); // 2 = error
                openSpan?.setAttribute('error', result.error || 'unknown');
              } else {
                openSpan?.setStatus({ code: 1 }); // 1 = ok
              }
              
              return result;
            } catch (error) {
              // Mark span as failed
              openSpan?.setStatus({ code: 2 });
              if (error instanceof Error) {
                openSpan?.setAttribute('error.message', error.message);
                openSpan?.setAttribute('error.name', error.name);
              }
              throw error;
            }
          }
        );

        // Add breadcrumb for opened case
        Sentry.addBreadcrumb({
          category: 'game',
          message: 'Case opened successfully',
          level: 'info',
          data: {
            item_won: openingResult.item_won?.name || 'unknown',
            currency_awarded: openingResult.currency_awarded,
            item_rarity: openingResult.item_won?.rarity || 'unknown'
          }
        });

        // Process case opening as a single atomic transaction with span
        const transactionResult = await startSpan(
          {
            op: 'currency.transaction',
            name: 'Process Case Opening Transaction'
          },
          async (txSpan) => {
            txSpan?.setAttribute('transaction.type', 'case_opening');
            txSpan?.setAttribute('case.type_id', caseTypeId);
            txSpan?.setAttribute('case.price', caseType.price);
            txSpan?.setAttribute('currency.awarded', openingResult.currency_awarded);
            
            return await CurrencyService.processCaseOpening(
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
            );
          }
        );

        if (!transactionResult.success) {
          Sentry.captureMessage('Case opening transaction failed', {
            level: 'error',
            tags: { game: 'case_opening', action: 'transaction_failed' },
            extra: { user_id: user.id, case_type_id: caseTypeId }
          });
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
        Sentry.captureException(error, {
          tags: {
            game: 'case_opening',
            action: 'case_opening'
          },
          extra: {
            user_id: user.id,
            case_type_id: caseTypeId,
            preview_only: previewOnly,
            request_id: requestId
          }
        });
        logger.error('Case opening error', { 
          error: error?.message, 
          user_id: user.id,
          case_type_id: caseTypeId 
        });
        const isProd = process.env.NODE_ENV === 'production';
        return c.json({ error: isProd ? 'Internal server error' : (error?.message || 'Internal server error') }, 500)
      }
    }
  );
  }

  // Store promise for deduplication and execute
  if (dedupKey) {
    const requestPromise = processRequest()
    await requestDeduplication.setInFlight(dedupKey, requestPromise)
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


