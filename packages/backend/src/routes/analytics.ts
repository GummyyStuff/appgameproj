import { Hono, type Context } from 'hono';
import { asyncHandler } from '../middleware/error';
import { optionalAuthMiddleware } from '../middleware/auth';

export const analyticsRoutes = new Hono();

// Apply optional auth - works with or without authentication
analyticsRoutes.use('*', optionalAuthMiddleware);

/**
 * Track analytics events
 * Accepts events from frontend for user behavior tracking
 */
analyticsRoutes.post('/events', asyncHandler(async (c: Context) => {
  try {
    const body = await c.req.json();
    const user = c.get('user');
    
    // Log event for debugging (can be extended to store in database)
    console.log('📊 Analytics event:', {
      userId: user?.id || 'anonymous',
      timestamp: new Date().toISOString(),
      ...body
    });
    
    // Return success
    return c.json({ success: true });
  } catch (error) {
    console.error('Analytics event error:', error);
    // Always return success for analytics - don't break user experience
    return c.json({ success: true });
  }
}));

/**
 * Get analytics data (future feature)
 */
analyticsRoutes.get('/stats', asyncHandler(async (c: Context) => {
  // Placeholder for future analytics dashboard
  return c.json({
    message: 'Analytics stats endpoint - coming soon',
    available: false
  });
}));

