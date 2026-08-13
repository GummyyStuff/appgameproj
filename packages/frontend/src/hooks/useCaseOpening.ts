import { useState, useCallback } from 'react'
import { CaseType, CaseOpeningResult } from '../types/caseOpening'
import { caseOpeningApi, CaseOpeningResponse } from '../services/caseOpeningApi'
import { useCachedCaseItems, useOptimisticCaseOpening, getCaseCacheService } from '../services/caseCache'

export interface CaseOpeningData {
  caseTypeId: string
  openingId: string
  token: string
  predeterminedWinner?: any
}

export interface UseCaseOpeningReturn {
  isOpening: boolean
  openingError: string | null
  openCase: (caseType: CaseType) => Promise<CaseOpeningResponse | null>
  completeCase: (data: CaseOpeningData) => Promise<CaseOpeningResult | null>
  previewCase: (caseType: CaseType) => Promise<CaseOpeningResult | null>
  loadCaseItems: (caseTypeId: string) => Promise<any[]>
  resetOpening: () => void
}

export const useCaseOpening = (): UseCaseOpeningReturn => {
  const [isOpening, setIsOpening] = useState(false)
  const [openingError, setOpeningError] = useState<string | null>(null)

  const resetOpening = useCallback(() => {
    setIsOpening(false)
    setOpeningError(null)
  }, [])

  const openCase = useCallback(async (caseType: CaseType): Promise<CaseOpeningResponse | null> => {
    try {
      setIsOpening(true)
      setOpeningError(null)

      // Use simplified API - single atomic transaction
      const result = await caseOpeningApi.openCase(caseType)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open case'
      setOpeningError(errorMessage)
      return null
    } finally {
      setIsOpening(false)
    }
  }, [])

  const previewCase = useCallback(async (caseType: CaseType): Promise<CaseOpeningResult | null> => {
    try {
      // Use simplified API preview mode
      const result = await caseOpeningApi.previewCase(caseType)
      return result.opening_result
    } catch (err) {
      console.error('Preview case error:', err)
      return null
    }
  }, [])

  const completeCase = useCallback(async (data: CaseOpeningData): Promise<CaseOpeningResult | null> => {
    // With the simplified API, completion is already handled in openCase
    // This method just returns the predetermined winner from the opening response
    if (data.predeterminedWinner) {
      return data.predeterminedWinner
    }

    // No predetermined winner available - this should not happen in normal flow
    console.error('completeCase called without predeterminedWinner')
    return null
  }, [])

  const loadCaseItems = useCallback(async (caseTypeId: string): Promise<any[]> => {
    try {
      const cacheService = getCaseCacheService()
      return await cacheService.ensureCaseItems(caseTypeId)
    } catch (error) {
      console.warn('Cache service not available, falling back to direct API call:', error)
      return await caseOpeningApi.getItemPool(caseTypeId)
    }
  }, [])

  return {
    isOpening,
    openingError,
    openCase,
    completeCase,
    previewCase,
    loadCaseItems,
    resetOpening
  }
}
