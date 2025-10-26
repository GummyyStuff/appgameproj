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

  // Use SENTRY_DSN for backend, don't fallback to VITE_SENTRY_DSN
  // to avoid mixing frontend and backend configurations
  const sentryDsn = process.env.SENTRY_DSN;
  
  if (!sentryDsn) {
    console.warn('⚠️  Sentry DSN not configured. Set SENTRY_DSN environment variable for backend.');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    
    // Set environment
    environment: process.env.NODE_ENV || 'production',
    
    // Set release version - can be set via SENTRY_RELEASE env var or defaults to package version
    release: process.env.SENTRY_RELEASE || process.env.npm_package_version || 'tarkov-backend@1.1.0',
    
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

    // Filter out some common errors and sanitize sensitive data
    beforeSend(event) {
      // Filter out expected errors
      if (event.exception?.values?.[0]?.value?.includes('ECONNREFUSED')) {
        return null;
      }
      
      // Scrub sensitive data from stack traces
      if (event.exception?.values) {
        event.exception.values = event.exception.values.map(value => {
          if (value.stacktrace?.frames) {
            value.stacktrace.frames = value.stacktrace.frames.map(frame => {
              // Remove variables from stack frames to prevent secret exposure
              if (frame.vars && typeof frame.vars === 'object') {
                // Only keep non-sensitive variables
                frame.vars = Object.fromEntries(
                  Object.entries(frame.vars).filter(([key]) => 
                    !key.match(/password|secret|token|key|credential|session|auth|apikey/i)
                  )
                );
              }
              return frame;
            });
          }
          return value;
        });
      }
      
      // Scrub sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          // Filter out session secrets from logs
          if (breadcrumb.category === 'console' && breadcrumb.message) {
            breadcrumb.message = breadcrumb.message
              .replace(/session[^,]*secret[^,\s]*/gi, '[REDACTED]')
              .replace(/cookie[^,]*value[^,\s]*/gi, '[REDACTED]')
              .replace(/token=[^&\s]+/g, 'token=[REDACTED]')
              .replace(/password=[^&\s]+/g, 'password=[REDACTED]')
              .replace(/apikey=[^&\s]+/g, 'apikey=[REDACTED]');
          }
          
          // Scrub any data that might contain secrets
          if (breadcrumb.data) {
            Object.keys(breadcrumb.data).forEach(key => {
              if (key.match(/password|secret|token|key|credential|session|auth/i)) {
                const data = breadcrumb.data;
                if (data) {
                  data[key] = '[REDACTED]';
                }
              }
            });
          }
          
          return breadcrumb;
        });
      }
      
      return event;
    },
    
    // Filter breadcrumbs before capture
    beforeBreadcrumb(breadcrumb) {
      // Don't capture breadcrumbs with sensitive data
      if (breadcrumb.category === 'console') {
        const message = breadcrumb.message || '';
        if (message.match(/session.*secret|password|token|apikey|credential/i)) {
          // Redact sensitive info
          breadcrumb.message = message
            .replace(/session[^,]*secret[^,\s]*/gi, '[REDACTED]')
            .replace(/password[=:][^,\s]+/gi, 'password=[REDACTED]')
            .replace(/token[=:][^,\s]+/gi, 'token=[REDACTED]')
            .replace(/apikey[=:][^,\s]+/gi, 'apikey=[REDACTED]');
        }
      }
      
      return breadcrumb;
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

  // Don't send email or other PII to Sentry
  const { email, password, ...safeUserData } = userData || {};
  
  Sentry.setUser({
    id: userId,
    username: userData?.username,
    // Don't send email for privacy
    // email: userData?.email,
    ...safeUserData
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
 * This provides a wrapper around Sentry.logger for consistency with development logging
 * 
 * @example
 * logger.trace("Starting database connection", { database: "users" });
 * logger.debug(logger.fmt`Cache miss for user: ${userId}`);
 * logger.info("Updated profile", { profileId: 345 });
 * logger.warn("Rate limit reached for endpoint", { endpoint: "/api/results/" });
 * logger.error("Failed to process payment", { orderId: "order_123", amount: 99.99 });
 * logger.fatal("Database connection pool exhausted", { database: "users", activeConnections: 100 });
 */
export const logger: {
  trace: (message: string, extra?: Record<string, any>) => void;
  debug: (message: string, extra?: Record<string, any>) => void;
  info: (message: string, extra?: Record<string, any>) => void;
  warn: (message: string, extra?: Record<string, any>) => void;
  error: (message: string, extra?: Record<string, any>) => void;
  fatal: (message: string, extra?: Record<string, any>) => void;
  fmt: (strings: TemplateStringsArray, ...values: any[]) => string;
} = {
  trace: (message: string, extra?: Record<string, any>) => {
    if (isDevelopment) {
      console.trace(message, extra);
      return;
    }
    // Use Sentry's built-in logger API for proper structured logging
    Sentry.logger.trace(message, extra);
  },
  
  debug: (message: string, extra?: Record<string, any>) => {
    if (isDevelopment) {
      console.debug(message, extra);
      return;
    }
    Sentry.logger.debug(message, extra);
  },
  
  info: (message: string, extra?: Record<string, any>) => {
    if (isDevelopment) {
      console.info(message, extra);
      return;
    }
    Sentry.logger.info(message, extra);
  },
  
  warn: (message: string, extra?: Record<string, any>) => {
    if (isDevelopment) {
      console.warn(message, extra);
      return;
    }
    Sentry.logger.warn(message, extra);
  },
  
  error: (message: string, extra?: Record<string, any>) => {
    if (isDevelopment) {
      console.error(message, extra);
      return;
    }
    Sentry.logger.error(message, extra);
  },
  
  fatal: (message: string, extra?: Record<string, any>) => {
    if (isDevelopment) {
      console.error('[FATAL]', message, extra);
      return;
    }
    Sentry.logger.fatal(message, extra);
  },
  
  // Template literal function for formatting - uses Sentry's fmt
  fmt: (strings: TemplateStringsArray, ...values: any[]) => {
    return Sentry.logger.fmt(strings, ...values);
  }
};

// Export Sentry for advanced usage
export { Sentry };

