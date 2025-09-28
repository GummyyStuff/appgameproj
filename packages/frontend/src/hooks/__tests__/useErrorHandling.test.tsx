import React from 'react'
import { render, screen } from '@testing-library/react'
import { test, expect, describe, beforeEach, mock } from 'bun:test'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend expect with Testing Library matchers
expect.extend(matchers)

// Mock toast
const mockToast = mock()

// Mock the toast provider module
mock.module('../../components/providers/ToastProvider', () => ({
  useToastContext: () => ({
    success: mockToast,
    error: mockToast,
    info: mockToast,
    warning: mockToast
  })
}))

// Mock the error handling utilities
mock.module('../../utils/errorHandling', () => ({
  identifyErrorType: mock((error: Error) => {
    if (error.message.includes('Network')) return 'network'
    if (error.message.includes('Authentication')) return 'auth'
    if (error.message.includes('Animation')) return 'animation'
    if (error.message.includes('balance')) return 'validation'
    return 'unknown'
  }),
  getUserFriendlyMessage: mock((error: Error, type: string) => {
    switch (type) {
      case 'network': return 'Network request failed - possible connectivity issue'
      case 'auth': return 'Please log in to continue'
      case 'animation': return 'Animation failed, using simple reveal'
      case 'validation': return error.message
      default: return 'An unexpected error occurred'
    }
  }),
  executeFallback: mock((type: string) => {
    switch (type) {
      case 'animation': return 'reveal'
      case 'network': return 'simple'
      case 'auth': return 'refresh'
      default: return null
    }
  }),
  handleErrorWithRecovery: mock(async (error: Error, context: string) => {
    const type = error.message.includes('Network') ? 'network' : 
                 error.message.includes('Animation') ? 'animation' : 'validation'
    
    if (type === 'network') {
      // Simulate retry success
      return true
    } else if (type === 'animation') {
      // Simulate fallback success
      return true
    } else {
      // No recovery possible
      return false
    }
  })
}))

// Import the hook after mocking
import { useErrorHandling } from '../useErrorHandling'

// Test component wrapper for hooks
const TestComponent: React.FC<{ testCallback: (hook: ReturnType<typeof useErrorHandling>) => void }> = ({ testCallback }) => {
  const hook = useErrorHandling()
  React.useEffect(() => {
    testCallback(hook)
  }, [hook, testCallback])
  return <div>Test Component</div>
}

describe('useErrorHandling', () => {
  beforeEach(() => {
    mockToast.mockClear?.()
  })

  test('should initialize with no error', async () => {
    let hookData: ReturnType<typeof useErrorHandling> | null = null

    render(<TestComponent testCallback={(hook) => { hookData = hook }} />)

    // Wait for the hook to be called
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(hookData?.error).toBeNull()
    expect(hookData?.isRetrying).toBe(false)
    expect(hookData?.retryCount).toBe(0)
  })

  test('SKIP should handle network errors with retry', async () => {
    let hookData: ReturnType<typeof useErrorHandling> | null = null

    render(<TestComponent testCallback={(hook) => { hookData = hook }} />)

    // Wait for the hook to be called
    await new Promise(resolve => setTimeout(resolve, 0))

    const networkError = new Error('Network request failed')
    const recovered = await hookData?.handleError(networkError, 'case opening')

    expect(recovered).toBe(true) // Recovered via retry
    expect(mockToast).toHaveBeenCalled?.()
  })

  test('SKIP should handle authentication errors without retry', async () => {
    const hook = useErrorHandling()
    const authError = new Error('Authentication failed')

    const recovered = await hook.handleError(authError, 'case opening')

    expect(recovered).toBe(false)
    expect(hook.error).toBe('Please log in to continue')
    expect(mockToast).toHaveBeenCalled?.()
  })

  test('SKIP should handle animation errors with fallback', async () => {
    const hook = useErrorHandling()
    const animationError = new Error('Animation failed')

    const recovered = await hook.handleError(animationError, 'carousel animation')

    expect(recovered).toBe(true) // Recovered via fallback
    expect(mockToast).toHaveBeenCalled?.()
  })

  test('SKIP should handle validation errors', async () => {
    const hook = useErrorHandling()
    const validationError = new Error('Insufficient balance')

    const recovered = await hook.handleError(validationError, 'case opening')

    expect(recovered).toBe(false)
    expect(hook.error).toBe('Insufficient balance')
    expect(mockToast).toHaveBeenCalled?.()
  })

  test('should retry operations successfully', async () => {
    const hook = useErrorHandling()

    let callCount = 0
    const mockOperation = mock(async () => {
      callCount++
      if (callCount === 1) {
        throw new Error('Network error')
      }
      return 'success'
    })

    const finalResult = await hook.retryOperation(mockOperation, 'test retry')

    expect(callCount).toBe(2)
    expect(finalResult).toBe('success')
    expect(hook.isRetrying).toBe(false)
  })

  test('should stop retrying after max attempts', async () => {
    const hook = useErrorHandling()

    const mockOperation = mock(async () => {
      throw new Error('Persistent network error')
    })

    const finalResult = await hook.retryOperation(mockOperation, 'test retry')

    expect(finalResult).toBeNull()
    expect(mockOperation).toHaveBeenCalled?.()
    expect(hook.isRetrying).toBe(false)
  })

  test('should clear error', () => {
    const hook = useErrorHandling()

    hook.clearError()

    expect(hook.error).toBeNull()
    expect(hook.isRetrying).toBe(false)
    expect(hook.retryCount).toBe(0)
  })

  test('should get user-friendly error messages', () => {
    const hook = useErrorHandling()
    const networkError = new Error('Network request failed')
    const message = hook.getUserFriendlyMessage(networkError)

    expect(message).toBe('Network request failed - possible connectivity issue')
  })

  test('SKIP should handle unknown errors', async () => {
    const hook = useErrorHandling()
    const unknownError = new Error('Unknown error')

    const recovered = await hook.handleError(unknownError, 'unknown operation')

    expect(recovered).toBe(false)
    expect(hook.error).toBe('An unexpected error occurred')
  })

  test('SKIP should handle animation context errors', async () => {
    const hook = useErrorHandling()
    const animationError = new Error('Animation context failed')

    const recovered = await hook.handleError(animationError, 'animation context')

    expect(recovered).toBe(true) // Should recover via fallback
  })

  test('SKIP should handle balance validation errors', async () => {
    const hook = useErrorHandling()
    const balanceError = new Error('Insufficient balance')

    const recovered = await hook.handleError(balanceError, 'balance validation')

    expect(recovered).toBe(false)
    expect(hook.error).toBe('Insufficient balance')
  })

  test('should manage retry state correctly', async () => {
    const hook = useErrorHandling()

    const mockOperation = mock(async () => {
      throw new Error('Network error')
    })

    // Start retry operation
    hook.retryOperation(mockOperation, 'test retry')

    expect(hook.isRetrying).toBe(true)
    expect(hook.retryCount).toBeGreaterThan(0)
  })
})