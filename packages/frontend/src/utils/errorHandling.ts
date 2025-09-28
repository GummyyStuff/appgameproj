/**
 * Centralized Error Handling System
 *
 * This module provides a comprehensive error handling system for the case opening game,
 * including error categorization, recovery strategies, user-friendly messaging, and
 * automatic retry mechanisms.
 */

export type ErrorType = 'network' | 'animation' | 'validation' | 'authentication' | 'api' | 'unknown'

export interface ErrorStrategy {
  type: ErrorType
  retry: boolean
  maxRetries: number
  retryDelay: number // milliseconds
  fallback: 'reveal' | 'simple' | 'refresh' | 'none'
  userMessage: string
  technicalMessage: string
  logLevel: 'error' | 'warn' | 'info'
  category: 'user_action' | 'system' | 'network'
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface ErrorContext {
  operation: string
  component: string
  userId?: string
  gameState?: any
  timestamp: number
  attemptCount: number
}

export interface ErrorReport {
  error: Error
  strategy: ErrorStrategy
  context: ErrorContext
  recoveryAttempted: boolean
  recoverySuccessful: boolean
}

// Error strategy definitions
const ERROR_STRATEGIES: Record<string, ErrorStrategy> = {
  // Network errors
  'Network request failed': {
    type: 'network',
    retry: true,
    maxRetries: 3,
    retryDelay: 1000,
    fallback: 'simple',
    userMessage: 'Connection problem. Retrying...',
    technicalMessage: 'Network request failed - possible connectivity issue',
    logLevel: 'warn',
    category: 'network',
    severity: 'medium'
  },

  'fetch': {
    type: 'network',
    retry: true,
    maxRetries: 2,
    retryDelay: 1500,
    fallback: 'simple',
    userMessage: 'Connection issue. Trying again...',
    technicalMessage: 'Fetch API error - network connectivity problem',
    logLevel: 'warn',
    category: 'network',
    severity: 'medium'
  },

  // Authentication errors
  'authentication': {
    type: 'authentication',
    retry: false,
    maxRetries: 0,
    retryDelay: 0,
    fallback: 'refresh',
    userMessage: 'Please log in to continue playing',
    technicalMessage: 'Authentication required - user session expired',
    logLevel: 'info',
    category: 'user_action',
    severity: 'low'
  },

  'unauthorized': {
    type: 'authentication',
    retry: false,
    maxRetries: 0,
    retryDelay: 0,
    fallback: 'refresh',
    userMessage: 'Your session has expired. Please refresh and log in again.',
    technicalMessage: 'Unauthorized access - invalid or expired token',
    logLevel: 'warn',
    category: 'user_action',
    severity: 'medium'
  },

  // Animation errors
  'animation': {
    type: 'animation',
    retry: false,
    maxRetries: 1,
    retryDelay: 1000,
    fallback: 'reveal',
    userMessage: 'Animation failed, using simple reveal instead',
    technicalMessage: 'Animation system error - falling back to reveal mode',
    logLevel: 'warn',
    category: 'system',
    severity: 'medium'
  },

  'carousel': {
    type: 'animation',
    retry: false,
    maxRetries: 1,
    retryDelay: 500,
    fallback: 'reveal',
    userMessage: 'Carousel animation failed, showing result directly',
    technicalMessage: 'Carousel animation error - switching to reveal mode',
    logLevel: 'warn',
    category: 'system',
    severity: 'medium'
  },

  // API errors
  'api': {
    type: 'api',
    retry: true,
    maxRetries: 2,
    retryDelay: 2000,
    fallback: 'simple',
    userMessage: 'Server error. Retrying...',
    technicalMessage: 'API endpoint error - server-side issue',
    logLevel: 'error',
    category: 'system',
    severity: 'high'
  },

  // Validation errors
  'balance': {
    type: 'validation',
    retry: false,
    maxRetries: 0,
    retryDelay: 0,
    fallback: 'none',
    userMessage: 'Insufficient balance to open this case',
    technicalMessage: 'Balance validation failed - user has insufficient funds',
    logLevel: 'info',
    category: 'user_action',
    severity: 'low'
  },

  'validation': {
    type: 'validation',
    retry: false,
    maxRetries: 0,
    retryDelay: 0,
    fallback: 'none',
    userMessage: 'Invalid request. Please check your input.',
    technicalMessage: 'Input validation failed - malformed request data',
    logLevel: 'warn',
    category: 'user_action',
    severity: 'low'
  },

  // Default unknown error
  'unknown': {
    type: 'unknown',
    retry: true,
    maxRetries: 1,
    retryDelay: 3000,
    fallback: 'refresh',
    userMessage: 'Something unexpected happened. Please try again.',
    technicalMessage: 'Unknown error occurred - requires investigation',
    logLevel: 'error',
    category: 'system',
    severity: 'high'
  }
}

/**
 * Determine error strategy based on error message and context
 */
export function getErrorStrategy(error: Error, context: string = ''): ErrorStrategy {
  const errorMessage = error.message.toLowerCase()
  const contextLower = context.toLowerCase()

  // Check for specific error patterns in message
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
    return ERROR_STRATEGIES['Network request failed']
  }

