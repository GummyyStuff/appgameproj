/**
 * Performance Monitoring Utilities
 * Monitors chat system performance metrics
 */

export interface PerformanceMetrics {
  messagesSent: number
  messagesReceived: number
  averageLatency: number
  connectionUptime: number
  memoryUsage: number
  errorRate: number
  throughput: number // messages per second
  lastUpdated: number
}

export interface MessageTiming {
  messageId: string
  sentAt: number
  receivedAt?: number
  latency?: number
}

export class ChatPerformanceMonitor {
  private metrics: PerformanceMetrics
  private messageTimings: Map<string, MessageTiming>
  private connectionStartTime: number
  private errorCount: number
  private totalMessages: number
  private observers: ((metrics: PerformanceMetrics) => void)[]

  constructor() {
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      averageLatency: 0,
      connectionUptime: 0,
      memoryUsage: 0,
      errorRate: 0,
      throughput: 0,
      lastUpdated: Date.now()
    }
    
    this.messageTimings = new Map()
    this.connectionStartTime = Date.now()
    this.errorCount = 0
    this.totalMessages = 0
    this.observers = []

    // Start periodic updates
    this.startPeriodicUpdates()
  }

  /**
   * Record when a message is sent
   */
  recordMessageSent(messageId: string): void {
    const timing: MessageTiming = {
      messageId,
      sentAt: Date.now()
    }
    
    this.messageTimings.set(messageId, timing)
    this.metrics.messagesSent++
    this.totalMessages++
    this.updateMetrics()
  }

  /**
   * Record when a message is received
   */
  recordMessageReceived(messageId: string): void {
    const timing = this.messageTimings.get(messageId)
    const now = Date.now()
    
    if (timing) {
      timing.receivedAt = now
      timing.latency = now - timing.sentAt
      this.messageTimings.set(messageId, timing)
    }
    
    this.metrics.messagesReceived++
    this.updateAverageLatency()
    this.updateMetrics()
  }

  /**
   * Record a connection error
   */
  recordError(): void {
    this.errorCount++
    this.updateErrorRate()
    this.updateMetrics()
  }

  /**
   * Record connection established
   */
  recordConnectionEstablished(): void {
    this.connectionStartTime = Date.now()
    this.updateMetrics()
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Subscribe to metrics updates
   */
  subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(callback)
      if (index > -1) {
        this.observers.splice(index, 1)
      }
    }
  }

  /**
   * Get detailed latency statistics
   */
  getLatencyStats(): {
    min: number
    max: number
    average: number
    p95: number
    p99: number
  } {
    const latencies = Array.from(this.messageTimings.values())
      .filter(timing => timing.latency !== undefined)
      .map(timing => timing.latency!)
      .sort((a, b) => a - b)

    if (latencies.length === 0) {
      return { min: 0, max: 0, average: 0, p95: 0, p99: 0 }
    }

    const min = latencies[0]
    const max = latencies[latencies.length - 1]
    const average = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
    const p95Index = Math.floor(latencies.length * 0.95)
    const p99Index = Math.floor(latencies.length * 0.99)
    
    return {
      min,
      max,
      average,
      p95: latencies[p95Index] || 0,
      p99: latencies[p99Index] || 0
    }
  }

  /**
   * Get throughput over different time windows
   */
  getThroughputStats(): {
    last1min: number
    last5min: number
    last15min: number
    overall: number
  } {
    const now = Date.now()
    const oneMinAgo = now - 60 * 1000
    const fiveMinAgo = now - 5 * 60 * 1000
    const fifteenMinAgo = now - 15 * 60 * 1000

    const messages = Array.from(this.messageTimings.values())

    const last1min = messages.filter(msg => msg.sentAt >= oneMinAgo).length / 60
    const last5min = messages.filter(msg => msg.sentAt >= fiveMinAgo).length / (5 * 60)
    const last15min = messages.filter(msg => msg.sentAt >= fifteenMinAgo).length / (15 * 60)
    const overall = this.totalMessages / ((now - this.connectionStartTime) / 1000)

    return { last1min, last5min, last15min, overall }
  }

  /**
   * Clear old message timings to prevent memory leaks
   */
  private cleanupOldTimings(): void {
    const cutoff = Date.now() - 15 * 60 * 1000 // Keep last 15 minutes
    
    for (const [messageId, timing] of this.messageTimings.entries()) {
      if (timing.sentAt < cutoff) {
        this.messageTimings.delete(messageId)
      }
    }
  }

  /**
   * Update average latency
   */
  private updateAverageLatency(): void {
    const latencies = Array.from(this.messageTimings.values())
      .filter(timing => timing.latency !== undefined)
      .map(timing => timing.latency!)

    if (latencies.length > 0) {
      this.metrics.averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
    }
  }

  /**
   * Update error rate
   */
  private updateErrorRate(): void {
    if (this.totalMessages > 0) {
      this.metrics.errorRate = (this.errorCount / this.totalMessages) * 100
    }
  }

  /**
   * Update connection uptime
   */
  private updateConnectionUptime(): void {
    this.metrics.connectionUptime = Date.now() - this.connectionStartTime
  }

  /**
   * Update memory usage (if available)
   */
  private updateMemoryUsage(): void {
    if ('memory' in performance) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize
    }
  }

  /**
   * Update throughput
   */
  private updateThroughput(): void {
    const now = Date.now()
    const timeWindow = 60 * 1000 // 1 minute
    const windowStart = now - timeWindow
    
    const recentMessages = Array.from(this.messageTimings.values())
      .filter(timing => timing.sentAt >= windowStart)
    
    this.metrics.throughput = recentMessages.length / 60 // messages per second
  }

  /**
   * Update all metrics
   */
  private updateMetrics(): void {
    this.updateConnectionUptime()
    this.updateMemoryUsage()
    this.updateThroughput()
    this.metrics.lastUpdated = Date.now()
    
    // Notify observers
    this.observers.forEach(callback => callback(this.getMetrics()))
  }

  /**
   * Start periodic updates
   */
  private startPeriodicUpdates(): void {
    setInterval(() => {
      this.updateMetrics()
      this.cleanupOldTimings()
    }, 5000) // Update every 5 seconds
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    const latencyStats = this.getLatencyStats()
    const throughputStats = this.getThroughputStats()
    
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      latencyStats,
      throughputStats,
      messageCount: this.messageTimings.size
    }
    
    return JSON.stringify(report, null, 2)
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      averageLatency: 0,
      connectionUptime: 0,
      memoryUsage: 0,
      errorRate: 0,
      throughput: 0,
      lastUpdated: Date.now()
    }
    
    this.messageTimings.clear()
    this.connectionStartTime = Date.now()
    this.errorCount = 0
    this.totalMessages = 0
  }
}

