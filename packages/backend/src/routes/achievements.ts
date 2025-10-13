/**
 * Achievement API Routes
 * Provides endpoints for achievement management
 */

import { Hono, type Context } from 'hono';
import { asyncHandler } from '../middleware/error';
import { authMiddleware } from '../middleware/auth';
import { AchievementService } from '../services/achievement-service';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

export const achievementRoutes = new Hono();

// All routes require authentication
achievementRoutes.use('*', authMiddleware);

/**
 * GET /api/achievements
 * Get all achievements with user's progress
 */
achievementRoutes.get('/', asyncHandler(async (c: Context) => {
  const user = c.get('user');
  
  try {
    const achievements = await AchievementService.getUserAchievements(user.id);
    
    return c.json({
      success: true,
      achievements,
      total: achievements.length,
      unlocked: achievements.filter(a => a.unlocked).length,
      claimed: achievements.filter(a => a.claimed).length,
    });
  } catch (error: any) {
    console.error('Error fetching user achievements:', error);
    throw new HTTPException(500, { 
      message: 'Failed to fetch achievements',
      cause: error.message,
    });
  }
}));

/**
 * POST /api/achievements/progress
 * Update achievement progress
 */
const updateProgressSchema = z.object({
  achievementId: z.string().min(1, 'Achievement ID is required'),
  progress: z.number().min(1, 'Progress must be at least 1').int('Progress must be an integer'),
});

achievementRoutes.post('/progress', asyncHandler(async (c: Context) => {
  const user = c.get('user');
  
  try {
    const body = await c.req.json();
    const { achievementId, progress } = updateProgressSchema.parse(body);
    
    const result = await AchievementService.updateProgress(user.id, achievementId, progress);
    
    return c.json({
      success: true,
      achievementId,
      progressAdded: progress,
      unlocked: result.unlocked,
      newlyUnlocked: result.newlyUnlocked,
      message: result.newlyUnlocked ? 'Achievement unlocked!' : 'Progress updated',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { 
        message: 'Invalid request data',
        cause: error.issues,
      });
    }
    
    console.error('Error updating achievement progress:', error);
    throw new HTTPException(500, { 
      message: error.message || 'Failed to update achievement progress',
    });
  }
}));

/**
 * POST /api/achievements/claim
 * Claim achievement reward
 */
const claimRewardSchema = z.object({
  achievementId: z.string().min(1, 'Achievement ID is required'),
});

achievementRoutes.post('/claim', asyncHandler(async (c: Context) => {
  const user = c.get('user');
  
  try {
    const body = await c.req.json();
    const { achievementId } = claimRewardSchema.parse(body);
    
    const reward = await AchievementService.claimReward(user.id, achievementId);
    
    return c.json({
      success: true,
      achievementId,
      reward,
      message: `Reward claimed! ${reward.rewardType === 'currency' ? `+₽${reward.rewardAmount}` : reward.rewardItem}`,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { 
        message: 'Invalid request data',
        cause: error.issues,
      });
    }
    
    // Handle specific business logic errors with appropriate status codes
    if (error.message.includes('not unlocked')) {
      throw new HTTPException(403, { message: error.message });
    }
    
    if (error.message.includes('already claimed')) {
      throw new HTTPException(409, { message: error.message });
    }
    
    if (error.message.includes('not found')) {
      throw new HTTPException(404, { message: error.message });
    }
    
    console.error('Error claiming achievement reward:', error);
    throw new HTTPException(500, { 
      message: error.message || 'Failed to claim reward',
    });
  }
}));

/**
 * GET /api/achievements/definitions
 * Get all achievement definitions (for reference/admin)
 */
achievementRoutes.get('/definitions', asyncHandler(async (c: Context) => {
  try {
    const definitions = await AchievementService.getAchievementDefinitions();
    
    return c.json({
      success: true,
      definitions,
      total: definitions.length,
    });
  } catch (error: any) {
    console.error('Error fetching achievement definitions:', error);
    throw new HTTPException(500, { 
      message: 'Failed to fetch achievement definitions',
    });
  }
}));

