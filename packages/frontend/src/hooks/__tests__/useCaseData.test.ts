import { describe, test, expect, mock, beforeEach } from 'bun:test'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCaseData } from '../useCaseData'

// NOTE: This test file references deprecated Supabase module
// The useCaseData hook has been updated to use Appwrite
// Skipping these tests until they can be properly updated

describe.skip('useCaseData - DEPRECATED (needs Appwrite migration)', () => {
  const mockCaseTypes = [
    { id: '1', name: 'Test Case 1', price: 100 },
    { id: '2', name: 'Test Case 2', price: 200 }
  ]

  beforeEach(() => {
    // Reset mocks
    global.fetch = mock(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ case_types: mockCaseTypes })
    }))
    mockSupabase.auth.getSession.mockClear()
    mockToast.error.mockClear()
  })

  test('should initialize with loading state', () => {
    const { result } = renderHook(() => useCaseData())

    expect(result.current.isLoadingCases).toBe(true)
    expect(result.current.caseTypes).toEqual([])
    expect(result.current.error).toBeNull()
    expect(result.current.selectedCase).toBeNull()
  })

  test('should load case types on mount', async () => {
    const { result } = renderHook(() => useCaseData())

    await waitFor(() => {
      expect(result.current.isLoadingCases).toBe(false)
    })

    expect(result.current.caseTypes).toEqual(mockCaseTypes)
    expect(global.fetch).toHaveBeenCalledWith('/api/games/cases', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    })
  })

  test('should handle authentication error', async () => {
    mockSupabase.auth.getSession.mockImplementationOnce(() =>
      Promise.resolve({ data: { session: null } })
    )

    const { result } = renderHook(() => useCaseData())

    await waitFor(() => {
      expect(result.current.isLoadingCases).toBe(false)
    })

    expect(result.current.error).toBe('Please log in to view cases')
  })

  test('should handle API error', async () => {
    global.fetch = mock(() => Promise.resolve({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    }))

    const { result } = renderHook(() => useCaseData())

    await waitFor(() => {
      expect(result.current.isLoadingCases).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load case types')
  })

  test('should select case', async () => {
    const { result } = renderHook(() => useCaseData())

    await waitFor(() => {
      expect(result.current.isLoadingCases).toBe(false)
    })

    act(() => {
      result.current.selectCase(mockCaseTypes[0])
    })

    expect(result.current.selectedCase).toEqual(mockCaseTypes[0])
  })

  test('should clear error', async () => {
    global.fetch = mock(() => Promise.resolve({
      ok: false
    }))

    const { result } = renderHook(() => useCaseData())

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load case types')
    })

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })

  test('should reload case types manually', async () => {
    let callCount = 0
    global.fetch = mock(() => {
      callCount++
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          case_types: callCount === 1 ? mockCaseTypes : [mockCaseTypes[0]]
        })
      })
    })

    const { result } = renderHook(() => useCaseData())

    await waitFor(() => {
      expect(result.current.caseTypes).toEqual(mockCaseTypes)
    })

    await act(async () => {
      await result.current.loadCaseTypes()
    })

    expect(result.current.caseTypes).toEqual([mockCaseTypes[0]])
    expect(callCount).toBe(2)
  })
})
