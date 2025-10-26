import { renderHook, act } from '@testing-library/react'
import { test, expect, describe, beforeEach, mock } from 'bun:test'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend expect with Testing Library matchers
expect.extend(matchers)

// Create mock functions
const mockError = mock(() => {})
const mockSuccess = mock(() => {})
const mockInfo = mock(() => {})
const mockWarning = mock(() => {})

// Mock the toast provider module
mock.module('../../components/providers/ToastProvider', () => ({
  useToastContext: () => ({
    success: mockSuccess,
    error: mockError,
    info: mockInfo,
    warning: mockWarning
  })
}))

// Import the hook after mocking
import { useErrorHandling } from '../useErrorHandling'

describe('useErrorHandling', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    mockError.mockClear()
    mockSuccess.mockClear()
    mockInfo.mockClear()
    mockWarning.mockClear()
  })

  test('should initialize with no error', () => {
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

  test('should handle validation errors', async () => {
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
    
    // First set an error
    await act(async () => {
      const error = new Error('Test error')
      await result.current.handleError(error, 'test context')
    })

    expect(result.current.currentError).not.toBeNull()

    // Now clear it
    act(() => {
      result.current.clearError()
    })

    expect(result.current.currentError).toBeNull()
  })

  test('should get user-friendly error messages', () => {
    const { result } = renderHook(() => useErrorHandling())
    const networkError = new Error('Network request failed')
    
    const message = result.current.getErrorMessage(networkError)
    expect(message).toBe('Connection problem. Retrying...')
  })

  test('should handle animation errors', async () => {
    const { result } = renderHook(() => useErrorHandling())
    const animationError = new Error('Animation failed')

    let recovered = false
    await act(async () => {
      recovered = await result.current.handleError(animationError, 'animation context')
    })

    expect(recovered).toBe(true) // Should recover via fallback
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
})
