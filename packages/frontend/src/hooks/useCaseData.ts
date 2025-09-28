import { useState, useCallback } from 'react'
import { useToastContext } from '../components/providers/ToastProvider'
import { CaseType } from '../types/caseOpening'
import { useCachedCaseTypes, getCaseCacheService } from '../services/caseCache'

export interface UseCaseDataReturn {
  caseTypes: CaseType[]
  isLoadingCases: boolean
  error: string | null
  loadCaseTypes: () => Promise<void>
  selectCase: (caseType: CaseType) => void
  selectedCase: CaseType | null
  clearError: () => void
  refetch: () => Promise<void>
}

export const useCaseData = (): UseCaseDataReturn => {
  const [selectedCase, setSelectedCase] = useState<CaseType | null>(null)
  const [manualError, setManualError] = useState<string | null>(null)

  const toast = useToastContext()

  // Use TanStack Query for cached case types
  const {
    data: caseTypes = [],
    isLoading: isLoadingCases,
    error: queryError,
    refetch
  } = useCachedCaseTypes()

  const clearError = useCallback(() => {
    setManualError(null)
  }, [])

  const loadCaseTypes = useCallback(async () => {
    try {
      setManualError(null)
      await refetch()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load cases'
      setManualError(errorMessage)
      toast.error('Loading failed', errorMessage)
    }
  }, [refetch, toast])

  const selectCase = useCallback((caseType: CaseType) => {
    setSelectedCase(caseType)
    clearError()
  }, [clearError])

  // Combine query error with manual error
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load cases') : manualError

  return {
    caseTypes,
    isLoadingCases,
    error,
    loadCaseTypes,
    selectCase,
    selectedCase,
    clearError,
    refetch: loadCaseTypes
  }
}
