import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { criticalAuthMiddleware } from '../middleware/auth'
import { asyncHandler } from '../middleware/error'
import { UserService } from '../services/user-service'
import { CurrencyService } from '../services/currency-new'
import { GameService } from '../services/game-service'
import { appwriteDb } from '../services/appwrite-database'
import { COLLECTION_IDS } from '../config/collections'

export const userRoutes = new Hono()

// Validation schemas
const updateProfileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters').optional(),
  email: z.string().email('Invalid email format').optional()
}).refine(data => data.username || data.email, {
  message: 'At least one field (username or email) must be provided'
})

// 🔐 SECURITY: All user routes require critical authentication with session validation
// This prevents authentication bypass attacks where users could forge the X-Appwrite-User-Id header
userRoutes.use('*', criticalAuthMiddleware)

// Get user profile
userRoutes.get('/profile', asyncHandler(async (c) => {
  const user = c.get('user')

  try {
    const profile = await UserService.getUserProfile(user.id)

    if (!profile) {
      throw new HTTPException(404, { message: 'User profile not found' })
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        username: profile.username || user.email || `user_${user.id.substring(0, 8)}`,
        displayName: profile.displayName || profile.username || user.email || 'Anonymous User',
        balance: profile.balance,
        created_at: profile.createdAt,
        is_moderator: profile.isModerator,
        avatar_path: profile.avatarPath
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
    const dailyBonusStatus = await CurrencyService.checkDailyBonusStatus(user.id)

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
    const result = await GameService.getGameHistory(user.id, {
      gameType,
      limit,
      offset
    })

    if (!result.success) {
      throw new HTTPException(500, { message: result.error || 'Failed to fetch game history' })
    }

    return c.json({
      history: result.games || [],
      pagination: {
        limit,
        offset,
        total: result.total || 0
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

// Get transaction history (same as game history)
userRoutes.get('/transactions', asyncHandler(async (c) => {
  const user = c.get('user')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')
  const gameType = c.req.query('game_type')

  try {
    const result = await GameService.getGameHistory(user.id, { gameType, limit, offset })

    if (!result.success) {
      throw new HTTPException(500, { message: result.error || 'Failed to fetch transaction history' })
    }

    return c.json({
      transactions: result.games!.map(tx => ({
        ...tx,
        formatted_bet: CurrencyService.formatCurrency(tx.betAmount),
        formatted_win: CurrencyService.formatCurrency(tx.winAmount),
        formatted_net: CurrencyService.formatCurrency(tx.winAmount - tx.betAmount)
      })),
      pagination: {
        limit,
        offset,
        total: result.total
      }
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
  const { username } = updateProfileSchema.parse(body) // Email update removed (OAuth only)

  try {
    // Check if username is already taken (if username is being updated)
    if (username) {
      // Query Appwrite to check if username exists
      const { data: existingUsers } = await appwriteDb.listDocuments(
        COLLECTION_IDS.USERS,
        [appwriteDb.equal('username', username)]
      );
      
      if (existingUsers && existingUsers.length > 0 && existingUsers[0].userId !== user.id) {
        throw new HTTPException(400, { message: 'Username already taken' })
      }
    }

    // Update profile
    const profileUpdates: any = {}
    if (username) {
      profileUpdates.username = username
      profileUpdates.displayName = username // Update display name too
    }

    if (Object.keys(profileUpdates).length > 0) {
      const result = await UserService.updateUserProfile(user.id, profileUpdates)
      
      if (!result.success) {
        throw new HTTPException(500, { message: result.error || 'Failed to update profile' })
      }

      return c.json({
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          email: user.email,
          username: result.profile!.username,
          displayName: result.profile!.displayName,
          balance: result.profile!.balance,
          created_at: result.profile!.createdAt
        }
      })
    }

    return c.json({ message: 'No updates provided' })

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

    if (!result.success) {
      throw new HTTPException(400, { message: result.error || 'Failed to claim daily bonus' })
    }

    return c.json({
      message: 'Daily bonus claimed successfully',
      bonus_amount: result.bonusAmount,
      formatted_bonus: CurrencyService.formatCurrency(result.bonusAmount!),
      new_balance: result.newBalance,
      formatted_new_balance: CurrencyService.formatCurrency(result.newBalance!),
      next_bonus_available: result.nextAvailableDate
    })

  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    
    console.error('Daily bonus error:', error)
    throw new HTTPException(500, { message: 'Failed to claim daily bonus' })
  }
}))