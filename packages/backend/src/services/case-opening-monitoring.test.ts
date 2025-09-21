/**
 * Case Opening Monitoring and Logging Tests
 * Tests monitoring functionality, metrics collection, and system health
 */

import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test'

// Set up environment variables
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = 'test-anon-key-that-is-long-enough'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-that-is-long-enough'
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long-for-validation'
process.env.STARTING_BALANCE = '10000'
process.env.DAILY_BONUS = '1000'

import { CaseOpeningMonitoringService } from './case-opening-monitoring'

// Mock Supabase
mock.module('../config/supabase', () => ({
  supabaseAdmin: {
    from: mock(() => ({
      insert: mock().mockResolvedValue({ error: null }),
      select: mock(() => ({
        eq: mock(() => ({
          gte: mock(() => ({
            single: mock().mockResolvedValue({ data: null, error: null }),
            order: mock(() => ({
              limit: mock().mockResolvedValue({ data: [], error: null })
            }))
          })),
          single: mock().mockResolvedValue({ data: null, error: null }),
          order: mock(() => ({
            limit: mock().mockResolvedValue({ data: [], error: null })
          }))
        })),
        gte: mock(() => ({
          eq: mock(() => ({
            eq: mock(() => ({
              eq: mock().mockResolvedValue({ data: [], error: null })
            }))
          }))
        })),
        order: mock(() => ({
          limit: mock().mockResolvedValue({ data: [], error: null })
        }))
      }))
    }))
  }
}))

