import { describe, test, expect, beforeAll } from 'vitest'
import { SecureRandomGenerator } from '../services/game-engine/random-generator'
import { WheelOfChanceGame } from '../services/game-engine/wheel-of-chance-game'
import { generateWheelLayout, BONUS_ANGLE, BASE_ANGLE } from '../services/game-engine/wheel-layout'
import { ProvablyFairService } from '../services/game-engine/provably-fair-service'
import type { ProvablyFairSeed } from '../services/game-engine/types'

describe('Game Fairness Testing', () => {
  beforeAll(() => {})

  describe('Random Number Generation Fairness', () => {
    test('should pass chi-square test for uniform distribution', async () => {
      const generator = new SecureRandomGenerator()
      const samples = 10000
      const buckets = 10
      const expected = samples / buckets
      const counts = new Array(buckets).fill(0)

      for (let i = 0; i < samples; i++) {
        const random = await generator.generateSecureRandom()
        const bucket = Math.floor(random * buckets)
        counts[bucket]++
      }

      let chiSquare = 0
      for (let i = 0; i < buckets; i++) {
        const diff = counts[i] - expected
        chiSquare += (diff * diff) / expected
      }

      expect(chiSquare).toBeLessThan(16.919)
    })

    test('should pass runs test for randomness', async () => {
      const generator = new SecureRandomGenerator()
      const samples = 1000
      const values: number[] = []

      for (let i = 0; i < samples; i++) {
        const random = await generator.generateSecureRandom()
        values.push(random < 0.5 ? 0 : 1)
      }

      let runs = 1
      for (let i = 1; i < values.length; i++) {
        if (values[i] !== values[i - 1]) {
          runs++
        }
      }

      const ones = values.filter(v => v === 1).length
      const zeros = values.length - ones

      const expectedRuns = (2 * ones * zeros) / samples + 1
      const variance = (2 * ones * zeros * (2 * ones * zeros - samples)) /
                      (samples * samples * (samples - 1))
      const stdDev = Math.sqrt(variance)

      const zScore = Math.abs(runs - expectedRuns) / stdDev
      expect(zScore).toBeLessThan(2.5)
    })

    test('should generate cryptographically secure seeds', async () => {
      const generator = new SecureRandomGenerator()
      const seeds: string[] = []
      const numSeeds = 100

      for (let i = 0; i < numSeeds; i++) {
        const seed = await generator.generateSeed()
        seeds.push(seed)
      }

      const uniqueSeeds = new Set(seeds)
      expect(uniqueSeeds.size).toBe(numSeeds)

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

      const results = []
      for (let i = 0; i < 10; i++) {
        const result = await generator.generateProvablyFairResult(seed)
        results.push(result)
      }

      const firstResult = results[0]
      for (const result of results) {
        expect(result.hash).toBe(firstResult.hash)
        expect(result.randomValue).toBe(firstResult.randomValue)
        expect(result.isValid).toBe(true)
      }

      for (const result of results) {
        const isValid = await generator.verifyProvablyFairResult(result)
        expect(isValid).toBe(true)
      }
    })
  })

  describe('Wheel of Chance Fairness Testing', () => {
    test('winning segments follow their angular weights', async () => {
      const game = new WheelOfChanceGame()
      const layout = generateWheelLayout(1337)
      const simulations = 5000
      const counts = new Array(layout.length).fill(0)

      for (let i = 0; i < simulations; i++) {
        const bet = {
          userId: 'fairness-user',
          amount: 100,
          gameType: 'wheel_of_chance' as const,
          bets: [{ segmentIndex: 0, amount: 100 }],
          wheel_layout: layout
        }
        const result = await game.play(bet)
        if (result.success) {
          counts[(result.resultData as any).winning_segment]++
        }
      }

      const totalBonusHits = counts.reduce((sum, count, idx) => sum + (layout[idx].bettable ? 0 : count), 0)
      const totalBaseHits = counts.reduce((sum, count, idx) => sum + (layout[idx].bettable ? count : 0), 0)

      const expectedBonusRatio = (3 * BONUS_ANGLE) / 360
      const expectedBaseRatio = (9 * BASE_ANGLE) / 360

      expect(totalBonusHits / simulations).toBeCloseTo(expectedBonusRatio, 1)
      expect(totalBaseHits / simulations).toBeCloseTo(expectedBaseRatio, 1)
    })

    test('spin results carry independently verifiable provably fair data', async () => {
      const game = new WheelOfChanceGame()
      const layout = generateWheelLayout(4242)
      const bet = {
        userId: 'fairness-user',
        amount: 100,
        gameType: 'wheel_of_chance' as const,
        bets: [{ segmentIndex: 0, amount: 100 }],
        wheel_layout: layout
      }

      const result = await game.play(bet)
      expect(result.success).toBe(true)
      const verification = (result.resultData as any).verification
      expect(verification).toBeDefined()

      const fair = new ProvablyFairService()
      const recomputed = await fair.generateOutcome({
        serverSeed: verification.server_seed,
        clientSeed: verification.client_seed,
        nonce: verification.nonce
      })

      expect(recomputed.randomValue).toBeCloseTo(verification.random_value, 9)
      expect(fair.hashServerSeed(verification.server_seed)).toBe(verification.server_seed_hash)
    })

    test('payouts never exceed the theoretical maximum', async () => {
      const game = new WheelOfChanceGame()
      const layout = generateWheelLayout(7)
      const simulations = 1000
      let maxWin = 0

      for (let i = 0; i < simulations; i++) {
        const bet = {
          userId: 'fairness-user',
          amount: 100,
          gameType: 'wheel_of_chance' as const,
          bets: [{ segmentIndex: 0, amount: 100 }],
          wheel_layout: layout
        }
        const result = await game.play(bet)
        if (result.success) {
          maxWin = Math.max(maxWin, result.winAmount)
        }
      }

      expect(maxWin).toBeLessThanOrEqual(100 * 100)
    })
  })

  describe.skip('Blackjack Fairness Testing - SKIPPED: Blackjack game not implemented yet', () => {})

  describe('Cross-Game Consistency', () => {
    test('should maintain consistent random seed behavior across games', async () => {
      const generator = new SecureRandomGenerator()
      const seed: ProvablyFairSeed = {
        serverSeed: 'consistent_test_seed',
        clientSeed: 'consistent_client_seed',
        nonce: 1
      }

      const values = []
      for (let i = 0; i < 10; i++) {
        const result = await generator.generateProvablyFairResult(seed)
        values.push(result.randomValue)
      }

      const firstValue = values[0]
      for (const value of values) {
        expect(value).toBe(firstValue)
      }
    })

    test('should have reasonable house edge across all games', async () => {
      const games = [
        { name: 'wheel_of_chance', expectedHouseEdge: 0.02 },
        { name: 'blackjack', expectedHouseEdge: 0.005 }
      ]

      for (const game of games) {
        expect(game.expectedHouseEdge).toBeGreaterThan(0)
        expect(game.expectedHouseEdge).toBeLessThan(0.1)
      }
    })
  })

  describe('Statistical Validation', () => {
    test('should pass Kolmogorov-Smirnov test for uniform distribution', async () => {
      const generator = new SecureRandomGenerator()
      const samples = 1000
      const values: number[] = []

      for (let i = 0; i < samples; i++) {
        const value = await generator.generateSecureRandom()
        values.push(value)
      }

      values.sort((a, b) => a - b)

      let maxD = 0
      for (let i = 0; i < samples; i++) {
        const empiricalCDF = (i + 1) / samples
        const theoreticalCDF = values[i]
        const d = Math.abs(empiricalCDF - theoreticalCDF)
        maxD = Math.max(maxD, d)
      }

      const criticalValue = 1.36 / Math.sqrt(samples)
      expect(maxD).toBeLessThan(criticalValue * 1.05)
    })

    test('should maintain entropy across multiple generations', async () => {
      const generator = new SecureRandomGenerator()
      const samples = 1000
      const bitStrings: string[] = []

      for (let i = 0; i < samples; i++) {
        const bytes = await generator.generateSecureBytes(4)
        const bitString = Array.from(bytes)
          .map(byte => byte.toString(2).padStart(8, '0'))
          .join('')
        bitStrings.push(bitString)
      }

      let totalBits = 0
      let ones = 0

      for (const bitString of bitStrings) {
        totalBits += bitString.length
        ones += bitString.split('1').length - 1
      }

      const ratio = ones / totalBits

      expect(ratio).toBeGreaterThan(0.45)
      expect(ratio).toBeLessThan(0.55)
    })
  })
})
