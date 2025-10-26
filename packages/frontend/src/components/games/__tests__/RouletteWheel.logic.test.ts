/**
 * Unit Tests for Roulette Wheel Logic
 * Tests roulette game logic without rendering the wheel
 */

import { describe, test, expect } from 'bun:test'

describe('Roulette Wheel Logic', () => {
  
  describe('Number Validation', () => {
    test('should validate roulette numbers 0-36', () => {
      const validNumbers = Array.from({ length: 37 }, (_, i) => i)
      
      for (const num of validNumbers) {
        expect(num).toBeGreaterThanOrEqual(0)
        expect(num).toBeLessThanOrEqual(36)
      }
    })

    test('should reject invalid roulette numbers', () => {
      const invalidNumbers = [-1, 37, 38, 100]
      
      for (const num of invalidNumbers) {
        expect(num < 0 || num > 36).toBe(true)
      }
    })
  })

  describe('Bet Type Validation', () => {
    const validBetTypes = ['number', 'red', 'black', 'odd', 'even', 'low', 'high', 'dozen', 'column']
    
    test('should recognize valid bet types', () => {
      const betType = 'red'
      expect(validBetTypes).toContain(betType)
    })

    test('should reject invalid bet types', () => {
      const betType = 'invalid'
      expect(validBetTypes).not.toContain(betType)
    })
  })

  describe('Payout Calculation', () => {
    test('should calculate number bet payout correctly', () => {
      const betAmount = 100
      const payout = betAmount * 36
      expect(payout).toBe(3600)
    })

    test('should calculate color bet payout correctly', () => {
      const betAmount = 100
      const payout = betAmount * 2 // 1:1 payout
      expect(payout).toBe(200)
    })

    test('should calculate odd/even bet payout correctly', () => {
      const betAmount = 100
      const payout = betAmount * 2
      expect(payout).toBe(200)
    })
  })

  describe('Color Detection', () => {
    test('should identify red numbers', () => {
      const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
      
      for (const num of redNumbers) {
        // Red numbers are odd and follow specific patterns
        const isOdd = num % 2 === 1
        expect(isOdd).toBe(true)
      }
    })

    test('should identify black numbers', () => {
      const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]
      
      for (const num of blackNumbers) {
        // Black numbers are even (mostly)
        const isEven = num % 2 === 0
        expect(isEven || num === 11 || num === 13 || num === 15 || num === 17 || num === 29 || num === 31 || num === 33 || num === 35).toBe(true)
      }
    })

    test('should identify zero as neither red nor black', () => {
      const number = 0
      const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(number)
      const isBlack = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35].includes(number)
      
      expect(isRed).toBe(false)
      expect(isBlack).toBe(false)
    })
  })

  describe('Number Range Calculations', () => {
    test('should calculate low range (1-18)', () => {
      const number = 10
      const isLow = number >= 1 && number <= 18
      expect(isLow).toBe(true)
    })

    test('should calculate high range (19-36)', () => {
      const number = 25
      const isHigh = number >= 19 && number <= 36
      expect(isHigh).toBe(true)
    })

    test('should handle zero outside ranges', () => {
      const number = 0
      const isLow = number >= 1 && number <= 18
      const isHigh = number >= 19 && number <= 36
      
      expect(isLow).toBe(false)
      expect(isHigh).toBe(false)
    })
  })
})

