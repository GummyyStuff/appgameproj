// Performance monitoring utilities for case opening animations

export interface PerformanceMetrics {
  frameRate: number
  memoryUsage: number
  animationDuration: number
  domElements: number
  timestamp: number
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetrics[] = []
  private animationStartTime: number = 0
  private frameCount: number = 0
  private lastFrameTime: number = 0
  private animationId: number | null = null
  private observers: ((metrics: PerformanceMetrics) => void)[] = []

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  startAnimationMonitoring(): void {
    this.animationStartTime = performance.now()
    this.frameCount = 0
    this.lastFrameTime = performance.now()

    const monitorFrame = () => {
      const now = performance.now()
      this.frameCount++

      // Calculate frame rate every 60 frames
      if (this.frameCount % 60 === 0) {
        const frameRate = 1000 / ((now - this.lastFrameTime) / 60)
        this.lastFrameTime = now

        this.recordMetrics({
          frameRate: Math.round(frameRate),
          memoryUsage: this.getMemoryUsage(),
          animationDuration: now - this.animationStartTime,
          domElements: this.getDomElementCount(),
          timestamp: now
        })
      }

      this.animationId = requestAnimationFrame(monitorFrame)
    }

    this.animationId = requestAnimationFrame(monitorFrame)
  }

  stopAnimationMonitoring(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }

    // Record final metrics
    const finalMetrics = this.getCurrentMetrics()
    this.recordMetrics(finalMetrics)
  }

  private getCurrentMetrics(): PerformanceMetrics {
    return {
      frameRate: this.frameCount > 0 ? Math.round((this.frameCount / ((performance.now() - this.animationStartTime) / 1000))) : 0,
      memoryUsage: this.getMemoryUsage(),
      animationDuration: performance.now() - this.animationStartTime,
      domElements: this.getDomElementCount(),
      timestamp: performance.now()
    }
  }

  private getMemoryUsage(): number {
    // @ts-ignore - performance.memory is not in TypeScript definitions but available in Chrome
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
    }
    return 0
  }

  private getDomElementCount(): number {
    return document.getElementsByTagName('*').length
  }

  private recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics)

    // Keep only last 100 metrics to prevent memory issues
    if (this.metrics.length > 100) {
      this.metrics.shift()
    }

    // Notify observers
    this.observers.forEach(observer => observer(metrics))

    // Log performance warnings
    if (metrics.frameRate < 30) {
      console.warn(`Low frame rate detected: ${metrics.frameRate} FPS`)
    }

    if (metrics.memoryUsage > 100) {
      console.warn(`High memory usage: ${metrics.memoryUsage.toFixed(2)} MB`)
    }

    if (metrics.domElements > 1000) {
      console.warn(`High DOM element count: ${metrics.domElements} elements`)
    }
  }

  getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics[this.metrics.length - 1] || null
  }

  getAverageFrameRate(): number {
    if (this.metrics.length === 0) return 0

    const recentMetrics = this.metrics.slice(-10) // Last 10 measurements
    const avgFrameRate = recentMetrics.reduce((sum, m) => sum + m.frameRate, 0) / recentMetrics.length

    return Math.round(avgFrameRate)
  }

  getMetricsHistory(count: number = 50): PerformanceMetrics[] {
    return this.metrics.slice(-count)
  }

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

  reset(): void {
    this.metrics = []
    this.animationStartTime = 0
    this.frameCount = 0
    this.lastFrameTime = 0
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }
}

// Utility functions for performance checks
export const checkPerformanceRequirements = (metrics: PerformanceMetrics): {
  passed: boolean
  issues: string[]
} => {
  const issues: string[] = []

  if (metrics.frameRate < 30) {
    issues.push(`Frame rate too low: ${metrics.frameRate} FPS (required: 30+ FPS)`)
  }

  if (metrics.animationDuration > 5000) {
    issues.push(`Animation too slow: ${metrics.animationDuration}ms (required: <5000ms)`)
  }

  if (metrics.domElements > 200) {
    issues.push(`Too many DOM elements: ${metrics.domElements} (recommended: <200)`)
  }

  return {
    passed: issues.length === 0,
    issues
  }
}

// Performance optimization utilities
export const optimizeForPerformance = (): {
  hardwareAcceleration: boolean
  reducedMotion: boolean
  lowPowerMode: boolean
} => {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')

  const hardwareAcceleration = !!(gl && gl instanceof WebGLRenderingContext)

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Detect low power mode (basic heuristic)
  const lowPowerMode = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2

  return {
    hardwareAcceleration,
    reducedMotion,
    lowPowerMode
  }
}


