/**
 * Case Opening Cache Service
 * Provides intelligent caching for case types, items, and opening operations
 * using TanStack Query with optimistic updates and request deduplication
 */

import { QueryClient, QueryKey, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { CaseType, CaseOpeningResult } from '../types/caseOpening'
import { CaseOpeningApiService, CaseOpeningResponse, caseOpeningApi } from './caseOpeningApi'

// Query keys for consistent caching
export const caseQueryKeys = {
  all: ['cases'] as const,
  lists: () => [...caseQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...caseQueryKeys.lists(), filters] as const,
  details: () => [...caseQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...caseQueryKeys.details(), id] as const,
  items: () => [...caseQueryKeys.all, 'items'] as const,
  itemsByCase: (caseTypeId: string) => [...caseQueryKeys.items(), caseTypeId] as const,
  openings: () => [...caseQueryKeys.all, 'openings'] as const,
  openingHistory: (userId: string) => [...caseQueryKeys.openings(), userId] as const,
}

// Cache configuration
export const CACHE_CONFIG = {
  // Case types cache for 10 minutes (they don't change often)
  caseTypes: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  // Case items cache for 5 minutes
  caseItems: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  },
  // Opening history cache for 1 minute (more dynamic)
  openingHistory: {
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  },
}

// Request deduplication map
const pendingRequests = new Map<string, Promise<any>>()

/**
 * Get deduplicated request - prevents duplicate API calls
 */
function getDeduplicatedRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!
  }

  const request = requestFn().finally(() => {
    pendingRequests.delete(key)
  })

  pendingRequests.set(key, request)
  return request
}

/**
 * Authenticated API call wrapper with deduplication
 */
async function authenticatedApiCall<T>(
  apiCall: () => Promise<T>,
  requestKey: string
): Promise<T> {
  return getDeduplicatedRequest(requestKey, async () => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token

    if (!token) {
      throw new Error('Authentication required')
    }

    return apiCall()
  })
}

/**
 * Case Cache Service - provides cached data access with TanStack Query
 */
export class CaseCacheService {
  private queryClient: QueryClient
  private apiService: CaseOpeningApiService

  constructor(queryClient: QueryClient, apiService: CaseOpeningApiService = caseOpeningApi) {
    this.queryClient = queryClient
    this.apiService = apiService
  }

  /**
   * Get cached case types with automatic refetching
   */
  async getCaseTypes(): Promise<CaseType[]> {
    return authenticatedApiCall(
      () => this.apiService.getCaseTypes(),
      'getCaseTypes'
    )
  }

  /**
   * Get cached case type by ID
   */
  async getCaseType(caseTypeId: string): Promise<CaseType | null> {
    return authenticatedApiCall(
      () => this.apiService.getCaseType(caseTypeId),
      `getCaseType:${caseTypeId}`
    )
  }

  /**
   * Get cached case items for a specific case type
   */
  async getCaseItems(caseTypeId: string): Promise<any[]> {
    return authenticatedApiCall(
      () => this.apiService.getItemPool(caseTypeId),
      `getCaseItems:${caseTypeId}`
    )
  }

  /**
   * Prefetch case types for improved UX
   */
  prefetchCaseTypes(): void {
    this.queryClient.prefetchQuery({
      queryKey: caseQueryKeys.lists(),
      queryFn: () => this.getCaseTypes(),
      ...CACHE_CONFIG.caseTypes,
    })
  }

  /**
   * Prefetch case items for a specific case type
   */
  prefetchCaseItems(caseTypeId: string): void {
    this.queryClient.prefetchQuery({
      queryKey: caseQueryKeys.itemsByCase(caseTypeId),
      queryFn: () => this.getCaseItems(caseTypeId),
      ...CACHE_CONFIG.caseItems,
    })
  }

  /**
   * Prefetch items for multiple case types (for performance optimization)
   */
  prefetchMultipleCaseItems(caseTypeIds: string[]): void {
    caseTypeIds.forEach(caseTypeId => {
      this.prefetchCaseItems(caseTypeId)
    })
  }

  /**
   * Warm up cache with essential data on app initialization
   */
  async warmCache(): Promise<void> {
    try {
      // Prefetch case types first
      await this.ensureCaseTypes()

      // Then prefetch items for the first few cases (most commonly accessed)
      const caseTypes = this.getCachedCaseTypes()
      if (caseTypes && caseTypes.length > 0) {
        // Prefetch items for the first 3 cases (most popular ones)
        const popularCaseIds = caseTypes.slice(0, 3).map(ct => ct.id)
        this.prefetchMultipleCaseItems(popularCaseIds)
      }
    } catch (error) {
      console.warn('Cache warming failed:', error)
      // Don't throw - cache warming failure shouldn't break the app
    }
  }

  /**
   * Optimistically update case opening result
   * This provides immediate UI feedback while the API call completes
   */
  async openCaseOptimistic(caseType: CaseType, currentBalance: number, userId: string, delayCredit: boolean = false): Promise<CaseOpeningResponse> {
    const caseTypesQueryKey = caseQueryKeys.lists()
    const balanceQueryKey = ['balance', userId]

    // Cancel any outgoing refetches to avoid overwriting optimistic update
    await this.queryClient.cancelQueries({ queryKey: caseTypesQueryKey })
    await this.queryClient.cancelQueries({ queryKey: balanceQueryKey })

    // Snapshot previous data for rollback
    const previousCaseTypes = this.queryClient.getQueryData(caseTypesQueryKey)
    const previousBalance = this.queryClient.getQueryData(balanceQueryKey)

    // Optimistically update balance (subtract case price)
    const optimisticBalance = currentBalance - caseType.price
    this.queryClient.setQueryData(balanceQueryKey, optimisticBalance)

    try {
      const result = await authenticatedApiCall(
        () => this.apiService.openCase(caseType, delayCredit),
        `openCase:${caseType.id}:${Date.now()}`
      )

      // Update opening history cache optimistically
      this.updateOpeningHistoryOptimistic(result.opening_result)

      // Update balance with actual result (should match optimistic update for successful cases)
      const actualBalance = delayCredit ? result.balance_after_deduction : result.new_balance
      if (actualBalance !== undefined) {
        this.queryClient.setQueryData(balanceQueryKey, actualBalance)
      }

      return result
    } catch (error) {
      // Rollback on error
      this.queryClient.setQueryData(caseTypesQueryKey, previousCaseTypes)
      this.queryClient.setQueryData(balanceQueryKey, previousBalance)
      throw error
    }
  }

