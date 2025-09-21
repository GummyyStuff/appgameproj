/**
 * Analytics utilities for tracking user behavior and game events
 */

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

interface GameEvent {
  gameType: 'roulette' | 'blackjack';
  action: 'start' | 'bet' | 'win' | 'lose' | 'quit';
  betAmount?: number;
  winAmount?: number;
  gameId?: string;
  duration?: number;
}

interface UserEvent {
  action: 'login' | 'logout' | 'register' | 'profile_view' | 'balance_check';
  metadata?: Record<string, any>;
}

class Analytics {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private sessionStart: number;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.initializeSession();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize analytics session
   */
  private initializeSession(): void {
    this.track('session_start', {
      userAgent: navigator.userAgent,
      screen: {
        width: screen.width,
        height: screen.height,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    });

    // Track session end on page unload
    window.addEventListener('beforeunload', () => {
      this.track('session_end', {
        duration: Date.now() - this.sessionStart,
        eventsCount: this.events.length,
      });
      this.flush();
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.track('page_visibility_change', {
        hidden: document.hidden,
      });
    });
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string): void {
    this.userId = userId;
    this.track('user_identified', { userId });
  }

  /**
   * Track generic event
   */
  track(eventName: string, properties?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.events.push(event);

    // Auto-flush events periodically
    if (this.events.length >= 50) {
      this.flush();
    }

    // Log important events to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', event);
    }
  }

  /**
   * Track game-specific events
   */
  trackGameEvent(event: GameEvent): void {
    this.track(`game_${event.action}`, {
      gameType: event.gameType,
      betAmount: event.betAmount,
      winAmount: event.winAmount,
      gameId: event.gameId,
      duration: event.duration,
      profit: event.winAmount ? event.winAmount - (event.betAmount || 0) : undefined,
    });
  }

  /**
   * Track user events
   */
  trackUserEvent(event: UserEvent): void {
    this.track(`user_${event.action}`, event.metadata);
  }

  /**
   * Track page views
   */
  trackPageView(path: string, title?: string): void {
    this.track('page_view', {
      path,
      title: title || document.title,
      referrer: document.referrer,
    });
  }

  /**
   * Track errors
   */
  trackError(error: Error, context?: Record<string, any>): void {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
      url: window.location.href,
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, value: number, metadata?: Record<string, any>): void {
    this.track('performance', {
      metric,
      value,
      ...metadata,
    });
  }

  /**
   * Track conversion events
   */
  trackConversion(conversionType: string, value?: number, metadata?: Record<string, any>): void {
    this.track('conversion', {
      type: conversionType,
      value,
      ...metadata,
    });
  }

  /**
   * Get session summary
   */
  getSessionSummary(): {
    sessionId: string;
    userId?: string;
    duration: number;
    eventsCount: number;
    gameEvents: number;
    errorEvents: number;
  } {
    const gameEvents = this.events.filter(e => e.name.startsWith('game_')).length;
    const errorEvents = this.events.filter(e => e.name === 'error').length;

    return {
      sessionId: this.sessionId,
      userId: this.userId,
      duration: Date.now() - this.sessionStart,
      eventsCount: this.events.length,
      gameEvents,
      errorEvents,
    };
  }

  /**
   * Flush events to server
   */
  async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      // Send to analytics endpoint
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: eventsToSend,
          session: this.getSessionSummary(),
        }),
      });
    } catch (error) {
      console.warn('Failed to send analytics events:', error);
      // Re-add events back to queue for retry
      this.events.unshift(...eventsToSend);
    }
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }
}

// Singleton instance
export const analytics = new Analytics();

// Convenience functions
export const trackGameEvent = (event: GameEvent) => analytics.trackGameEvent(event);
export const trackUserEvent = (event: UserEvent) => analytics.trackUserEvent(event);
export const trackPageView = (path: string, title?: string) => analytics.trackPageView(path, title);
export const trackError = (error: Error, context?: Record<string, any>) => analytics.trackError(error, context);
export const trackPerformance = (metric: string, value: number, metadata?: Record<string, any>) => 
  analytics.trackPerformance(metric, value, metadata);
export const trackConversion = (type: string, value?: number, metadata?: Record<string, any>) =>
  analytics.trackConversion(type, value, metadata);

/**
 * React hook for analytics tracking
 */
export function useAnalytics() {
  const track = (eventName: string, properties?: Record<string, any>) => {
    analytics.track(eventName, properties);
  };

  const trackGame = (event: GameEvent) => {
    analytics.trackGameEvent(event);
  };

  const trackUser = (event: UserEvent) => {
    analytics.trackUserEvent(event);
  };

  const setUser = (userId: string) => {
    analytics.setUserId(userId);
  };

  return {
    track,
    trackGame,
    trackUser,
    setUser,
  };
}