describe('Case Opening Monitoring Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock performance.now
    vi.spyOn(performance, 'now').mockReturnValue(1000)
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Operation Recording', () => {
    it('should record successful operations', () => {
      const startTime = 1000
      vi.spyOn(performance, 'now').mockReturnValue(1050) // 50ms later

      CaseOpeningMonitoringService.recordOperation(
        'test_operation',
        startTime,
        true,
        {
          user_id: 'test-user',
          case_type_id: 'test-case',
          item_rarity: 'rare'
        }
      )

      expect(console.log).toHaveBeenCalledWith(
        '✅ test_operation completed in 50ms',
        {
          user_id: 'test-user',
          case_type_id: 'test-case',
          item_rarity: 'rare'
        }
      )
    })

    it('should record failed operations', () => {
      const startTime = 1000
      vi.spyOn(performance, 'now').mockReturnValue(1100) // 100ms later

      CaseOpeningMonitoringService.recordOperation(
        'test_operation',
        startTime,
        false,
        {
          user_id: 'test-user',
          case_type_id: 'test-case',
          error_message: 'Test error'
        }
      )

      expect(console.error).toHaveBeenCalledWith(
        '❌ test_operation failed after 100ms',
        {
          error: 'Test error',
          user_id: 'test-user',
          case_type_id: 'test-case'
        }
      )
    })

    it('should calculate duration correctly', () => {
      const startTime = 1000
      vi.spyOn(performance, 'now').mockReturnValue(1123.456) // 123.456ms later

      CaseOpeningMonitoringService.recordOperation('test_operation', startTime, true)

      expect(console.log).toHaveBeenCalledWith(
        '✅ test_operation completed in 123.46ms',
        {}
      )
    })
  })

  describe('Case Opening Specific Recording', () => {
    it('should record case opening start', () => {
      const startTime = CaseOpeningMonitoringService.recordCaseOpeningStart('user-123', 'case-456')

      expect(startTime).toBe(1000)
      expect(console.log).toHaveBeenCalledWith(
        '🎲 Case opening started',
        {
          user_id: 'user-123',
          case_type_id: 'case-456',
          timestamp: expect.any(String)
        }
      )
    })

    it('should record successful case opening', () => {
      const startTime = 1000
      vi.spyOn(performance, 'now').mockReturnValue(1200) // 200ms later

      CaseOpeningMonitoringService.recordCaseOpeningSuccess(
        startTime,
        'user-123',
        'case-456',
        'legendary',
        5000,
        'opening-789'
      )

      expect(console.log).toHaveBeenCalledWith(
        '✅ case_opening completed in 200ms',
        {
          user_id: 'user-123',
          case_type_id: 'case-456',
          item_rarity: 'legendary'
        }
      )
    })

    it('should record failed case opening', () => {
      const startTime = 1000
      vi.spyOn(performance, 'now').mockReturnValue(1150) // 150ms later

      CaseOpeningMonitoringService.recordCaseOpeningFailure(
        startTime,
        'user-123',
        'case-456',
        'Insufficient balance'
      )

      expect(console.error).toHaveBeenCalledWith(
        '❌ case_opening failed after 150ms',
        {
          error: 'Insufficient balance',
          user_id: 'user-123',
          case_type_id: 'case-456'
        }
      )
    })
  })

  describe('Performance Metrics', () => {
    it('should calculate performance metrics correctly', async () => {
      // Mock database response
      const mockMetrics = [
        { duration_ms: 100, success: true },
        { duration_ms: 150, success: true },
        { duration_ms: 200, success: false },
        { duration_ms: 120, success: true },
        { duration_ms: 300, success: false }
      ]

      const { supabaseAdmin } = await import('../config/supabase')
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn().mockResolvedValue({ data: mockMetrics, error: null })
        }))
      }))
      
      supabaseAdmin.from = vi.fn(() => ({ select: mockSelect }))

      const metrics = await CaseOpeningMonitoringService.getPerformanceMetrics('case_opening', '24h')

      expect(metrics).toEqual({
        operation: 'case_opening',
        avg_duration_ms: 174, // (100+150+200+120+300)/5
        min_duration_ms: 100,
        max_duration_ms: 300,
        total_operations: 5,
        success_rate: 0.6, // 3/5
        error_count: 2,
        last_24h_operations: 5
      })
    })

    it('should handle empty metrics gracefully', async () => {
      const { supabaseAdmin } = await import('../config/supabase')
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
      }))
      
      supabaseAdmin.from = vi.fn(() => ({ select: mockSelect }))

      const metrics = await CaseOpeningMonitoringService.getPerformanceMetrics('case_opening', '24h')

      expect(metrics).toBeNull()
    })

    it('should handle database errors gracefully', async () => {
      const { supabaseAdmin } = await import('../config/supabase')
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
        }))
      }))
      
      supabaseAdmin.from = vi.fn(() => ({ select: mockSelect }))

      const metrics = await CaseOpeningMonitoringService.getPerformanceMetrics('case_opening', '24h')

      expect(metrics).toBeNull()
      expect(console.error).toHaveBeenCalledWith('Error fetching performance metrics:', expect.any(Error))
    })
  })

  describe('Fairness Metrics', () => {
    it('should calculate fairness metrics correctly', async () => {
      // Mock case type data
      const mockCaseType = {
        rarity_distribution: {
          common: 60,
          uncommon: 25,
          rare: 10,
          epic: 4,
          legendary: 1
        }
      }

      // Mock opening data (100 openings)
      const mockOpenings = [
        ...Array(58).fill({ item_rarity: 'common' }),    // 58% (expected 60%)
        ...Array(27).fill({ item_rarity: 'uncommon' }),  // 27% (expected 25%)
        ...Array(12).fill({ item_rarity: 'rare' }),      // 12% (expected 10%)
        ...Array(2).fill({ item_rarity: 'epic' }),       // 2% (expected 4%)
        ...Array(1).fill({ item_rarity: 'legendary' })   // 1% (expected 1%)
      ]

      const { supabaseAdmin } = await import('../config/supabase')
      
      // Mock the database calls
      supabaseAdmin.from = vi.fn((table) => {
        if (table === 'case_types') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockCaseType, error: null })
              }))
            }))
          }
        } else if (table === 'case_opening_metrics') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      gte: vi.fn().mockResolvedValue({ data: mockOpenings, error: null })
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        return {}
      })

      const fairnessMetrics = await CaseOpeningMonitoringService.getFairnessMetrics('test-case')

      expect(fairnessMetrics).toBeDefined()
      expect(fairnessMetrics?.total_openings).toBe(100)
      expect(fairnessMetrics?.rarity_distribution.common).toBe(58)
      expect(fairnessMetrics?.rarity_distribution.uncommon).toBe(27)
      expect(fairnessMetrics?.rarity_distribution.rare).toBe(12)
      expect(fairnessMetrics?.rarity_distribution.epic).toBe(2)
      expect(fairnessMetrics?.rarity_distribution.legendary).toBe(1)
      expect(fairnessMetrics?.chi_square_statistic).toBeGreaterThan(0)
      expect(typeof fairnessMetrics?.is_fair).toBe('boolean')
    })

    it('should handle missing case type gracefully', async () => {
      const { supabaseAdmin } = await import('../config/supabase')
      
      supabaseAdmin.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') })
          }))
        }))
      }))

      const fairnessMetrics = await CaseOpeningMonitoringService.getFairnessMetrics('nonexistent-case')

      expect(fairnessMetrics).toBeNull()
      expect(console.error).toHaveBeenCalledWith('Error fetching case type:', expect.any(Error))
    })
  })

  describe('System Health', () => {
    it('should report healthy system', async () => {
      const mockHealthyMetrics = [
        { duration_ms: 50, success: true, timestamp: new Date().toISOString() },
        { duration_ms: 75, success: true, timestamp: new Date().toISOString() },
        { duration_ms: 60, success: true, timestamp: new Date().toISOString() },
        { duration_ms: 80, success: true, timestamp: new Date().toISOString() }
      ]

      const { supabaseAdmin } = await import('../config/supabase')
      supabaseAdmin.from = vi.fn(() => ({
        select: vi.fn(() => ({
          gte: vi.fn().mockResolvedValue({ data: mockHealthyMetrics, error: null })
        }))
      }))

      const health = await CaseOpeningMonitoringService.getSystemHealth()

      expect(health.status).toBe('healthy')
      expect(health.metrics.success_rate).toBe(100)
      expect(health.metrics.error_rate).toBe(0)
      expect(health.metrics.avg_response_time).toBe(66.25) // (50+75+60+80)/4
      expect(health.issues).toHaveLength(0)
    })

    it('should report degraded system with high response time', async () => {
      const mockSlowMetrics = [
        { duration_ms: 1500, success: true, timestamp: new Date().toISOString() },
        { duration_ms: 2000, success: true, timestamp: new Date().toISOString() }
      ]

      const { supabaseAdmin } = await import('../config/supabase')
      supabaseAdmin.from = vi.fn(() => ({
        select: vi.fn(() => ({
          gte: vi.fn().mockResolvedValue({ data: mockSlowMetrics, error: null })
        }))
      }))

      const health = await CaseOpeningMonitoringService.getSystemHealth()

      expect(health.status).toBe('degraded')
      expect(health.metrics.avg_response_time).toBe(1750)
      expect(health.issues).toContain('High average response time: 1750.00ms')
    })

    it('should report unhealthy system with high error rate', async () => {
      const mockErrorMetrics = [
        { duration_ms: 100, success: false, timestamp: new Date().toISOString() },
        { duration_ms: 150, success: false, timestamp: new Date().toISOString() },
        { duration_ms: 120, success: false, timestamp: new Date().toISOString() },
        { duration_ms: 80, success: true, timestamp: new Date().toISOString() }
      ]

      const { supabaseAdmin } = await import('../config/supabase')
      supabaseAdmin.from = vi.fn(() => ({
        select: vi.fn(() => ({
          gte: vi.fn().mockResolvedValue({ data: mockErrorMetrics, error: null })
        }))
      }))

      const health = await CaseOpeningMonitoringService.getSystemHealth()

      expect(health.status).toBe('unhealthy')
      expect(health.metrics.error_rate).toBe(75) // 3/4 failed
      expect(health.issues).toContain('High error rate: 75.00%')
    })

    it('should handle database errors in health check', async () => {
      const { supabaseAdmin } = await import('../config/supabase')
      supabaseAdmin.from = vi.fn(() => ({
        select: vi.fn(() => ({
          gte: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
        }))
      }))

      const health = await CaseOpeningMonitoringService.getSystemHealth()

      expect(health.status).toBe('unhealthy')
      expect(health.issues).toContain('Failed to fetch metrics from database')
    })
  })

  describe('Logging Functions', () => {
    it('should log critical errors', () => {
      const error = new Error('Critical test error')
      error.stack = 'Error stack trace'

      CaseOpeningMonitoringService.logCriticalError(
        'test_operation',
        error,
        { user_id: 'test-user' }
      )

      expect(console.error).toHaveBeenCalledWith('🚨 CRITICAL ERROR:', {
        timestamp: expect.any(String),
        level: 'CRITICAL',
        operation: 'test_operation',
        error_message: 'Critical test error',
        error_stack: 'Error stack trace',
        context: { user_id: 'test-user' }
      })
    })

    it('should log warnings', () => {
      CaseOpeningMonitoringService.logWarning(
        'test_operation',
        'Test warning message',
        { case_id: 'test-case' }
      )

      expect(console.warn).toHaveBeenCalledWith('⚠️ WARNING:', {
        timestamp: expect.any(String),
        level: 'WARNING',
        operation: 'test_operation',
        message: 'Test warning message',
        context: { case_id: 'test-case' }
      })
    })

    it('should log info messages', () => {
      CaseOpeningMonitoringService.logInfo(
        'test_operation',
        'Test info message',
        { status: 'success' }
      )

      expect(console.info).toHaveBeenCalledWith('ℹ️ INFO:', {
        timestamp: expect.any(String),
        level: 'INFO',
        operation: 'test_operation',
        message: 'Test info message',
        context: { status: 'success' }
      })
    })
  })

  describe('Dashboard Data', () => {
    it('should compile dashboard data successfully', async () => {
      // Mock all the required data
      const mockHealthyMetrics = [
        { duration_ms: 50, success: true, timestamp: new Date().toISOString() }
      ]

      const mockRecentMetrics = [
        {
          timestamp: new Date().toISOString(),
          operation: 'case_opening',
          duration_ms: 100,
          success: true,
          user_id: 'test-user'
        }
      ]

      const { supabaseAdmin } = await import('../config/supabase')
      supabaseAdmin.from = vi.fn((table) => {
        if (table === 'case_opening_metrics') {
          return {
            select: vi.fn(() => ({
              gte: vi.fn().mockResolvedValue({ data: mockHealthyMetrics, error: null }),
              eq: vi.fn(() => ({
                gte: vi.fn().mockResolvedValue({ data: mockHealthyMetrics, error: null })
              })),
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: mockRecentMetrics, error: null })
              }))
            }))
          }
        }
        return {}
      })

      const dashboardData = await CaseOpeningMonitoringService.getDashboardData()

      expect(dashboardData).toBeDefined()
      expect(dashboardData.systemHealth).toBeDefined()
      expect(dashboardData.recentMetrics).toBeDefined()
      expect(dashboardData.performanceMetrics).toBeDefined()
      expect(dashboardData.fairnessAlerts).toBeDefined()
      expect(Array.isArray(dashboardData.recentMetrics)).toBe(true)
      expect(Array.isArray(dashboardData.performanceMetrics)).toBe(true)
      expect(Array.isArray(dashboardData.fairnessAlerts)).toBe(true)
    })
  })

  describe('Currency Transaction Recording', () => {
    it('should record successful currency transactions', () => {
      const startTime = 1000
      vi.spyOn(performance, 'now').mockReturnValue(1025) // 25ms later

      CaseOpeningMonitoringService.recordCurrencyTransaction(
        startTime,
        'user-123',
        'debit',
        500,
        true
      )

      expect(console.log).toHaveBeenCalledWith(
        '✅ currency_transaction completed in 25ms',
        {
          user_id: 'user-123',
          transaction_type: 'debit',
          amount: 500
        }
      )
    })

    it('should record failed currency transactions', () => {
      const startTime = 1000
      vi.spyOn(performance, 'now').mockReturnValue(1075) // 75ms later

      CaseOpeningMonitoringService.recordCurrencyTransaction(
        startTime,
        'user-123',
        'credit',
        1000,
        false,
        'Insufficient balance'
      )

      expect(console.error).toHaveBeenCalledWith(
        '❌ currency_transaction failed after 75ms',
        {
          error: 'Insufficient balance',
          user_id: 'user-123',
          transaction_type: 'credit',
          amount: 1000
        }
      )
    })
  })

  describe('Database Operation Recording', () => {
    it('should record database operations', () => {
      const startTime = 1000
      vi.spyOn(performance, 'now').mockReturnValue(1030) // 30ms later

      CaseOpeningMonitoringService.recordDatabaseOperation(
        'select_case_types',
        startTime,
        true,
        5
      )

      expect(console.log).toHaveBeenCalledWith(
        '✅ db_select_case_types completed in 30ms',
        {
          record_count: 5
        }
      )
    })

    it('should record failed database operations', () => {
      const startTime = 1000
      vi.spyOn(performance, 'now').mockReturnValue(1200) // 200ms later

      CaseOpeningMonitoringService.recordDatabaseOperation(
        'insert_metrics',
        startTime,
        false,
        undefined,
        'Connection timeout'
      )

      expect(console.error).toHaveBeenCalledWith(
        '❌ db_insert_metrics failed after 200ms',
        {
          error: 'Connection timeout',
          record_count: undefined
        }
      )
    })
  })
})