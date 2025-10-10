/**
 * Simplified Case Opening API Service
 * Uses the single /api/games/cases/open endpoint with atomic transactions
 * Updated for Appwrite migration
 */

import { CaseType, CaseOpeningResult } from '../types/caseOpening'

export interface CaseOpeningRequest {
  caseTypeId: string
  previewOnly?: boolean
  delayCredit?: boolean
  requestId?: string
}

export interface CaseOpeningResponse {
  success: boolean
  preview?: boolean
  opening_result: CaseOpeningResult
  case_price?: number
  currency_awarded?: number
  net_result?: number
  estimated_net_result?: number
  new_balance?: number
  transaction_id?: string
}

export interface CaseOpeningApiService {
  openCase(caseType: CaseType, delayCredit?: boolean): Promise<CaseOpeningResponse>
  previewCase(caseType: CaseType): Promise<CaseOpeningResponse>
  getCaseTypes(): Promise<CaseType[]>
  getCaseType(caseTypeId: string): Promise<CaseType | null>
  getItemPool(caseTypeId: string): Promise<any[]>
}

/**
 * Generate a unique request ID for deduplication
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Simplified case opening API service
 */
export class CaseOpeningApiServiceImpl implements CaseOpeningApiService {
  private requestCache = new Map<string, Promise<any>>()

  /**
   * Open a case using the simplified API
   */
  async openCase(caseType: CaseType, delayCredit: boolean = false): Promise<CaseOpeningResponse> {
    const requestId = generateRequestId()

    try {
      const response = await fetch('/api/games/cases/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          caseTypeId: caseType.id,
          delayCredit,
          requestId
        })
      })

      if (!response.ok) {
        let errorMessage = 'Failed to open case'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Case opening failed')
      }

      return result
    } catch (error) {
      console.error('Case opening error:', error)
      throw error
    }
  }


  /**
   * Preview a case opening for animation setup
   */
  async previewCase(caseType: CaseType): Promise<CaseOpeningResponse> {
    const requestId = generateRequestId()

    try {
      const response = await fetch('/api/games/cases/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          caseTypeId: caseType.id,
          previewOnly: true,
          requestId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to preview case opening')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Case opening preview failed')
      }

      return result
    } catch (error) {
      console.error('Case preview error:', error)
      throw error
    }
  }

  /**
   * Get all available case types
   */
  async getCaseTypes(): Promise<CaseType[]> {
    try {
      const response = await fetch('/api/games/cases', {
        credentials: 'include' // Include cookies for authentication
      })

      if (response.ok) {
        const data = await response.json()
        return data.case_types || []
      } else {
        console.warn('Failed to load case types from API')
        return []
      }
    } catch (error) {
      console.error('Failed to load case types:', error)
      return []
    }
  }

  /**
   * Get a specific case type
   */
  async getCaseType(caseTypeId: string): Promise<CaseType | null> {
    try {
      const response = await fetch(`/api/games/cases/${caseTypeId}`, {
        credentials: 'include' // Include cookies for authentication
      })

      if (response.ok) {
        const data = await response.json()
        return data.case_type || null
      } else {
        console.warn('Failed to load case type from API')
        return null
      }
    } catch (error) {
      console.error('Failed to load case type:', error)
      return null
    }
  }

  /**
   * Get item pool for a case type
   */
  async getItemPool(caseTypeId: string): Promise<any[]> {
    try {
      const caseType = await this.getCaseType(caseTypeId)
      if (!caseType) {
        return []
      }

      const response = await fetch(`/api/games/cases/${caseTypeId}`, {
        credentials: 'include' // Include cookies for authentication
      })

      if (response.ok) {
        const data = await response.json()
        console.log('API Response:', data) // Debug log
        let weightedItems = data.item_pool || []

        // Extract items from WeightedItem structure
        let items = weightedItems.map((weightedItem: any) => weightedItem.item).filter((item: any) =>
          item && item.id && item.name && item.rarity && typeof item.base_value === 'number'
        )

        console.log(`Loaded ${items.length} valid items for case ${caseTypeId}`)
        console.log('Sample items:', items.slice(0, 3)) // Debug log
        return items
      } else {
        console.warn('Failed to load case items from API')
        return []
      }
    } catch (error) {
      console.error('Failed to load case items:', error)
      return []
    }
  }
}

// Export singleton instance
export const caseOpeningApi = new CaseOpeningApiServiceImpl()
