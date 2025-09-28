/**
 * Roulette Game Tests
 * Comprehensive testing of roulette game logic, betting validation, and payout calculations
 */

import { describe, test, expect, beforeEach } from 'bun:test'
import { RouletteGame } from './roulette-game'
import type { RouletteBet } from './roulette-game'

describe('RouletteGame', () => {
  let rouletteGame: RouletteGame

  beforeEach(() => {
    rouletteGame = new RouletteGame()
  })

  describe('Bet Validation', () => {
    test('should validate basic bet parameters', () => {
      const validBet: RouletteBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'roulette',
        betType: 'number',
        betValue: 17
      }

      expect(rouletteGame.validateGameSpecificBet(validBet)).toBe(true)
    })

    test('should reject invalid bet types', () => {
      const invalidBet: RouletteBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'roulette',
        betType: 'invalid' as any,
        betValue: 17
      }

      expect(rouletteGame.validateGameSpecificBet(invalidBet)).toBe(false)
    })

    test('should validate number bets correctly', () => {
      const validNumberBets = [0, 17, 36]
      const invalidNumberBets = [-1, 37, 100]

      for (const number of validNumberBets) {
        const bet: RouletteBet = {
          userId: 'user123',
          amount: 100,
          gameType: 'roulette',
          betType: 'number',
          betValue: number
        }
        expect(rouletteGame.validateGameSpecificBet(bet)).toBe(true)
      }

      for (const number of invalidNumberBets) {
        const bet: RouletteBet = {
          userId: 'user123',
          amount: 100,
          gameType: 'roulette',
          betType: 'number',
          betValue: number
        }
        expect(rouletteGame.validateGameSpecificBet(bet)).toBe(false)
      }
    })

    test('should validate dozen bets correctly', () => {
      const validDozenBets = [1, 2, 3]
      const invalidDozenBets = [0, 4, -1]

      for (const dozen of validDozenBets) {
        const bet: RouletteBet = {
          userId: 'user123',
          amount: 100,
          gameType: 'roulette',
          betType: 'dozen',
          betValue: dozen
        }
        expect(rouletteGame.validateGameSpecificBet(bet)).toBe(true)
      }

      for (const dozen of invalidDozenBets) {
        const bet: RouletteBet = {
          userId: 'user123',
          amount: 100,
          gameType: 'roulette',
          betType: 'dozen',
          betValue: dozen
        }
        expect(rouletteGame.validateGameSpecificBet(bet)).toBe(false)
      }
    })

    test('should validate column bets correctly', () => {
      const validColumnBets = [1, 2, 3]
      const invalidColumnBets = [0, 4, -1]

      for (const column of validColumnBets) {
        const bet: RouletteBet = {
          userId: 'user123',
          amount: 100,
          gameType: 'roulette',
          betType: 'column',
          betValue: column
        }
        expect(rouletteGame.validateGameSpecificBet(bet)).toBe(true)
      }

      for (const column of invalidColumnBets) {
        const bet: RouletteBet = {
          userId: 'user123',
          amount: 100,
          gameType: 'roulette',
          betType: 'column',
          betValue: column
        }
        expect(rouletteGame.validateGameSpecificBet(bet)).toBe(false)
      }
    })

    test('should validate color and even/odd bets correctly', () => {
      const colorBets = ['red', 'black', 'odd', 'even', 'low', 'high']

      for (const betType of colorBets) {
        const bet: RouletteBet = {
          userId: 'user123',
          amount: 100,
          gameType: 'roulette',
          betType: betType as any,
          betValue: betType
        }
        expect(rouletteGame.validateGameSpecificBet(bet)).toBe(true)
      }
    })
  })

  describe('Game Play', () => {
    test('should successfully play a valid roulette game', async () => {
      const bet: RouletteBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'roulette',
        betType: 'red',
        betValue: 'red'
      }

      const result = await rouletteGame.play(bet)

      expect(result.success).toBe(true)
      expect(result.resultData).toBeDefined()
      expect(typeof result.winAmount).toBe('number')
      expect(result.winAmount).toBeGreaterThanOrEqual(0)
    })

    test('should reject invalid bets', async () => {
      const invalidBet: RouletteBet = {
        userId: 'user123',
        amount: -100, // Invalid amount
        gameType: 'roulette',
        betType: 'red',
        betValue: 'red'
      }

      const result = await rouletteGame.play(invalidBet)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.winAmount).toBe(0)
    })

    test('should generate valid winning numbers (0-36)', async () => {
      const bet: RouletteBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'roulette',
        betType: 'red',
        betValue: 'red'
      }

      // Test multiple games to ensure random number generation is working
      for (let i = 0; i < 10; i++) {
        const result = await rouletteGame.play(bet)
        expect(result.success).toBe(true)
        
        const rouletteResult = result.resultData as any
        expect(rouletteResult.winning_number).toBeGreaterThanOrEqual(0)
        expect(rouletteResult.winning_number).toBeLessThanOrEqual(36)
        expect(Number.isInteger(rouletteResult.winning_number)).toBe(true)
      }
    })
  })

  describe('Payout Calculations', () => {
    test('should calculate correct payouts for number bets', async () => {
      const bet: RouletteBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'roulette',
        betType: 'number',
        betValue: 17
      }

      // Mock a winning result
      const winningResult = {
        bet_type: 'number',
        bet_value: 17,
        winning_number: 17,
        multiplier: 35
      }

      const payout = rouletteGame.calculatePayout(bet, winningResult as any)
      expect(payout).toBe(3500) // 100 * 35
    })

    test('should calculate correct payouts for color bets', async () => {
      const bet: RouletteBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'roulette',
        betType: 'red',
        betValue: 'red'
      }

      // Mock a winning result
      const winningResult = {
        bet_type: 'red',
        bet_value: 'red',
        winning_number: 1, // Red number
        multiplier: 1
      }

      const payout = rouletteGame.calculatePayout(bet, winningResult as any)
      expect(payout).toBe(100) // 100 * 1
    })

    test('should return zero payout for losing bets', async () => {
      const bet: RouletteBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'roulette',
        betType: 'red',
        betValue: 'red'
      }

      // Mock a losing result
      const losingResult = {
        bet_type: 'red',
        bet_value: 'red',
        winning_number: 2, // Black number
        multiplier: 0
      }

      const payout = rouletteGame.calculatePayout(bet, losingResult as any)
      expect(payout).toBe(0)
    })
  })

  describe('Static Methods', () => {
    test('should return valid bet types information', () => {
      const betTypes = RouletteGame.getBetTypes()

      expect(betTypes).toBeDefined()
      expect(typeof betTypes).toBe('object')
      expect(betTypes.number).toBeDefined()
      expect(betTypes.red).toBeDefined()
      expect(betTypes.black).toBeDefined()
      expect(betTypes.odd).toBeDefined()
      expect(betTypes.even).toBeDefined()
      expect(betTypes.low).toBeDefined()
      expect(betTypes.high).toBeDefined()
      expect(betTypes.dozen).toBeDefined()
      expect(betTypes.column).toBeDefined()

      // Check structure of bet type info
      expect(betTypes.number.description).toBeDefined()
      expect(betTypes.number.payout).toBeDefined()
      expect(betTypes.number.example).toBeDefined()
    })

    test('should return valid wheel layout', () => {
      const wheelLayout = RouletteGame.getWheelLayout()

      expect(wheelLayout).toBeDefined()
      expect(Array.isArray(wheelLayout)).toBe(true)
      expect(wheelLayout.length).toBe(37) // 0-36

      // Check first number (0 - green)
      expect(wheelLayout[0].number).toBe(0)
      expect(wheelLayout[0].color).toBe('green')

      // Check that all numbers 0-36 are present
      const numbers = wheelLayout.map(slot => slot.number).sort((a, b) => a - b)
      expect(numbers).toEqual(Array.from({ length: 37 }, (_, i) => i))

      // Check that colors are assigned correctly
      const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
      const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]

      for (const slot of wheelLayout) {
        if (slot.number === 0) {
          expect(slot.color).toBe('green')
        } else if (redNumbers.includes(slot.number)) {
          expect(slot.color).toBe('red')
        } else if (blackNumbers.includes(slot.number)) {
          expect(slot.color).toBe('black')
        }
      }
    })
  })

  describe('Edge Cases', () => {
    test('should handle zero winning number correctly for outside bets', async () => {
      const outsideBets = ['red', 'black', 'odd', 'even', 'low', 'high']

      for (const betType of outsideBets) {
        const bet: RouletteBet = {
          userId: 'user123',
          amount: 100,
          gameType: 'roulette',
          betType: betType as any,
          betValue: betType
        }

        // Test with winning number 0 (should lose all outside bets)
        const zeroResult = {
          bet_type: betType,
          bet_value: betType,
          winning_number: 0,
          multiplier: 0
        }

        const payout = rouletteGame.calculatePayout(bet, zeroResult as any)
        expect(payout).toBe(0)
      }
    })

    test('should handle boundary numbers for low/high bets', async () => {
      const lowBet: RouletteBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'roulette',
        betType: 'low',
        betValue: 'low'
      }

      const highBet: RouletteBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'roulette',
        betType: 'high',
        betValue: 'high'
      }

      // Test boundary numbers
      const lowWinResult = {
        bet_type: 'low',
        bet_value: 'low',
        winning_number: 18,
        multiplier: 1
      }

      const highWinResult = {
        bet_type: 'high',
        bet_value: 'high',
        winning_number: 19,
        multiplier: 1
      }

      expect(rouletteGame.calculatePayout(lowBet, lowWinResult as any)).toBe(100)
      expect(rouletteGame.calculatePayout(highBet, highWinResult as any)).toBe(100)
    })

    test('should handle maximum bet amounts', async () => {
      const maxBet: RouletteBet = {
        userId: 'user123',
        amount: 10000, // Maximum bet
        gameType: 'roulette',
        betType: 'number',
        betValue: 17
      }

      const result = await rouletteGame.play(maxBet)
      expect(result.success).toBe(true)

      // If it wins, payout should be 10000 * 35 = 350000
      if (result.winAmount > 0) {
        expect(result.winAmount).toBe(350000)
      }
    })

    test('should handle minimum bet amounts', async () => {
      const minBet: RouletteBet = {
        userId: 'user123',
        amount: 1, // Minimum bet
        gameType: 'roulette',
        betType: 'red',
        betValue: 'red'
      }

      const result = await rouletteGame.play(minBet)
      expect(result.success).toBe(true)
    })
  })

  describe('Randomness and Fairness', () => {
    test('should produce different results across multiple games', async () => {
      const bet: RouletteBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'roulette',
        betType: 'red',
        betValue: 'red'
      }

      const results: number[] = []
      const numGames = 20

      for (let i = 0; i < numGames; i++) {
        const result = await rouletteGame.play(bet)
        expect(result.success).toBe(true)
        
        const rouletteResult = result.resultData as any
        results.push(rouletteResult.winning_number)
      }

      // Check that we got some variety in results (not all the same)
      const uniqueResults = new Set(results)
      expect(uniqueResults.size).toBeGreaterThan(1)
    })

    test('should maintain statistical properties over many games', async () => {
      const bet: RouletteBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'roulette',
        betType: 'red',
        betValue: 'red'
      }

      let redWins = 0
      let blackWins = 0
      let zeroWins = 0
      const numGames = 100

      const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]

      for (let i = 0; i < numGames; i++) {
        const result = await rouletteGame.play(bet)
        const rouletteResult = result.resultData as any
        const winningNumber = rouletteResult.winning_number

        if (winningNumber === 0) {
          zeroWins++
        } else if (redNumbers.includes(winningNumber)) {
          redWins++
        } else {
          blackWins++
        }
      }

      // Basic sanity checks - we should have some distribution
      expect(redWins + blackWins + zeroWins).toBe(numGames)
      expect(redWins).toBeGreaterThan(0)
      expect(blackWins).toBeGreaterThan(0)
      
      // Red and black should be roughly equal (within reasonable variance)
      const ratio = redWins / (redWins + blackWins)
      expect(ratio).toBeGreaterThan(0.3) // At least 30%
      expect(ratio).toBeLessThan(0.7)    // At most 70%
    })
  })
})