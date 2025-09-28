/**
 * Comprehensive Metrics Collector for Case Opening Game
 * Tracks performance metrics, user interactions, and system health
 */

export interface APIMetric {
  endpoint: string
  method: string
  duration: number
  status: number
  timestamp: number
  success: boolean
  error?: string
  requestSize?: number
  responseSize?: number
}

export interface UserInteractionMetric {
  type: 'click' | 'hover' | 'scroll' | 'game_action'
  element?: string
  action: string
  timestamp: number
  duration?: number
  context?: Record<string, any>
}

export interface GamePerformanceMetric {
  phase: string
  metric: string
  value: number
  timestamp: number
  context?: Record<string, any>
}

export interface ErrorMetric {
  type: 'api' | 'animation' | 'ui' | 'network'
  message: string
  stack?: string
  timestamp: number
  context?: Record<string, any>
  userImpact: 'low' | 'medium' | 'high'
}

export interface SystemHealthMetric {
  memoryUsage: number
  cpuUsage?: number
  networkLatency: number
  timestamp: number
  domElements: number
  activeConnections: number
}

export interface PerformanceReport {
  summary: {
    totalRequests: number
    successRate: number
    averageResponseTime: number
    errorCount: number
    userInteractions: number
  }
  apiMetrics: APIMetric[]
  userMetrics: UserInteractionMetric[]
  gameMetrics: GamePerformanceMetric[]
  errorMetrics: ErrorMetric[]
  healthMetrics: SystemHealthMetric[]
  timeRange: {
    start: number
    end: number
  }
}

