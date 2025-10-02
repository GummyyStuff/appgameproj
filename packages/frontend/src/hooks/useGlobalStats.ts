/**
 * Custom hook for fetching global statistics
 */

import { useQuery } from '@tanstack/react-query'
import { GlobalStatsApiService, GlobalStatistics } from '../services/globalStatsApi'

export interface UseGlobalStatsOptions {
  days?: number
  enabled?: boolean
  staleTime?: number
  refetchInterval?: number
}

export function useGlobalStats(options: UseGlobalStatsOptions = {}) {
  const {
    days = 30,
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    refetchInterval = 10 * 60 * 1000, // 10 minutes
  } = options

  return useQuery<GlobalStatistics>({
    queryKey: ['global-stats', days],
    queryFn: () => GlobalStatsApiService.getGlobalStatistics(days),
    enabled,
    staleTime,
    refetchInterval,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export default useGlobalStats
