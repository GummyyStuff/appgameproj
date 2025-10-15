import { startSpan } from '../../lib/sentry';

/**
 * Span Metrics Utilities
 * 
 * Provides utilities for adding business and performance metrics to Sentry spans.
 * This enables correlation between technical performance and business outcomes.
 */

export interface GameMetrics {
  gameType: 'roulette' | 'stock-market' | 'case-opening';
  betAmount: number;
  currency: string;
  playerLevel: 'beginner' | 'intermediate' | 'expert';
  sessionDuration: number;
  winRate: number;
}

export interface UserMetrics {
  userId: string;
  subscriptionTier: 'free' | 'premium' | 'vip';
  totalSpent: number;
  gamesPlayed: number;
  accountAge: number;
  deviceType: 'mobile' | 'desktop' | 'tablet';
}

export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  cacheHitRate: number;
  errorRate: number;
}

/**
 * Track game-related business metrics
 */
export function trackGameMetrics(
  operation: string,
  metrics: GameMetrics,
  callback: () => void | Promise<void>
) {
  return startSpan(
    {
      op: 'game.action',
      name: operation
    },
    async (span) => {
      // Business metrics
      span?.setAttribute('game.type', metrics.gameType);
      span?.setAttribute('game.bet_amount', metrics.betAmount);
      span?.setAttribute('game.currency', metrics.currency);
      span?.setAttribute('game.player_level', metrics.playerLevel);
      span?.setAttribute('game.session_duration', metrics.sessionDuration);
      span?.setAttribute('game.win_rate', metrics.winRate);
      
      // Performance context
      span?.setAttribute('business.value_at_risk', metrics.betAmount);
      span?.setAttribute('business.player_engagement', metrics.sessionDuration > 300 ? 'high' : 'low');
      
      await callback();
    }
  );
}

/**
 * Track user-related metrics
 */
export function trackUserMetrics(
  operation: string,
  metrics: UserMetrics,
  callback: () => void | Promise<void>
) {
  return startSpan(
    {
      op: 'user.action',
      name: operation
    },
    async (span) => {
      // User context
      span?.setAttribute('user.id', metrics.userId);
      span?.setAttribute('user.subscription_tier', metrics.subscriptionTier);
      span?.setAttribute('user.total_spent', metrics.totalSpent);
      span?.setAttribute('user.games_played', metrics.gamesPlayed);
      span?.setAttribute('user.account_age', metrics.accountAge);
      span?.setAttribute('user.device_type', metrics.deviceType);
      
      // Business context
      span?.setAttribute('business.customer_lifetime_value', metrics.totalSpent);
      span?.setAttribute('business.customer_segment', 
        metrics.totalSpent > 1000 ? 'high_value' : 
        metrics.totalSpent > 100 ? 'medium_value' : 'low_value'
      );
      
      await callback();
    }
  );
}

/**
 * Track performance metrics
 */
export function trackPerformanceMetrics(
  operation: string,
  metrics: PerformanceMetrics,
  callback: () => void | Promise<void>
) {
  return startSpan(
    {
      op: 'performance.monitor',
      name: operation
    },
    async (span) => {
      // Performance metrics
      span?.setAttribute('performance.response_time_ms', metrics.responseTime);
      span?.setAttribute('performance.memory_usage_mb', metrics.memoryUsage);
      span?.setAttribute('performance.cpu_usage_percent', metrics.cpuUsage);
      span?.setAttribute('performance.network_latency_ms', metrics.networkLatency);
      span?.setAttribute('performance.cache_hit_rate', metrics.cacheHitRate);
      span?.setAttribute('performance.error_rate', metrics.errorRate);
      
      // Performance context
      span?.setAttribute('performance.health_score', 
        metrics.errorRate < 0.01 && metrics.responseTime < 200 ? 'excellent' :
        metrics.errorRate < 0.05 && metrics.responseTime < 500 ? 'good' :
        metrics.errorRate < 0.1 && metrics.responseTime < 1000 ? 'fair' : 'poor'
      );
      
      await callback();
    }
  );
}

/**
 * Track API call metrics with business context
 */
export function trackApiMetrics(
  method: string,
  endpoint: string,
  metrics: {
    responseTime: number;
    statusCode: number;
    requestSize: number;
    responseSize: number;
    userId?: string;
    gameType?: string;
  },
  callback: () => void | Promise<void>
) {
  return startSpan(
    {
      op: 'http.client',
      name: `${method} ${endpoint}`
    },
    async (span) => {
      // API metrics
      span?.setAttribute('http.method', method);
      span?.setAttribute('http.url', endpoint);
      span?.setAttribute('http.status_code', metrics.statusCode);
      span?.setAttribute('http.response_time_ms', metrics.responseTime);
      span?.setAttribute('http.request_size_bytes', metrics.requestSize);
      span?.setAttribute('http.response_size_bytes', metrics.responseSize);
      
      // Business context
      if (metrics.userId) {
        span?.setAttribute('user.id', metrics.userId);
      }
      if (metrics.gameType) {
        span?.setAttribute('game.type', metrics.gameType);
      }
      
      // Performance context
      span?.setAttribute('api.success', metrics.statusCode < 400);
      span?.setAttribute('api.performance_tier',
        metrics.responseTime < 100 ? 'excellent' :
        metrics.responseTime < 300 ? 'good' :
        metrics.responseTime < 1000 ? 'fair' : 'poor'
      );
      
      await callback();
    }
  );
}

