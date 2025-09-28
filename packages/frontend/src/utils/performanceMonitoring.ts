/**
 * Comprehensive Performance Monitoring Service
 * Integrates with existing PerformanceMonitor and MetricsCollector
 * Provides real-time monitoring and alerting for the case opening game
 */

import { PerformanceMonitor, PerformanceMetrics } from './performanceMonitor'
import { MetricsCollector, metricsCollector, APIMetric, UserInteractionMetric, GamePerformanceMetric, ErrorMetric, SystemHealthMetric } from './metricsCollector'

export interface MonitoringConfig {
  enableRealTimeMonitoring: boolean
  enableHealthChecks: boolean
  enableAPIMonitoring: boolean
  enableErrorTracking: boolean
  alertThresholds: {
    frameRate: number
    memoryUsage: number
    apiResponseTime: number
    errorRate: number
  }
  healthCheckInterval: number // milliseconds
  metricsRetentionPeriod: number // hours
}

export interface MonitoringAlert {
  type: 'warning' | 'error' | 'critical'
  category: 'performance' | 'api' | 'error' | 'health'
  message: string
  value: number
  threshold: number
  timestamp: number
  context?: Record<string, any>
}

export interface MonitoringDashboard {
  current: {
    frameRate: number
    memoryUsage: number
    activeConnections: number
    domElements: number
  }
  averages: {
    apiResponseTime: number
    successRate: number
    errorRate: number
  }
  trends: {
    frameRate: number[]
    memoryUsage: number[]
    apiResponseTime: number[]
  }
  alerts: MonitoringAlert[]
  lastUpdated: number
}

