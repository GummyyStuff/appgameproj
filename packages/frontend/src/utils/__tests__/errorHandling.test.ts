import { test, expect, describe } from 'bun:test'
import {
  getErrorStrategy,
  getUserFriendlyMessage,
  getTechnicalMessage,
  isRecoverableError,
  calculateRetryDelay,
  executeFallback,
  createErrorContext,
  handleErrorWithRecovery
} from '../errorHandling'

describe('Error Handling Utilities', () => {
  test('should identify network errors correctly', () => {
    const networkError = new Error('Network request failed')
    const strategy = getErrorStrategy(networkError, 'test operation')

    expect(strategy.type).toBe('network')
    expect(strategy.retry).toBe(true)
    expect(strategy.maxRetries).toBe(3)
    expect(strategy.fallback).toBe('simple')
    expect(strategy.userMessage).toBe('Connection problem. Retrying...')
  })

  test('should identify authentication errors correctly', () => {
    const authError = new Error('Please log in to continue')
    const strategy = getErrorStrategy(authError, 'test operation')

    expect(strategy.type).toBe('authentication')
    expect(strategy.retry).toBe(false)
    expect(strategy.maxRetries).toBe(0)
    expect(strategy.fallback).toBe('refresh')
    expect(strategy.userMessage).toBe('Please log in to continue playing')
  })

  test('should identify animation errors correctly', () => {
    const animationError = new Error('Animation failed')
    const strategy = getErrorStrategy(animationError, 'carousel animation')

    expect(strategy.type).toBe('animation')
    expect(strategy.retry).toBe(false)
    expect(strategy.maxRetries).toBe(1)
    expect(strategy.fallback).toBe('reveal')
    expect(strategy.userMessage).toBe('Animation failed, using simple reveal instead')
  })

  test('should identify validation errors correctly', () => {
    const validationError = new Error('Insufficient balance')
    const strategy = getErrorStrategy(validationError, 'case opening')

    expect(strategy.type).toBe('validation')
    expect(strategy.retry).toBe(false)
    expect(strategy.maxRetries).toBe(0)
    expect(strategy.fallback).toBe('none')
    expect(strategy.userMessage).toBe('Insufficient balance to open this case')
  })

  test('should identify API errors correctly', () => {
    const apiError = new Error('Server error')
    const strategy = getErrorStrategy(apiError, 'api call')

    expect(strategy.type).toBe('api')
    expect(strategy.retry).toBe(true)
    expect(strategy.maxRetries).toBe(2)
    expect(strategy.fallback).toBe('simple')
    expect(strategy.userMessage).toBe('Server error. Retrying...')
  })

  test('should handle unknown errors', () => {
    const unknownError = new Error('Some unexpected error')
    const strategy = getErrorStrategy(unknownError, 'unknown operation')

    expect(strategy.type).toBe('unknown')
    expect(strategy.retry).toBe(true)
    expect(strategy.maxRetries).toBe(1)
    expect(strategy.fallback).toBe('refresh')
    expect(strategy.userMessage).toBe('Something unexpected happened. Please try again.')
  })

  test('should get user-friendly error messages', () => {
    const networkError = new Error('Connection timeout')
    const message = getUserFriendlyMessage(networkError, 'test operation')

    expect(message).toBe('Connection problem. Retrying...')
  })

  test('should get technical error messages', () => {
    const networkError = new Error('Connection timeout')
    const message = getTechnicalMessage(networkError, 'test operation')

    expect(message).toBe('Network request failed - possible connectivity issue')
  })

  test('should identify recoverable errors', () => {
    const networkError = new Error('Network request failed')
    const authError = new Error('Please log in to continue')

    expect(isRecoverableError(networkError, 'test operation')).toBe(true)
    expect(isRecoverableError(authError, 'test operation')).toBe(true) // Has fallback
  })

  test('should identify non-recoverable errors', () => {
    const validationError = new Error('Invalid input')
    const strategy = getErrorStrategy(validationError, 'validation')

    expect(strategy.fallback).toBe('none')
    expect(isRecoverableError(validationError, 'validation')).toBe(false)
  })

  test('should calculate retry delay with exponential backoff', () => {
    const baseDelay = 1000

    expect(calculateRetryDelay(1, baseDelay)).toBeGreaterThanOrEqual(1000)
    expect(calculateRetryDelay(2, baseDelay)).toBeGreaterThanOrEqual(2000)
    expect(calculateRetryDelay(3, baseDelay)).toBeGreaterThanOrEqual(4000)
    expect(calculateRetryDelay(10, baseDelay)).toBeLessThanOrEqual(30000) // Capped at 30s
  })

  test('should create error context', () => {
    const context = createErrorContext('test operation', 'TestComponent', 1, 'user123', { phase: 'loading' })

    expect(context.operation).toBe('test operation')
    expect(context.component).toBe('TestComponent')
    expect(context.attemptCount).toBe(1)
    expect(context.userId).toBe('user123')
    expect(context.gameState).toEqual({ phase: 'loading' })
    expect(context.timestamp).toBeGreaterThan(0)
  })

  test('should execute reveal fallback', async () => {
    const context = createErrorContext('animation', 'TestComponent')
    const result = await executeFallback('reveal', context)

    expect(result).toBe(true)
  })

  test('should execute simple fallback', async () => {
    const context = createErrorContext('network', 'TestComponent')
    const result = await executeFallback('simple', context)

    expect(result).toBe(true)
  })

  test('should execute refresh fallback', async () => {
    const context = createErrorContext('auth', 'TestComponent')
    const result = await executeFallback('refresh', context)

    expect(result).toBe(true)
  })

  test('should handle no fallback', async () => {
    const context = createErrorContext('validation', 'TestComponent')
    const result = await executeFallback('none', context)

    expect(result).toBe(false)
  })

  test('should handle error with recovery - successful retry', async () => {
    const error = new Error('Network request failed')
    const context = createErrorContext('test operation', 'TestComponent', 1)
    
    let retryCount = 0
    const mockRetry = async () => {
      retryCount++
      if (retryCount === 1) {
        throw new Error('Still failing')
      }
      return 'success'
    }

    const result = await handleErrorWithRecovery(error, context, mockRetry)

    expect(result.recovered).toBe(true)
    expect(result.strategy.type).toBe('network')
    expect(result.shouldShowUserMessage).toBe(false)
    expect(retryCount).toBe(2)
  })

  test('should handle error with recovery - fallback success', async () => {
    const error = new Error('Animation failed')
    const context = createErrorContext('animation', 'TestComponent', 1)
    
    const mockFallback = async (fallback: string) => {
      expect(fallback).toBe('reveal')
      return true
    }

    const result = await handleErrorWithRecovery(error, context, undefined, mockFallback)

    expect(result.recovered).toBe(true)
    expect(result.strategy.type).toBe('animation')
    expect(result.shouldShowUserMessage).toBe(true)
  })

  test('should handle error with recovery - no recovery possible', async () => {
    const error = new Error('Invalid input')
    const context = createErrorContext('validation', 'TestComponent', 1)

    const result = await handleErrorWithRecovery(error, context)

    expect(result.recovered).toBe(false)
    expect(result.strategy.type).toBe('validation')
    expect(result.shouldShowUserMessage).toBe(true)
  })

  test('should handle context-based error detection', () => {
    const genericError = new Error('Something went wrong')
    
    // Animation context
    const animationStrategy = getErrorStrategy(genericError, 'carousel animation')
    expect(animationStrategy.type).toBe('animation')
    
    // Network context
    const networkStrategy = getErrorStrategy(genericError, 'network request')
    expect(networkStrategy.type).toBe('network')
    
    // Auth context
    const authStrategy = getErrorStrategy(genericError, 'authentication check')
    expect(authStrategy.type).toBe('authentication')
    
    // Balance context
    const balanceStrategy = getErrorStrategy(genericError, 'balance validation')
    expect(balanceStrategy.type).toBe('validation')
    
    // API context
    const apiStrategy = getErrorStrategy(genericError, 'api call')
    expect(apiStrategy.type).toBe('api')
  })

  test('should handle error message variations', () => {
    const variations = [
      'Network request failed',
      'fetch error',
      'connection timeout',
      'network error',
      'Connection problem'
    ]

    variations.forEach(message => {
      const error = new Error(message)
      const strategy = getErrorStrategy(error, 'test')
      expect(strategy.type).toBe('network')
    })
  })

  test('should handle authentication message variations', () => {
    const variations = [
      'Please log in to continue',
      'authentication required',
      'unauthorized access',
      'session expired'
    ]

    variations.forEach(message => {
      const error = new Error(message)
      const strategy = getErrorStrategy(error, 'test')
      expect(['authentication', 'unknown']).toContain(strategy.type)
    })
  })
})
