import { useState, useCallback } from 'react'
import { useToastContext } from '../components/providers/ToastProvider'

export type ErrorType = 'network' | 'animation' | 'validation' | 'authentication' | 'unknown'

export interface ErrorStrategy {
  retry: boolean
  retryCount: number
  maxRetries: number
  fallback: 'reveal' | 'simple' | 'none'
  userMessage: string
  logLevel: 'error' | 'warn' | 'info'
}

export interface UseErrorHandlingReturn {
  handleError: (error: Error, context: string) => Promise<boolean> // Returns true if recovery was successful
  retryOperation: <T>(operation: () => Promise<T>, context: string) => Promise<T | null>
  getErrorMessage: (error: Error) => string
  clearError: () => void
  currentError: string | null
  isRetrying: boolean
}

const getErrorStrategy = (error: Error, context: string): ErrorStrategy => {
  const errorMessage = error.message.toLowerCase()

  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
    return {
      retry: true,
      retryCount: 0,
      maxRetries: 3,
      fallback: 'simple',
      userMessage: 'Connection problem. Retrying...',
      logLevel: 'warn'
    }
  }

  // Authentication errors
  if (errorMessage.includes('log in') || errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
    return {
      retry: false,
      retryCount: 0,
      maxRetries: 0,
      fallback: 'none',
      userMessage: 'Please log in to continue',
      logLevel: 'warn'
    }
  }

  // Animation errors
  if (context.includes('animation') || context.includes('carousel')) {
    return {
      retry: false,
      retryCount: 0,
      maxRetries: 1,
      fallback: 'reveal',
      userMessage: 'Animation failed, using simple reveal',
      logLevel: 'warn'
    }
  }

  // Validation errors
  if (errorMessage.includes('balance') || errorMessage.includes('insufficient') || errorMessage.includes('validation')) {
    return {
      retry: false,
      retryCount: 0,
      maxRetries: 0,
      fallback: 'none',
      userMessage: error.message,
      logLevel: 'info'
    }
  }

  // Default unknown errors
  return {
    retry: true,
    retryCount: 0,
    maxRetries: 2,
    fallback: 'simple',
    userMessage: 'Something went wrong. Please try again.',
    logLevel: 'error'
  }
}

export const useErrorHandling = (): UseErrorHandlingReturn => {
  const [currentError, setCurrentError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const toast = useToastContext()

  const clearError = useCallback(() => {
    setCurrentError(null)
  }, [])

  const getErrorMessage = useCallback((error: Error): string => {
    const strategy = getErrorStrategy(error, '')
    return strategy.userMessage
  }, [])

  const retryOperation = useCallback(async <T,>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T | null> => {
    setIsRetrying(true)

    try {
      const result = await operation()
      setIsRetrying(false)
      clearError()
      return result
    } catch (error) {
      setIsRetrying(false)

      if (error instanceof Error) {
        const strategy = getErrorStrategy(error, context)

        if (strategy.retry && strategy.retryCount < strategy.maxRetries) {
          console.log(`Retrying operation (${strategy.retryCount + 1}/${strategy.maxRetries}): ${context}`)

          // Exponential backoff
          const delay = Math.pow(2, strategy.retryCount) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))

          strategy.retryCount++
          return retryOperation(operation, context)
        }

        console[strategy.logLevel](`Error in ${context}:`, error)
        setCurrentError(strategy.userMessage)
        toast.error('Error', strategy.userMessage)
      }

      return null
    }
  }, [toast, clearError])

  const handleError = useCallback(async (error: Error, context: string): Promise<boolean> => {
    const strategy = getErrorStrategy(error, context)

    console[strategy.logLevel](`Error in ${context}:`, error)

    if (strategy.retry) {
      const result = await retryOperation(async () => { throw error }, context)
      return result !== null
    }

    if (strategy.fallback !== 'none') {
      setCurrentError(strategy.userMessage)
      toast.error('Using fallback mode', strategy.userMessage)
      return true // Recovery via fallback
    }

    setCurrentError(strategy.userMessage)
    toast.error('Error', strategy.userMessage)
    return false
  }, [toast, retryOperation])

  return {
    handleError,
    retryOperation,
    getErrorMessage,
    clearError,
    currentError,
    isRetrying
  }
}
