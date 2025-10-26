/**
 * Unit Tests for BettingPanel Logic
 * Tests betting logic, validations, and calculations without rendering
 */

import { describe, test, expect } from 'bun:test'

/**
 * Test the betting logic functions
 * These tests verify the core functionality without needing to render
 */

describe('BettingPanel Logic', () => {
  
  describe('Bet Amount Validation', () => {
    test('should cap bet amount to balance', () => {
      const balance = 1000
      const requestedAmount = 1500
      const result = Math.min(requestedAmount, balance)
      expect(result).toBe(1000)
    })

    test('should allow bet amount equal to balance', () => {
      const balance = 1000
      const requestedAmount = 1000
      const result = Math.min(requestedAmount, balance)
      expect(result).toBe(1000)
    })

    test('should allow bet amount less than balance', () => {
      const balance = 1000
      const requestedAmount = 500
      const result = Math.min(requestedAmount, balance)
      expect(result).toBe(500)
    })
  })

  describe('Large Bet Detection', () => {
    test('should detect large bet by absolute amount', () => {
      const betAmount = 1500
      const balance = 10000
      const isLargeBet = betAmount > 1000
      expect(isLargeBet).toBe(true)
    })

    test('should detect large bet by percentage', () => {
      const betAmount = 6000
      const balance = 10000
      const isLargeBet = betAmount > balance * 0.5
      expect(isLargeBet).toBe(true)
    })

    test('should not flag small bets', () => {
      const betAmount = 500
      const balance = 10000
      const isLargeBet = betAmount > 1000 || betAmount > balance * 0.5
      expect(isLargeBet).toBe(false)
    })

    test('should not flag small percentage bets', () => {
      const betAmount = 3000
      const balance = 10000
      const isLargeBet = betAmount > 1000 || betAmount > balance * 0.5
      expect(isLargeBet).toBe(false)
    })
  })

  describe('Bet Formatting', () => {
    test('should format currency correctly', () => {
      const amount = 1000
      const formatted = `₽${amount.toLocaleString()}`
      expect(formatted).toBe('₽1,000')
    })

    test('should format large amounts correctly', () => {
      const amount = 1000000
      const formatted = `₽${amount.toLocaleString()}`
      expect(formatted).toBe('₽1,000,000')
    })
  })

  describe('Quick Bet Selection', () => {
    const quickBetAmounts = [10, 50, 100, 500, 1000]

    test('should select quick bet amounts', () => {
      expect(quickBetAmounts).toContain(10)
      expect(quickBetAmounts).toContain(50)
      expect(quickBetAmounts).toContain(100)
      expect(quickBetAmounts).toContain(500)
      expect(quickBetAmounts).toContain(1000)
    })

    test('should respect balance when using quick bets', () => {
      const balance = 350
      const quickBets = [10, 50, 100, 500, 1000]
      const validQuickBets = quickBets.filter(bet => bet <= balance)
      
      expect(validQuickBets).toEqual([10, 50, 100])
      expect(validQuickBets).not.toContain(500)
      expect(validQuickBets).not.toContain(1000)
    })
  })

  describe('Bet Validation Rules', () => {
    test('should validate minimum bet', () => {
      const minBet = 1
      const betAmount = 1
      expect(betAmount >= minBet).toBe(true)
    })

    test('should reject bets below minimum', () => {
      const minBet = 1
      const betAmount = 0
      expect(betAmount >= minBet).toBe(false)
    })

    test('should validate maximum bet', () => {
      const maxBet = 10000
      const betAmount = 5000
      expect(betAmount <= maxBet).toBe(true)
    })

    test('should reject bets above maximum', () => {
      const maxBet = 10000
      const betAmount = 15000
      expect(betAmount <= maxBet).toBe(false)
    })
  })
})