export class MetricsCollector {
  private static instance: MetricsCollector
  private apiMetrics: APIMetric[] = []
  private userMetrics: UserInteractionMetric[] = []
  private gameMetrics: GamePerformanceMetric[] = []
  private errorMetrics: ErrorMetric[] = []
  private healthMetrics: SystemHealthMetric[] = []
  private observers: ((metric: any) => void)[] = []
  private maxMetrics = 1000 // Limit stored metrics to prevent memory issues

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector()
    }
    return MetricsCollector.instance
  }

  // API Metrics
  recordAPICall(endpoint: string, method: string, startTime: number, status: number, success: boolean, error?: string): void {
    const duration = performance.now() - startTime
    const metric: APIMetric = {
      endpoint,
      method,
      duration,
      status,
      timestamp: Date.now(),
      success,
      error
    }

    this.apiMetrics.push(metric)
    this.trimMetrics(this.apiMetrics)
    this.notifyObservers('api', metric)

    // Log slow API calls
    if (duration > 2000) {
      console.warn(`Slow API call: ${method} ${endpoint} took ${duration.toFixed(0)}ms`)
    }

    // Log failed API calls
    if (!success) {
      console.error(`API call failed: ${method} ${endpoint} (${status}) - ${error}`)
    }
  }

  // User Interaction Metrics
  recordUserInteraction(type: UserInteractionMetric['type'], action: string, element?: string, context?: Record<string, any>): void {
    const metric: UserInteractionMetric = {
      type,
      element,
      action,
      timestamp: Date.now(),
      context
    }

    this.userMetrics.push(metric)
    this.trimMetrics(this.userMetrics)
    this.notifyObservers('user', metric)
  }

  // Game Performance Metrics
  recordGameMetric(phase: string, metric: string, value: number, context?: Record<string, any>): void {
    const gameMetric: GamePerformanceMetric = {
      phase,
      metric,
      value,
      timestamp: Date.now(),
      context
    }

    this.gameMetrics.push(gameMetric)
    this.trimMetrics(this.gameMetrics)
    this.notifyObservers('game', gameMetric)
  }

  // Error Metrics
  recordError(type: ErrorMetric['type'], message: string, stack?: string, context?: Record<string, any>, userImpact: ErrorMetric['userImpact'] = 'medium'): void {
    const errorMetric: ErrorMetric = {
      type,
      message,
      stack,
      timestamp: Date.now(),
      context,
      userImpact
    }

    this.errorMetrics.push(errorMetric)
    this.trimMetrics(this.errorMetrics)
    this.notifyObservers('error', errorMetric)

    console.error(`Error recorded (${type}): ${message}`, context)
  }

  // System Health Metrics
  recordSystemHealth(): void {
    const metric: SystemHealthMetric = {
      memoryUsage: this.getMemoryUsage(),
      networkLatency: this.measureNetworkLatency(),
      timestamp: Date.now(),
      domElements: document.getElementsByTagName('*').length,
      activeConnections: this.getActiveConnections()
    }

    this.healthMetrics.push(metric)
    this.trimMetrics(this.healthMetrics)
    this.notifyObservers('health', metric)
  }

  // Performance timing helpers
  startTiming(label: string): () => void {
    const startTime = performance.now()
    return () => {
      const duration = performance.now() - startTime
      this.recordGameMetric('timing', label, duration)
      return duration
    }
  }

  // Generate comprehensive performance report
  generateReport(timeRangeHours: number = 1): PerformanceReport {
    const now = Date.now()
    const startTime = now - (timeRangeHours * 60 * 60 * 1000)

    const filterByTime = <T extends { timestamp: number }>(metrics: T[]) =>
      metrics.filter(m => m.timestamp >= startTime)

    const apiMetrics = filterByTime(this.apiMetrics)
    const userMetrics = filterByTime(this.userMetrics)
    const gameMetrics = filterByTime(this.gameMetrics)
    const errorMetrics = filterByTime(this.errorMetrics)
    const healthMetrics = filterByTime(this.healthMetrics)

    const totalRequests = apiMetrics.length
    const successfulRequests = apiMetrics.filter(m => m.success).length
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100

    const averageResponseTime = apiMetrics.length > 0
      ? apiMetrics.reduce((sum, m) => sum + m.duration, 0) / apiMetrics.length
      : 0

    return {
      summary: {
        totalRequests,
        successRate,
        averageResponseTime,
        errorCount: errorMetrics.length,
        userInteractions: userMetrics.length
      },
      apiMetrics,
      userMetrics,
      gameMetrics,
      errorMetrics,
      healthMetrics,
      timeRange: {
        start: startTime,
        end: now
      }
    }
  }

  // Observer pattern for real-time monitoring
  subscribe(callback: (type: string, metric: any) => void): () => void {
    this.observers.push(callback)
    return () => {
      const index = this.observers.indexOf(callback)
      if (index > -1) {
        this.observers.splice(index, 1)
      }
    }
  }

  // Clear all metrics (useful for testing or memory management)
  clearMetrics(): void {
    this.apiMetrics = []
    this.userMetrics = []
    this.gameMetrics = []
    this.errorMetrics = []
    this.healthMetrics = []
  }

  // Export metrics for external analysis
  exportMetrics(): string {
    const report = this.generateReport(24) // Last 24 hours
    return JSON.stringify(report, null, 2)
  }

  private notifyObservers(type: string, metric: any): void {
    this.observers.forEach(observer => observer(type, metric))
  }

  private trimMetrics<T>(metrics: T[]): void {
    if (metrics.length > this.maxMetrics) {
      metrics.splice(0, metrics.length - this.maxMetrics)
    }
  }

  private getMemoryUsage(): number {
    // @ts-ignore - performance.memory is available in Chrome
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / 1024 / 1024 // MB
    }
    return 0
  }

  private measureNetworkLatency(): number {
    // Use navigator.connection if available, otherwise estimate
    // @ts-ignore - navigator.connection is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (connection && connection.rtt) {
      return connection.rtt
    }
    return 0 // Fallback
  }

  private getActiveConnections(): number {
    // Estimate active connections (this is a rough approximation)
    // In a real implementation, you might track this more accurately
    return Math.max(0, performance.getEntriesByType('resource').length - 10) // Subtract some baseline
  }
}

// Global metrics collector instance
export const metricsCollector = MetricsCollector.getInstance()

// Utility functions for common metrics
export const recordAPIStart = (endpoint: string, method: string = 'GET'): (() => void) => {
  const startTime = performance.now()
  return () => {
    // This will be called by the API wrapper with the response details
  }
}

export const recordUserAction = (action: string, element?: string, context?: Record<string, any>) => {
  metricsCollector.recordUserInteraction('game_action', action, element, context)
}

export const recordGameTiming = (phase: string, operation: string, duration: number, context?: Record<string, any>) => {
  metricsCollector.recordGameMetric(phase, operation, duration, context)
}

export const recordError = (type: ErrorMetric['type'], message: string, context?: Record<string, any>, userImpact?: ErrorMetric['userImpact']) => {
  metricsCollector.recordError(type, message, undefined, context, userImpact)
}

// React hook for performance monitoring
export const usePerformanceMonitoring = () => {
  const startTiming = metricsCollector.startTiming.bind(metricsCollector)
  const recordUserAction = (action: string, context?: Record<string, any>) => {
    metricsCollector.recordUserInteraction('game_action', action, undefined, context)
  }

  return {
    startTiming,
    recordUserAction,
    recordAPIStart,
    recordError: metricsCollector.recordError.bind(metricsCollector),
    generateReport: metricsCollector.generateReport.bind(metricsCollector)
  }
}
