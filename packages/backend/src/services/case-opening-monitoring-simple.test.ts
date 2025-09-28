/**
 * Simplified Case Opening Monitoring Tests
 * Tests monitoring functionality without complex database mocking
 */

import { describe, test, expect } from 'bun:test'

// Set up environment variables
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = 'test-anon-key-that-is-long-enough'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-that-is-long-enough'
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long-for-validation'
process.env.STARTING_BALANCE = '10000'
process.env.DAILY_BONUS = '1000'

describe('Case Opening Monitoring Service - Core Functions', () => {
  let originalConsole: typeof console

  beforeEach(() => {
    // Mock console methods
    originalConsole = console
    console.log = () => {}
    console.error = () => {}
    console.warn = () => {}
    console.info = () => {}
  })

  afterEach(() => {
    // Restore console
    console = originalConsole
  })

  describe('Logging Functions', () => {
    test('should format critical error logs correctly', () => {
      const mockConsoleError = (message: string, data: any) => {
        expect(message).toBe('🚨 CRITICAL ERROR:')
        expect(data.level).toBe('CRITICAL')
        expect(data.operation).toBe('test_operation')
        expect(data.error_message).toBe('Test error')
        expect(data.context).toEqual({ user_id: 'test-user' })
        expect(data.timestamp).toBeDefined()
      }

      console.error = mockConsoleError

      // Import after mocking console
      const { CaseOpeningMonitoringService } = require('./case-opening-monitoring')
      
      const error = new Error('Test error')
      CaseOpeningMonitoringService.logCriticalError(
        'test_operation',
        error,
        { user_id: 'test-user' }
      )
    })

    test('should format warning logs correctly', () => {
      const mockConsoleWarn = (message: string, data: any) => {
        expect(message).toBe('⚠️ WARNING:')
        expect(data.level).toBe('WARNING')
        expect(data.operation).toBe('test_operation')
        expect(data.message).toBe('Test warning')
        expect(data.context).toEqual({ case_id: 'test-case' })
        expect(data.timestamp).toBeDefined()
      }

      console.warn = mockConsoleWarn

      const { CaseOpeningMonitoringService } = require('./case-opening-monitoring')
      
      CaseOpeningMonitoringService.logWarning(
        'test_operation',
        'Test warning',
        { case_id: 'test-case' }
      )
    })

    test('should format info logs correctly', () => {
      const mockConsoleInfo = (message: string, data: any) => {
        expect(message).toBe('ℹ️ INFO:')
        expect(data.level).toBe('INFO')
        expect(data.operation).toBe('test_operation')
        expect(data.message).toBe('Test info')
        expect(data.context).toEqual({ status: 'success' })
        expect(data.timestamp).toBeDefined()
      }

      console.info = mockConsoleInfo

      const { CaseOpeningMonitoringService } = require('./case-opening-monitoring')
      
      CaseOpeningMonitoringService.logInfo(
        'test_operation',
        'Test info',
        { status: 'success' }
      )
    })
  })

  describe('Operation Recording', () => {
    test('should record successful operations with correct format', () => {
      const mockConsoleLog = (message: string, data: any) => {
        expect(message).toContain('✅')
        expect(message).toContain('test_operation completed')
        expect(message).toContain('ms')
        expect(data.user_id).toBe('test-user')
        expect(data.case_type_id).toBe('test-case')
      }

      console.log = mockConsoleLog

      const { CaseOpeningMonitoringService } = require('./case-opening-monitoring')
      
      // Mock performance.now to return predictable values
      const originalPerformanceNow = performance.now
      let callCount = 0
      performance.now = () => {
        callCount++
        return callCount === 1 ? 1000 : 1050 // 50ms difference
      }

      CaseOpeningMonitoringService.recordOperation(
        'test_operation',
        1000,
        true,
        {
          user_id: 'test-user',
          case_type_id: 'test-case'
        }
      )

      // Restore performance.now
      performance.now = originalPerformanceNow
    })

    test('should record failed operations with correct format', () => {
      const mockConsoleError = (message: string, data: any) => {
        expect(message).toContain('❌')
        expect(message).toContain('test_operation failed')
        expect(message).toContain('ms')
        expect(data.error).toBe('Test error')
        expect(data.user_id).toBe('test-user')
      }

      console.error = mockConsoleError

      const { CaseOpeningMonitoringService } = require('./case-opening-monitoring')
      
      // Mock performance.now
      const originalPerformanceNow = performance.now
      let callCount = 0
      performance.now = () => {
        callCount++
        return callCount === 1 ? 1000 : 1100 // 100ms difference
      }

      CaseOpeningMonitoringService.recordOperation(
        'test_operation',
        1000,
        false,
        {
          user_id: 'test-user',
          error_message: 'Test error'
        }
      )

      // Restore performance.now
      performance.now = originalPerformanceNow
    })
  })

  describe('Case Opening Specific Recording', () => {
    test('should record case opening start correctly', () => {
      const mockConsoleLog = (message: string, data: any) => {
        expect(message).toBe('🎲 Case opening started')
        expect(data.user_id).toBe('user-123')
        expect(data.case_type_id).toBe('case-456')
        expect(data.timestamp).toBeDefined()
      }

      console.log = mockConsoleLog

      const { CaseOpeningMonitoringService } = require('./case-opening-monitoring')
      
      const startTime = CaseOpeningMonitoringService.recordCaseOpeningStart('user-123', 'case-456')
      expect(typeof startTime).toBe('number')
      expect(startTime).toBeGreaterThan(0)
    })

    test('should record successful case opening', () => {
      let logCallCount = 0
      const mockConsoleLog = (message: string, data: any) => {
        logCallCount++
        if (logCallCount === 2) { // Second call is the success log
          expect(message).toContain('✅ case_opening completed')
          expect(data.user_id).toBe('user-123')
          expect(data.case_type_id).toBe('case-456')
          expect(data.item_rarity).toBe('legendary')
        }
      }

      console.log = mockConsoleLog

      const { CaseOpeningMonitoringService } = require('./case-opening-monitoring')
      
      // Mock performance.now
      const originalPerformanceNow = performance.now
      let callCount = 0
      performance.now = () => {
        callCount++
        return callCount === 1 ? 1000 : 1200 // 200ms difference
      }

      CaseOpeningMonitoringService.recordCaseOpeningSuccess(
        1000,
        'user-123',
        'case-456',
        'legendary',
        5000,
        'opening-789'
      )

      // Restore performance.now
      performance.now = originalPerformanceNow
    })

    test('should record failed case opening', () => {
      const mockConsoleError = (message: string, data: any) => {
        expect(message).toContain('❌ case_opening failed')
        expect(data.error).toBe('Insufficient balance')
        expect(data.user_id).toBe('user-123')
        expect(data.case_type_id).toBe('case-456')
      }

      console.error = mockConsoleError

      const { CaseOpeningMonitoringService } = require('./case-opening-monitoring')
      
      // Mock performance.now
      const originalPerformanceNow = performance.now
      let callCount = 0
      performance.now = () => {
        callCount++
        return callCount === 1 ? 1000 : 1150 // 150ms difference
      }

      CaseOpeningMonitoringService.recordCaseOpeningFailure(
        1000,
        'user-123',
        'case-456',
        'Insufficient balance'
      )

      // Restore performance.now
      performance.now = originalPerformanceNow
    })
  })

  describe('Duration Calculation', () => {
    test('should calculate duration correctly', () => {
      const mockConsoleLog = (message: string) => {
        expect(message).toContain('123.46ms') // Should round to 2 decimal places
      }

      console.log = mockConsoleLog

      const { CaseOpeningMonitoringService } = require('./case-opening-monitoring')
      
      // Mock performance.now to return specific values
      const originalPerformanceNow = performance.now
      let callCount = 0
      performance.now = () => {
        callCount++
        return callCount === 1 ? 1000 : 1123.456 // 123.456ms difference
      }

      CaseOpeningMonitoringService.recordOperation('test_operation', 1000, true)

      // Restore performance.now
      performance.now = originalPerformanceNow
    })

    test('should handle zero duration', () => {
      const mockConsoleLog = (message: string) => {
        expect(message).toContain('0ms')
      }

      console.log = mockConsoleLog

      const { CaseOpeningMonitoringService } = require('./case-opening-monitoring')
      
      // Mock performance.now to return same value
      const originalPerformanceNow = performance.now
      performance.now = () => 1000

      CaseOpeningMonitoringService.recordOperation('test_operation', 1000, true)

      // Restore performance.now
      performance.now = originalPerformanceNow
    })
  })

  describe('Currency Transaction Recording', () => {
    test('should record successful currency transactions', () => {
      const mockConsoleLog = (message: string, data: any) => {
        expect(message).toContain('✅ currency_transaction completed')
        expect(data.user_id).toBe('user-123')
        expect(data.transaction_type).toBe('debit')
        expect(data.amount).toBe(500)
      }

      console.log = mockConsoleLog

      const { CaseOpeningMonitoringService } = require('./case-opening-monitoring')
      
      // Mock performance.now
      const originalPerformanceNow = performance.now
      let callCount = 0
      performance.now = () => {
        callCount++
        return callCount === 1 ? 1000 : 1025 // 25ms difference
      }

      CaseOpeningMonitoringService.recordCurrencyTransaction(
        1000,
        'user-123',
        'debit',
        500,
        true
      )

      // Restore performance.now
      performance.now = originalPerformanceNow
    })

    test('should record failed currency transactions', () => {
      const mockConsoleError = (message: string, data: any) => {
        expect(message).toContain('❌ currency_transaction failed')
        expect(data.error).toBe('Insufficient balance')
        expect(data.user_id).toBe('user-123')
        expect(data.transaction_type).toBe('credit')
        expect(data.amount).toBe(1000)
      }

      console.error = mockConsoleError

      const { CaseOpeningMonitoringService } = require('./case-opening-monitoring')
      
      // Mock performance.now
      const originalPerformanceNow = performance.now
      let callCount = 0
      performance.now = () => {
        callCount++
        return callCount === 1 ? 1000 : 1075 // 75ms difference
      }

      CaseOpeningMonitoringService.recordCurrencyTransaction(
        1000,
        'user-123',
        'credit',
        1000,
        false,
        'Insufficient balance'
      )

      // Restore performance.now
      performance.now = originalPerformanceNow
    })
  })

  describe('Database Operation Recording', () => {
    test('should record successful database operations', () => {
      const mockConsoleLog = (message: string, data: any) => {
        expect(message).toContain('✅ db_select_case_types completed')
        expect(data.record_count).toBe(5)
      }

      console.log = mockConsoleLog

      const { CaseOpeningMonitoringService } = require('./case-opening-monitoring')
      
      // Mock performance.now
      const originalPerformanceNow = performance.now
      let callCount = 0
      performance.now = () => {
        callCount++
        return callCount === 1 ? 1000 : 1030 // 30ms difference
      }

      CaseOpeningMonitoringService.recordDatabaseOperation(
        'select_case_types',
        1000,
        true,
        5
      )

      // Restore performance.now
      performance.now = originalPerformanceNow
    })

    test('should record failed database operations', () => {
      const mockConsoleError = (message: string, data: any) => {
        expect(message).toContain('❌ db_insert_metrics failed')
        expect(data.error).toBe('Connection timeout')
        expect(data.record_count).toBeUndefined()
      }

      console.error = mockConsoleError

      const { CaseOpeningMonitoringService } = require('./case-opening-monitoring')
      
      // Mock performance.now
      const originalPerformanceNow = performance.now
      let callCount = 0
      performance.now = () => {
        callCount++
        return callCount === 1 ? 1000 : 1200 // 200ms difference
      }

      CaseOpeningMonitoringService.recordDatabaseOperation(
        'insert_metrics',
        1000,
        false,
        undefined,
        'Connection timeout'
      )

      // Restore performance.now
      performance.now = originalPerformanceNow
    })
  })
})