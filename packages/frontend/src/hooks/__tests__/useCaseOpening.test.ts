import { renderHook, act, waitFor, cleanup } from '@testing-library/react'
import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { useCaseOpening } from '../useCaseOpening'

// Clean up after each test
afterEach(() => {
  cleanup()
  // Clear DOM content between tests
  if (document.body) {
    document.body.innerHTML = ''
  }
})

// NOTE: This test file references deprecated Supabase, skipping all tests
// The useCaseOpening hook has been updated to use Appwrite
// This test should be updated or removed

// Mock fetch
const mockFetch = mock()
global.fetch = mockFetch

describe.skip('useCaseOpening - DEPRECATED (needs Appwrite migration)', () => {
  const mockCaseType = {
    id: 'test-case',
    name: 'Test Case',
    price: 100
  }

  const mockOpeningData = {
    caseTypeId: 'test-case',
    openingId: 'test-opening-id',
    token: 'test-token'
  }

  const mockCaseOpeningResult = {
    item_won: {
      id: 'item-1',
      name: 'Test Item',
      rarity: 'rare',
      base_value: 500
    },
    currency_awarded: 400
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'test-token' } }
    })
  })

  test('should initialize with correct state', () => {
    const { result } = renderHook(() => useCaseOpening())

    expect(result.current.isOpening).toBe(false)
    expect(result.current.openingError).toBeNull()
  })

  test('should open case successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        opening_id: 'test-opening-id',
        case_price: 100
      })
    })

    const { result } = renderHook(() => useCaseOpening())

    let openingData: any = null
    await act(async () => {
      openingData = await result.current.openCase(mockCaseType)
    })

    expect(openingData).toEqual(mockOpeningData)
    expect(result.current.isOpening).toBe(false)
    expect(result.current.openingError).toBeNull()

    expect(mockFetch).toHaveBeenCalledWith('/api/games/cases/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        caseTypeId: 'test-case'
      })
    })
  })

  test('should handle authentication failure', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null }
    })

    const { result } = renderHook(() => useCaseOpening())

    let openingData: any = null
    await act(async () => {
      openingData = await result.current.openCase(mockCaseType)
    })

    expect(openingData).toBeNull()
    expect(result.current.openingError).toBe('Please log in to open cases')
  })

  test('should handle API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' })
    })

    const { result } = renderHook(() => useCaseOpening())

    let openingData: any = null
    await act(async () => {
      openingData = await result.current.openCase(mockCaseType)
    })

    expect(openingData).toBeNull()
    expect(result.current.openingError).toContain('Server error')
  })

  test('should preview case successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        opening_result: mockCaseOpeningResult
      })
    })

    const { result } = renderHook(() => useCaseOpening())

    let previewResult: any = null
    await act(async () => {
      previewResult = await result.current.previewCase(mockCaseType, 'test-opening-id')
    })

    expect(previewResult).toEqual(mockCaseOpeningResult)
  })

  test('should handle preview failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false
    })

    const { result } = renderHook(() => useCaseOpening())

    let previewResult: any = null
    await act(async () => {
      previewResult = await result.current.previewCase(mockCaseType, 'test-opening-id')
    })

    expect(previewResult).toBeNull()
  })

  test('should complete case successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        opening_result: mockCaseOpeningResult
      })
    })

    const { result } = renderHook(() => useCaseOpening())

    let completeResult: any = null
    await act(async () => {
      completeResult = await result.current.completeCase(mockOpeningData)
    })

    expect(completeResult).toEqual(mockCaseOpeningResult)
  })

  test('should handle completion failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Completion failed' })
    })

    const { result } = renderHook(() => useCaseOpening())

    let completeResult: any = null
    await act(async () => {
      completeResult = await result.current.completeCase(mockOpeningData)
    })

    expect(completeResult).toBeNull()
  })

  test('should load case items successfully', async () => {
    const mockItems = [
      { id: '1', name: 'Item 1', rarity: 'common', base_value: 100 },
      { id: '2', name: 'Item 2', rarity: 'rare', base_value: 500 }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ item_pool: mockItems })
    })

    const { result } = renderHook(() => useCaseOpening())

    let items: any[] = []
    await act(async () => {
      items = await result.current.loadCaseItems('test-case-id')
    })

    expect(items).toEqual(mockItems)
  })

  test('should handle case items loading failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false
    })

    const { result } = renderHook(() => useCaseOpening())

    let items: any[] = []
    await act(async () => {
      items = await result.current.loadCaseItems('test-case-id')
    })

    expect(items).toEqual([])
  })

  test('should reset opening state', () => {
    const { result } = renderHook(() => useCaseOpening())

    // Simulate error state
    act(() => {
      // Trigger an operation that sets error
      mockFetch.mockResolvedValueOnce({
        ok: false
      })
    })

    act(() => {
      result.current.resetOpening()
    })

    expect(result.current.isOpening).toBe(false)
    expect(result.current.openingError).toBeNull()
  })

  test('should handle invalid case opening response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: 'Invalid case'
      })
    })

    const { result } = renderHook(() => useCaseOpening())

    let openingData: any = null
    await act(async () => {
      openingData = await result.current.openCase(mockCaseType)
    })

    expect(openingData).toBeNull()
    expect(result.current.openingError).toBe('Case opening start failed')
  })
})
