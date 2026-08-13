import { describe, test, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

vi.mock('../../components/providers/ToastProvider', () => ({
  useToastContext: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    addToast: vi.fn(),
    removeToast: vi.fn(),
    clearAllToasts: vi.fn(),
  }),
}))

import { useErrorHandling } from '../useErrorHandling'

describe('useErrorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should initialize with no error and not retrying', () => {
    const { result } = renderHook(() => useErrorHandling())
    expect(result.current.currentError).toBeNull()
    expect(result.current.isRetrying).toBe(false)
  })

  test('should handle authentication errors without retry', async () => {
    const { result } = renderHook(() => useErrorHandling())
    const authError = new Error('Authentication failed')

    let recovered = false
    await act(async () => {
      recovered = await result.current.handleError(authError, 'case opening')
    })

    expect(recovered).toBe(false)
    expect(result.current.currentError).toBe('Please log in to continue')
  })

  test('should handle validation errors with original message', async () => {
    const { result } = renderHook(() => useErrorHandling())
    const validationError = new Error('Insufficient balance')

    let recovered = false
    await act(async () => {
      recovered = await result.current.handleError(validationError, 'case opening')
    })

    expect(recovered).toBe(false)
    expect(result.current.currentError).toBe('Insufficient balance')
  })

  test('should clear error', async () => {
    const { result } = renderHook(() => useErrorHandling())

    await act(async () => {
      await result.current.handleError(new Error('Authentication failed'), 'test')
    })
    expect(result.current.currentError).not.toBeNull()

    act(() => {
      result.current.clearError()
    })
    expect(result.current.currentError).toBeNull()
  })

  test('should return user-friendly message for network errors', () => {
    const { result } = renderHook(() => useErrorHandling())
    const networkError = new Error('Network request failed')

    const message = result.current.getErrorMessage(networkError)
    expect(message).toBe('Connection problem. Retrying...')
  })

  test('should recover via fallback for animation context errors', async () => {
    const { result } = renderHook(() => useErrorHandling())
    const animationError = new Error('Animation failed')

    let recovered = false
    await act(async () => {
      recovered = await result.current.handleError(animationError, 'animation context')
    })

    expect(recovered).toBe(true)
  })

  test('should handle balance validation errors', async () => {
    const { result } = renderHook(() => useErrorHandling())
    const balanceError = new Error('Insufficient balance')

    let recovered = false
    await act(async () => {
      recovered = await result.current.handleError(balanceError, 'balance validation')
    })

    expect(recovered).toBe(false)
    expect(result.current.currentError).toBe('Insufficient balance')
  })

  test('should retry operation successfully', async () => {
    const { result } = renderHook(() => useErrorHandling())
    const operation = vi.fn().mockResolvedValue('success')

    let returnValue: string | null = null
    await act(async () => {
      returnValue = await result.current.retryOperation(operation, 'test')
    })

    expect(returnValue).toBe('success')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  test('should return all expected interface members', () => {
    const { result } = renderHook(() => useErrorHandling())
    expect(result.current).toHaveProperty('handleError')
    expect(result.current).toHaveProperty('retryOperation')
    expect(result.current).toHaveProperty('getErrorMessage')
    expect(result.current).toHaveProperty('clearError')
    expect(result.current).toHaveProperty('currentError')
    expect(result.current).toHaveProperty('isRetrying')
  })

  test('should return user-friendly message for unknown errors', () => {
    const { result } = renderHook(() => useErrorHandling())
    const unknownError = new Error('Something bizarre happened')

    const message = result.current.getErrorMessage(unknownError)
    expect(message).toBe('Something went wrong. Please try again.')
  })

  test('should return user-friendly message for authentication errors', () => {
    const { result } = renderHook(() => useErrorHandling())
    const authError = new Error('unauthorized access')

    const message = result.current.getErrorMessage(authError)
    expect(message).toBe('Please log in to continue')
  })
})
