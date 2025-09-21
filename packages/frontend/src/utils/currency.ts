/**
 * Currency formatting utilities for Tarkov Casino
 * Provides consistent currency display with Tarkov theming
 */

export type CurrencyType = 'roubles' | 'dollars' | 'euros'

export interface CurrencyConfig {
  symbol: string
  name: string
  shortName: string
  color: string
}

export const CURRENCY_CONFIGS: Record<CurrencyType, CurrencyConfig> = {
  roubles: {
    symbol: '₽',
    name: 'Roubles',
    shortName: 'RUB',
    color: 'text-tarkov-accent'
  },
  dollars: {
    symbol: '$',
    name: 'Dollars',
    shortName: 'USD',
    color: 'text-green-400'
  },
  euros: {
    symbol: '€',
    name: 'Euros',
    shortName: 'EUR',
    color: 'text-blue-400'
  }
}

/**
 * Format currency amount with Tarkov theming
 */
export const formatCurrency = (
  amount: number,
  currency: CurrencyType = 'roubles',
  options: {
    showSymbol?: boolean
    showName?: boolean
    compact?: boolean
    showSign?: boolean
    decimals?: number
  } = {}
): string => {
  const {
    showSymbol = true,
    showName = false,
    compact = false,
    showSign = false,
    decimals = 0
  } = options

  const config = CURRENCY_CONFIGS[currency]
  
  // Format the number
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: compact ? 'compact' : 'standard',
    compactDisplay: 'short'
  }).format(Math.abs(amount))

  // Build the display string
  let result = ''
  
  if (showSign && amount !== 0) {
    result += amount > 0 ? '+' : '-'
  }
  
  if (showSymbol) {
    result += config.symbol
  }
  
  result += formatted
  
  if (showName) {
    result += ` ${config.name}`
  }
  
  return result
}

/**
 * Format currency with color classes for React components
 */
export const formatCurrencyWithColor = (
  amount: number,
  currency: CurrencyType = 'roubles',
  options: {
    showSymbol?: boolean
    showName?: boolean
    compact?: boolean
    showSign?: boolean
    decimals?: number
    colorByValue?: boolean // Color positive/negative amounts differently
  } = {}
): { text: string; colorClass: string } => {
  const { colorByValue = false, ...formatOptions } = options
  const config = CURRENCY_CONFIGS[currency]
  
  let colorClass = config.color
  
  if (colorByValue && amount !== 0) {
    colorClass = amount > 0 ? 'text-tarkov-success' : 'text-tarkov-danger'
  }
  
  return {
    text: formatCurrency(amount, currency, formatOptions),
    colorClass
  }
}

/**
 * Parse currency string back to number (for form inputs)
 */
export const parseCurrency = (value: string): number => {
  // Remove all non-numeric characters except decimal point and minus sign
  const cleaned = value.replace(/[^\d.-]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Validate currency amount
 */
export const validateCurrencyAmount = (
  amount: number,
  options: {
    min?: number
    max?: number
    allowNegative?: boolean
  } = {}
): { isValid: boolean; error?: string } => {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, allowNegative = false } = options
  
  if (isNaN(amount)) {
    return { isValid: false, error: 'Invalid amount' }
  }
  
  if (!allowNegative && amount < 0) {
    return { isValid: false, error: 'Amount cannot be negative' }
  }
  
  if (amount < min) {
    return { isValid: false, error: `Amount must be at least ${formatCurrency(min)}` }
  }
  
  if (amount > max) {
    return { isValid: false, error: `Amount cannot exceed ${formatCurrency(max)}` }
  }
  
  return { isValid: true }
}

/**
 * Get currency symbol for a given type
 */
export const getCurrencySymbol = (currency: CurrencyType = 'roubles'): string => {
  return CURRENCY_CONFIGS[currency].symbol
}

/**
 * Get currency color class for a given type
 */
export const getCurrencyColor = (currency: CurrencyType = 'roubles'): string => {
  return CURRENCY_CONFIGS[currency].color
}

/**
 * Format balance change with appropriate styling
 */
export const formatBalanceChange = (
  previousBalance: number,
  newBalance: number,
  currency: CurrencyType = 'roubles'
): { text: string; colorClass: string; isIncrease: boolean } => {
  const change = newBalance - previousBalance
  const isIncrease = change > 0
  
  return {
    text: formatCurrency(Math.abs(change), currency, { showSign: true }),
    colorClass: isIncrease ? 'text-tarkov-success' : 'text-tarkov-danger',
    isIncrease
  }
}

/**
 * Format large numbers in a compact, readable way
 */
export const formatCompactCurrency = (
  amount: number,
  currency: CurrencyType = 'roubles'
): string => {
  return formatCurrency(amount, currency, { compact: true })
}

/**
 * Calculate and format win rate percentage
 */
export const formatWinRate = (totalWon: number, totalWagered: number): string => {
  if (totalWagered === 0) return '0.0%'
  const rate = (totalWon / totalWagered) * 100
  return `${rate.toFixed(1)}%`
}

/**
 * Calculate and format return on investment (ROI)
 */
export const formatROI = (totalWon: number, totalWagered: number): {
  text: string
  colorClass: string
  percentage: number
} => {
  if (totalWagered === 0) {
    return { text: '0.0%', colorClass: 'text-gray-400', percentage: 0 }
  }
  
  const roi = ((totalWon - totalWagered) / totalWagered) * 100
  const colorClass = roi > 0 ? 'text-tarkov-success' : roi < 0 ? 'text-tarkov-danger' : 'text-gray-400'
  
  return {
    text: `${roi > 0 ? '+' : ''}${roi.toFixed(1)}%`,
    colorClass,
    percentage: roi
  }
}