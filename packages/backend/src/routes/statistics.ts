/**
 * Statistics API routes for game history and analytics
 * Provides comprehensive statistics endpoints with filtering and data visualization support
 */

import { Hono, type Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { criticalAuthMiddleware } from '../middleware/auth'
import { asyncHandler } from '../middleware/error'
import { StatisticsServiceAppwrite as StatisticsService, type StatisticsFilters } from '../services/statistics-appwrite'
import { UserService } from '../services/user-service'
import { GameService } from '../services/game-service'

export const statisticsRoutes = new Hono()

// Helper to validate game types
const isValidGameType = (gameType: string): boolean => {
  return ['roulette', 'blackjack', 'case_opening'].includes(gameType)
}

// Validation schemas
const statisticsFiltersSchema = z.object({
  gameType: z.string().optional().refine(
    (val) => !val || isValidGameType(val),
    { message: 'Invalid game type' }
  ),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  minBet: z.number().positive().optional(),
  maxBet: z.number().positive().optional(),
  winOnly: z.boolean().optional(),
  lossOnly: z.boolean().optional()
}).refine(
  (data) => !(data.winOnly && data.lossOnly),
  { message: 'Cannot filter for both wins and losses only' }
).refine(
  (data) => !data.minBet || !data.maxBet || data.minBet <= data.maxBet,
  { message: 'Minimum bet cannot be greater than maximum bet' }
)

const leaderboardSchema = z.object({
  metric: z.enum(['balance', 'total_won', 'games_played', 'total_wagered']).default('balance'),
  limit: z.number().int().min(1).max(100).default(10)
})

const gameHistorySchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  gameType: z.string().optional().refine(
    (val) => !val || isValidGameType(val),
    { message: 'Invalid game type' }
  )
})

// 🔐 SECURITY: All statistics routes require critical authentication with session validation
// This prevents unauthorized access to user statistics and game history
statisticsRoutes.use('*', criticalAuthMiddleware)

// Get comprehensive user statistics with advanced analytics
statisticsRoutes.get('/advanced', asyncHandler(async (c: Context) => {
  const user = c.get('user')
  const query = c.req.query()

  try {
    // Parse and validate filters
    const filters: StatisticsFilters = {}
    
    if (query.gameType) filters.gameType = query.gameType
    if (query.dateFrom) filters.dateFrom = query.dateFrom
    if (query.dateTo) filters.dateTo = query.dateTo
    if (query.minBet) filters.minBet = parseFloat(query.minBet)
    if (query.maxBet) filters.maxBet = parseFloat(query.maxBet)
    if (query.winOnly) filters.winOnly = query.winOnly === 'true'
    if (query.lossOnly) filters.lossOnly = query.lossOnly === 'true'

    // Validate filters
    statisticsFiltersSchema.parse(filters)

    const statistics = await StatisticsService.getAdvancedStatistics(user.id, filters)

    return c.json({
      success: true,
      statistics,
      filters: filters,
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { 
        message: 'Invalid filters', 
        cause: error.issues 
      })
    }
    
    console.error('Advanced statistics error:', error)
    throw new HTTPException(500, { message: 'Failed to fetch advanced statistics' })
  }
}))