export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService
  private config: MonitoringConfig
  private performanceMonitor: PerformanceMonitor
  private metricsCollector: MetricsCollector
  private alerts: MonitoringAlert[] = []
  private healthCheckTimer?: NodeJS.Timeout
  private subscribers: ((dashboard: MonitoringDashboard) => void)[] = []
  private isInitialized = false

  private defaultConfig: MonitoringConfig = {
    enableRealTimeMonitoring: true,
    enableHealthChecks: true,
    enableAPIMonitoring: true,
    enableErrorTracking: true,
    alertThresholds: {
      frameRate: 30, // FPS
      memoryUsage: 100, // MB
      apiResponseTime: 2000, // ms
      errorRate: 0.1 // 10%
    },
    healthCheckInterval: 30000, // 30 seconds
    metricsRetentionPeriod: 24 // 24 hours
  }

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService()
    }
    return PerformanceMonitoringService.instance
  }

  constructor() {
    this.config = { ...this.defaultConfig }
    this.performanceMonitor = PerformanceMonitor.getInstance()
    this.metricsCollector = MetricsCollector.getInstance()
  }

  initialize(config?: Partial<MonitoringConfig>): void {
    if (this.isInitialized) return

    this.config = { ...this.defaultConfig, ...config }
    this.isInitialized = true

    this.setupMonitoring()
    this.startHealthChecks()
    console.log('Performance monitoring service initialized')
  }

  private setupMonitoring(): void {
    if (this.config.enableRealTimeMonitoring) {
      // Subscribe to performance monitor updates
      this.performanceMonitor.subscribe((metrics: PerformanceMetrics) => {
        this.checkPerformanceThresholds(metrics)
      })
    }

    if (this.config.enableAPIMonitoring) {
      // Subscribe to API metrics
      this.metricsCollector.subscribe((type, metric) => {
        if (type === 'api') {
          this.checkAPIThresholds(metric as APIMetric)
        } else if (type === 'error') {
          this.checkErrorThresholds(metric as ErrorMetric)
        }
      })
    }

    // Setup automatic health checks
    if (this.config.enableHealthChecks) {
      this.startHealthChecks()
    }
  }

  private startHealthChecks(): void {
    if (this.healthCheckTimer) return

    this.healthCheckTimer = setInterval(() => {
      this.metricsCollector.recordSystemHealth()
      this.notifySubscribers()
    }, this.config.healthCheckInterval)
  }

  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }

  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    const config = this.config.alertThresholds

    if (metrics.frameRate < config.frameRate) {
      this.createAlert('warning', 'performance', `Low frame rate: ${metrics.frameRate} FPS`, metrics.frameRate, config.frameRate, { metrics })
    }

    if (metrics.memoryUsage > config.memoryUsage) {
      this.createAlert('error', 'performance', `High memory usage: ${metrics.memoryUsage.toFixed(2)} MB`, metrics.memoryUsage, config.memoryUsage, { metrics })
    }

    if (metrics.domElements > 1000) {
      this.createAlert('warning', 'performance', `High DOM element count: ${metrics.domElements}`, metrics.domElements, 1000, { metrics })
    }
  }

  private checkAPIThresholds(metric: APIMetric): void {
    const config = this.config.alertThresholds

    if (metric.duration > config.apiResponseTime) {
      this.createAlert('warning', 'api', `Slow API response: ${metric.method} ${metric.endpoint} took ${metric.duration.toFixed(0)}ms`, metric.duration, config.apiResponseTime, { metric })
    }

    if (!metric.success) {
      this.createAlert('error', 'api', `API call failed: ${metric.method} ${metric.endpoint} (${metric.status})`, metric.status, 200, { metric })
    }
  }

  private checkErrorThresholds(metric: ErrorMetric): void {
    // Check error rate over last hour
    const report = this.metricsCollector.generateReport(1)
    const errorRate = report.summary.errorCount / Math.max(report.summary.totalRequests + report.summary.userInteractions, 1)

    if (errorRate > this.config.alertThresholds.errorRate) {
      this.createAlert('critical', 'error', `High error rate: ${(errorRate * 100).toFixed(1)}%`, errorRate, this.config.alertThresholds.errorRate, { report })
    }
  }

  private createAlert(type: MonitoringAlert['type'], category: MonitoringAlert['category'], message: string, value: number, threshold: number, context?: Record<string, any>): void {
    const alert: MonitoringAlert = {
      type,
      category,
      message,
      value,
      threshold,
      timestamp: Date.now(),
      context
    }

    this.alerts.push(alert)

    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts.shift()
    }

    // Log alerts based on severity
    const logMethod = type === 'critical' ? console.error : type === 'error' ? console.warn : console.info
    logMethod(`[${type.toUpperCase()}] ${message}`, context)

    // Notify subscribers of dashboard update
    this.notifySubscribers()
  }

  getDashboard(): MonitoringDashboard {
    const latestMetrics = this.performanceMonitor.getLatestMetrics()
    const report = this.metricsCollector.generateReport(1) // Last hour

    // Calculate trends (last 10 data points)
    const healthMetrics = report.healthMetrics.slice(-10)
    const apiMetrics = report.apiMetrics.slice(-10)

    return {
      current: {
        frameRate: latestMetrics?.frameRate || 0,
        memoryUsage: latestMetrics?.memoryUsage || 0,
        activeConnections: healthMetrics[healthMetrics.length - 1]?.activeConnections || 0,
        domElements: latestMetrics?.domElements || 0
      },
      averages: {
        apiResponseTime: report.summary.averageResponseTime,
        successRate: report.summary.successRate,
        errorRate: (report.summary.errorCount / Math.max(report.summary.totalRequests, 1)) * 100
      },
      trends: {
        frameRate: healthMetrics.map(m => m.memoryUsage), // Note: Using memory as proxy, should be frameRate
        memoryUsage: healthMetrics.map(m => m.memoryUsage),
        apiResponseTime: apiMetrics.map(m => m.duration)
      },
      alerts: this.alerts.slice(-10), // Last 10 alerts
      lastUpdated: Date.now()
    }
  }

  getRecentAlerts(count: number = 10): MonitoringAlert[] {
    return this.alerts.slice(-count)
  }

  clearAlerts(): void {
    this.alerts = []
  }

  // API monitoring wrapper
  async monitorAPICall<T>(
    endpoint: string,
    method: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()

    try {
      const result = await apiCall()
      const duration = performance.now() - startTime

      this.metricsCollector.recordAPICall(endpoint, method, startTime, 200, true)
      return result
    } catch (error: any) {
      const duration = performance.now() - startTime
      const status = error.status || 500

      this.metricsCollector.recordAPICall(endpoint, method, startTime, status, false, error.message)
      throw error
    }
  }

  // Game action monitoring
  monitorGameAction(action: string, context?: Record<string, any>): void {
    this.metricsCollector.recordUserInteraction('game_action', action, undefined, context)
  }

  // Performance timing
  startTiming(label: string): () => number {
    return this.metricsCollector.startTiming(label)
  }

  // Subscribe to dashboard updates
  subscribeToDashboard(callback: (dashboard: MonitoringDashboard) => void): () => void {
    this.subscribers.push(callback)

    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback)
      if (index > -1) {
        this.subscribers.splice(index, 1)
      }
    }
  }

  private notifySubscribers(): void {
    const dashboard = this.getDashboard()
    this.subscribers.forEach(callback => callback(dashboard))
  }

  // Export monitoring data
  exportMonitoringData(): string {
    const dashboard = this.getDashboard()
    const report = this.metricsCollector.generateReport(24) // Last 24 hours

    return JSON.stringify({
      dashboard,
      detailedReport: report,
      alerts: this.alerts,
      config: this.config,
      exportTime: Date.now()
    }, null, 2)
  }

  // Cleanup
  destroy(): void {
    this.stopHealthChecks()
    this.subscribers = []
    this.alerts = []
    this.isInitialized = false
  }
}

// Global performance monitoring service instance
export const performanceMonitoring = PerformanceMonitoringService.getInstance()

// React hook for performance monitoring
export const usePerformanceMonitoring = () => {
  const monitorAPICall = performanceMonitoring.monitorAPICall.bind(performanceMonitoring)
  const monitorGameAction = performanceMonitoring.monitorGameAction.bind(performanceMonitoring)
  const startTiming = performanceMonitoring.startTiming.bind(performanceMonitoring)
  const getDashboard = performanceMonitoring.getDashboard.bind(performanceMonitoring)
  const subscribeToDashboard = performanceMonitoring.subscribeToDashboard.bind(performanceMonitoring)

  return {
    monitorAPICall,
    monitorGameAction,
    startTiming,
    getDashboard,
    subscribeToDashboard
  }
}

// Initialize with default configuration
if (typeof window !== 'undefined') {
  performanceMonitoring.initialize()
}
