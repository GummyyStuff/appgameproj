/**
 * User Experience Metrics for Case Opening Game
 * Tracks Core Web Vitals, user engagement, and experience quality metrics
 */

import { metricsCollector } from './metricsCollector'

export interface CoreWebVitals {
  FCP: number | null // First Contentful Paint
  LCP: number | null // Largest Contentful Paint
  CLS: number | null // Cumulative Layout Shift
  FID: number | null // First Input Delay
  TTFB: number | null // Time to First Byte
}

export interface UserEngagementMetrics {
  sessionDuration: number
  pageViews: number
  interactions: number
  caseOpenings: number
  errorsEncountered: number
  timestamp: number
}

export interface ExperienceQualityMetrics {
  timeToInteractive: number | null
  timeToFirstCase: number | null
  averageCaseOpeningTime: number
  errorRecoveryRate: number
  userSatisfactionScore: number | null // 1-5 scale
  timestamp: number
}

export interface UserFlowMetrics {
  flowId: string
  steps: UserFlowStep[]
  completed: boolean
  totalTime: number
  errors: number
  timestamp: number
}

export interface UserFlowStep {
  step: string
  timestamp: number
  duration?: number
  success: boolean
  error?: string
}

export class UserExperienceMonitor {
  private static instance: UserExperienceMonitor
  private webVitals: CoreWebVitals = {
    FCP: null,
    LCP: null,
    CLS: null,
    FID: null,
    TTFB: null
  }
  private engagementMetrics: UserEngagementMetrics
  private qualityMetrics: ExperienceQualityMetrics
  private activeFlows: Map<string, UserFlowMetrics> = new Map()
  private observers: ((type: string, data: any) => void)[] = []
  private sessionStart: number
  private isInitialized = false

  static getInstance(): UserExperienceMonitor {
    if (!UserExperienceMonitor.instance) {
      UserExperienceMonitor.instance = new UserExperienceMonitor()
    }
    return UserExperienceMonitor.instance
  }

  constructor() {
    this.sessionStart = Date.now()
    this.engagementMetrics = {
      sessionDuration: 0,
      pageViews: 1,
      interactions: 0,
      caseOpenings: 0,
      errorsEncountered: 0,
      timestamp: this.sessionStart
    }
    this.qualityMetrics = {
      timeToInteractive: null,
      timeToFirstCase: null,
      averageCaseOpeningTime: 0,
      errorRecoveryRate: 1.0,
      userSatisfactionScore: null,
      timestamp: this.sessionStart
    }
  }

  initialize(): void {
    if (this.isInitialized) return

    this.isInitialized = true
    this.setupWebVitalsTracking()
    this.setupUserInteractionTracking()
    this.setupErrorTracking()
    this.setupVisibilityTracking()

    console.log('User experience monitoring initialized')
  }

