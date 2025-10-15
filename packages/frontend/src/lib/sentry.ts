import * as Sentry from "@sentry/react";

export interface ErrorInfoType {
  [key: string | symbol]: string;
}

const isLocal = import.meta.env.DEV;
const isDevelopment = import.meta.env.MODE === 'development';

/**
 * Initialize Sentry for error tracking in production
 */
export function initSentry() {
  // Skip Sentry initialization in local development
  if (isLocal || isDevelopment) {
    console.log('🔧 Sentry disabled in development mode');
    return;
  }

  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!sentryDsn) {
    console.warn('⚠️  Sentry DSN not configured. Set VITE_SENTRY_DSN environment variable.');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    
    // Set environment
    environment: import.meta.env.MODE || 'production',
    
    // Set release version (from package.json)
    release: import.meta.env.VITE_APP_VERSION || '1.1.0',
    
    // Enable logging
    enableLogs: true,
    
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    
    // Performance monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      // Send console.log, console.warn, and console.error calls as logs to Sentry
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ],
    
    // Tracing
    // Capture 100% of the transactions in production, 0% in development
    tracesSampleRate: import.meta.env.PROD ? 1.0 : 0,
    
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/tarkov\.juanis\.cool\/api/,
      /^\/api/, // Local API calls
    ],
    
    // Session Replay
    // This sets the sample rate at 10%. You may want to change it to 100% while in development
    replaysSessionSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
    
    // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
    replaysOnErrorSampleRate: 1.0,
    
    // Filter out some common errors
    beforeSend(event) {
      // Filter out browser extension errors
      if (event.exception?.values?.[0]?.value?.includes('Extension context')) {
        return null;
      }
      
      // Filter out network errors that are likely user connection issues
      if (event.exception?.values?.[0]?.type === 'NetworkError') {
        return null;
      }
      
      return event;
    },
    
    // Add user context
    // Using tags to distinguish frontend vs backend if using same DSN
    initialScope: {
      tags: {
        'app.name': 'tarkov-casino',
        'app.component': 'frontend',
        'platform': 'browser'
      }
    }
  });

  console.log('✅ Sentry initialized for production');
}

/**
 * Log an error to Sentry
 * @param error The error to log
 * @param errorInfo Additional error information
 */
export function logError(error: unknown, errorInfo: ErrorInfoType | null = null) {
  // In development, just log to console
  if (isLocal || isDevelopment) {
    console.error('🔴 Error:', error);
    if (errorInfo) {
      console.error('🔴 Error Info:', errorInfo);
    }
    return;
  }

  // In production, send to Sentry
  Sentry.withScope((scope) => {
    if (errorInfo) {
      scope.setExtras(errorInfo);
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
  if (isLocal || isDevelopment) {
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
  if (isLocal || isDevelopment) {
    return;
  }

  Sentry.setUser({
    id: userId,
    ...userData
  });
}

/**
 * Clear user context from Sentry (on logout)
 */
export function clearUserContext() {
  if (isLocal || isDevelopment) {
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
  if (isLocal || isDevelopment) {
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
 * Create a Sentry span for performance tracking (e.g., button clicks, API calls)
 * 
 * @example
 * // In a component
 * const handleClick = () => {
 *   startSpan(
 *     { op: "ui.click", name: "Play Game Button" },
 *     (span) => {
 *       span?.setAttribute("gameType", "coinflip");
 *       span?.setAttribute("betAmount", 100);
 *       playGame();
 *     }
 *   );
 * };
 * 
 * @example
 * // In an API call
 * async function fetchUserData(userId) {
 *   return startSpan(
 *     { op: "http.client", name: `GET /api/users/${userId}` },
 *     async () => {
 *       const response = await fetch(`/api/users/${userId}`);
 *       return await response.json();
 *     }
 *   );
 * }
 */
export function startSpan<T>(
  context: { op: string; name: string },
  callback: (span: any) => T
): T {
  if (isLocal || isDevelopment) {
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
 * logger.warn("Rate limit reached", { endpoint: "/api/results/" });
 * logger.error("Failed to process payment", { orderId: "order_123" });
 * logger.fatal("Database connection pool exhausted", { activeConnections: 100 });
 */
export const logger = {
  trace: (message: string, extra?: Record<string, any>) => {
    if (isLocal || isDevelopment) {
      console.trace(message, extra);
      return;
    }
    Sentry.captureMessage(message, { level: 'debug', extra });
  },
  
  debug: (message: string, extra?: Record<string, any>) => {
    if (isLocal || isDevelopment) {
      console.debug(message, extra);
      return;
    }
    Sentry.captureMessage(message, { level: 'debug', extra });
  },
  
  info: (message: string, extra?: Record<string, any>) => {
    if (isLocal || isDevelopment) {
      console.info(message, extra);
      return;
    }
    Sentry.captureMessage(message, { level: 'info', extra });
  },
  
  warn: (message: string, extra?: Record<string, any>) => {
    if (isLocal || isDevelopment) {
      console.warn(message, extra);
      return;
    }
    Sentry.captureMessage(message, { level: 'warning', extra });
  },
  
  error: (message: string, extra?: Record<string, any>) => {
    if (isLocal || isDevelopment) {
      console.error(message, extra);
      return;
    }
    Sentry.captureMessage(message, { level: 'error', extra });
  },
  
  fatal: (message: string, extra?: Record<string, any>) => {
    if (isLocal || isDevelopment) {
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

