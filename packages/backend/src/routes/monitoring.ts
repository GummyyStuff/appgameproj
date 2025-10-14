import { Hono } from 'hono'
import { env, config } from '../config/env'
import { appwriteDb } from '../services/appwrite-database'
import { COLLECTION_IDS } from '../config/collections'
import { stockMarketStateService } from '../services/stock-market-state'

const monitoring = new Hono()

// Basic health check endpoint
monitoring.get('/health', async (c) => {
  try {
    const startTime = Date.now()
    const responseTime = Date.now() - startTime
    
    // Simple health check - service is up
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'tarkov-casino-backend',
      version: '1.0.0',
      environment: env.NODE_ENV,
      uptime: process.uptime(),
      responseTime,
      database: 'appwrite'
    }, 200)
  } catch (error) {
    return c.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'tarkov-casino-backend',
      version: '1.0.0',
      environment: env.NODE_ENV,
      error: 'Health check failed',
      uptime: process.uptime()
    }, 503)
  }
})

// Detailed health check with more comprehensive checks
monitoring.get('/health/detailed', async (c) => {
  try {
    const startTime = Date.now()
    
    // Check memory usage
    const memoryUsage = process.memoryUsage()
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    }
    
    // Check system info
    const systemInfo = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: process.uptime(),
      pid: process.pid
    }
    
    const responseTime = Date.now() - startTime
    
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'tarkov-casino-backend',
      version: '1.0.0',
      environment: env.NODE_ENV,
      responseTime,
      system: systemInfo,
      memory: memoryUsageMB,
      database: 'appwrite'
    }, 200)
  } catch (error) {
    return c.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'tarkov-casino-backend',
      version: '1.0.0',
      environment: env.NODE_ENV,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 503)
  }
})

// Readiness check (for Kubernetes-style deployments)
monitoring.get('/ready', async (c) => {
  try {
    const startTime = Date.now()
    
    // Test Appwrite connectivity
    let appwriteStatus = 'unknown';
    let appwriteError = null;
    
    try {
      const testQuery = await Promise.race([
        appwriteDb.listDocuments(COLLECTION_IDS.USERS, [appwriteDb.limit(1)]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]) as any;
      
      appwriteStatus = testQuery.error ? 'error' : 'connected';
      appwriteError = testQuery.error;
    } catch (error: any) {
      appwriteStatus = 'timeout';
      appwriteError = error.message;
    }
    
    const responseTime = Date.now() - startTime;
    const isReady = appwriteStatus === 'connected';
    
    return c.json({
      ready: isReady,
      timestamp: new Date().toISOString(),
      checks: {
        database: 'appwrite',
        status: appwriteStatus,
        error: appwriteError,
        responseTime
      }
    }, isReady ? 200 : 503)
  } catch (error) {
    return c.json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed'
    }, 503)
  }
})

// Liveness check (for Kubernetes-style deployments)
monitoring.get('/live', async (c) => {
  // Simple liveness check - if the server can respond, it's alive
  return c.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Metrics endpoint (basic metrics for monitoring)
monitoring.get('/metrics', async (c) => {
  if (!config.metricsEnabled) {
    return c.json({ error: 'Metrics disabled' }, 404)
  }
  
  try {
    const memoryUsage = process.memoryUsage()
    
    // Basic Prometheus-style metrics
    const metrics = [
      `# HELP nodejs_memory_usage_bytes Memory usage in bytes`,
      `# TYPE nodejs_memory_usage_bytes gauge`,
      `nodejs_memory_usage_bytes{type="rss"} ${memoryUsage.rss}`,
      `nodejs_memory_usage_bytes{type="heapTotal"} ${memoryUsage.heapTotal}`,
      `nodejs_memory_usage_bytes{type="heapUsed"} ${memoryUsage.heapUsed}`,
      `nodejs_memory_usage_bytes{type="external"} ${memoryUsage.external}`,
      ``,
      `# HELP nodejs_process_uptime_seconds Process uptime in seconds`,
      `# TYPE nodejs_process_uptime_seconds gauge`,
      `nodejs_process_uptime_seconds ${process.uptime()}`,
      ``,
      `# HELP tarkov_casino_info Application information`,
      `# TYPE tarkov_casino_info gauge`,
      `tarkov_casino_info{version="1.0.0",environment="${env.NODE_ENV}"} 1`,
    ].join('\n')
    
    return c.text(metrics, 200, {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
    })
  } catch (error) {
    return c.json({ error: 'Failed to generate metrics' }, 500)
  }
})

// Stock Market Service Health Check
monitoring.get('/health/stock-market', async (c) => {
  try {
    const state = await stockMarketStateService.getCurrentState()
    
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'stock-market-state-service',
      state: {
        current_price: state.current_price,
        prev_price: state.prev_price,
        trend: state.trend,
        volatility: state.volatility,
        tick_count: state.tick_count,
        last_update: state.last_update
      },
      message: 'Stock market service is running and generating updates'
    }, 200)
  } catch (error) {
    return c.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'stock-market-state-service',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Stock market service is not running or encountered an error'
    }, 503)
  }
})

export { monitoring }