  private setupWebVitalsTracking(): void {
    // Track Core Web Vitals using Performance Observer API
    if ('PerformanceObserver' in window) {
      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        this.webVitals.FCP = lastEntry.startTime
        this.notifyObservers('webVitals', { ...this.webVitals })
      })
      fcpObserver.observe({ entryTypes: ['paint'] })

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        this.webVitals.LCP = lastEntry.startTime
        this.notifyObservers('webVitals', { ...this.webVitals })
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0
        for (const entry of list.getEntries()) {
          // @ts-ignore - layout-shift entries have value property
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        }
        this.webVitals.CLS = clsValue
        this.notifyObservers('webVitals', { ...this.webVitals })
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        // @ts-ignore - first-input entries have processingStart property
        this.webVitals.FID = lastEntry.processingStart - lastEntry.startTime
        this.notifyObservers('webVitals', { ...this.webVitals })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
    }

    // Time to First Byte (TTFB)
    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    if (navigationEntries.length > 0) {
      const navEntry = navigationEntries[0]
      this.webVitals.TTFB = navEntry.responseStart - navEntry.requestStart
    }
  }

  private setupUserInteractionTracking(): void {
    // Track user interactions
    const trackInteraction = (event: Event) => {
      this.engagementMetrics.interactions++
      this.updateEngagementMetrics()

      // Track specific interactions
      if (event.type === 'click') {
        const target = event.target as HTMLElement
        if (target) {
          metricsCollector.recordUserInteraction('click', target.tagName.toLowerCase(), target.className || target.id)
        }
      }
    }

    document.addEventListener('click', trackInteraction, { passive: true })
    document.addEventListener('keydown', trackInteraction, { passive: true })
    document.addEventListener('scroll', trackInteraction, { passive: true })
  }

  private setupErrorTracking(): void {
    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      this.engagementMetrics.errorsEncountered++
      this.updateEngagementMetrics()

      metricsCollector.recordError('ui', event.message, event.error?.stack, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }, 'high')
    })

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.engagementMetrics.errorsEncountered++
      this.updateEngagementMetrics()

      metricsCollector.recordError('ui', `Unhandled promise rejection: ${event.reason}`, undefined, {
        reason: event.reason
      }, 'high')
    })
  }

  private setupVisibilityTracking(): void {
    // Track page visibility changes (user engagement)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // User left the page - record session duration
        this.updateSessionDuration()
      } else {
        // User returned - reset session start for more accurate tracking
        this.sessionStart = Date.now()
      }
    })
  }

  // Public API methods
  recordCaseOpening(caseType: string, duration: number, success: boolean): void {
    this.engagementMetrics.caseOpenings++

    if (this.qualityMetrics.timeToFirstCase === null) {
      this.qualityMetrics.timeToFirstCase = Date.now() - this.sessionStart
    }

    // Update average case opening time
    const totalTime = this.qualityMetrics.averageCaseOpeningTime * (this.engagementMetrics.caseOpenings - 1) + duration
    this.qualityMetrics.averageCaseOpeningTime = totalTime / this.engagementMetrics.caseOpenings

    this.updateQualityMetrics()

    metricsCollector.recordGameMetric('case_opening', 'duration', duration, {
      caseType,
      success,
      sessionCaseNumber: this.engagementMetrics.caseOpenings
    })
  }

  recordErrorRecovery(success: boolean): void {
    // Update error recovery rate
    const totalErrors = this.engagementMetrics.errorsEncountered
    const successfulRecoveries = success ? 1 : 0
    this.qualityMetrics.errorRecoveryRate = successfulRecoveries / Math.max(totalErrors, 1)

    this.updateQualityMetrics()
  }

  setUserSatisfactionScore(score: number): void {
    this.qualityMetrics.userSatisfactionScore = Math.max(1, Math.min(5, score))
    this.updateQualityMetrics()
  }

  startUserFlow(flowId: string, initialStep: string): string {
    const flow: UserFlowMetrics = {
      flowId,
      steps: [{
        step: initialStep,
        timestamp: Date.now(),
        success: true
      }],
      completed: false,
      totalTime: 0,
      errors: 0,
      timestamp: Date.now()
    }

    this.activeFlows.set(flowId, flow)
    return flowId
  }

  recordFlowStep(flowId: string, step: string, success: boolean, error?: string): void {
    const flow = this.activeFlows.get(flowId)
    if (!flow) return

    const lastStep = flow.steps[flow.steps.length - 1]
    const stepDuration = Date.now() - lastStep.timestamp

    // Update last step duration
    lastStep.duration = stepDuration

    // Add new step
    flow.steps.push({
      step,
      timestamp: Date.now(),
      success,
      error
    })

    if (!success) {
      flow.errors++
    }

    this.activeFlows.set(flowId, flow)
  }

  completeUserFlow(flowId: string): void {
    const flow = this.activeFlows.get(flowId)
    if (!flow) return

    const totalDuration = Date.now() - flow.timestamp
    flow.totalTime = totalDuration
    flow.completed = true

    // Record flow completion metrics
    metricsCollector.recordGameMetric('user_flow', 'completion', totalDuration, {
      flowId,
      steps: flow.steps.length,
      errors: flow.errors,
      completed: flow.completed
    })

    // Clean up completed flows after some time
    setTimeout(() => {
      this.activeFlows.delete(flowId)
    }, 60000) // Keep for 1 minute for analysis
  }

  getCoreWebVitals(): CoreWebVitals {
    return { ...this.webVitals }
  }

  getEngagementMetrics(): UserEngagementMetrics {
    this.updateSessionDuration()
    return { ...this.engagementMetrics }
  }

  getQualityMetrics(): ExperienceQualityMetrics {
    return { ...this.qualityMetrics }
  }

  getActiveFlows(): UserFlowMetrics[] {
    return Array.from(this.activeFlows.values())
  }

  // Performance scoring
  getPerformanceScore(): {
    overall: number // 0-100
    breakdown: {
      webVitals: number
      engagement: number
      quality: number
      errors: number
    }
  } {
    const webVitals = this.calculateWebVitalsScore()
    const engagement = this.calculateEngagementScore()
    const quality = this.calculateQualityScore()
    const errors = this.calculateErrorScore()

    const overall = (webVitals + engagement + quality + errors) / 4

    return {
      overall: Math.round(overall),
      breakdown: {
        webVitals,
        engagement,
        quality,
        errors
      }
    }
  }

  private calculateWebVitalsScore(): number {
    const { FCP, LCP, CLS, FID } = this.webVitals
    let score = 100

    // FCP scoring (good < 1800ms, poor > 3000ms)
    if (FCP !== null) {
      if (FCP > 3000) score -= 30
      else if (FCP > 1800) score -= 15
    }

    // LCP scoring (good < 2500ms, poor > 4000ms)
    if (LCP !== null) {
      if (LCP > 4000) score -= 30
      else if (LCP > 2500) score -= 15
    }

    // CLS scoring (good < 0.1, poor > 0.25)
    if (CLS !== null) {
      if (CLS > 0.25) score -= 30
      else if (CLS > 0.1) score -= 15
    }

    // FID scoring (good < 100ms, poor > 300ms)
    if (FID !== null) {
      if (FID > 300) score -= 30
      else if (FID > 100) score -= 15
    }

    return Math.max(0, Math.min(100, score))
  }

  private calculateEngagementScore(): number {
    const { interactions, caseOpenings, errorsEncountered, sessionDuration } = this.engagementMetrics
    let score = 50 // Base score

    // Interactions per minute
    const interactionsPerMinute = (interactions / Math.max(sessionDuration / 60000, 1))
    if (interactionsPerMinute > 10) score += 25
    else if (interactionsPerMinute > 5) score += 15
    else if (interactionsPerMinute < 1) score -= 10

    // Case openings
    if (caseOpenings > 5) score += 15
    else if (caseOpenings > 2) score += 10
    else if (caseOpenings === 0) score -= 20

    // Error impact
    if (errorsEncountered > 5) score -= 25
    else if (errorsEncountered > 2) score -= 15

    return Math.max(0, Math.min(100, score))
  }

  private calculateQualityScore(): number {
    const { averageCaseOpeningTime, errorRecoveryRate, timeToInteractive } = this.qualityMetrics
    let score = 100

    // Time to interactive (good < 3000ms, poor > 5000ms)
    if (timeToInteractive !== null) {
      if (timeToInteractive > 5000) score -= 30
      else if (timeToInteractive > 3000) score -= 15
    }

    // Average case opening time (good < 3000ms, poor > 5000ms)
    if (averageCaseOpeningTime > 5000) score -= 30
    else if (averageCaseOpeningTime > 3000) score -= 15

    // Error recovery rate
    score += (errorRecoveryRate - 0.5) * 40 // -20 to +20

    return Math.max(0, Math.min(100, score))
  }

  private calculateErrorScore(): number {
    const errorRate = this.engagementMetrics.errorsEncountered / Math.max(this.engagementMetrics.interactions, 1)
    // Lower error rate = higher score
    return Math.max(0, Math.min(100, 100 - (errorRate * 1000)))
  }

  private updateEngagementMetrics(): void {
    this.engagementMetrics.sessionDuration = Date.now() - this.sessionStart
    this.engagementMetrics.timestamp = Date.now()
    this.notifyObservers('engagement', { ...this.engagementMetrics })
  }

  private updateQualityMetrics(): void {
    this.qualityMetrics.timestamp = Date.now()
    this.notifyObservers('quality', { ...this.qualityMetrics })
  }

  private updateSessionDuration(): void {
    this.engagementMetrics.sessionDuration = Date.now() - this.sessionStart
  }

  subscribe(callback: (type: string, data: any) => void): () => void {
    this.observers.push(callback)
    return () => {
      const index = this.observers.indexOf(callback)
      if (index > -1) {
        this.observers.splice(index, 1)
      }
    }
  }

  private notifyObservers(type: string, data: any): void {
    this.observers.forEach(observer => observer(type, data))
  }

  // Cleanup
  destroy(): void {
    this.observers = []
    this.activeFlows.clear()
    this.isInitialized = false
  }
}

