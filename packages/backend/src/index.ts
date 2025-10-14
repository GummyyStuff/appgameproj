import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/bun'
import { env, config, isProduction } from './config/env'
import { errorHandler } from './middleware/error'
import { requestLogger } from './middleware/logger'
import { securityHeadersMiddleware, requestTimeoutMiddleware, ipSecurityMiddleware } from './middleware/security'
import { apiRateLimit } from './middleware/rate-limit'
import { validateContentType, validateRequestSize } from './middleware/validation'
import { performanceMiddleware } from './middleware/performance'
import { apiRoutes } from './routes/api'
import { monitoring } from './routes/monitoring'
// Supabase realtime service removed - now using Appwrite realtime
// Custom WebSocket server removed - now using Appwrite Realtime

const app = new Hono()

// Security middleware (applied first)
app.use('*', securityHeadersMiddleware())
app.use('*', ipSecurityMiddleware())
app.use('*', requestTimeoutMiddleware())

// Performance monitoring middleware
app.use('*', performanceMiddleware)

// Global middleware
if (!isProduction()) {
  app.use('*', logger())
}

// Request logging middleware
if (config.enableRequestLogging) {
  app.use('*', requestLogger)
}

// CORS configuration
app.use('*', cors({
  origin: isProduction() 
    ? ['https://tarkov.juanis.cool'] // Production domain
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}))

// Content validation middleware (only for API routes, not static files)
app.use('/api/*', validateContentType(['application/json', 'text/plain']))
app.use('/api/*', validateRequestSize(5 * 1024 * 1024)) // 5MB limit

// Session management - DEPRECATED
// sessionTimeoutMiddleware has been disabled (see security.ts)
// Authentication is now handled by authMiddleware/criticalAuthMiddleware per-route
// app.use('*', sessionTimeoutMiddleware())

// Monitoring endpoints (no auth required)
app.route('/api', monitoring)

// Public leaderboard endpoint (no rate limiting, cached)
app.get('/api/statistics/leaderboard', async (c) => {
  const { z } = await import('zod')
  const { HTTPException } = await import('hono/http-exception')
  const { StatisticsServiceAppwrite: StatisticsService } = await import('./services/statistics-appwrite')
  
  const query = c.req.query()
  
  try {
    const leaderboardSchema = z.object({
      metric: z.enum(['balance', 'totalWon', 'gamesPlayed', 'totalWagered']).default('balance'),
      limit: z.number().int().min(1).max(100).default(10)
    })
    
    const params = leaderboardSchema.parse({
      metric: query.metric as any,
      limit: query.limit ? parseInt(query.limit) : undefined
    })

    const leaderboard = await StatisticsService.getLeaderboard(params.metric, params.limit)

    // Cache-Control: public data, cache for 2 minutes
    c.header('Cache-Control', 'public, max-age=120, s-maxage=120')

    return c.json({
      success: true,
      leaderboard: leaderboard,
      metric: params.metric,
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { 
        message: 'Invalid parameters', 
        cause: error.issues 
      })
    }
    
    console.error('Leaderboard error:', error)
    throw new HTTPException(500, { message: 'Failed to fetch leaderboard' })
  }
})

// Public global statistics endpoint (no rate limiting, cached)
app.get('/api/statistics/global', async (c) => {
  const { z } = await import('zod')
  const { HTTPException } = await import('hono/http-exception')
  const { StatisticsServiceAppwrite: StatisticsService } = await import('./services/statistics-appwrite')
  const { withCache } = await import('./utils/cache')
  
  const query = c.req.query()
  const days = query.days ? parseInt(query.days) : 30
  
  try {
    const globalStatsSchema = z.object({
      days: z.number().int().min(1).max(365).default(30)
    })
    
    const params = globalStatsSchema.parse({
      days: query.days ? parseInt(query.days) : undefined
    })

    console.log('📊 Fetching global statistics for', params.days, 'days...')
    
    // Cache global stats for 2 minutes (since it's expensive)
    const globalStats = await withCache(
      `global_stats_${params.days}d`,
      () => StatisticsService.getGlobalStatistics(params.days),
      2 * 60 * 1000
    );
    
    console.log('✅ Global statistics fetched successfully')

    // Cache-Control: public data, cache for 2 minutes
    c.header('Cache-Control', 'public, max-age=120, s-maxage=120')

    return c.json({
      success: true,
      global_statistics: globalStats,
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { 
        message: 'Invalid parameters', 
        cause: error.issues 
      })
    }
    
    console.error('❌ Global stats error:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack')
    
    // Return empty statistics instead of crashing
    return c.json({
      success: true,
      global_statistics: {
        overview: {
          totalGames: 0,
          totalWagered: 0,
          totalWon: 0,
          netProfit: 0,
          winRate: 0,
          biggestWin: 0,
          biggestLoss: 0,
          averageBet: 0,
          averageWin: 0,
          profitMargin: 0
        },
        gameBreakdown: [],
        timeSeriesData: [],
        totalUsers: 0,
        period: `${days} days`
      },
      generated_at: new Date().toISOString(),
      note: 'No data available or error fetching statistics'
    })
  }
})