  if (errorMessage.includes('log in') || errorMessage.includes('authentication') || errorMessage.includes('unauthorized') || errorMessage.includes('session')) {
    return ERROR_STRATEGIES.authentication
  }

  if (errorMessage.includes('animation') || errorMessage.includes('carousel') || errorMessage.includes('canvas')) {
    return ERROR_STRATEGIES.animation
  }

  if (errorMessage.includes('balance') || errorMessage.includes('insufficient') || errorMessage.includes('funds')) {
    return ERROR_STRATEGIES.balance
  }

  if (errorMessage.includes('api') || errorMessage.includes('server') || errorMessage.includes('endpoint')) {
    return ERROR_STRATEGIES.api
  }

  if (errorMessage.includes('validation') || errorMessage.includes('invalid') || errorMessage.includes('malformed')) {
    return ERROR_STRATEGIES.validation
  }

  // Check context-based patterns
  if (contextLower.includes('animation') || contextLower.includes('carousel')) {
    return ERROR_STRATEGIES.animation
  }

  if (contextLower.includes('network') || contextLower.includes('fetch') || contextLower.includes('connection')) {
    return ERROR_STRATEGIES['Network request failed']
  }

  if (contextLower.includes('auth') || contextLower.includes('login')) {
    return ERROR_STRATEGIES.authentication
  }

  if (contextLower.includes('balance') || contextLower.includes('insufficient')) {
    return ERROR_STRATEGIES.balance
  }

  if (contextLower.includes('api') || contextLower.includes('server')) {
    return ERROR_STRATEGIES.api
  }

  // Default to unknown error
  return ERROR_STRATEGIES.unknown
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function calculateRetryDelay(attempt: number, baseDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)
  const jitter = Math.random() * 0.1 * exponentialDelay // Add 10% jitter
  return Math.min(exponentialDelay + jitter, 30000) // Cap at 30 seconds
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: Error, context: string): boolean {
  const strategy = getErrorStrategy(error, context)
  return strategy.retry || strategy.fallback !== 'none'
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: Error, context: string): string {
  const strategy = getErrorStrategy(error, context)
  return strategy.userMessage
}

/**
 * Get technical error message for logging
 */
export function getTechnicalMessage(error: Error, context: string): string {
  const strategy = getErrorStrategy(error, context)
  return strategy.technicalMessage
}

/**
 * Execute fallback strategy
 */