// Global user experience monitor instance
export const userExperienceMonitor = UserExperienceMonitor.getInstance()

// React hook for user experience monitoring
export const useUserExperienceMonitoring = () => {
  const recordCaseOpening = userExperienceMonitor.recordCaseOpening.bind(userExperienceMonitor)
  const recordErrorRecovery = userExperienceMonitor.recordErrorRecovery.bind(userExperienceMonitor)
  const setUserSatisfactionScore = userExperienceMonitor.setUserSatisfactionScore.bind(userExperienceMonitor)
  const startUserFlow = userExperienceMonitor.startUserFlow.bind(userExperienceMonitor)
  const recordFlowStep = userExperienceMonitor.recordFlowStep.bind(userExperienceMonitor)
  const completeUserFlow = userExperienceMonitor.completeUserFlow.bind(userExperienceMonitor)
  const getPerformanceScore = userExperienceMonitor.getPerformanceScore.bind(userExperienceMonitor)

  return {
    recordCaseOpening,
    recordErrorRecovery,
    setUserSatisfactionScore,
    startUserFlow,
    recordFlowStep,
    completeUserFlow,
    getPerformanceScore,
    getCoreWebVitals: userExperienceMonitor.getCoreWebVitals.bind(userExperienceMonitor),
    getEngagementMetrics: userExperienceMonitor.getEngagementMetrics.bind(userExperienceMonitor),
    getQualityMetrics: userExperienceMonitor.getQualityMetrics.bind(userExperienceMonitor)
  }
}

// Initialize monitoring
// Disabled to reduce console noise
// if (typeof window !== 'undefined') {
//   userExperienceMonitor.initialize()
// }