/**
 * Track database operation metrics
 */
export function trackDatabaseMetrics(
  operation: string,
  table: string,
  metrics: {
    executionTime: number;
    rowsAffected: number;
    queryComplexity: 'simple' | 'moderate' | 'complex';
    cacheHit: boolean;
    userId?: string;
  },
  callback: () => void | Promise<void>
) {
  return startSpan(
    {
      op: 'db.query',
      name: operation
    },
    async (span) => {
      // Database metrics
      span?.setAttribute('db.operation', operation);
      span?.setAttribute('db.table', table);
      span?.setAttribute('db.execution_time_ms', metrics.executionTime);
      span?.setAttribute('db.rows_affected', metrics.rowsAffected);
      span?.setAttribute('db.query_complexity', metrics.queryComplexity);
      span?.setAttribute('db.cache_hit', metrics.cacheHit);
      
      // Business context
      if (metrics.userId) {
        span?.setAttribute('user.id', metrics.userId);
      }
      
      // Performance context
      span?.setAttribute('db.performance_tier',
        metrics.executionTime < 10 ? 'excellent' :
        metrics.executionTime < 50 ? 'good' :
        metrics.executionTime < 200 ? 'fair' : 'poor'
      );
      
      await callback();
    }
  );
}

/**
 * Track payment processing metrics
 */
export function trackPaymentMetrics(
  operation: string,
  metrics: {
    amount: number;
    currency: string;
    paymentMethod: string;
    processingTime: number;
    success: boolean;
    userId: string;
    gameType?: string;
  },
  callback: () => void | Promise<void>
) {
  return startSpan(
    {
      op: 'payment.process',
      name: operation
    },
    async (span) => {
      // Payment metrics
      span?.setAttribute('payment.amount', metrics.amount);
      span?.setAttribute('payment.currency', metrics.currency);
      span?.setAttribute('payment.method', metrics.paymentMethod);
      span?.setAttribute('payment.processing_time_ms', metrics.processingTime);
      span?.setAttribute('payment.success', metrics.success);
      span?.setAttribute('user.id', metrics.userId);
      
      // Business context
      if (metrics.gameType) {
        span?.setAttribute('game.type', metrics.gameType);
      }
      span?.setAttribute('business.transaction_value', metrics.amount);
      span?.setAttribute('business.revenue_impact', metrics.success ? 'positive' : 'negative');
      
      // Performance context
      span?.setAttribute('payment.performance_tier',
        metrics.processingTime < 1000 ? 'excellent' :
        metrics.processingTime < 3000 ? 'good' :
        metrics.processingTime < 5000 ? 'fair' : 'poor'
      );
      
      await callback();
    }
  );
}

/**
 * Track UI interaction metrics
 */
export function trackUIMetrics(
  component: string,
  action: string,
  metrics: {
    renderTime: number;
    interactionTime: number;
    userAgent: string;
    viewportSize: string;
    userId?: string;
  },
  callback: () => void | Promise<void>
) {
  return startSpan(
    {
      op: 'ui.interaction',
      name: `${component} ${action}`
    },
    async (span) => {
      // UI metrics
      span?.setAttribute('ui.component', component);
      span?.setAttribute('ui.action', action);
      span?.setAttribute('ui.render_time_ms', metrics.renderTime);
      span?.setAttribute('ui.interaction_time_ms', metrics.interactionTime);
      span?.setAttribute('ui.user_agent', metrics.userAgent);
      span?.setAttribute('ui.viewport_size', metrics.viewportSize);
      
      // Business context
      if (metrics.userId) {
        span?.setAttribute('user.id', metrics.userId);
      }
      
      // Performance context
      span?.setAttribute('ui.performance_tier',
        metrics.renderTime < 16 ? 'excellent' : // 60fps
        metrics.renderTime < 33 ? 'good' :     // 30fps
        metrics.renderTime < 100 ? 'fair' : 'poor'
      );
      
      await callback();
    }
  );
}

/**
 * Utility function to measure and track any operation
 */
export function measureOperation<T>(
  operation: string,
  operationType: string,
  metrics: Record<string, any>,
  callback: () => T | Promise<T>
): Promise<T> {
  return startSpan(
    {
      op: operationType,
      name: operation
    },
    async (span) => {
      // Add all provided metrics as attributes
      Object.entries(metrics).forEach(([key, value]) => {
        span?.setAttribute(key, value);
      });
      
      const startTime = performance.now();
      const result = await callback();
      const endTime = performance.now();
      
      // Add timing information
      span?.setAttribute('operation.duration_ms', endTime - startTime);
      span?.setAttribute('operation.timestamp', Date.now());
      
      return result;
    }
  );
}
