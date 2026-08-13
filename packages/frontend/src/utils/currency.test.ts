import { describe, test, expect } from 'vitest'
import {
  formatCurrency,
  formatCurrencyWithColor,
  parseCurrency,
  validateCurrencyAmount,
  getCurrencySymbol,
  getCurrencyColor,
  formatBalanceChange,
  formatCompactCurrency,
  formatWinRate,
  formatROI,
  CURRENCY_CONFIGS,
} from './currency'

describe('Currency Utils', () => {
  describe('formatCurrency', () => {
    test('should format roubles with default options', () => {
      const result = formatCurrency(1000)
      expect(result).toContain('₽')
      expect(result).toContain('1,000')
    })

    test('should format dollars', () => {
      const result = formatCurrency(1000, 'dollars')
      expect(result).toContain('$')
      expect(result).toContain('1,000')
    })

    test('should format euros', () => {
      const result = formatCurrency(1000, 'euros')
      expect(result).toContain('€')
      expect(result).toContain('1,000')
    })

    test('should handle zero amounts', () => {
      const result = formatCurrency(0)
      expect(result).toContain('0')
    })

    test('should handle large amounts', () => {
      const result = formatCurrency(1000000)
      expect(result).toContain('1,000,000')
    })

    test('should support compact notation', () => {
      const result = formatCurrency(1500, 'roubles', { compact: true })
      expect(result).toContain('₽')
    })

    test('should show sign for non-zero amounts', () => {
      const positive = formatCurrency(100, 'roubles', { showSign: true })
      expect(positive).toContain('+')

      const negative = formatCurrency(-100, 'roubles', { showSign: true })
      expect(negative).toContain('-')
    })

    test('should show currency name when requested', () => {
      const result = formatCurrency(100, 'roubles', { showName: true })
      expect(result).toContain('Roubles')
    })

    test('should hide symbol when showSymbol is false', () => {
      const result = formatCurrency(100, 'roubles', { showSymbol: false })
      expect(result).not.toContain('₽')
    })
  })

  describe('formatCurrencyWithColor', () => {
    test('should return text and colorClass', () => {
      const result = formatCurrencyWithColor(100)
      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('colorClass')
      expect(result.colorClass).toBe('text-tarkov-accent')
    })

    test('should use value-based coloring when enabled', () => {
      const positive = formatCurrencyWithColor(100, 'roubles', { colorByValue: true })
      expect(positive.colorClass).toBe('text-tarkov-success')

      const negative = formatCurrencyWithColor(-100, 'roubles', { colorByValue: true })
      expect(negative.colorClass).toBe('text-tarkov-danger')
    })
  })

  describe('parseCurrency', () => {
    test('should extract numeric value from currency string', () => {
      expect(parseCurrency('₽1,000')).toBe(1000)
      expect(parseCurrency('$500')).toBe(500)
    })

    test('should handle decimal values', () => {
      expect(parseCurrency('100.50')).toBe(100.5)
    })

    test('should return 0 for non-numeric strings', () => {
      expect(parseCurrency('abc')).toBe(0)
    })

    test('should handle negative values', () => {
      expect(parseCurrency('-50')).toBe(-50)
    })
  })

  describe('validateCurrencyAmount', () => {
    test('should validate amounts within range', () => {
      expect(validateCurrencyAmount(100, { min: 0, max: 1000 }).isValid).toBe(true)
    })

    test('should reject NaN', () => {
      const result = validateCurrencyAmount(NaN)
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid amount')
    })

    test('should reject negative amounts by default', () => {
      const result = validateCurrencyAmount(-10)
      expect(result.isValid).toBe(false)
    })

    test('should reject amounts below minimum', () => {
      const result = validateCurrencyAmount(5, { min: 10 })
      expect(result.isValid).toBe(false)
    })

    test('should reject amounts above maximum', () => {
      const result = validateCurrencyAmount(100, { max: 50 })
      expect(result.isValid).toBe(false)
    })
  })

  describe('getCurrencySymbol', () => {
    test('should return correct symbols', () => {
      expect(getCurrencySymbol('roubles')).toBe('₽')
      expect(getCurrencySymbol('dollars')).toBe('$')
      expect(getCurrencySymbol('euros')).toBe('€')
    })
  })

  describe('getCurrencyColor', () => {
    test('should return correct color classes', () => {
      expect(getCurrencyColor('roubles')).toBe('text-tarkov-accent')
      expect(getCurrencyColor('dollars')).toBe('text-green-400')
      expect(getCurrencyColor('euros')).toBe('text-blue-400')
    })
  })

  describe('formatBalanceChange', () => {
    test('should detect increase', () => {
      const result = formatBalanceChange(1000, 1500)
      expect(result.isIncrease).toBe(true)
      expect(result.colorClass).toBe('text-tarkov-success')
    })

    test('should detect decrease', () => {
      const result = formatBalanceChange(1500, 1000)
      expect(result.isIncrease).toBe(false)
      expect(result.colorClass).toBe('text-tarkov-danger')
    })
  })

  describe('formatWinRate', () => {
    test('should calculate win rate percentage', () => {
      expect(formatWinRate(50, 100)).toBe('50.0%')
    })

    test('should return 0.0% for zero wagers', () => {
      expect(formatWinRate(0, 0)).toBe('0.0%')
    })
  })

  describe('formatROI', () => {
    test('should calculate positive ROI', () => {
      const result = formatROI(150, 100)
      expect(result.percentage).toBe(50)
      expect(result.colorClass).toBe('text-tarkov-success')
    })

    test('should calculate negative ROI', () => {
      const result = formatROI(50, 100)
      expect(result.percentage).toBe(-50)
      expect(result.colorClass).toBe('text-tarkov-danger')
    })

    test('should return 0% for zero wagers', () => {
      const result = formatROI(0, 0)
      expect(result.percentage).toBe(0)
      expect(result.text).toBe('0.0%')
    })
  })

  describe('CURRENCY_CONFIGS', () => {
    test('should have all currency types configured', () => {
      expect(CURRENCY_CONFIGS.roubles).toBeDefined()
      expect(CURRENCY_CONFIGS.dollars).toBeDefined()
      expect(CURRENCY_CONFIGS.euros).toBeDefined()
    })

    test('should have required fields for each currency', () => {
      for (const config of Object.values(CURRENCY_CONFIGS)) {
        expect(config).toHaveProperty('symbol')
        expect(config).toHaveProperty('name')
        expect(config).toHaveProperty('shortName')
        expect(config).toHaveProperty('color')
      }
    })
  })
})
