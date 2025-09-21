/**
 * Case Opening Monitoring and Logging Service
 * Provides operational observability, performance metrics, and error tracking
 */

import { supabaseAdmin } from '../config/supabase'

export interface CaseOpeningMetrics {
  timestamp: string
  operation: string
  duration_ms: number
  success: boolean
  user_id?: string
  case_type_id?: string
  item_rarity?: string
  currency_awarded?: number
  error_message?: string
  metadata?: Record<string, any>
}

export interface PerformanceMetrics {
  operation: string
  avg_duration_ms: number
  min_duration_ms: number
  max_duration_ms: number
  total_operations: number
  success_rate: number
  error_count: number
  last_24h_operations: number
}

export interface FairnessMetrics {
  case_type_id: string
  total_openings: number
  rarity_distribution: Record<string, number>
  expected_distribution: Record<string, number>
  chi_square_statistic: number
  is_fair: boolean
  last_updated: string
}

export class CaseOpeningMonitoringService {
  private static metricsBuffer: CaseOpeningMetrics[] = []
  private static readonly BUFFER_SIZE = 100
  private static readonly FLUSH_INTERVAL = 30000 // 30 seconds

  static {
    // Start periodic metrics flushing
    setInterval(() => {
      this.flushMetrics()
    }, this.FLUSH_INTERVAL)
  }

