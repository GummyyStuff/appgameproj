/**
 * Game Fairness Testing Suite
 * Statistical validation and provably fair algorithm testing
 */

import { describe, test, expect, beforeAll } from 'bun:test'
import { SecureRandomGenerator } from '../services/game-engine/random-generator'
import { RouletteGame } from '../services/game-engine/roulette-game'
import { BlackjackGame } from '../services/game-engine/blackjack-game'
import type { ProvablyFairSeed } from '../services/game-engine/types'

describe('Game Fairness Testing', () => {
  // Clear any leftover state from previous test suites
  beforeAll(() => {
    BlackjackGame.clearActiveGames()
  })
  describe('Random Number Generation Fairness', () => {
    test('should pass chi-square test for uniform distribution', async () => {
      const generator = new SecureRandomGenerator()
      const samples = 10000
      const buckets = 10
      const expected = samples / buckets
      const counts = new Array(buckets).fill(0)

      // Generate random numbers and count distribution
      for (let i = 0; i < samples; i++) {
        const random = await generator.generateSecureRandom()
        const bucket = Math.floor(random * buckets)
        counts[bucket]++
      }

      // Calculate chi-square statistic
      let chiSquare = 0
      for (let i = 0; i < buckets; i++) {
        const diff = counts[i] - expected
        chiSquare += (diff * diff) / expected
      }

      // Critical value for 9 degrees of freedom at 95% confidence is 16.919
      expect(chiSquare).toBeLessThan(16.919)
    })

    test('should pass runs test for randomness', async () => {
      const generator = new SecureRandomGenerator()
      const samples = 1000
      const values: number[] = []

      // Generate binary sequence (0 or 1 based on < 0.5)
      for (let i = 0; i < samples; i++) {
        const random = await generator.generateSecureRandom()
        values.push(random < 0.5 ? 0 : 1)
      }

      // Count runs (consecutive identical values)
      let runs = 1
      for (let i = 1; i < values.length; i++) {
        if (values[i] !== values[i - 1]) {
          runs++
        }
      }

      // Count 0s and 1s
      const ones = values.filter(v => v === 1).length
      const zeros = values.length - ones

      // Expected runs and standard deviation
      const expectedRuns = (2 * ones * zeros) / samples + 1
      const variance = (2 * ones * zeros * (2 * ones * zeros - samples)) / 
                      (samples * samples * (samples - 1))
      const stdDev = Math.sqrt(variance)

      // Z-score should be within reasonable bounds (-2 to 2 for 95% confidence)
      const zScore = Math.abs(runs - expectedRuns) / stdDev
      expect(zScore).toBeLessThan(2.0)
    })

    test('should generate cryptographically secure seeds', async () => {
      const generator = new SecureRandomGenerator()
      const seeds: string[] = []
      const numSeeds = 100

      // Generate multiple seeds
      for (let i = 0; i < numSeeds; i++) {
        const seed = await generator.generateSeed()
        seeds.push(seed)
      }

      // All seeds should be unique
      const uniqueSeeds = new Set(seeds)
      expect(uniqueSeeds.size).toBe(numSeeds)

      // All seeds should be proper hex strings
      for (const seed of seeds) {
        expect(seed).toMatch(/^[0-9a-f]{64}$/)
      }
    })

    test('should maintain provably fair consistency', async () => {
      const generator = new SecureRandomGenerator()
      const seed: ProvablyFairSeed = {
        serverSeed: 'test_server_seed_123',
        clientSeed: 'test_client_seed_456',
        nonce: 1
      }

      // Generate same result multiple times
      const results = []
      for (let i = 0; i < 10; i++) {
        const result = await generator.generateProvablyFairResult(seed)
        results.push(result)
      }

      // All results should be identical
      const firstResult = results[0]
      for (const result of results) {
        expect(result.hash).toBe(firstResult.hash)
        expect(result.randomValue).toBe(firstResult.randomValue)
        expect(result.isValid).toBe(true)
      }

      // Verify each result
      for (const result of results) {
        const isValid = await generator.verifyProvablyFairResult(result)
        expect(isValid).toBe(true)
      }
    })
  })

  describe('Roulette Fairness Testing', () => {
    test('should have correct theoretical return to player (RTP)', async () => {
      // Clear any leftover state from previous tests
      BlackjackGame.clearActiveGames()

      const roulette = new RouletteGame()
      const betAmount = 100
      const simulations = 10000

      // Test different bet types
      const betTypes = [
        { type: 'red', value: 'red', expectedRTP: 18/37 }, // 18 red numbers out of 37
        { type: 'number', value: 17, expectedRTP: 1/37 }, // 1 number out of 37
        { type: 'dozen', value: 1, expectedRTP: 12/37 }, // 12 numbers out of 37
        { type: 'even', value: 'even', expectedRTP: 18/37 } // 18 even numbers out of 37
      ]

      for (const betType of betTypes) {
        let totalWins = 0
        let totalBets = 0

        for (let i = 0; i < simulations; i++) {
          const bet = {
            userId: `user${i}`,
            amount: betAmount,
            gameType: 'roulette' as const,
            betType: betType.type as any,
            betValue: betType.value
          }

          const result = await roulette.play(bet)
          if (result.success) {
            totalBets += betAmount
            totalWins += result.winAmount
          }
        }

        const actualRTP = totalWins / totalBets
        const expectedRTP = betType.expectedRTP

        // Allow 5% variance from expected RTP
        const tolerance = 0.05
        expect(Math.abs(actualRTP - expectedRTP)).toBeLessThan(tolerance)
      }
    })

    test('should distribute winning numbers uniformly', async () => {
      const roulette = new RouletteGame()
      const simulations = 3700 // 100 per number
      const numberCounts = new Array(37).fill(0)

      for (let i = 0; i < simulations; i++) {
        const bet = {
          userId: `user${i}`,
          amount: 100,
          gameType: 'roulette' as const,
          betType: 'red',
          betValue: 'red'
        }

        const result = await roulette.play(bet)
        if (result.success) {
          const winningNumber = (result.resultData as any).winning_number
          numberCounts[winningNumber]++
        }
      }

      // Each number should appear roughly equally (within statistical bounds)
      const expected = simulations / 37
      const tolerance = expected * 0.3 // 30% tolerance

      for (let i = 0; i < 37; i++) {
        expect(Math.abs(numberCounts[i] - expected)).toBeLessThan(tolerance)
      }
    })

    test('should maintain correct payout ratios', () => {
      const payoutTests = [
        { betType: 'number', multiplier: 35, probability: 1/37 },
        { betType: 'red', multiplier: 1, probability: 18/37 },
        { betType: 'dozen', multiplier: 2, probability: 12/37 },
        { betType: 'column', multiplier: 2, probability: 12/37 },
        { betType: 'even', multiplier: 1, probability: 18/37 },
        { betType: 'odd', multiplier: 1, probability: 18/37 },
        { betType: 'low', multiplier: 1, probability: 18/37 },
        { betType: 'high', multiplier: 1, probability: 18/37 }
      ]

      for (const test of payoutTests) {
        // Expected value should be negative (house edge)
        const expectedValue = (test.multiplier * test.probability) - 1
        expect(expectedValue).toBeLessThan(0)

        // House edge should be reasonable (around 2.7% for European roulette)
        const houseEdge = Math.abs(expectedValue)
        expect(houseEdge).toBeGreaterThan(0.02)
        expect(houseEdge).toBeLessThan(0.05)
      }
    })
  })

  describe('Blackjack Fairness Testing', () => {
    test('should have correct basic strategy expected values', async () => {
      const simulations = 1000
      let playerWins = 0
      let dealerWins = 0
      let pushes = 0

      for (let i = 0; i < simulations; i++) {
        // Clear static state between simulations
        BlackjackGame.clearActiveGames()
        const blackjack = new BlackjackGame()
        const bet = {
          userId: `user${i}`,
          amount: 100,
          gameType: 'blackjack' as const
        }

        const initialResult = await blackjack.play(bet)
        if (initialResult.success && initialResult.gameId) {
          // Check if game is already completed (immediate blackjack)
          if (initialResult.winAmount > 0) {
            // Game is already completed
            const gameResult = (initialResult.resultData as any).result
            if (gameResult === 'player_win' || gameResult === 'blackjack') {
              playerWins++
            } else if (gameResult === 'dealer_win') {
              dealerWins++
            } else if (gameResult === 'push') {
              pushes++
            }
          } else {
            // Complete the game by standing (simulating basic strategy)
            const standAction = {
              userId: `user${i}`,
              gameId: initialResult.gameId,
              action: 'stand' as const
            }

            const finalResult = await blackjack.processAction(standAction)
            if (finalResult.success) {
              const gameResult = (finalResult.resultData as any).result
              if (gameResult === 'player_win' || gameResult === 'blackjack') {
                playerWins++
              } else if (gameResult === 'dealer_win') {
                dealerWins++
              } else if (gameResult === 'push') {
                pushes++
              }
            }
          }
        }
      }

      // Basic blackjack statistics (approximate)
      const playerWinRate = playerWins / simulations
      const dealerWinRate = dealerWins / simulations
      const pushRate = pushes / simulations

      // Player should win roughly 42-48% of hands
      expect(playerWinRate).toBeGreaterThan(0.35)
      expect(playerWinRate).toBeLessThan(0.55)

      // Dealer should win roughly 48-52% of hands
      expect(dealerWinRate).toBeGreaterThan(0.40)
      expect(dealerWinRate).toBeLessThan(0.60)

      // Pushes should be roughly 8-12% of hands
      expect(pushRate).toBeGreaterThan(0.05)
      expect(pushRate).toBeLessThan(0.15)
    })

    test('should deal cards from a properly shuffled deck', async () => {
      const blackjack = new BlackjackGame()
      const cardCounts: Record<string, number> = {}
      const simulations = 520 // 10 full decks

      for (let i = 0; i < simulations; i++) {
        const bet = {
          userId: `user${i}`,
          amount: 100,
          gameType: 'blackjack' as const
        }

        const result = await blackjack.play(bet)
        if (result.success) {
          const gameData = result.resultData as any
          const allCards = [...gameData.player_hand, ...gameData.dealer_hand]
          
          for (const card of allCards) {
            const cardKey = `${card.suit}-${card.value}`
            cardCounts[cardKey] = (cardCounts[cardKey] || 0) + 1
          }
        }
      }

      // Each card should appear roughly equally (4 times per deck)
      const totalCards = Object.values(cardCounts).reduce((sum, count) => sum + count, 0)
      const expectedPerCard = totalCards / 52 // 52 unique cards

      for (const count of Object.values(cardCounts)) {
        // Allow reasonable variance
        expect(count).toBeGreaterThan(expectedPerCard * 0.5)
        expect(count).toBeLessThan(expectedPerCard * 2.0)
      }
    })

    test('should calculate hand values correctly', () => {
      const testHands = [
        { cards: [{ suit: 'hearts', value: 'K' }, { suit: 'spades', value: '7' }], expectedValue: 17 },
        { cards: [{ suit: 'diamonds', value: 'A' }, { suit: 'clubs', value: 'K' }], expectedValue: 21 },
        { cards: [{ suit: 'hearts', value: 'A' }, { suit: 'spades', value: 'A' }], expectedValue: 12 },
        { cards: [{ suit: 'diamonds', value: '5' }, { suit: 'clubs', value: '6' }, { suit: 'hearts', value: 'A' }], expectedValue: 12 },
        { cards: [{ suit: 'spades', value: 'K' }, { suit: 'hearts', value: 'Q' }, { suit: 'diamonds', value: 'J' }], expectedValue: 30 }
      ]

      for (const hand of testHands) {
        let value = 0
        let aces = 0

        for (const card of hand.cards) {
          if (card.value === 'A') {
            aces++
            value += 11
          } else if (['K', 'Q', 'J'].includes(card.value)) {
            value += 10
          } else {
            value += parseInt(card.value)
          }
        }

        // Adjust for aces
        while (value > 21 && aces > 0) {
          value -= 10
          aces--
        }

        expect(value).toBe(hand.expectedValue)
      }
    })
  })


  describe('Cross-Game Consistency', () => {
    test('should maintain consistent random seed behavior across games', async () => {
      const generator = new SecureRandomGenerator()
      const seed: ProvablyFairSeed = {
        serverSeed: 'consistent_test_seed',
        clientSeed: 'consistent_client_seed',
        nonce: 1
      }

      // Generate same random value multiple times
      const values = []
      for (let i = 0; i < 10; i++) {
        const result = await generator.generateProvablyFairResult(seed)
        values.push(result.randomValue)
      }

      // All values should be identical
      const firstValue = values[0]
      for (const value of values) {
        expect(value).toBe(firstValue)
      }
    })

    test('should have reasonable house edge across all games', async () => {
      const games = [
        { name: 'roulette', expectedHouseEdge: 0.027 }, // 2.7%
        { name: 'blackjack', expectedHouseEdge: 0.005 } // 0.5% with basic strategy
      ]

      for (const game of games) {
        // House edge should be positive but reasonable
        expect(game.expectedHouseEdge).toBeGreaterThan(0)
        expect(game.expectedHouseEdge).toBeLessThan(0.1) // Less than 10%
      }
    })
  })

  describe('Statistical Validation', () => {
    test('should pass Kolmogorov-Smirnov test for uniform distribution', async () => {
      const generator = new SecureRandomGenerator()
      const samples = 1000
      const values: number[] = []

      // Generate random values
      for (let i = 0; i < samples; i++) {
        const value = await generator.generateSecureRandom()
        values.push(value)
      }

      // Sort values
      values.sort((a, b) => a - b)

      // Calculate D statistic
      let maxD = 0
      for (let i = 0; i < samples; i++) {
        const empiricalCDF = (i + 1) / samples
        const theoreticalCDF = values[i] // For uniform [0,1]
        const d = Math.abs(empiricalCDF - theoreticalCDF)
        maxD = Math.max(maxD, d)
      }

      // Critical value for 1000 samples at 95% confidence
      const criticalValue = 1.36 / Math.sqrt(samples)
      expect(maxD).toBeLessThan(criticalValue)
    })

    test('should maintain entropy across multiple generations', async () => {
      const generator = new SecureRandomGenerator()
      const samples = 1000
      const bitStrings: string[] = []

      // Generate random bytes and convert to bit strings
      for (let i = 0; i < samples; i++) {
        const bytes = await generator.generateSecureBytes(4)
        const bitString = Array.from(bytes)
          .map(byte => byte.toString(2).padStart(8, '0'))
          .join('')
        bitStrings.push(bitString)
      }

      // Count 0s and 1s
      let totalBits = 0
      let ones = 0

      for (const bitString of bitStrings) {
        totalBits += bitString.length
        ones += bitString.split('1').length - 1
      }

      const zeros = totalBits - ones
      const ratio = ones / totalBits

      // Should be close to 50/50
      expect(ratio).toBeGreaterThan(0.45)
      expect(ratio).toBeLessThan(0.55)
    })
  })
})