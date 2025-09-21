/**
 * Error tracking and reporting utilities
 */

interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  url: string;
  timestamp: number;
  userAgent: string;
  userId?: string;
  sessionId: string;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'javascript' | 'network' | 'game' | 'auth' | 'ui';
}

interface UserFeedback {
  id: string;
  type: 'bug' | 'feature' | 'improvement' | 'complaint' | 'praise';
  message: string;
  rating?: number;
  email?: string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  context?: {
    page: string;
    gameType?: string;
    userAgent: string;
  };
}

class ErrorTracker {
  private errors: ErrorReport[] = [];
  private feedback: UserFeedback[] = [];
  private sessionId: string;
  private userId?: string;
  private isInitialized = false;

  constructor() {
    this.sessionId = this.generateId();
    this.initialize();
  }

  /**
   * Initialize error tracking
   */
  private initialize(): void {
    if (this.isInitialized) return;

    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }, 'high', 'javascript');
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        { reason: event.reason },
        'high',
        'javascript'
      );
    });

    // Network error tracking
    this.trackNetworkErrors();

    this.isInitialized = true;
  }

  /**
   * Track network errors
   */
  private trackNetworkErrors(): void {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok) {
          this.captureError(
            new Error(`Network Error: ${response.status} ${response.statusText}`),
            {
              url: args[0],
              status: response.status,
              statusText: response.statusText,
            },
            response.status >= 500 ? 'high' : 'medium',
            'network'
          );
        }
        
        return response;
      } catch (error) {
        this.captureError(
          error instanceof Error ? error : new Error('Network request failed'),
          { url: args[0] },
          'high',
          'network'
        );
        throw error;
      }
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set user ID
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Capture error
   */
  captureError(
    error: Error,
    context?: Record<string, any>,
    severity: ErrorReport['severity'] = 'medium',
    category: ErrorReport['category'] = 'javascript'
  ): void {
    const errorReport: ErrorReport = {
      id: this.generateId(),
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      userId: this.userId,
      sessionId: this.sessionId,
      context,
      severity,
      category,
    };

    this.errors.push(errorReport);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error captured:', errorReport);
    }

    // Auto-report critical errors immediately
    if (severity === 'critical') {
      this.reportError(errorReport);
    }

    // Keep only last 100 errors to prevent memory leaks
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }
  }

  /**
   * Capture game-specific error
   */
  captureGameError(
    error: Error,
    gameType: string,
    gameState?: Record<string, any>
  ): void {
    this.captureError(error, {
      gameType,
      gameState,
    }, 'high', 'game');
  }

  /**
   * Capture authentication error
   */
  captureAuthError(error: Error, action: string): void {
    this.captureError(error, {
      authAction: action,
    }, 'high', 'auth');
  }

  /**
   * Capture UI error
   */
  captureUIError(error: Error, component: string): void {
    this.captureError(error, {
      component,
    }, 'medium', 'ui');
  }

  /**
   * Report error to server
   */
  private async reportError(errorReport: ErrorReport): Promise<void> {
    try {
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });
    } catch (error) {
      console.warn('Failed to report error:', error);
    }
  }

  /**
   * Collect user feedback
   */
  collectFeedback(feedback: Omit<UserFeedback, 'id' | 'timestamp' | 'userId' | 'sessionId' | 'context'>): void {
    const feedbackReport: UserFeedback = {
      ...feedback,
      id: this.generateId(),
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
      context: {
        page: window.location.pathname,
        userAgent: navigator.userAgent,
      },
    };

    this.feedback.push(feedbackReport);

    // Send feedback to server
    this.submitFeedback(feedbackReport);

    // Keep only last 50 feedback items
    if (this.feedback.length > 50) {
      this.feedback = this.feedback.slice(-50);
    }
  }

  /**
   * Submit feedback to server
   */
  private async submitFeedback(feedback: UserFeedback): Promise<void> {
    try {
      await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback),
      });
    } catch (error) {
      console.warn('Failed to submit feedback:', error);
    }
  }

  /**
   * Get error summary
   */
  getErrorSummary(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: ErrorReport[];
  } {
    const errorsByCategory = this.errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsBySeverity = this.errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors: this.errors.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors: this.errors.slice(-10),
    };
  }

  /**
   * Export error data
   */
  exportErrors(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      errors: this.errors,
      feedback: this.feedback,
      summary: this.getErrorSummary(),
    });
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.errors = [];
    this.feedback = [];
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

// Convenience functions
export const captureError = (
  error: Error,
  context?: Record<string, any>,
  severity?: ErrorReport['severity'],
  category?: ErrorReport['category']
) => errorTracker.captureError(error, context, severity, category);

export const captureGameError = (error: Error, gameType: string, gameState?: Record<string, any>) =>
  errorTracker.captureGameError(error, gameType, gameState);

export const captureAuthError = (error: Error, action: string) =>
  errorTracker.captureAuthError(error, action);

export const captureUIError = (error: Error, component: string) =>
  errorTracker.captureUIError(error, component);

export const collectFeedback = (feedback: Omit<UserFeedback, 'id' | 'timestamp' | 'userId' | 'sessionId' | 'context'>) =>
  errorTracker.collectFeedback(feedback);

/**
 * React hook for error tracking
 */
export function useErrorTracking() {
  const trackError = (error: Error, context?: Record<string, any>) => {
    errorTracker.captureError(error, context);
  };

  const trackGameError = (error: Error, gameType: string, gameState?: Record<string, any>) => {
    errorTracker.captureGameError(error, gameType, gameState);
  };

  const submitFeedback = (feedback: Omit<UserFeedback, 'id' | 'timestamp' | 'userId' | 'sessionId' | 'context'>) => {
    errorTracker.collectFeedback(feedback);
  };

  const setUser = (userId: string) => {
    errorTracker.setUserId(userId);
  };

  return {
    trackError,
    trackGameError,
    submitFeedback,
    setUser,
  };
}