// API routes with rate limiting and authentication middleware
app.use('/api/*', apiRateLimit)
app.route('/api', apiRoutes)

// Serve static files from public directory (built frontend)
// Serve all static files including Font Awesome
app.use('/*', serveStatic({ 
  root: './public',
  rewriteRequestPath: (path) => {
    const rewritten = path.replace(/^\//, '')
    console.log(`📁 [STATIC] Request: ${path} → Rewritten: ${rewritten}`)
    return rewritten
  },
  // Manually set correct MIME types using onFound callback
  onFound: (path, c) => {
    console.log(`✅ [FOUND] File found: ${path}`)
    // Set Content-Type based on file extension
    if (path.endsWith('.css')) {
      c.header('Content-Type', 'text/css; charset=utf-8')
      console.log(`📝 [MIME] Set CSS MIME type for: ${path}`)
    } else if (path.endsWith('.js')) {
      c.header('Content-Type', 'application/javascript; charset=utf-8')
    } else if (path.endsWith('.json')) {
      c.header('Content-Type', 'application/json; charset=utf-8')
    } else if (path.endsWith('.woff')) {
      c.header('Content-Type', 'font/woff')
    } else if (path.endsWith('.woff2')) {
      c.header('Content-Type', 'font/woff2')
    } else if (path.endsWith('.ttf')) {
      c.header('Content-Type', 'font/ttf')
    } else if (path.endsWith('.eot')) {
      c.header('Content-Type', 'application/vnd.ms-fontobject')
    } else if (path.endsWith('.svg')) {
      c.header('Content-Type', 'image/svg+xml')
    } else if (path.endsWith('.png')) {
      c.header('Content-Type', 'image/png')
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      c.header('Content-Type', 'image/jpeg')
    } else if (path.endsWith('.gif')) {
      c.header('Content-Type', 'image/gif')
    } else if (path.endsWith('.webp')) {
      c.header('Content-Type', 'image/webp')
    } else if (path.endsWith('.ico')) {
      c.header('Content-Type', 'image/x-icon')
    } else if (path.endsWith('.webmanifest')) {
      c.header('Content-Type', 'application/manifest+json')
    } else if (path.endsWith('.html')) {
      c.header('Content-Type', 'text/html; charset=utf-8')
    }
    // Set cache headers for static assets
    c.header('Cache-Control', 'public, max-age=31536000, immutable')
  },
  onNotFound: (path, c) => {
    console.log(`❌ [NOT FOUND] Static file not found: ${path}, Request path: ${c.req.path}`)
  }
}))

// Fallback to index.html for SPA routing (only for HTML requests)
app.get('*', async (c) => {
  // Check if the request is for a static asset
  const path = c.req.path
  console.log(`🔄 [FALLBACK] Hit fallback handler for: ${path}`)
  
  if (path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webmanifest)$/)) {
    // If static asset not found, return 404 instead of index.html
    console.log(`⚠️  [404] Static asset not found: ${path}`)
    return c.notFound()
  }
  // Otherwise serve index.html for SPA routing
  console.log(`📄 [SPA] Serving index.html for: ${path}`)
  return serveStatic({ path: './public/index.html' })(c, async () => {})
})

// Global error handler
app.onError(errorHandler)

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...')
  // Shutdown stock market state service
  const { stockMarketStateService } = await import('./services/stock-market-state')
  stockMarketStateService.shutdown()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...')
  // Shutdown stock market state service
  const { stockMarketStateService } = await import('./services/stock-market-state')
  stockMarketStateService.shutdown()
  process.exit(0)
})

// Unhandled error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  if (isProduction()) {
    process.exit(1)
  }
})

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  if (isProduction()) {
    process.exit(1)
  }
})

const port = config.port

// Initialize services (Appwrite version)
async function initializeServices() {
  try {
    // Initialize Stock Market State Service
    const { stockMarketStateService } = await import('./services/stock-market-state')
    await stockMarketStateService.initialize()
    console.log('✅ Stock Market State Service initialized')
    
    // Appwrite doesn't require server-side initialization
    // Realtime is handled client-side
    console.log('✅ Appwrite services ready')
  } catch (error) {
    console.error('❌ Failed to initialize services:', error)
    if (isProduction()) {
      process.exit(1)
    }
  }
}

console.log(`🎰 Tarkov Casino Backend starting...`)
console.log(`📊 Environment: ${env.NODE_ENV}`)
console.log(`🚀 Port: ${port}`)
console.log(`🔗 Database: Appwrite (${process.env.APPWRITE_ENDPOINT})`)
console.log(`📝 Logging: ${config.enableRequestLogging ? 'enabled' : 'disabled'}`)
console.log(`📊 Metrics: ${config.metricsEnabled ? 'enabled' : 'disabled'}`)

// Initialize services
initializeServices()

// Export the Hono app for Coolify/Bun to handle server initialization
// Note: Real-time updates are now handled by Appwrite Realtime
// No custom WebSocket server needed!
console.log(`✅ Server configured for port ${port}`)
console.log(`📡 Real-time updates via Appwrite Realtime`)

export default {
  port,
  fetch: app.fetch,
}