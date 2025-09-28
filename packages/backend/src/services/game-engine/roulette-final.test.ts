/**
 * Final Roulette Implementation Test
 * Comprehensive test to verify all roulette functionality works correctly
 */

import { describe, test, expect } from 'bun:test'
import { RouletteGame } from './roulette-game'
import { PayoutCalculator } from './payout-calculator'
import { GameValidator } from './game-validator'
import { RouletteResult } from '../../types/database'

describe('Roulette Final Implementation Test', () => {
  test('should complete a full roulette game workflow', async () => {
    // 1. Create game instance
    const rouletteGame = new RouletteGame()
    const payoutCalculator = new PayoutCalculator()
    const gameValidator = new GameValidator()

    // 2. Test different bet types
    const betTypes = [
      { betType: 'number', betValue: 17 },
      { betType: 'red', betValue: 'red' },
      { betType: 'black', betValue: 'black' },
      { betType: 'odd', betValue: 'odd' },
      { betType: 'even', betValue: 'even' },
      { betType: 'low', betValue: 'low' },
      { betType: 'high', betValue: 'high' },
      { betType: 'dozen', betValue: 1 },
      { betType: 'column', betValue: 2 }
    ]

    for (const { betType, betValue } of betTypes) {
      // 3. Create and validate bet
      const bet = {
        userId: 'test-user',
        amount: 100,
        gameType: 'roulette' as const,
        betType: betType as any,
        betValue
      }

      expect(rouletteGame.validateGameSpecificBet(bet)).toBe(true)

      // 4. Play the game
      const result = await rouletteGame.play(bet)
      expect(result.success).toBe(true)
      expect(result.resultData).toBeDefined()

      // 5. Validate result structure
      const rouletteResult = result.resultData as RouletteResult
      expect(rouletteResult.bet_type).toBe(betType)
      expect(rouletteResult.bet_value).toBe(betValue)
      expect(rouletteResult.winning_number).toBeGreaterThanOrEqual(0)
      expect(rouletteResult.winning_number).toBeLessThanOrEqual(36)
      expect(typeof rouletteResult.multiplier).toBe('number')

      // 6. Validate game result
      expect(gameValidator.validateGameResult('roulette', result.resultData)).toBe(true)

      // 7. Validate payout calculation
      const calculatedPayout = payoutCalculator.calculateRoulettePayout(
        rouletteResult.bet_type,
        rouletteResult.bet_value,
        rouletteResult.winning_number,
        bet.amount
      )
      expect(result.winAmount).toBe(calculatedPayout)

      // 8. Validate payout consistency
      expect(gameValidator.validatePayout(bet, result.resultData, result.winAmount)).toBe(true)
    }
  })

  test('should handle edge cases correctly', async () => {
    const rouletteGame = new RouletteGame()

    // Test minimum bet
    const minBet = {
      userId: 'test-user',
      amount: 1,
      gameType: 'roulette' as const,
      betType: 'red' as const,
      betValue: 'red'
    }

    const minResult = await rouletteGame.play(minBet)
    expect(minResult.success).toBe(true)

    // Test maximum bet
    const maxBet = {
      userId: 'test-user',
      amount: 10000,
      gameType: 'roulette' as const,
      betType: 'number' as const,
      betValue: 0
    }

    const maxResult = await rouletteGame.play(maxBet)
    expect(maxResult.success).toBe(true)

    // Test invalid bet
    const invalidBet = {
      userId: 'test-user',
      amount: -100,
      gameType: 'roulette' as const,
      betType: 'red' as const,
      betValue: 'red'
    }

    const invalidResult = await rouletteGame.play(invalidBet)
    expect(invalidResult.success).toBe(false)
    expect(invalidResult.error).toBeDefined()
  })

  test('should provide correct game information', () => {
    // Test bet types information
    const betTypes = RouletteGame.getBetTypes()
    expect(Object.keys(betTypes)).toHaveLength(9)
    
    for (const [betType, info] of Object.entries(betTypes)) {
      expect(info.description).toBeDefined()
      expect(info.payout).toBeDefined()
      expect(info.example).toBeDefined()
    }

    // Test wheel layout
    const wheelLayout = RouletteGame.getWheelLayout()
    expect(wheelLayout).toHaveLength(37)
    
    // Verify all numbers 0-36 are present
    const numbers = wheelLayout.map(slot => slot.number).sort((a, b) => a - b)
    expect(numbers).toEqual(Array.from({ length: 37 }, (_, i) => i))

    // Verify colors are correct
    expect(wheelLayout[0].color).toBe('green') // 0 is green
    
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

  test('should demonstrate statistical fairness over many games', async () => {
    const rouletteGame = new RouletteGame()
    
    const bet = {
      userId: 'test-user',
      amount: 100,
      gameType: 'roulette' as const,
      betType: 'red' as const,
      betValue: 'red'
    }

    let totalWins = 0
    let totalLosses = 0
    const numGames = 50

    for (let i = 0; i < numGames; i++) {
      const result = await rouletteGame.play(bet)
      expect(result.success).toBe(true)

      if (result.winAmount > 0) {
        totalWins++
      } else {
        totalLosses++
      }
    }

    // Should have both wins and losses
    expect(totalWins).toBeGreaterThan(0)
    expect(totalLosses).toBeGreaterThan(0)
    expect(totalWins + totalLosses).toBe(numGames)

    // Win rate should be reasonable (red has 18/37 chance ≈ 48.6%)
    const winRate = totalWins / numGames
    expect(winRate).toBeGreaterThan(0.2) // At least 20%
    expect(winRate).toBeLessThan(0.8)    // At most 80%
  })

  test('should integrate with payout calculator correctly', () => {
    const payoutCalculator = new PayoutCalculator()

    // Test all bet types with winning scenarios
    const testCases = [
      { betType: 'number', betValue: 17, winningNumber: 17, expectedMultiplier: 35 },
      { betType: 'red', betValue: 'red', winningNumber: 1, expectedMultiplier: 1 },
      { betType: 'black', betValue: 'black', winningNumber: 2, expectedMultiplier: 1 },
      { betType: 'odd', betValue: 'odd', winningNumber: 1, expectedMultiplier: 1 },
      { betType: 'even', betValue: 'even', winningNumber: 2, expectedMultiplier: 1 },
      { betType: 'low', betValue: 'low', winningNumber: 18, expectedMultiplier: 1 },
      { betType: 'high', betValue: 'high', winningNumber: 19, expectedMultiplier: 1 },
      { betType: 'dozen', betValue: 1, winningNumber: 12, expectedMultiplier: 2 },
      { betType: 'column', betValue: 1, winningNumber: 1, expectedMultiplier: 2 }
    ]

    for (const testCase of testCases) {
      const payout = payoutCalculator.calculateRoulettePayout(
        testCase.betType,
        testCase.betValue,
        testCase.winningNumber,
        100
      )
      expect(payout).toBe(100 * testCase.expectedMultiplier)
    }

    // Test losing scenarios
    const losingCases = [
      { betType: 'number', betValue: 17, winningNumber: 18 },
      { betType: 'red', betValue: 'red', winningNumber: 2 }, // 2 is black
      { betType: 'red', betValue: 'red', winningNumber: 0 }, // 0 loses all outside bets
    ]

    for (const testCase of losingCases) {
      const payout = payoutCalculator.calculateRoulettePayout(
        testCase.betType,
        testCase.betValue,
        testCase.winningNumber,
        100
      )
      expect(payout).toBe(0)
    }
  })

  test('should validate all game results correctly', () => {
    const gameValidator = new GameValidator()

    // Valid roulette results
    const validResults = [
      {
        bet_type: 'number',
        bet_value: 17,
        winning_number: 17,
        multiplier: 35
      },
      {
        bet_type: 'red',
        bet_value: 'red',
        winning_number: 1,
        multiplier: 1
      },
      {
        bet_type: 'dozen',
        bet_value: 1,
        winning_number: 12,
        multiplier: 2
      }
    ]

    for (const result of validResults) {
      expect(gameValidator.validateGameResult('roulette', result as any)).toBe(true)
    }

    // Invalid roulette results
    const invalidResults = [
      {
        bet_type: 'number',
        bet_value: 17,
        winning_number: 37, // Invalid winning number
        multiplier: 35
      },
      {
        bet_type: 'invalid',
        bet_value: 'red',
        winning_number: 1,
        multiplier: 1
      },
      {
        bet_type: 'red',
        bet_value: 'red',
        winning_number: 1,
        multiplier: -1 // Invalid multiplier
      }
    ]

    for (const result of invalidResults) {
      expect(gameValidator.validateGameResult('roulette', result as any)).toBe(false)
    }
  })
})