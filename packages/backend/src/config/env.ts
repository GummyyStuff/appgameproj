import { z } from 'zod'

const envSchema = z.object({
  // Application Configuration
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Supabase Configuration (DEPRECATED - kept for backward compatibility)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  
  // Security Configuration (optional - only needed for tests)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long').optional(),
  
  // Game Configuration
  STARTING_BALANCE: z.string().default('10000'),
  DAILY_BONUS: z.string().default('1000'),
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ENABLE_REQUEST_LOGGING: z.string().default('true'),
  ENABLE_GAME_LOGGING: z.string().default('true'),
  ENABLE_SECURITY_LOGGING: z.string().default('true'),
  
  // Performance Configuration
  MAX_REQUEST_SIZE: z.string().default('10mb'),
  REQUEST_TIMEOUT: z.string().default('30000'),
  RATE_LIMIT_WINDOW: z.string().default('900000'), // 15 minutes
  RATE_LIMIT_MAX: z.string().default('100'),
  
  // Monitoring Configuration
  HEALTH_CHECK_TIMEOUT: z.string().default('5000'),
  METRICS_ENABLED: z.string().default('true'),
  
  // Redis Configuration
  REDIS_URL: z.string().url().optional(), // e.g., redis://localhost:6379
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().default('0'), // Database number (0-15)
  REDIS_ENABLED: z.string().default('true'), // Enable/disable Redis
  
  // Cache Configuration
  CACHE_USER_PROFILE_TTL: z.string().default('300'), // 5 minutes
  CACHE_BALANCE_TTL: z.string().default('60'), // 1 minute
  CACHE_LEADERBOARD_TTL: z.string().default('30'), // 30 seconds
  CACHE_STATS_TTL: z.string().default('120'), // 2 minutes
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env)

    // Log configuration in development
    if (parsed.NODE_ENV === 'development') {
      console.log('🔧 Environment Configuration:')
      console.log(`   NODE_ENV: ${parsed.NODE_ENV}`)
      console.log(`   PORT: ${parsed.PORT}`)
      console.log(`   DATABASE: Appwrite`)
      console.log(`   REDIS: ${parsed.REDIS_ENABLED === 'true' ? `${parsed.REDIS_HOST}:${parsed.REDIS_PORT}` : 'Disabled'}`)
      console.log(`   LOG_LEVEL: ${parsed.LOG_LEVEL}`)
      console.log(`   METRICS_ENABLED: ${parsed.METRICS_ENABLED}`)
    }

    return parsed
  } catch (error) {
    console.error('❌ Invalid environment variables:')
    console.error('Error type:', typeof error)
    console.error('Error keys:', Object.keys(error || {}))
    console.error('Error:', error)

    if (error instanceof z.ZodError) {
      error.issues.forEach(err => {
        console.error(`   ${err.path.join('.')}: ${err.message}`)
      })
    } else {
      console.error('   Error:', error instanceof Error ? error.message : String(error))
    }

    // In test environment, don't exit - just throw
    if (process.env.NODE_ENV === 'test') {
      throw error
    }

    process.exit(1)
  }
}

// Lazy-loaded environment validation
let _env: Env | null = null
let _config: any = null

function getEnv(): Env {
  if (!_env) {
    _env = validateEnv()
  }
  return _env
}

function getConfig(): any {
  if (!_config) {
    const env = getEnv()
    _config = {
      port: parseInt(env.PORT),
      startingBalance: parseInt(env.STARTING_BALANCE),
      dailyBonus: parseInt(env.DAILY_BONUS),
      requestTimeout: parseInt(env.REQUEST_TIMEOUT),
      rateLimitWindow: parseInt(env.RATE_LIMIT_WINDOW),
      rateLimitMax: parseInt(env.RATE_LIMIT_MAX),
      healthCheckTimeout: parseInt(env.HEALTH_CHECK_TIMEOUT),

      // Boolean flags
      enableRequestLogging: env.ENABLE_REQUEST_LOGGING === 'true',
      enableGameLogging: env.ENABLE_GAME_LOGGING === 'true',
      enableSecurityLogging: env.ENABLE_SECURITY_LOGGING === 'true',
      metricsEnabled: env.METRICS_ENABLED === 'true',
      redisEnabled: env.REDIS_ENABLED === 'true',
      
      // Redis configuration
      redis: {
        url: env.REDIS_URL,
        host: env.REDIS_HOST,
        port: parseInt(env.REDIS_PORT),
        password: env.REDIS_PASSWORD,
        db: parseInt(env.REDIS_DB),
      },
      
      // Cache TTLs (in seconds)
      cache: {
        userProfileTtl: parseInt(env.CACHE_USER_PROFILE_TTL),
        balanceTtl: parseInt(env.CACHE_BALANCE_TTL),
        leaderboardTtl: parseInt(env.CACHE_LEADERBOARD_TTL),
        statsTtl: parseInt(env.CACHE_STATS_TTL),
      },
    }
  }
  return _config
}

export const env = new Proxy({} as Env, {
  get(target, prop) {
    return getEnv()[prop as keyof Env]
  }
})

export const config = new Proxy({} as any, {
  get(target, prop) {
    return getConfig()[prop]
  }
})

// Helper functions for environment-specific behavior
export const isDevelopment = () => getEnv().NODE_ENV === 'development'
export const isProduction = () => getEnv().NODE_ENV === 'production'
export const isTest = () => getEnv().NODE_ENV === 'test'