export async function executeFallback(
  fallback: ErrorStrategy['fallback'],
  context: ErrorContext
): Promise<boolean> {
  switch (fallback) {
    case 'reveal':
      console.log('Executing reveal fallback for:', context.operation)
      // Reveal fallback is handled by the component logic
      return true

    case 'simple':
      console.log('Executing simple fallback for:', context.operation)
      // Simple fallback - continue with basic functionality
      return true

    case 'refresh':
      console.log('Executing refresh fallback for:', context.operation)
      // Trigger page refresh after a delay
      if (typeof window !== 'undefined' && window.location) {
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
      return true

    case 'none':
    default:
      console.log('No fallback available for:', context.operation)
      return false
  }
}

/**
 * Log error with appropriate level and context
 */
export function logError(error: Error, strategy: ErrorStrategy, context: ErrorContext): void {
  const logData = {
    message: error.message,
    stack: error.stack,
    strategy: strategy.type,
    operation: context.operation,
    component: context.component,
    attemptCount: context.attemptCount,
    userId: context.userId,
    timestamp: context.timestamp
  }

  switch (strategy.logLevel) {
    case 'error':
      console.error(`[${strategy.type.toUpperCase()}] ${strategy.technicalMessage}`, logData)
      break
    case 'warn':
      console.warn(`[${strategy.type.toUpperCase()}] ${strategy.technicalMessage}`, logData)
      break
    case 'info':
      console.info(`[${strategy.type.toUpperCase()}] ${strategy.technicalMessage}`, logData)
      break
  }

  // Send to error tracking service if available
  if (typeof window !== 'undefined' && (window as any).errorTracker) {
    ;(window as any).errorTracker.captureError(error, {
      strategy: strategy.type,
      operation: context.operation,
      component: context.component,
      attemptCount: context.attemptCount
    }, strategy.severity, strategy.category === 'network' ? 'network' : 'javascript')
  }
}

/**
 * Create error context
 */
export function createErrorContext(
  operation: string,
  component: string,
  attemptCount: number = 1,
  userId?: string,
  gameState?: any
): ErrorContext {
  return {
    operation,
    component,
    userId,
    gameState,
    timestamp: Date.now(),
    attemptCount
  }
}

/**
 * Comprehensive error handler with recovery
 */
export async function handleErrorWithRecovery(
  error: Error,
  context: ErrorContext,
  onRetry?: () => Promise<any>,
  onFallback?: (fallback: ErrorStrategy['fallback']) => Promise<boolean>
): Promise<{
  recovered: boolean
  strategy: ErrorStrategy
  shouldShowUserMessage: boolean
}> {
  const strategy = getErrorStrategy(error, context.operation)

  // Log the error
  logError(error, strategy, context)

  // Try retry first if enabled
  if (strategy.retry && context.attemptCount <= strategy.maxRetries && onRetry) {
    const retryDelay = calculateRetryDelay(context.attemptCount, strategy.retryDelay)

    console.log(`Retrying ${context.operation} in ${retryDelay}ms (attempt ${context.attemptCount}/${strategy.maxRetries})`)

    await new Promise(resolve => setTimeout(resolve, retryDelay))

    try {
      await onRetry()
      return {
        recovered: true,
        strategy,
        shouldShowUserMessage: false
      }
    } catch (retryError) {
      console.warn(`Retry ${context.attemptCount} failed for ${context.operation}:`, retryError)
      
      // Try recursive retry with incremented attempt count
      if (context.attemptCount < strategy.maxRetries) {
        const nextContext = { ...context, attemptCount: context.attemptCount + 1 }
        return handleErrorWithRecovery(error, nextContext, onRetry, onFallback)
      }
      // Continue to fallback if max retries reached
    }
  }

  // Try fallback if available
  if (strategy.fallback !== 'none' && onFallback) {
    const fallbackSuccess = await onFallback(strategy.fallback)
    if (fallbackSuccess) {
      return {
        recovered: true,
        strategy,
        shouldShowUserMessage: true
      }
    }
  }

  // No recovery possible
  return {
    recovered: false,
    strategy,
    shouldShowUserMessage: true
  }
}
