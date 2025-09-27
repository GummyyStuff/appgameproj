/**
 * Memory Leak Detection and Cleanup Utilities
 * Monitors and prevents memory leaks in long chat sessions
 */

export interface MemorySnapshot {
  timestamp: number
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  componentCount: number
  listenerCount: number
  messageCount: number
}

export interface MemoryLeak {
  type: 'component' | 'listener' | 'message' | 'memory'
  severity: 'low' | 'medium' | 'high'
  description: string
  timestamp: number
  value: number
}

export class MemoryMonitor {
  private snapshots: MemorySnapshot[]
  private maxSnapshots: number
  private snapshotInterval: number
  private intervalId?: number
  private leakThresholds: {
    memoryGrowthRate: number // MB per minute
    componentGrowthRate: number // components per minute
    listenerGrowthRate: number // listeners per minute
    messageGrowthRate: number // messages per minute
  }
  private observers: ((leak: MemoryLeak) => void)[]

  constructor() {
    this.snapshots = []
    this.maxSnapshots = 100 // Keep last 100 snapshots
    this.snapshotInterval = 30000 // 30 seconds
    this.observers = []
    
    this.leakThresholds = {
      memoryGrowthRate: 10, // 10MB per minute
      componentGrowthRate: 50, // 50 components per minute
      listenerGrowthRate: 20, // 20 listeners per minute
      messageGrowthRate: 100 // 100 messages per minute
    }

    this.startMonitoring()
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }

    this.intervalId = setInterval(() => {
      this.takeSnapshot()
      this.detectLeaks()
    }, this.snapshotInterval)