// Get basic user statistics (existing endpoint enhanced)
statisticsRoutes.get('/basic', asyncHandler(async (c: Context) => {
  const user = c.get('user')

  try {
    const statistics = await UserService.getUserStatistics(user.id)

    return c.json({
      success: true,
      statistics,
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Basic statistics error:', error)
    throw new HTTPException(500, { message: 'Failed to fetch basic statistics' })
  }
}))

// Get paginated game history with enhanced filtering
statisticsRoutes.get('/history', asyncHandler(async (c: Context) => {
  const user = c.get('user')
  const query = c.req.query()

  try {
    const params = gameHistorySchema.parse({
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
      gameType: query.gameType
    })

    const history = await GameService.getGameHistory(
      user.id,
      params.limit,
      params.offset,
      params.gameType
    )

    return c.json({
      success: true,
      ...history,
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { 
        message: 'Invalid parameters', 
        cause: error.issues 
      })
    }
    
    console.error('Game history error:', error)
    throw new HTTPException(500, { message: 'Failed to fetch game history' })
  }
}))

// Get time series data for charts
statisticsRoutes.get('/time-series', asyncHandler(async (c: Context) => {
  const user = c.get('user')
  const query = c.req.query()

  try {
    const filters: StatisticsFilters = {}
    
    if (query.gameType) filters.gameType = query.gameType
    if (query.dateFrom) filters.dateFrom = query.dateFrom
    if (query.dateTo) filters.dateTo = query.dateTo

    statisticsFiltersSchema.parse(filters)

    const gameHistory = await StatisticsService.getFilteredGameHistory(user.id, filters)
    const timeSeriesData = StatisticsService.calculateTimeSeriesData(gameHistory)

    return c.json({
      success: true,
      time_series: timeSeriesData,
      filters: filters,
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { 
        message: 'Invalid filters', 
        cause: error.issues 
      })
    }
    
    console.error('Time series error:', error)
    throw new HTTPException(500, { message: 'Failed to fetch time series data' })
  }
}))

// Get game type breakdown statistics
statisticsRoutes.get('/game-breakdown', asyncHandler(async (c: Context) => {
  const user = c.get('user')
  const query = c.req.query()

  try {
    const filters: StatisticsFilters = {}
    
    if (query.dateFrom) filters.dateFrom = query.dateFrom
    if (query.dateTo) filters.dateTo = query.dateTo

    const gameHistory = await StatisticsService.getFilteredGameHistory(user.id, filters)
    const gameBreakdown = StatisticsService.calculateGameTypeBreakdown(gameHistory)

    return c.json({
      success: true,
      game_breakdown: gameBreakdown,
      filters: filters,
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Game breakdown error:', error)
    throw new HTTPException(500, { message: 'Failed to fetch game breakdown' })
  }
}))

// Get win/loss streaks and patterns
statisticsRoutes.get('/streaks', asyncHandler(async (c: Context) => {
  const user = c.get('user')
  const query = c.req.query()

  try {
    const filters: StatisticsFilters = {}
    
    if (query.gameType) filters.gameType = query.gameType
    if (query.dateFrom) filters.dateFrom = query.dateFrom
    if (query.dateTo) filters.dateTo = query.dateTo

    const gameHistory = await StatisticsService.getFilteredGameHistory(user.id, filters)
    const winStreaks = StatisticsService.calculateWinStreaks(gameHistory)

    return c.json({
      success: true,
      streaks: winStreaks,
      filters: filters,
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Streaks error:', error)
    throw new HTTPException(500, { message: 'Failed to fetch streak data' })
  }
}))

// Get betting patterns analysis
statisticsRoutes.get('/betting-patterns', asyncHandler(async (c: Context) => {
  const user = c.get('user')
  const query = c.req.query()

  try {
    const filters: StatisticsFilters = {}
    
    if (query.gameType) filters.gameType = query.gameType
    if (query.dateFrom) filters.dateFrom = query.dateFrom
    if (query.dateTo) filters.dateTo = query.dateTo

    const gameHistory = await StatisticsService.getFilteredGameHistory(user.id, filters)
    const betPatterns = StatisticsService.calculateBetPatterns(gameHistory)

    return c.json({
      success: true,
      betting_patterns: betPatterns,
      filters: filters,
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Betting patterns error:', error)
    throw new HTTPException(500, { message: 'Failed to fetch betting patterns' })
  }
}))

// Get playing habits and session analysis
statisticsRoutes.get('/playing-habits', asyncHandler(async (c: Context) => {
  const user = c.get('user')
  const query = c.req.query()

  try {
    const filters: StatisticsFilters = {}
    
    if (query.dateFrom) filters.dateFrom = query.dateFrom
    if (query.dateTo) filters.dateTo = query.dateTo

    const gameHistory = await StatisticsService.getFilteredGameHistory(user.id, filters)
    const playingHabits = StatisticsService.calculatePlayingHabits(gameHistory)

    return c.json({
      success: true,
      playing_habits: playingHabits,
      filters: filters,
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Playing habits error:', error)
    throw new HTTPException(500, { message: 'Failed to fetch playing habits' })
  }
}))

// Export statistics data (CSV format preparation)
statisticsRoutes.get('/export', asyncHandler(async (c: Context) => {
  const user = c.get('user')
  const query = c.req.query()

  try {
    const filters: StatisticsFilters = {}
    
    if (query.gameType) filters.gameType = query.gameType
    if (query.dateFrom) filters.dateFrom = query.dateFrom
    if (query.dateTo) filters.dateTo = query.dateTo

    const gameHistory = await StatisticsService.getFilteredGameHistory(user.id, filters)

    // Prepare data for CSV export
    const exportData = gameHistory.map(game => ({
      date: new Date(game.created_at).toISOString().split('T')[0],
      time: new Date(game.created_at).toTimeString().split(' ')[0],
      game_type: game.game_type,
      bet_amount: game.bet_amount,
      win_amount: game.win_amount,
      net_result: game.win_amount - game.bet_amount,
      game_duration: game.game_duration || 0,
      result_data: JSON.stringify(game.result_data)
    }))

    return c.json({
      success: true,
      export_data: exportData,
      total_records: exportData.length,
      filters: filters,
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Export statistics error:', error)
    throw new HTTPException(500, { message: 'Failed to export statistics' })
  }
}))