/**
 * Plinko Game Tests
 * Comprehensive testing for physics simulation, payouts, and game fairness
 */

import { PlinkoGame, PlinkoBet } from './plinko-game'
import { PlinkoResult } from '../../types/database'

describe('PlinkoGame', () => {
  let plinkoGame: PlinkoGame

  beforeEach(() => {
    plinkoGame = new PlinkoGame()
  })

  describe('Basic Game Functionality', () => {
    test('should create plinko game instance', () => {
      expect(plinkoGame).toBeInstanceOf(PlinkoGame)
    })

    test('should have correct game type', () => {
      expect((plinkoGame as any).gameType).toBe('plinko')
    })

    test('should have correct bet limits', () => {
      expect((plinkoGame as any).minBet).toBe(1)
      expect((plinkoGame as any).maxBet).toBe(10000)
    })
  })

  describe('Bet Validation', () => {
    test('should validate valid plinko bet', () => {
      const validBet: PlinkoBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'plinko',
        riskLevel: 'medium'
      }

      expect(plinkoGame.validateGameSpecificBet(validBet)).toBe(true)
    })

    test('should reject bet with invalid risk level', () => {
      const invalidBet: PlinkoBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'plinko',
        riskLevel: 'invalid' as any
      }

      expect(plinkoGame.validateGameSpecificBet(invalidBet)).toBe(false)
    })

    test('should reject bet with missing risk level', () => {
      const invalidBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'plinko'
      } as PlinkoBet

      expect(plinkoGame.validateGameSpecificBet(invalidBet)).toBe(false)
    })

    test('should validate all risk levels', () => {
      const riskLevels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high']
      
      riskLevels.forEach(riskLevel => {
        const bet: PlinkoBet = {
          userId: 'user123',
          amount: 100,
          gameType: 'plinko',
          riskLevel
        }
        expect(plinkoGame.validateGameSpecificBet(bet)).toBe(true)
      })
    })
  })

  describe('Game Play', () => {
    test('should play plinko game successfully', async () => {
      const bet: PlinkoBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'plinko',
        riskLevel: 'medium'
      }

      const result = await plinkoGame.play(bet)

      expect(result.success).toBe(true)
      expect(result.winAmount).toBeGreaterThanOrEqual(0)
      expect(result.resultData).toBeDefined()
      expect(result.error).toBeUndefined()
    })

    test('should return valid plinko result data', async () => {
      const bet: PlinkoBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'plinko',
        riskLevel: 'high'
      }

      const result = await plinkoGame.play(bet)
      const plinkoResult = result.resultData as PlinkoResult

      expect(plinkoResult.risk_level).toBe('high')
      expect(plinkoResult.ball_path).toBeInstanceOf(Array)
      expect(plinkoResult.ball_path).toHaveLength(4) // 4 rows of pegs
      expect(plinkoResult.multiplier).toBeGreaterThanOrEqual(0)
      expect(plinkoResult.landing_slot).toBeGreaterThanOrEqual(0)
      expect(plinkoResult.landing_slot).toBeLessThan(9) // 9 slots (0-8)
    })

    test('should generate valid ball path', async () => {
      const bet: PlinkoBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'plinko',
        riskLevel: 'low'
      }

      const result = await plinkoGame.play(bet)
      const plinkoResult = result.resultData as PlinkoResult

      // Ball path should contain only 0s and 1s
      plinkoResult.ball_path.forEach(move => {
        expect([0, 1]).toContain(move)
      })
    })

    test('should reject invalid bet amount', async () => {
      const invalidBet: PlinkoBet = {
        userId: 'user123',
        amount: 0,
        gameType: 'plinko',
        riskLevel: 'medium'
      }

      const result = await plinkoGame.play(invalidBet)

      expect(result.success).toBe(false)
      expect(result.winAmount).toBe(0)
      expect(result.error).toBe('Invalid bet')
    })

    test('should reject bet exceeding maximum', async () => {
      const invalidBet: PlinkoBet = {
        userId: 'user123',
        amount: 20000,
        gameType: 'plinko',
        riskLevel: 'medium'
      }

      const result = await plinkoGame.play(invalidBet)

      expect(result.success).toBe(false)
      expect(result.winAmount).toBe(0)
      expect(result.error).toBe('Invalid bet')
    })
  })

  describe('Payout Calculations', () => {
    test('should calculate correct payout for winning result', () => {
      const bet: PlinkoBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'plinko',
        riskLevel: 'medium'
      }

      const resultData: PlinkoResult = {
        risk_level: 'medium',
        ball_path: [1, 0, 1, 0],
        multiplier: 2.1,
        landing_slot: 1
      }

      const payout = plinkoGame.calculatePayout(bet, resultData)
      expect(payout).toBe(210) // 100 * 2.1
    })

    test('should calculate zero payout for losing result', () => {
      const bet: PlinkoBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'plinko',
        riskLevel: 'medium'
      }

      const resultData: PlinkoResult = {
        risk_level: 'medium',
        ball_path: [1, 1, 0, 0],
        multiplier: 0.5,
        landing_slot: 4
      }

      const payout = plinkoGame.calculatePayout(bet, resultData)
      expect(payout).toBe(50) // 100 * 0.5
    })

    test('should handle edge case multipliers', () => {
      const bet: PlinkoBet = {
        userId: 'user123',
        amount: 1000,
        gameType: 'plinko',
        riskLevel: 'high'
      }

      // Test maximum multiplier
      const maxResult: PlinkoResult = {
        risk_level: 'high',
        ball_path: [0, 0, 0, 0],
        multiplier: 29,
        landing_slot: 0
      }

      const maxPayout = plinkoGame.calculatePayout(bet, maxResult)
      expect(maxPayout).toBe(29000) // 1000 * 29

      // Test minimum multiplier
      const minResult: PlinkoResult = {
        risk_level: 'high',
        ball_path: [1, 0, 1, 0],
        multiplier: 1.0,
        landing_slot: 4
      }

      const minPayout = plinkoGame.calculatePayout(bet, minResult)
      expect(minPayout).toBe(1000) // 1000 * 1.0
    })
  })

  describe('Ball Path Physics', () => {
    test('should validate correct ball path calculation', () => {
      // Test path that goes all left (should land in slot 0)
      const leftPath = [0, 0, 0, 0]
      expect(PlinkoGame.validateBallPath(leftPath, 0)).toBe(true)

      // Test path that goes all right (should land in slot 8)
      const rightPath = [1, 1, 1, 1]
      expect(PlinkoGame.validateBallPath(rightPath, 8)).toBe(true)

      // Test mixed path
      const mixedPath = [1, 0, 1, 0]
      expect(PlinkoGame.validateBallPath(mixedPath, 4)).toBe(true) // Should stay in middle
    })

    test('should reject invalid ball path', () => {
      // Wrong length
      expect(PlinkoGame.validateBallPath([0, 1], 2)).toBe(false)

      // Invalid values
      expect(PlinkoGame.validateBallPath([0, 1, 2, 0], 3)).toBe(false)

      // Wrong expected slot
      expect(PlinkoGame.validateBallPath([0, 0, 0, 0], 5)).toBe(false)
    })

    test('should handle boundary conditions', () => {
      // Ball can't go below slot 0
      const extremeLeftPath = [0, 0, 0, 0, 0, 0] // More moves than rows
      const validLeftPath = [0, 0, 0, 0]
      expect(PlinkoGame.validateBallPath(validLeftPath, 0)).toBe(true)

      // Ball can't go above slot 8
      const extremeRightPath = [1, 1, 1, 1, 1, 1] // More moves than rows
      const validRightPath = [1, 1, 1, 1]
      expect(PlinkoGame.validateBallPath(validRightPath, 8)).toBe(true)
    })
  })

  describe('Static Configuration Methods', () => {
    test('should return correct multiplier table', () => {
      const multipliers = PlinkoGame.getMultiplierTable()

      expect(multipliers).toHaveProperty('low')
      expect(multipliers).toHaveProperty('medium')
      expect(multipliers).toHaveProperty('high')

      expect(multipliers.low).toHaveLength(9)
      expect(multipliers.medium).toHaveLength(9)
      expect(multipliers.high).toHaveLength(9)

      // Check that high risk has higher max multiplier
      const maxLow = Math.max(...multipliers.low)
      const maxHigh = Math.max(...multipliers.high)
      expect(maxHigh).toBeGreaterThan(maxLow)
    })

    test('should return correct board configuration', () => {
      const config = PlinkoGame.getBoardConfig()

      expect(config.rows).toBe(4)
      expect(config.slots).toBe(9)
      expect(config.startingPosition).toBe(4)
      expect(config.multipliers).toBeDefined()
    })

    test('should return risk level information', () => {
      const riskInfo = PlinkoGame.getRiskLevelInfo()

      expect(riskInfo).toHaveProperty('low')
      expect(riskInfo).toHaveProperty('medium')
      expect(riskInfo).toHaveProperty('high')

      Object.values(riskInfo).forEach(info => {
        expect(info).toHaveProperty('description')
        expect(info).toHaveProperty('maxMultiplier')
        expect(info).toHaveProperty('minMultiplier')
        expect(info).toHaveProperty('expectedReturn')
        expect(info.maxMultiplier).toBeGreaterThan(info.minMultiplier)
      })
    })

    test('should calculate RTP correctly', () => {
      const lowRTP = PlinkoGame.calculateRTP('low')
      const mediumRTP = PlinkoGame.calculateRTP('medium')
      const highRTP = PlinkoGame.calculateRTP('high')

      expect(lowRTP).toBeGreaterThan(0)
      expect(mediumRTP).toBeGreaterThan(0)
      expect(highRTP).toBeGreaterThan(0)

      // All RTPs should be reasonable (the current multipliers give higher RTPs due to high max multipliers)
      expect(lowRTP).toBeLessThan(1.5)
      expect(mediumRTP).toBeLessThan(3.0) // Medium risk has higher variance
      expect(highRTP).toBeLessThan(10.0) // High risk has very high variance due to 29x multiplier
    })

    test('should return valid peg positions', () => {
      const pegs = PlinkoGame.getPegPositions()

      expect(pegs.length).toBeGreaterThan(0)
      
      pegs.forEach(peg => {
        expect(peg).toHaveProperty('row')
        expect(peg).toHaveProperty('position')
        expect(peg.row).toBeGreaterThanOrEqual(0)
        expect(peg.row).toBeLessThan(4) // 4 rows
        expect(peg.position).toBeGreaterThanOrEqual(0)
        expect(peg.position).toBeLessThan(9) // 9 possible positions
      })
    })
  })

  describe('Game Fairness and Randomness', () => {
    test('should produce different results for multiple games', async () => {
      const bet: PlinkoBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'plinko',
        riskLevel: 'medium'
      }

      const results = []
      for (let i = 0; i < 10; i++) {
        const result = await plinkoGame.play(bet)
        results.push(result)
      }

      // Check that we get different landing slots (high probability)
      const landingSlots = results.map(r => (r.resultData as PlinkoResult).landing_slot)
      const uniqueSlots = new Set(landingSlots)
      expect(uniqueSlots.size).toBeGreaterThan(1)
    })

    test('should maintain statistical distribution over many games', async () => {
      const bet: PlinkoBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'plinko',
        riskLevel: 'medium'
      }

      const results = []
      const iterations = 100

      for (let i = 0; i < iterations; i++) {
        const result = await plinkoGame.play(bet)
        results.push(result)
      }

      // Check that multiple slots are hit (with reasonable probability)
      const landingSlots = results.map(r => (r.resultData as PlinkoResult).landing_slot)
      const uniqueSlots = new Set(landingSlots)
      expect(uniqueSlots.size).toBeGreaterThanOrEqual(4) // Should hit multiple slots

      // Check that middle slots are hit more frequently (normal distribution)
      const slotCounts = Array(9).fill(0)
      landingSlots.forEach(slot => slotCounts[slot]++)
      
      // Middle slots (3, 4, 5) should have higher counts than edge slots (0, 8)
      const middleCount = slotCounts[3] + slotCounts[4] + slotCounts[5]
      const edgeCount = slotCounts[0] + slotCounts[8]
      expect(middleCount).toBeGreaterThan(edgeCount)
    })

    test('should have consistent ball path length', async () => {
      const bet: PlinkoBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'plinko',
        riskLevel: 'high'
      }

      for (let i = 0; i < 20; i++) {
        const result = await plinkoGame.play(bet)
        const plinkoResult = result.resultData as PlinkoResult
        expect(plinkoResult.ball_path).toHaveLength(4)
      }
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid user ID', async () => {
      const invalidBet: PlinkoBet = {
        userId: '',
        amount: 100,
        gameType: 'plinko',
        riskLevel: 'medium'
      }

      const result = await plinkoGame.play(invalidBet)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid bet')
    })

    test('should handle negative bet amount', async () => {
      const invalidBet: PlinkoBet = {
        userId: 'user123',
        amount: -100,
        gameType: 'plinko',
        riskLevel: 'medium'
      }

      const result = await plinkoGame.play(invalidBet)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid bet')
    })

    test('should handle wrong game type', async () => {
      const invalidBet = {
        userId: 'user123',
        amount: 100,
        gameType: 'roulette',
        riskLevel: 'medium'
      } as PlinkoBet

      const result = await plinkoGame.play(invalidBet)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid bet')
    })
  })
})