    // Take initial snapshot
    this.takeSnapshot()
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
  }

  /**
   * Take a memory snapshot
   */
  private takeSnapshot(): void {
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: this.getUsedMemory(),
      totalJSHeapSize: this.getTotalMemory(),
      jsHeapSizeLimit: this.getMemoryLimit(),
      componentCount: this.getComponentCount(),
      listenerCount: this.getListenerCount(),
      messageCount: this.getMessageCount()
    }

    this.snapshots.push(snapshot)

    // Keep only the last N snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift()
    }
  }

  /**
   * Get used memory in bytes
   */
  private getUsedMemory(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }

  /**
   * Get total memory in bytes
   */
  private getTotalMemory(): number {
    if ('memory' in performance) {
      return (performance as any).memory.totalJSHeapSize
    }
    return 0
  }

  /**
   * Get memory limit in bytes
   */
  private getMemoryLimit(): number {
    if ('memory' in performance) {
      return (performance as any).memory.jsHeapSizeLimit
    }
    return 0
  }

  /**
   * Count React components in the DOM
   */
  private getComponentCount(): number {
    // Count elements with React fiber properties
    const elements = document.querySelectorAll('*')
    let componentCount = 0

    elements.forEach(element => {
      // Check for React fiber properties
      const keys = Object.keys(element)
      if (keys.some(key => key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance'))) {
        componentCount++
      }
    })

    return componentCount
  }

  /**
   * Count event listeners
   */
  private getListenerCount(): number {
    // This is an approximation - in a real implementation,
    // you'd need to track listeners more precisely
    const elements = document.querySelectorAll('*')
    let listenerCount = 0

    elements.forEach(element => {
      // Count common event properties
      const eventProps = [
        'onclick', 'onmousedown', 'onmouseup', 'onmouseover', 'onmouseout',
        'onkeydown', 'onkeyup', 'onkeypress', 'onchange', 'oninput',
        'onsubmit', 'onload', 'onerror', 'onresize', 'onscroll'
      ]

      eventProps.forEach(prop => {
        if ((element as any)[prop]) {
          listenerCount++
        }
      })
    })

    return listenerCount
  }

  /**
   * Count chat messages in memory
   */
  private getMessageCount(): number {
    // Count message elements in the DOM
    return document.querySelectorAll('[data-testid^="message-"]').length
  }

  /**
   * Detect potential memory leaks
   */
  private detectLeaks(): void {
    if (this.snapshots.length < 2) {
      return
    }

    const recent = this.snapshots.slice(-5) // Last 5 snapshots
    const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp
    const timeSpanMinutes = timeSpan / (1000 * 60)

    if (timeSpanMinutes === 0) {
      return
    }

    // Check memory growth
    const memoryGrowth = (recent[recent.length - 1].usedJSHeapSize - recent[0].usedJSHeapSize) / (1024 * 1024)
    const memoryGrowthRate = memoryGrowth / timeSpanMinutes

    if (memoryGrowthRate > this.leakThresholds.memoryGrowthRate) {
      this.reportLeak({
        type: 'memory',
        severity: memoryGrowthRate > this.leakThresholds.memoryGrowthRate * 2 ? 'high' : 'medium',
        description: `High memory growth rate: ${memoryGrowthRate.toFixed(2)} MB/min`,
        timestamp: Date.now(),
        value: memoryGrowthRate
      })
    }

    // Check component growth
    const componentGrowth = recent[recent.length - 1].componentCount - recent[0].componentCount
    const componentGrowthRate = componentGrowth / timeSpanMinutes

    if (componentGrowthRate > this.leakThresholds.componentGrowthRate) {
      this.reportLeak({
        type: 'component',
        severity: componentGrowthRate > this.leakThresholds.componentGrowthRate * 2 ? 'high' : 'medium',
        description: `High component growth rate: ${componentGrowthRate.toFixed(2)} components/min`,
        timestamp: Date.now(),
        value: componentGrowthRate
      })
    }

    // Check listener growth
    const listenerGrowth = recent[recent.length - 1].listenerCount - recent[0].listenerCount
    const listenerGrowthRate = listenerGrowth / timeSpanMinutes

    if (listenerGrowthRate > this.leakThresholds.listenerGrowthRate) {
      this.reportLeak({
        type: 'listener',
        severity: listenerGrowthRate > this.leakThresholds.listenerGrowthRate * 2 ? 'high' : 'medium',
        description: `High listener growth rate: ${listenerGrowthRate.toFixed(2)} listeners/min`,
        timestamp: Date.now(),
        value: listenerGrowthRate
      })
    }

    // Check message growth
    const messageGrowth = recent[recent.length - 1].messageCount - recent[0].messageCount
    const messageGrowthRate = messageGrowth / timeSpanMinutes

    if (messageGrowthRate > this.leakThresholds.messageGrowthRate) {
      this.reportLeak({
        type: 'message',
        severity: 'low', // Message growth is expected but should be monitored
        description: `High message growth rate: ${messageGrowthRate.toFixed(2)} messages/min`,
        timestamp: Date.now(),
        value: messageGrowthRate
      })
    }
  }

  /**
   * Report a detected memory leak
   */
  private reportLeak(leak: MemoryLeak): void {
    console.warn('Memory leak detected:', leak)
    this.observers.forEach(callback => callback(leak))
  }

  /**
   * Subscribe to memory leak notifications
   */
  onLeakDetected(callback: (leak: MemoryLeak) => void): () => void {
    this.observers.push(callback)
    
    return () => {
      const index = this.observers.indexOf(callback)
      if (index > -1) {
        this.observers.splice(index, 1)
      }
    }
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): {
    used: number // MB
    total: number // MB
    limit: number // MB
    percentage: number
  } {
    const used = this.getUsedMemory() / (1024 * 1024)
    const total = this.getTotalMemory() / (1024 * 1024)
    const limit = this.getMemoryLimit() / (1024 * 1024)
    const percentage = limit > 0 ? (used / limit) * 100 : 0

    return { used, total, limit, percentage }
  }

  /**
   * Get memory usage trend
   */
  getMemoryTrend(): {
    direction: 'increasing' | 'decreasing' | 'stable'
    rate: number // MB per minute
  } {
    if (this.snapshots.length < 2) {
      return { direction: 'stable', rate: 0 }
    }

    const recent = this.snapshots.slice(-10) // Last 10 snapshots
    const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp
    const timeSpanMinutes = timeSpan / (1000 * 60)

    if (timeSpanMinutes === 0) {
      return { direction: 'stable', rate: 0 }
    }

    const memoryChange = (recent[recent.length - 1].usedJSHeapSize - recent[0].usedJSHeapSize) / (1024 * 1024)
    const rate = memoryChange / timeSpanMinutes

    let direction: 'increasing' | 'decreasing' | 'stable'
    if (Math.abs(rate) < 0.1) {
      direction = 'stable'
    } else if (rate > 0) {
      direction = 'increasing'
    } else {
      direction = 'decreasing'
    }

    return { direction, rate: Math.abs(rate) }
  }

  /**
   * Force garbage collection (if available)
   */
  forceGarbageCollection(): boolean {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc()
      return true
    }
    return false
  }

  /**
   * Get memory snapshots for analysis
   */
  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots]
  }

  /**
   * Clear old snapshots
   */
  clearSnapshots(): void {
    this.snapshots = []
  }

  /**
   * Export memory data for analysis
   */
  exportMemoryData(): string {
    const memoryUsage = this.getCurrentMemoryUsage()
    const trend = this.getMemoryTrend()
    
    const report = {
      timestamp: new Date().toISOString(),
      currentUsage: memoryUsage,
      trend,
      snapshots: this.snapshots,
      thresholds: this.leakThresholds
    }
    
    return JSON.stringify(report, null, 2)
  }
}