/**
 * Global performance monitor instance
 */
export const chatPerformanceMonitor = new ChatPerformanceMonitor()

/**
 * Performance monitoring hook for React components
 */
export function usePerformanceMonitor() {
  // This would be implemented with actual React hooks in a real React environment
  return {
    metrics: chatPerformanceMonitor.getMetrics(),
    getLatencyStats: () => chatPerformanceMonitor.getLatencyStats(),
    getThroughputStats: () => chatPerformanceMonitor.getThroughputStats(),
    exportMetrics: () => chatPerformanceMonitor.exportMetrics(),
    reset: () => chatPerformanceMonitor.reset()
  }
}

/**
 * Performance alert thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  HIGH_LATENCY: 1000, // ms
  LOW_THROUGHPUT: 0.1, // messages per second
  HIGH_ERROR_RATE: 5, // percentage
  HIGH_MEMORY_USAGE: 100 * 1024 * 1024, // 100MB
  CONNECTION_TIMEOUT: 30 * 1000 // 30 seconds
}

/**
 * Check if performance metrics exceed thresholds
 */
export function checkPerformanceAlerts(metrics: PerformanceMetrics): string[] {
  const alerts: string[] = []

  if (metrics.averageLatency > PERFORMANCE_THRESHOLDS.HIGH_LATENCY) {
    alerts.push(`High latency detected: ${metrics.averageLatency}ms`)
  }

  if (metrics.throughput < PERFORMANCE_THRESHOLDS.LOW_THROUGHPUT) {
    alerts.push(`Low throughput detected: ${metrics.throughput} msg/s`)
  }

  if (metrics.errorRate > PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE) {
    alerts.push(`High error rate detected: ${metrics.errorRate}%`)
  }

  if (metrics.memoryUsage > PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE) {
    alerts.push(`High memory usage detected: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`)
  }

  return alerts
}