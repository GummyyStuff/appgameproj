import * as Sentry from "@sentry/react";
import { useEffect, useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from "react-router-dom";

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
      // React Router v6 integration for automatic route tracking
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      // Send console.log, console.warn, and console.error calls as logs to Sentry
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ],
    
    // Tracing configuration
    // This enables automatic instrumentation (highly recommended)
    // If you only want to use custom instrumentation:
    // * Remove the `BrowserTracing` integration
    // * add `Sentry.addTracingExtensions()` above your Sentry.init() call
    
    // Intelligent sampling based on transaction context
    tracesSampler: (samplingContext) => {
      // Always sample critical user interactions
      if (samplingContext.name?.includes('login') || 
          samplingContext.name?.includes('game') ||
          samplingContext.name?.includes('payment')) {
        return 1.0;
      }
      
      // Sample API calls at higher rate
      if (samplingContext.name?.startsWith('GET /api') || 
          samplingContext.name?.startsWith('POST /api')) {
        return 0.8;
      }
      
      // Sample page loads at moderate rate
      if (samplingContext.name?.startsWith('pageload')) {
        return 0.5;
      }
      
      // Sample navigation at lower rate
      if (samplingContext.name?.startsWith('navigation')) {
        return 0.3;
      }
      
      // Default sampling rate
      return 0.1;
    },
    
    // Set `tracePropagationTargets` to control for which URLs trace propagation should be enabled
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
 * Set user context for Sentry with enhanced data
 * @param userId User ID
 * @param userData Additional user data
 */
export function setUserContext(userId: string, userData?: Record<string, any>) {
  if (isLocal || isDevelopment) {
    console.log('🔧 Sentry setUserContext (dev mode):', { userId, userData });
    return;
  }

  Sentry.setUser({
    id: userId,
    username: userData?.username,
    email: userData?.email,
    subscription_tier: userData?.subscriptionTier,
    total_spent: userData?.totalSpent,
    games_played: userData?.gamesPlayed,
    account_age: userData?.accountAge,
    device_type: userData?.deviceType,
    ...userData
  });

  // Set additional context
  Sentry.setContext('user_profile', {
    subscription_tier: userData?.subscriptionTier || 'free',
    total_spent: userData?.totalSpent || 0,
    games_played: userData?.gamesPlayed || 0,
    account_age: userData?.accountAge || 0,
    device_type: userData?.deviceType || 'desktop',
    last_login: new Date().toISOString(),
  });

  // Set tags for filtering
  Sentry.setTag('user.subscription_tier', userData?.subscriptionTier || 'free');
  Sentry.setTag('user.device_type', userData?.deviceType || 'desktop');
  Sentry.setTag('user.customer_segment', 
    (userData?.totalSpent || 0) > 1000 ? 'high_value' : 
    (userData?.totalSpent || 0) > 100 ? 'medium_value' : 'low_value'
  );
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
 * Add breadcrumb for debugging with enhanced data
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
    console.log('🔧 Sentry breadcrumb (dev mode):', { message, category, level, data });
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data: {
      ...data,
      url: window.location.href,
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
    },
    timestamp: Date.now() / 1000
  });
}

/**
 * Add game-specific breadcrumb
 * @param gameType Type of game
 * @param action Action performed
 * @param data Additional game data
 */
export function addGameBreadcrumb(
  gameType: string,
  action: string,
  data?: Record<string, any>
) {
  addBreadcrumb(
    `${gameType}: ${action}`,
    'game',
    'info',
    {
      game_type: gameType,
      game_action: action,
      ...data
    }
  );
}

/**
 * Add navigation breadcrumb
 * @param from Previous route
 * @param to Current route
 * @param method Navigation method
 */
export function addNavigationBreadcrumb(
  from: string,
  to: string,
  method: 'link' | 'back' | 'forward' | 'programmatic' = 'programmatic'
) {
  addBreadcrumb(
    `Navigation: ${from} → ${to}`,
    'navigation',
    'info',
    {
      from,
      to,
      method,
      navigation_type: method
    }
  );
}

/**
 * Add API call breadcrumb
 * @param method HTTP method
 * @param url API endpoint
 * @param statusCode Response status
 * @param duration Response time
 */
export function addApiBreadcrumb(
  method: string,
  url: string,
  statusCode?: number,
  duration?: number
) {
  addBreadcrumb(
    `API ${method} ${url}${statusCode ? ` (${statusCode})` : ''}`,
    'http',
    statusCode && statusCode >= 400 ? 'error' : 'info',
    {
      method,
      url,
      status_code: statusCode,
      duration_ms: duration,
      api_endpoint: url
    }
  );
}

/**
 * Add user action breadcrumb
 * @param action Action performed
 * @param component Component where action occurred
 * @param data Additional action data
 */
export function addUserActionBreadcrumb(
  action: string,
  component: string,
  data?: Record<string, any>
) {
  addBreadcrumb(
    `User Action: ${action}`,
    'user',
    'info',
    {
      action,
      component,
      ...data
    }
  );
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

