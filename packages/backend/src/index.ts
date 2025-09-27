import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/bun'
import { env, config, isProduction } from './config/env'
import { errorHandler } from './middleware/error'
import { requestLogger } from './middleware/logger'
import { securityHeadersMiddleware, sessionTimeoutMiddleware, requestTimeoutMiddleware, ipSecurityMiddleware } from './middleware/security'
import { apiRateLimit } from './middleware/rate-limit'
import { validateContentType, validateRequestSize } from './middleware/validation'
import { apiRoutes } from './routes/api'
import { monitoring } from './routes/monitoring'
import { supabaseRealtimeService } from './services/realtime-supabase'

const app = new Hono()

// Security middleware (applied first)
app.use('*', securityHeadersMiddleware())
app.use('*', ipSecurityMiddleware())
app.use('*', requestTimeoutMiddleware())

// Global middleware
if (!isProduction) {
  app.use('*', logger())
}

// Request logging middleware
if (config.enableRequestLogging) {
  app.use('*', requestLogger)
}

// CORS configuration
app.use('*', cors({
  origin: isProduction 
    ? ['https://tarkov.juanis.cool'] // Production domain
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}))

// Content validation middleware
app.use('*', validateContentType(['application/json', 'text/plain']))
app.use('*', validateRequestSize(5 * 1024 * 1024)) // 5MB limit

// Session management
app.use('*', sessionTimeoutMiddleware())

// Monitoring endpoints (no auth required)
app.route('/api', monitoring)

// Public leaderboard endpoint (no rate limiting)
app.get('/api/statistics/leaderboard', async (c) => {
  const { z } = await import('zod')
  const { HTTPException } = await import('hono/http-exception')
  const { StatisticsService } = await import('./services/statistics')
  
  const query = c.req.query()
  
  try {
    const leaderboardSchema = z.object({
      metric: z.enum(['balance', 'total_won', 'games_played', 'total_wagered']).default('balance'),
      limit: z.number().int().min(1).max(100).default(10)
    })
    
    const params = leaderboardSchema.parse({
      metric: query.metric as any,
      limit: query.limit ? parseInt(query.limit) : undefined
    })

    const leaderboard = await StatisticsService.getLeaderboard(params.metric, params.limit)

    return c.json({
      success: true,
      ...leaderboard,
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { 
        message: 'Invalid parameters', 
        cause: error.errors 
      })
    }
    
    console.error('Leaderboard error:', error)
    throw new HTTPException(500, { message: 'Failed to fetch leaderboard' })
  }
})

// API routes with rate limiting and authentication middleware
app.use('/api/*', apiRateLimit())
app.route('/api', apiRoutes)

// Serve static files from public directory (built frontend)
app.use('/*', serveStatic({ root: './public' }))

// Fallback to index.html for SPA routing
app.get('*', serveStatic({ path: './public/index.html' }))

// Global error handler
app.onError(errorHandler)

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...')
  await supabaseRealtimeService.shutdown()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...')
  await supabaseRealtimeService.shutdown()
  process.exit(0)
})

// Unhandled error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  if (isProduction) {
    process.exit(1)
  }
})

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  if (isProduction) {
    process.exit(1)
  }
})

const port = config.port

// Initialize Supabase Realtime service
async function initializeServices() {
  try {
    await supabaseRealtimeService.initialize()
    await supabaseRealtimeService.subscribeToTableChanges()
    console.log('✅ Supabase Realtime service initialized')
  } catch (error) {
    console.error('❌ Failed to initialize Supabase Realtime:', error)
    if (isProduction) {
      process.exit(1)
    }
  }
}

console.log(`🎰 Tarkov Casino Backend starting...`)
console.log(`📊 Environment: ${env.NODE_ENV}`)
console.log(`🚀 Port: ${port}`)
console.log(`🔗 Supabase URL: ${env.SUPABASE_URL}`)
console.log(`📝 Logging: ${config.enableRequestLogging ? 'enabled' : 'disabled'}`)
console.log(`📊 Metrics: ${config.metricsEnabled ? 'enabled' : 'disabled'}`)

// Initialize services
initializeServices()

export default {
  port,
  fetch: app.fetch,
}