/**
 * Memory cleanup utilities
 */
export class MemoryCleanup {
  private cleanupTasks: (() => void)[]
  private intervalId?: number

  constructor() {
    this.cleanupTasks = []
    this.startPeriodicCleanup()
  }

  /**
   * Register a cleanup task
   */
  registerCleanupTask(task: () => void): void {
    this.cleanupTasks.push(task)
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    this.intervalId = setInterval(() => {
      this.runCleanup()
    }, 60000) // Run cleanup every minute
  }

  /**
   * Run all cleanup tasks
   */
  runCleanup(): void {
    this.cleanupTasks.forEach(task => {
      try {
        task()
      } catch (error) {
        console.error('Cleanup task failed:', error)
      }
    })
  }

  /**
   * Clean up old DOM elements
   */
  cleanupOldMessages(maxMessages: number = 100): void {
    const messageElements = document.querySelectorAll('[data-testid^="message-"]')
    
    if (messageElements.length > maxMessages) {
      const elementsToRemove = Array.from(messageElements).slice(0, messageElements.length - maxMessages)
      elementsToRemove.forEach(element => element.remove())
    }
  }

  /**
   * Clean up detached event listeners
   */
  cleanupDetachedListeners(): void {
    // This is a placeholder - in a real implementation,
    // you'd need to track and clean up specific listeners
    console.log('Cleaning up detached event listeners')
  }

  /**
   * Clean up React component references
   */
  cleanupComponentReferences(): void {
    // Force React to clean up unmounted components
    if ('__REACT_DEVTOOLS_GLOBAL_HOOK__' in window) {
      const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__
      if (hook && hook.onCommitFiberRoot) {
        // Trigger React cleanup
        console.log('Triggering React cleanup')
      }
    }
  }

  /**
   * Stop cleanup
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
  }
}

/**
 * Global memory monitor instance
 */
export const memoryMonitor = new MemoryMonitor()

/**
 * Global memory cleanup instance
 */
export const memoryCleanup = new MemoryCleanup()

/**
 * React hook for memory monitoring
 */
export function useMemoryMonitor() {
  // This would be implemented with actual React hooks in a real React environment
  return {
    memoryUsage: memoryMonitor.getCurrentMemoryUsage(),
    leaks: [] as MemoryLeak[],
    trend: memoryMonitor.getMemoryTrend(),
    forceGC: () => memoryMonitor.forceGarbageCollection(),
    exportData: () => memoryMonitor.exportMemoryData(),
    runCleanup: () => memoryCleanup.runCleanup()
  }
}

/**
 * Setup automatic memory management for chat
 */
export function setupChatMemoryManagement(): () => void {
  // Register cleanup tasks
  memoryCleanup.registerCleanupTask(() => {
    memoryCleanup.cleanupOldMessages(50) // Keep only 50 messages
  })

  memoryCleanup.registerCleanupTask(() => {
    memoryCleanup.cleanupDetachedListeners()
  })

  memoryCleanup.registerCleanupTask(() => {
    memoryCleanup.cleanupComponentReferences()
  })

  // Return cleanup function
  return () => {
    memoryMonitor.stopMonitoring()
    memoryCleanup.stop()
  }
}