  /**
   * Record a case opening operation metric
   */
  static recordOperation(
    operation: string,
    startTime: number,
    success: boolean,
    metadata?: {
      user_id?: string
      case_type_id?: string
      item_rarity?: string
      currency_awarded?: number
      error_message?: string
      [key: string]: any
    }
  ): void {
    const endTime = performance.now()
    const duration = endTime - startTime

    const metric: CaseOpeningMetrics = {
      timestamp: new Date().toISOString(),
      operation,
      duration_ms: Math.round(duration * 100) / 100, // Round to 2 decimal places
      success,
      ...metadata
    }

    this.metricsBuffer.push(metric)

    // Log to console for immediate visibility
    if (success) {
      console.log(`✅ ${operation} completed in ${metric.duration_ms}ms`, metadata || {})
    } else {
      console.error(`❌ ${operation} failed after ${metric.duration_ms}ms`, metadata || {})
    }

    // Flush buffer if it's full
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      this.flushMetrics()
    }
  }

  /**
   * Record case opening start
   */
  static recordCaseOpeningStart(userId: string, caseTypeId: string): number {
    const startTime = performance.now()
    
    console.log(`🎲 Case opening started`, {
      user_id: userId,
      case_type_id: caseTypeId,
      timestamp: new Date().toISOString()
    })

    return startTime
  }

  /**
   * Record successful case opening
   */
  static recordCaseOpeningSuccess(
    startTime: number,
    userId: string,
    caseTypeId: string,
    itemRarity: string,
    currencyAwarded: number,
    openingId: string
  ): void {
    this.recordOperation('case_opening', startTime, true, {
      user_id: userId,
      case_type_id: caseTypeId,
      item_rarity: itemRarity,
      currency_awarded: currencyAwarded,
      opening_id: openingId
    })
  }

  /**
   * Record failed case opening
   */
  static recordCaseOpeningFailure(
    startTime: number,
    userId: string,
    caseTypeId: string,
    errorMessage: string
  ): void {
    this.recordOperation('case_opening', startTime, false, {
      user_id: userId,
      case_type_id: caseTypeId,
      error_message: errorMessage
    })
  }

  /**
   * Record item selection performance
   */
  static recordItemSelection(
    startTime: number,
    caseTypeId: string,
    selectedRarity: string,
    itemPoolSize: number
  ): void {
    this.recordOperation('item_selection', startTime, true, {
      case_type_id: caseTypeId,
      selected_rarity: selectedRarity,
      item_pool_size: itemPoolSize
    })
  }

  /**
   * Record currency transaction
   */
  static recordCurrencyTransaction(
    startTime: number,
    userId: string,
    transactionType: 'debit' | 'credit',
    amount: number,
    success: boolean,
    errorMessage?: string
  ): void {
    this.recordOperation('currency_transaction', startTime, success, {
      user_id: userId,
      transaction_type: transactionType,
      amount,
      error_message: errorMessage
    })
  }

  /**
   * Record database operation performance
   */
  static recordDatabaseOperation(
    operation: string,
    startTime: number,
    success: boolean,
    recordCount?: number,
    errorMessage?: string
  ): void {
    this.recordOperation(`db_${operation}`, startTime, success, {
      record_count: recordCount,
      error_message: errorMessage
    })
  }

  /**
   * Flush metrics buffer to database
   */
  private static async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return
    }

    const metricsToFlush = [...this.metricsBuffer]
    this.metricsBuffer = []

    try {
      const { error } = await supabaseAdmin
        .from('case_opening_metrics')
        .insert(metricsToFlush)

      if (error) {
        console.error('Failed to flush metrics to database:', error)
        // Put metrics back in buffer for retry
        this.metricsBuffer.unshift(...metricsToFlush)
      } else {
        console.log(`📊 Flushed ${metricsToFlush.length} metrics to database`)
      }
    } catch (error) {
      console.error('Error flushing metrics:', error)
      // Put metrics back in buffer for retry
      this.metricsBuffer.unshift(...metricsToFlush)
    }
  }

  /**
   * Get performance metrics for a specific operation
   */
  static async getPerformanceMetrics(
    operation: string,
    timeRange: '1h' | '24h' | '7d' = '24h'
  ): Promise<PerformanceMetrics | null> {
    try {
      const timeRangeHours = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 168
      const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabaseAdmin
        .from('case_opening_metrics')
        .select('duration_ms, success')
        .eq('operation', operation)
        .gte('timestamp', since)

      if (error) {
        console.error('Error fetching performance metrics:', error)
        return null
      }

      if (!data || data.length === 0) {
        return null
      }

      const durations = data.map(m => m.duration_ms)
      const successCount = data.filter(m => m.success).length
      const errorCount = data.length - successCount

      return {
        operation,
        avg_duration_ms: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        min_duration_ms: Math.min(...durations),
        max_duration_ms: Math.max(...durations),
        total_operations: data.length,
        success_rate: successCount / data.length,
        error_count: errorCount,
        last_24h_operations: timeRange === '24h' ? data.length : 0
      }
    } catch (error) {
      console.error('Error calculating performance metrics:', error)
      return null
    }
  }

  /**
   * Get fairness metrics for a case type
   */
  static async getFairnessMetrics(caseTypeId: string): Promise<FairnessMetrics | null> {
    try {
      // Get case type expected distribution
      const { data: caseType, error: caseError } = await supabaseAdmin
        .from('case_types')
        .select('rarity_distribution')
        .eq('id', caseTypeId)
        .single()

      if (caseError || !caseType) {
        console.error('Error fetching case type:', caseError)
        return null
      }

      // Get actual openings from the last 30 days
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      
      const { data: openings, error: openingsError } = await supabaseAdmin
        .from('case_opening_metrics')
        .select('item_rarity')
        .eq('operation', 'case_opening')
        .eq('case_type_id', caseTypeId)
        .eq('success', true)
        .gte('timestamp', since)

      if (openingsError) {
        console.error('Error fetching case openings:', openingsError)
        return null
      }

      if (!openings || openings.length === 0) {
        return null
      }

      // Calculate actual distribution
      const actualDistribution: Record<string, number> = {
        common: 0,
        uncommon: 0,
        rare: 0,
        epic: 0,
        legendary: 0
      }

      openings.forEach(opening => {
        if (opening.item_rarity && actualDistribution.hasOwnProperty(opening.item_rarity)) {
          actualDistribution[opening.item_rarity]++
        }
      })

      // Convert to percentages
      const totalOpenings = openings.length
      Object.keys(actualDistribution).forEach(rarity => {
        actualDistribution[rarity] = (actualDistribution[rarity] / totalOpenings) * 100
      })

      // Calculate chi-square statistic
      const expectedDistribution = caseType.rarity_distribution
      let chiSquare = 0

      Object.keys(expectedDistribution).forEach(rarity => {
        const observed = (actualDistribution[rarity] / 100) * totalOpenings
        const expected = (expectedDistribution[rarity] / 100) * totalOpenings
        
        if (expected > 0) {
          chiSquare += Math.pow(observed - expected, 2) / expected
        }
      })

      // Critical value for α = 0.05 and df = 4 is approximately 9.488
      const isFair = chiSquare < 9.488

      return {
        case_type_id: caseTypeId,
        total_openings: totalOpenings,
        rarity_distribution: actualDistribution,
        expected_distribution: expectedDistribution,
        chi_square_statistic: chiSquare,
        is_fair: isFair,
        last_updated: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error calculating fairness metrics:', error)
      return null
    }
  }

  /**
   * Get system health metrics
   */
  static async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    metrics: {
      avg_response_time: number
      success_rate: number
      error_rate: number
      operations_per_minute: number
    }
    issues: string[]
  }> {
    try {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString() // Last hour

      const { data, error } = await supabaseAdmin
        .from('case_opening_metrics')
        .select('duration_ms, success, timestamp')
        .gte('timestamp', since)

      if (error) {
        return {
          status: 'unhealthy',
          metrics: { avg_response_time: 0, success_rate: 0, error_rate: 100, operations_per_minute: 0 },
          issues: ['Failed to fetch metrics from database']
        }
      }

      if (!data || data.length === 0) {
        return {
          status: 'healthy',
          metrics: { avg_response_time: 0, success_rate: 100, error_rate: 0, operations_per_minute: 0 },
          issues: []
        }
      }

      const avgResponseTime = data.reduce((sum, m) => sum + m.duration_ms, 0) / data.length
      const successCount = data.filter(m => m.success).length
      const successRate = (successCount / data.length) * 100
      const errorRate = 100 - successRate
      const operationsPerMinute = data.length / 60

      const issues: string[] = []
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

      // Check for performance issues
      if (avgResponseTime > 1000) {
        issues.push(`High average response time: ${avgResponseTime.toFixed(2)}ms`)
        status = 'degraded'
      }

      if (avgResponseTime > 5000) {
        status = 'unhealthy'
      }

      // Check for error rate issues
      if (errorRate > 5) {
        issues.push(`High error rate: ${errorRate.toFixed(2)}%`)
        status = status === 'unhealthy' ? 'unhealthy' : 'degraded'
      }

      if (errorRate > 20) {
        status = 'unhealthy'
      }

      // Check for low activity (might indicate issues)
      if (operationsPerMinute < 0.1 && data.length > 0) {
        issues.push(`Low activity: ${operationsPerMinute.toFixed(2)} operations/minute`)
      }

      return {
        status,
        metrics: {
          avg_response_time: Math.round(avgResponseTime * 100) / 100,
          success_rate: Math.round(successRate * 100) / 100,
          error_rate: Math.round(errorRate * 100) / 100,
          operations_per_minute: Math.round(operationsPerMinute * 100) / 100
        },
        issues
      }
    } catch (error) {
      console.error('Error getting system health:', error)
      return {
        status: 'unhealthy',
        metrics: { avg_response_time: 0, success_rate: 0, error_rate: 100, operations_per_minute: 0 },
        issues: ['System health check failed']
      }
    }
  }

  /**
   * Log critical error with context
   */
  static logCriticalError(
    operation: string,
    error: Error,
    context?: Record<string, any>
  ): void {
    const errorLog = {
      timestamp: new Date().toISOString(),
      level: 'CRITICAL',
      operation,
      error_message: error.message,
      error_stack: error.stack,
      context: context || {}
    }

    console.error('🚨 CRITICAL ERROR:', errorLog)

    // In production, you might want to send this to an external monitoring service
    // like Sentry, DataDog, or CloudWatch
  }

  /**
   * Log warning with context
   */
  static logWarning(
    operation: string,
    message: string,
    context?: Record<string, any>
  ): void {
    const warningLog = {
      timestamp: new Date().toISOString(),
      level: 'WARNING',
      operation,
      message,
      context: context || {}
    }

    console.warn('⚠️ WARNING:', warningLog)
  }

  /**
   * Log info message
   */
  static logInfo(
    operation: string,
    message: string,
    context?: Record<string, any>
  ): void {
    const infoLog = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      operation,
      message,
      context: context || {}
    }

    console.info('ℹ️ INFO:', infoLog)
  }

  /**
   * Create monitoring dashboard data
   */
  static async getDashboardData(): Promise<{
    systemHealth: Awaited<ReturnType<typeof this.getSystemHealth>>
    recentMetrics: CaseOpeningMetrics[]
    performanceMetrics: PerformanceMetrics[]
    fairnessAlerts: Array<{ case_type_id: string; issue: string }>
  }> {
    try {
      const [systemHealth, recentMetrics] = await Promise.all([
        this.getSystemHealth(),
        this.getRecentMetrics(50)
      ])

      // Get performance metrics for key operations
      const performanceMetrics = await Promise.all([
        this.getPerformanceMetrics('case_opening'),
        this.getPerformanceMetrics('item_selection'),
        this.getPerformanceMetrics('currency_transaction')
      ]).then(metrics => metrics.filter(m => m !== null) as PerformanceMetrics[])

      // Check for fairness alerts (simplified)
      const fairnessAlerts: Array<{ case_type_id: string; issue: string }> = []

      return {
        systemHealth,
        recentMetrics,
        performanceMetrics,
        fairnessAlerts
      }
    } catch (error) {
      console.error('Error creating dashboard data:', error)
      throw error
    }
  }

  /**
   * Get recent metrics
   */
  private static async getRecentMetrics(limit: number = 100): Promise<CaseOpeningMetrics[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('case_opening_metrics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent metrics:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error getting recent metrics:', error)
      return []
    }
  }

  /**
   * Force flush metrics (for testing or shutdown)
   */
  static async forceFlushMetrics(): Promise<void> {
    await this.flushMetrics()
  }
}