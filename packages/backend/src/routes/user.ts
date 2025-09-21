import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { asyncHandler } from '../middleware/error'
import { supabaseAdmin } from '../config/supabase'
import { CurrencyService } from '../services/currency'
import { DatabaseService } from '../services/database'

export const userRoutes = new Hono()

// Validation schemas
const updateProfileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters').optional(),
  email: z.string().email('Invalid email format').optional()
}).refine(data => data.username || data.email, {
  message: 'At least one field (username or email) must be provided'
})

// All user routes require authentication
userRoutes.use('*', authMiddleware)

// Get user profile
userRoutes.get('/profile', asyncHandler(async (c) => {
  const user = c.get('user')

  try {
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('username, balance, created_at, last_login')
      .eq('id', user.id)
      .single()

    if (error) {
      throw new HTTPException(404, { message: 'User profile not found' })
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        username: profile.username,
        balance: profile.balance,
        created_at: profile.created_at,
        last_login: profile.last_login
      }
    })

  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Get profile error:', error)
    throw new HTTPException(500, { message: 'Failed to fetch user profile' })
  }
}))

// Get user balance
userRoutes.get('/balance', asyncHandler(async (c) => {
  const user = c.get('user')

  try {
    const balance = await CurrencyService.getBalance(user.id)
    const dailyBonusStatus = await CurrencyService.getDailyBonusStatus(user.id)

    return c.json({
      balance,
      formatted_balance: CurrencyService.formatCurrency(balance),
      daily_bonus: {
        can_claim: dailyBonusStatus.canClaim,
        bonus_amount: dailyBonusStatus.bonusAmount,
        formatted_bonus: CurrencyService.formatCurrency(dailyBonusStatus.bonusAmount),
        next_available: dailyBonusStatus.nextAvailableDate,
        cooldown_hours: dailyBonusStatus.cooldownHours
      }
    })

  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Get balance error:', error)
    throw new HTTPException(500, { message: 'Failed to fetch balance' })
  }
}))

// Get user game history
userRoutes.get('/history', asyncHandler(async (c) => {
  const user = c.get('user')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')
  const gameType = c.req.query('game_type')

  try {
    let query = supabaseAdmin
      .from('game_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (gameType) {
      query = query.eq('game_type', gameType)
    }

    const { data: history, error } = await query

    if (error) {
      throw new HTTPException(500, { message: 'Failed to fetch game history' })
    }

    return c.json({
      history: history || [],
      pagination: {
        limit,
        offset,
        total: history?.length || 0
      }
    })

  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Get history error:', error)
    throw new HTTPException(500, { message: 'Failed to fetch game history' })
  }
}))

// Get user statistics
userRoutes.get('/stats', asyncHandler(async (c) => {
  const user = c.get('user')

  try {
    const stats = await CurrencyService.getCurrencyStats(user.id)

    return c.json({
      stats: {
        current_balance: stats.currentBalance,
        formatted_balance: CurrencyService.formatCurrency(stats.currentBalance),
        total_wagered: stats.totalWagered,
        formatted_wagered: CurrencyService.formatCurrency(stats.totalWagered),
        total_won: stats.totalWon,
        formatted_won: CurrencyService.formatCurrency(stats.totalWon),
        net_profit: stats.netProfit,
        formatted_profit: CurrencyService.formatCurrency(stats.netProfit),
        games_played: stats.gamesPlayed,
        daily_bonus_status: stats.dailyBonusStatus,
        game_breakdown: stats.gameBreakdown
      }
    })

  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Get stats error:', error)
    throw new HTTPException(500, { message: 'Failed to fetch statistics' })
  }
}))

// Validate balance for game transaction
userRoutes.post('/validate-balance', asyncHandler(async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  
  const { amount } = z.object({
    amount: z.number().positive('Amount must be positive')
  }).parse(body)

  try {
    const validation = await CurrencyService.validateBalance(user.id, amount)

    return c.json({
      is_valid: validation.isValid,
      current_balance: validation.currentBalance,
      formatted_balance: CurrencyService.formatCurrency(validation.currentBalance),
      required_amount: validation.requiredAmount,
      formatted_required: CurrencyService.formatCurrency(validation.requiredAmount),
      shortfall: validation.shortfall,
      formatted_shortfall: validation.shortfall ? CurrencyService.formatCurrency(validation.shortfall) : undefined
    })

  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Balance validation error:', error)
    throw new HTTPException(500, { message: 'Failed to validate balance' })
  }
}))

// Get transaction history
userRoutes.get('/transactions', asyncHandler(async (c) => {
  const user = c.get('user')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')
  const gameType = c.req.query('game_type')

  try {
    const history = await CurrencyService.getTransactionHistory(user.id, limit, offset, gameType)

    return c.json({
      transactions: history.transactions.map(tx => ({
        ...tx,
        formatted_bet: CurrencyService.formatCurrency(tx.betAmount),
        formatted_win: CurrencyService.formatCurrency(tx.winAmount),
        formatted_net: CurrencyService.formatCurrency(tx.netResult)
      })),
      pagination: history.pagination
    })

  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Get transactions error:', error)
    throw new HTTPException(500, { message: 'Failed to fetch transaction history' })
  }
}))

// Update user profile
userRoutes.put('/profile', asyncHandler(async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const { username, email } = updateProfileSchema.parse(body)

  try {
    // Check if username is already taken (if username is being updated)
    if (username) {
      const { data: existingUser } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user.id)
        .single()

      if (existingUser) {
        throw new HTTPException(400, { message: 'Username already taken' })
      }
    }

    // Update profile in user_profiles table
    const profileUpdates: any = {}
    if (username) {
      profileUpdates.username = username
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .update(profileUpdates)
        .eq('id', user.id)

      if (profileError) {
        throw new HTTPException(500, { message: 'Failed to update profile' })
      }
    }

    // Update email in Supabase Auth (if email is being updated)
    if (email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { email }
      )

      if (authError) {
        throw new HTTPException(400, { message: authError.message })
      }
    }

    // Fetch updated profile
    const { data: updatedProfile, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('username, balance, created_at, last_login')
      .eq('id', user.id)
      .single()

    if (fetchError) {
      throw new HTTPException(500, { message: 'Failed to fetch updated profile' })
    }

    return c.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: email || user.email,
        username: updatedProfile.username,
        balance: updatedProfile.balance,
        created_at: updatedProfile.created_at,
        last_login: updatedProfile.last_login
      }
    })

  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    console.error('Update profile error:', error)
    throw new HTTPException(500, { message: 'Failed to update profile' })
  }
}))

// Claim daily bonus
userRoutes.post('/daily-bonus', asyncHandler(async (c) => {
  const user = c.get('user')

  try {
    const result = await CurrencyService.claimDailyBonus(user.id)

    return c.json({
      message: 'Daily bonus claimed successfully',
      bonus_amount: result.bonusAmount,
      formatted_bonus: CurrencyService.formatCurrency(result.bonusAmount),
      previous_balance: result.previousBalance,
      new_balance: result.newBalance,
      formatted_new_balance: CurrencyService.formatCurrency(result.newBalance),
      next_bonus_available: result.nextBonusAvailable
    })

  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    
    // Handle specific currency service errors
    if (error.message.includes('already claimed')) {
      throw new HTTPException(400, { message: error.message })
    }
    
    console.error('Daily bonus error:', error)
    throw new HTTPException(500, { message: 'Failed to claim daily bonus' })
  }
}))