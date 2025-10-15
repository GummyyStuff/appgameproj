import * as Sentry from "@sentry/bun";
// Note: @sentry/profiling-node causes Bun to crash due to unsupported libuv functions
// See: https://github.com/oven-sh/bun/issues/18546
// Profiling is disabled for now - use Sentry's built-in performance monitoring instead

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Initialize Sentry for backend error tracking
 */
export function initSentry() {
  // Skip Sentry initialization in development
  if (!isProduction) {
    console.log('🔧 Sentry disabled in development mode');
    return;
  }

  // Prioritize separate backend DSN, fall back to frontend DSN if not set
  const sentryDsn = process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN;
  
  if (!sentryDsn) {
    console.warn('⚠️  Sentry DSN not configured. Set SENTRY_DSN or VITE_SENTRY_DSN environment variable.');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    
    // Set environment
    environment: process.env.NODE_ENV || 'production',
    
    // Set release version
    release: process.env.npm_package_version || '1.1.0',
    
    // Enable logging
    enableLogs: true,
    
    // Performance monitoring
    integrations: [
      // NOTE: nodeProfilingIntegration() is disabled because it crashes Bun
      // The profiling package uses libuv which Bun doesn't fully support yet
      // We still get performance monitoring via tracesSampleRate
      
      // Send console.log, console.warn, and console.error calls as logs to Sentry
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ],
    
    // Intelligent sampling based on transaction context
    tracesSampler: (samplingContext) => {
      const transactionName = samplingContext.name || '';
      const transactionData = samplingContext.data || {};
      
      // Always sample critical game operations
      if (transactionName.includes('/api/game/') || 
          transactionName.includes('/api/payment/') ||
          transactionName.includes('/api/auth/')) {
        return 1.0;
      }
      
      // Sample API calls at higher rate
      if (transactionName.startsWith('GET /api') || 
          transactionName.startsWith('POST /api')) {
        return 0.8;
      }
      
      // Sample health checks and monitoring at lower rate
      if (transactionName.includes('/health') || 
          transactionName.includes('/metrics')) {
        return 0.1;
      }
      
      // Sample database operations based on complexity
      if (transactionData.db_operation) {
        if (transactionData.db_operation === 'SELECT' && transactionData.db_table === 'users') {
          return 0.3; // User queries are frequent but important
        }
        if (transactionData.db_operation === 'INSERT' || transactionData.db_operation === 'UPDATE') {
          return 0.9; // Writes are critical
        }
        return 0.5; // Default for other DB operations
      }
      
      // Sample based on user context if available
      if (transactionData.user_id) {
        const userId = transactionData.user_id;
        // Sample premium users at higher rate
        if (transactionData.user_subscription_tier === 'premium' || 
            transactionData.user_subscription_tier === 'vip') {
          return 0.9;
        }
        // Sample high-value customers at higher rate
        if (transactionData.user_total_spent > 1000) {
          return 0.8;
        }
      }
      
      // Default sampling rate
      return 0.2;
    },
    
    // Set `tracePropagationTargets` to control for which URLs trace propagation should be enabled
    tracePropagationTargets: [
      "localhost", 
      /^https:\/\/tarkov\.juanis\.cool\/api/,
      /^\/api/, // Local API calls
    ],

    // Filter out some common errors
    beforeSend(event) {
      // Filter out expected errors
      if (event.exception?.values?.[0]?.value?.includes('ECONNREFUSED')) {
        return null;
      }
      
      return event;
    },
    
    // Add server context
    // Using tags to distinguish frontend vs backend in the same project
    initialScope: {
      tags: {
        'app.name': 'tarkov-casino',
        'app.component': 'backend',
        'platform': 'server',
        'runtime': 'bun',
        'bun.version': '1.3.0'
      }
    }
  });

  console.log('✅ Sentry initialized for production backend');
}

/**
 * Log an error to Sentry
 * @param error The error to log
 * @param context Additional context information
 */
