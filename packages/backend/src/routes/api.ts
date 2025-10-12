import { Hono } from 'hono'
import { authRoutes } from './auth'
import { userRoutes } from './user'
import { gameRoutes } from './games'
import { statisticsRoutes } from './statistics'
import { chatRoutes } from './chat'
import { analyticsRoutes } from './analytics'

export const apiRoutes = new Hono()

// Public routes (no authentication required)
apiRoutes.get('/', (c) => {
  return c.json({
    message: 'Tarkov Casino API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      user: '/api/user',
      games: '/api/games',
      statistics: '/api/statistics',
      chat: '/api/chat',
      analytics: '/api/analytics',
      health: '/api/health'
    }
  })
})

// Mount route modules
apiRoutes.route('/auth', authRoutes)
apiRoutes.route('/user', userRoutes)
apiRoutes.route('/games', gameRoutes)
apiRoutes.route('/statistics', statisticsRoutes)
apiRoutes.route('/chat', chatRoutes)
apiRoutes.route('/analytics', analyticsRoutes)