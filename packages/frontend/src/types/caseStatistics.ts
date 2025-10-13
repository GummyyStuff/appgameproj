/**
 * TypeScript types for Case Opening Statistics
 */

export interface CaseItemStats {
  item_id: string
  item_name: string
  item_rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  item_category: 'medical' | 'electronics' | 'consumables' | 'valuables' | 'keycards'
  count: number
  total_value: number
  average_value: number
  percentage: number
  first_won: string
  last_won: string
}

export interface RarityDistribution {
  rarity: string
  count: number
  percentage: number
  total_value: number
}

export interface CategoryDistribution {
  category: string
  count: number
  percentage: number
}

export interface CaseStatistics {
  total_cases_opened: number
  total_items_won: number
  total_value_won: number
  average_case_value: number
  items_by_frequency: CaseItemStats[]
  items_by_value: CaseItemStats[]
  rarity_distribution: RarityDistribution[]
  category_distribution: CategoryDistribution[]
  most_common_item: CaseItemStats | null
  rarest_item: CaseItemStats | null
  highest_value_item: CaseItemStats | null
}

export interface CaseStatisticsResponse {
  success: boolean
  statistics: CaseStatistics
  generated_at: string
}

// Color mappings for rarities
export const RARITY_COLORS: Record<string, string> = {
  common: '#9E9E9E',
  uncommon: '#4CAF50',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FFD700'
}

// Color mappings for categories
export const CATEGORY_COLORS: Record<string, string> = {
  medical: '#E91E63',
  electronics: '#2196F3',
  consumables: '#FF9800',
  valuables: '#FFD700',
  keycards: '#9C27B0'
}

// Icon mappings for categories
export const CATEGORY_ICONS: Record<string, string> = {
  medical: '🏥',
  electronics: '💻',
  consumables: '🍖',
  valuables: '💰',
  keycards: '🗝️'
}