  /**
   * Preview case opening with caching
   */
  async previewCaseOptimistic(caseType: CaseType): Promise<CaseOpeningResponse> {
    return authenticatedApiCall(
      () => this.apiService.previewCase(caseType),
      `previewCase:${caseType.id}:${Date.now()}`
    )
  }

  /**
   * Update opening history cache optimistically
   */
  private updateOpeningHistoryOptimistic(result: CaseOpeningResult): void {
    // This would typically be handled by a separate history service
    // For now, we'll just invalidate relevant queries to ensure fresh data
    this.queryClient.invalidateQueries({ queryKey: caseQueryKeys.openings() })
  }

  /**
   * Invalidate all case-related caches
   */
  invalidateAllCaches(): void {
    this.queryClient.invalidateQueries({ queryKey: caseQueryKeys.all })
  }

  /**
   * Invalidate specific case type cache
   */
  invalidateCaseType(caseTypeId: string): void {
    this.queryClient.invalidateQueries({ queryKey: caseQueryKeys.detail(caseTypeId) })
    this.queryClient.invalidateQueries({ queryKey: caseQueryKeys.itemsByCase(caseTypeId) })
  }

  /**
   * Set case types data manually (for optimistic updates or preloading)
   */
  setCaseTypesData(caseTypes: CaseType[]): void {
    this.queryClient.setQueryData(caseQueryKeys.lists(), caseTypes)
  }

  /**
   * Set case items data manually
   */
  setCaseItemsData(caseTypeId: string, items: any[]): void {
    this.queryClient.setQueryData(caseQueryKeys.itemsByCase(caseTypeId), items)
  }

  /**
   * Get cached data without triggering a fetch
   */
  getCachedCaseTypes(): CaseType[] | undefined {
    return this.queryClient.getQueryData(caseQueryKeys.lists())
  }

  /**
   * Get cached case items without triggering a fetch
   */
  getCachedCaseItems(caseTypeId: string): any[] | undefined {
    return this.queryClient.getQueryData(caseQueryKeys.itemsByCase(caseTypeId))
  }

  /**
   * Ensure case data is available (fetch if not cached)
   */
  async ensureCaseTypes(): Promise<CaseType[]> {
    return this.queryClient.ensureQueryData({
      queryKey: caseQueryKeys.lists(),
      queryFn: () => this.getCaseTypes(),
      ...CACHE_CONFIG.caseTypes,
    })
  }

  /**
   * Ensure case items are available
   */
  async ensureCaseItems(caseTypeId: string): Promise<any[]> {
    return this.queryClient.ensureQueryData({
      queryKey: caseQueryKeys.itemsByCase(caseTypeId),
      queryFn: () => this.getCaseItems(caseTypeId),
      ...CACHE_CONFIG.caseItems,
    })
  }
}

// React hooks for using the cache service

/**
 * Hook to get case types with caching
 */
export function useCachedCaseTypes() {
  return useQuery({
    queryKey: caseQueryKeys.lists(),
    queryFn: () => caseCacheService.getCaseTypes(),
    ...CACHE_CONFIG.caseTypes,
  })
}

/**
 * Hook to get case items with caching
 */
export function useCachedCaseItems(caseTypeId: string | undefined) {
  return useQuery({
    queryKey: caseQueryKeys.itemsByCase(caseTypeId!),
    queryFn: () => caseCacheService.getCaseItems(caseTypeId!),
    enabled: !!caseTypeId,
    ...CACHE_CONFIG.caseItems,
  })
}

/**
 * Hook for case opening with optimistic updates
 */
export function useOptimisticCaseOpening() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ caseType, currentBalance, userId, delayCredit }: {
      caseType: CaseType
      currentBalance: number
      userId: string
      delayCredit?: boolean
    }) => caseCacheService.openCaseOptimistic(caseType, currentBalance, userId, delayCredit),
    onSuccess: (data) => {
      // Update relevant caches after successful opening
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.openings() })
    },
    onError: (error) => {
      console.error('Case opening failed:', error)
      // Error handling is done in the service layer with rollback
    },
  })
}

/**
 * Hook for case preview with caching
 */
export function useCachedCasePreview() {
  return useMutation({
    mutationFn: (caseType: CaseType) => caseCacheService.previewCaseOptimistic(caseType),
  })
}

// Global cache service instance (requires QueryClient to be passed)
let queryClientInstance: QueryClient | null = null
let caseCacheService: CaseCacheService | null = null

/**
 * Initialize the global cache service with a QueryClient
 */
export function initializeCaseCache(queryClient: QueryClient): CaseCacheService {
  queryClientInstance = queryClient
  caseCacheService = new CaseCacheService(queryClient)
  return caseCacheService
}

/**
 * Get the global cache service instance
 */
export function getCaseCacheService(): CaseCacheService {
  if (!caseCacheService) {
    throw new Error('Case cache service not initialized. Call initializeCaseCache first.')
  }
  return caseCacheService
}
