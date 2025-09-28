/**
 * Currency Utility Tests
 * Simple utility function tests for frontend
 */

import { describe, test, expect } from 'bun:test'

// Simple currency formatting function
export function formatCurrency(amount: number, currency: 'roubles' | 'dollars' | 'euros' = 'roubles'): string {
  const symbols = {
    roubles: '₽',
    dollars: '$',
    euros: '€'
  }
  
  return `${symbols[currency]}${amount.toLocaleString()}`
}

// Validation functions
export function isValidBetAmount(amount: number): boolean {
  return typeof amount === 'number' && amount > 0 && amount <= 10000 && isFinite(amount)
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(username)
}

describe('Currency Utils', () => {
  describe('formatCurrency', () => {
    test('should format roubles correctly', () => {
      expect(formatCurrency(1000)).toBe('₽1,000')
      expect(formatCurrency(1000, 'roubles')).toBe('₽1,000')
    })

    test('should format dollars correctly', () => {
      expect(formatCurrency(1000, 'dollars')).toBe('$1,000')
    })

    test('should format euros correctly', () => {
      expect(formatCurrency(1000, 'euros')).toBe('€1,000')
    })

    test('should handle decimal amounts', () => {
      expect(formatCurrency(1000.5)).toBe('₽1,000.5')
      expect(formatCurrency(1000.0)).toBe('₽1,000')
    })

    test('should handle large amounts', () => {
      expect(formatCurrency(1000000)).toBe('₽1,000,000')
    })

    test('should handle zero amounts', () => {
      expect(formatCurrency(0)).toBe('₽0')
    })
  })

  describe('isValidBetAmount', () => {
    test('should validate positive amounts', () => {
      expect(isValidBetAmount(100)).toBe(true)
      expect(isValidBetAmount(1)).toBe(true)
      expect(isValidBetAmount(10000)).toBe(true)
    })

    test('should reject invalid amounts', () => {
      expect(isValidBetAmount(0)).toBe(false)
      expect(isValidBetAmount(-100)).toBe(false)
      expect(isValidBetAmount(10001)).toBe(false)
      expect(isValidBetAmount(NaN)).toBe(false)
      expect(isValidBetAmount(Infinity)).toBe(false)
    })
  })

  describe('isValidEmail', () => {
    test('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user@domain.co.uk')).toBe(true)
      expect(isValidEmail('name.surname@company.org')).toBe(true)
    })

    test('should reject invalid emails', () => {
      expect(isValidEmail('invalid-email')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('test@.com')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })
  })

  describe('isValidUsername', () => {
    test('should validate correct usernames', () => {
      expect(isValidUsername('testuser')).toBe(true)
      expect(isValidUsername('user123')).toBe(true)
      expect(isValidUsername('my_username')).toBe(true)
      expect(isValidUsername('player-one')).toBe(true)
    })

    test('should reject invalid usernames', () => {
      expect(isValidUsername('')).toBe(false)
      expect(isValidUsername('ab')).toBe(false) // Too short
      expect(isValidUsername('a'.repeat(25))).toBe(false) // Too long
      expect(isValidUsername('user@name')).toBe(false) // Invalid characters
      expect(isValidUsername('user name')).toBe(false) // Spaces
      expect(isValidUsername('user!')).toBe(false) // Special characters
    })
  })
})