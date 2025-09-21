import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/bun'
import { env, config, isProduction } from './config/env'
import { errorHandler } from './middleware/error'
import { requestLogger } from './middleware/logger'
import { apiRoutes } from './routes/api'
import { monitoring } from './routes/monitoring'
import { supabaseRealtimeService } from './services/realtime-supabase'

const app = new Hono()

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
    ? ['https://your-domain.com'] // Update with your production domain
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}))

// Monitoring endpoints (no auth required)
app.route('/api', monitoring)

// API routes with authentication middleware
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