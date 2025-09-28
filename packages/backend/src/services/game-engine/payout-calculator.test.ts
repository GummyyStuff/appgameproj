/**
 * Tests for PayoutCalculator
 * Validates payout calculations for all casino games
 */

import { describe, test, expect, beforeEach } from 'bun:test'
import { PayoutCalculator } from './payout-calculator'

describe('PayoutCalculator', () => {
  let calculator: PayoutCalculator

  beforeEach(() => {
    calculator = new PayoutCalculator()
  })

  describe('calculateRoulettePayout', () => {
    describe('number bets', () => {
      test('should calculate correct payout for winning number bet', () => {
        const payout = calculator.calculateRoulettePayout('number', 7, 7, 100)
        expect(payout).toBe(3500) // 35:1 payout
      })

      test('should return 0 for losing number bet', () => {
        const payout = calculator.calculateRoulettePayout('number', 7, 15, 100)
        expect(payout).toBe(0)
      })

      test('should handle zero bet', () => {
        const payout = calculator.calculateRoulettePayout('number', 0, 0, 50)
        expect(payout).toBe(1750) // 35:1 payout
      })
    })

    describe('color bets', () => {
      test('should calculate correct payout for winning red bet', () => {
        const payout = calculator.calculateRoulettePayout('red', 'red', 1, 100) // 1 is red
        expect(payout).toBe(100) // 1:1 payout
      })

      test('should return 0 for losing red bet', () => {
        const payout = calculator.calculateRoulettePayout('red', 'red', 2, 100) // 2 is black
        expect(payout).toBe(0)
      })

      test('should calculate correct payout for winning black bet', () => {
        const payout = calculator.calculateRoulettePayout('black', 'black', 2, 100) // 2 is black
        expect(payout).toBe(100) // 1:1 payout
      })

      test('should return 0 for color bets on zero', () => {
        const redPayout = calculator.calculateRoulettePayout('red', 'red', 0, 100)
        const blackPayout = calculator.calculateRoulettePayout('black', 'black', 0, 100)
        expect(redPayout).toBe(0)
        expect(blackPayout).toBe(0)
      })
    })

    describe('odd/even bets', () => {
      test('should calculate correct payout for winning odd bet', () => {
        const payout = calculator.calculateRoulettePayout('odd', 'odd', 7, 100)
        expect(payout).toBe(100) // 1:1 payout
      })

      test('should return 0 for losing odd bet', () => {
        const payout = calculator.calculateRoulettePayout('odd', 'odd', 8, 100)
        expect(payout).toBe(0)
      })

      test('should calculate correct payout for winning even bet', () => {
        const payout = calculator.calculateRoulettePayout('even', 'even', 8, 100)
        expect(payout).toBe(100) // 1:1 payout
      })

      test('should return 0 for odd/even bets on zero', () => {
        const oddPayout = calculator.calculateRoulettePayout('odd', 'odd', 0, 100)
        const evenPayout = calculator.calculateRoulettePayout('even', 'even', 0, 100)
        expect(oddPayout).toBe(0)
        expect(evenPayout).toBe(0)
      })
    })

    describe('high/low bets', () => {
      test('should calculate correct payout for winning low bet', () => {
        const payout = calculator.calculateRoulettePayout('low', 'low', 10, 100)
        expect(payout).toBe(100) // 1:1 payout
      })

      test('should return 0 for losing low bet', () => {
        const payout = calculator.calculateRoulettePayout('low', 'low', 25, 100)
        expect(payout).toBe(0)
      })

      test('should calculate correct payout for winning high bet', () => {
        const payout = calculator.calculateRoulettePayout('high', 'high', 25, 100)
        expect(payout).toBe(100) // 1:1 payout
      })

      test('should return 0 for high/low bets on zero', () => {
        const lowPayout = calculator.calculateRoulettePayout('low', 'low', 0, 100)
        const highPayout = calculator.calculateRoulettePayout('high', 'high', 0, 100)
        expect(lowPayout).toBe(0)
        expect(highPayout).toBe(0)
      })
    })

    describe('dozen bets', () => {
      test('should calculate correct payout for winning first dozen', () => {
        const payout = calculator.calculateRoulettePayout('dozen', 1, 5, 100)
        expect(payout).toBe(200) // 2:1 payout
      })

      test('should calculate correct payout for winning second dozen', () => {
        const payout = calculator.calculateRoulettePayout('dozen', 2, 15, 100)
        expect(payout).toBe(200) // 2:1 payout
      })

      test('should calculate correct payout for winning third dozen', () => {
        const payout = calculator.calculateRoulettePayout('dozen', 3, 30, 100)
        expect(payout).toBe(200) // 2:1 payout
      })

      test('should return 0 for losing dozen bet', () => {
        const payout = calculator.calculateRoulettePayout('dozen', 1, 15, 100)
        expect(payout).toBe(0)
      })
    })

    describe('column bets', () => {
      test('should calculate correct payout for winning column bets', () => {
        const column1Payout = calculator.calculateRoulettePayout('column', 1, 1, 100) // 1 is in column 1
        const column2Payout = calculator.calculateRoulettePayout('column', 2, 2, 100) // 2 is in column 2
        const column3Payout = calculator.calculateRoulettePayout('column', 3, 3, 100) // 3 is in column 3
        
        expect(column1Payout).toBe(200) // 2:1 payout
        expect(column2Payout).toBe(200) // 2:1 payout
        expect(column3Payout).toBe(200) // 2:1 payout
      })

      test('should return 0 for losing column bet', () => {
        const payout = calculator.calculateRoulettePayout('column', 1, 2, 100)
        expect(payout).toBe(0)
      })
    })

    describe('invalid bets', () => {
      test('should return 0 for invalid bet types', () => {
        const payout = calculator.calculateRoulettePayout('invalid', 'test', 10, 100)
        expect(payout).toBe(0)
      })

      test('should return 0 for invalid winning numbers', () => {
        const payout1 = calculator.calculateRoulettePayout('number', 5, -1, 100)
        const payout2 = calculator.calculateRoulettePayout('number', 5, 37, 100)
        expect(payout1).toBe(0)
        expect(payout2).toBe(0)
      })
    })
  })

  describe('calculateBlackjackPayout', () => {
    test('should calculate correct payout for blackjack', () => {
      const payout = calculator.calculateBlackjackPayout('blackjack', 100)
      expect(payout).toBe(150) // 3:2 payout
    })

    test('should calculate correct payout for regular win', () => {
      const payout = calculator.calculateBlackjackPayout('player_win', 100)
      expect(payout).toBe(100) // 1:1 payout
    })

    test('should return 0 for push (tie)', () => {
      const payout = calculator.calculateBlackjackPayout('push', 100)
      expect(payout).toBe(0) // Return original bet
    })

    test('should return 0 for dealer win', () => {
      const payout = calculator.calculateBlackjackPayout('dealer_win', 100)
      expect(payout).toBe(0) // Lose bet
    })

    test('should return 0 for bust', () => {
      const payout = calculator.calculateBlackjackPayout('bust', 100)
      expect(payout).toBe(0) // Lose bet
    })

    test('should return 0 for dealer blackjack', () => {
      const payout = calculator.calculateBlackjackPayout('dealer_blackjack', 100)
      expect(payout).toBe(0) // Lose bet
    })

    test('should return 0 for invalid result', () => {
      const payout = calculator.calculateBlackjackPayout('invalid', 100)
      expect(payout).toBe(0)
    })
  })



  describe('getHouseEdge', () => {
    test('should return correct house edges for different games', () => {
      expect(calculator.getHouseEdge('roulette')).toBe(2.7)
      expect(calculator.getHouseEdge('blackjack')).toBe(0.5)

      expect(calculator.getHouseEdge('invalid')).toBe(0)
    })
  })
})