export function logError(error: unknown, context?: Record<string, any>) {
  // In development, just log to console
  if (isDevelopment) {
    console.error('🔴 Error:', error);
    if (context) {
      console.error('🔴 Context:', context);
    }
    return;
  }

  // In production, send to Sentry
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

/**
 * Log a message to Sentry
 * @param message The message to log
 * @param level The severity level
 */
export function logMessage(
  message: string, 
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info'
) {
  if (isDevelopment) {
    console.log(`[${level.toUpperCase()}]`, message);
    return;
  }

  Sentry.captureMessage(message, level);
}

/**
 * Set user context for Sentry
 * @param userId User ID
 * @param userData Additional user data
 */
export function setUserContext(userId: string, userData?: Record<string, any>) {
  if (isDevelopment) {
    return;
  }

  Sentry.setUser({
    id: userId,
    ...userData
  });
}

/**
 * Clear user context from Sentry
 */
export function clearUserContext() {
  if (isDevelopment) {
    return;
  }

  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 * @param message Breadcrumb message
 * @param category Breadcrumb category
 * @param level Severity level
 * @param data Additional data
 */
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
  data?: Record<string, any>
) {
  if (isDevelopment) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000
  });
}

/**
 * Create a Sentry span for performance tracking (e.g., database queries, API calls)
 * 
 * @example
 * // Database operation
 * const result = await withSpan(
 *   "database",
 *   "Fetch user profile",
 *   async () => {
 *     return await database.getUser(userId);
 *   }
 * );
 * 
 * @example
 * // API call with attributes
 * const data = await Sentry.startSpan(
 *   { op: "http.client", name: "POST /api/game/play" },
 *   async (span) => {
 *     span?.setAttribute("gameType", "coinflip");
 *     span?.setAttribute("betAmount", 100);
 *     return await fetch("/api/game/play", { method: "POST", body: data });
 *   }
 * );
 */
export async function withSpan<T>(
  operation: string,
  description: string,
  callback: () => Promise<T>
): Promise<T> {
  if (isDevelopment) {
    return callback();
  }

  return Sentry.startSpan(
    {
      op: operation,
      name: description,
    },
    callback
  );
}

/**
 * Start a span with access to the span object for adding attributes
 * Use this when you need to add custom attributes to the span
 * 
 * @example
 * const result = await startSpan(
 *   { op: "database", name: "Complex Query" },
 *   async (span) => {
 *     span?.setAttribute("queryType", "aggregation");
 *     span?.setAttribute("rowCount", 1000);
 *     return await complexQuery();
 *   }
 * );
 */
export function startSpan<T>(
  context: { op: string; name: string },
  callback: (span: any) => T
): T {
  if (isDevelopment) {
    return callback(null);
  }

  return Sentry.startSpan(context, callback);
}

/**
 * Sentry logger for structured logging
 * Use logger.fmt for template literals
 * 
 * @example
 * logger.trace("Starting database connection", { database: "users" });
 * logger.debug(logger.fmt`Cache miss for user: ${userId}`);
 * logger.info("Updated profile", { profileId: 345 });
 * logger.warn("Rate limit reached for endpoint", { endpoint: "/api/results/" });
 * logger.error("Failed to process payment", { orderId: "order_123", amount: 99.99 });
 * logger.fatal("Database connection pool exhausted", { database: "users", activeConnections: 100 });
 */
export const logger = {
  trace: (message: string, extra?: Record<string, any>) => {
    if (isDevelopment) {
      console.trace(message, extra);
      return;
    }
    Sentry.captureMessage(message, { level: 'debug', extra });
  },
  
  debug: (message: string, extra?: Record<string, any>) => {
    if (isDevelopment) {
      console.debug(message, extra);
      return;
    }
    Sentry.captureMessage(message, { level: 'debug', extra });
  },
  
  info: (message: string, extra?: Record<string, any>) => {
    if (isDevelopment) {
      console.info(message, extra);
      return;
    }
    Sentry.captureMessage(message, { level: 'info', extra });
  },
  
  warn: (message: string, extra?: Record<string, any>) => {
    if (isDevelopment) {
      console.warn(message, extra);
      return;
    }
    Sentry.captureMessage(message, { level: 'warning', extra });
  },
  
  error: (message: string, extra?: Record<string, any>) => {
    if (isDevelopment) {
      console.error(message, extra);
      return;
    }
    Sentry.captureMessage(message, { level: 'error', extra });
  },
  
  fatal: (message: string, extra?: Record<string, any>) => {
    if (isDevelopment) {
      console.error('[FATAL]', message, extra);
      return;
    }
    Sentry.captureMessage(message, { level: 'fatal', extra });
  },
  
  // Template literal function for formatting
  fmt: (strings: TemplateStringsArray, ...values: any[]) => {
    return strings.reduce((acc, str, i) => {
      return acc + str + (values[i] !== undefined ? String(values[i]) : '');
    }, '');
  }
};

// Export Sentry for advanced usage
export { Sentry };

