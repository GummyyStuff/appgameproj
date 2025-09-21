/**
 * Simplified Plinko API Tests
 * Basic tests for plinko game endpoints without full database integration
 */

import { describe, test, expect } from 'bun:test'
import { PlinkoGame } from '../services/game-engine/plinko-game'

describe('Plinko Game Integration', () => {
  describe('Game Logic Integration', () => {
    test('should create plinko game and play successfully', async () => {
      const plinkoGame = new PlinkoGame()
      
      const bet = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100,
        gameType: 'plinko' as const,
        riskLevel: 'medium' as const
      }

      const result = await plinkoGame.play(bet)

      expect(result.success).toBe(true)
      expect(result.winAmount).toBeGreaterThanOrEqual(0)
      expect(result.resultData).toBeDefined()
      
      const plinkoResult = result.resultData as any
      expect(plinkoResult.risk_level).toBe('medium')
      expect(plinkoResult.ball_path).toHaveLength(4)
      expect(plinkoResult.landing_slot).toBeGreaterThanOrEqual(0)
      expect(plinkoResult.landing_slot).toBeLessThan(9)
    })

    test('should handle all risk levels correctly', async () => {
      const plinkoGame = new PlinkoGame()
      const riskLevels = ['low', 'medium', 'high'] as const

      for (const riskLevel of riskLevels) {
        const bet = {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 50,
          gameType: 'plinko' as const,
          riskLevel
        }

        const result = await plinkoGame.play(bet)

        expect(result.success).toBe(true)
        const plinkoResult = result.resultData as any
        expect(plinkoResult.risk_level).toBe(riskLevel)
      }
    })

    test('should validate bet parameters correctly', () => {
      const plinkoGame = new PlinkoGame()

      // Valid bet
      const validBet = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100,
        gameType: 'plinko' as const,
        riskLevel: 'medium' as const
      }
      expect(plinkoGame.validateGameSpecificBet(validBet)).toBe(true)

      // Invalid risk level
      const invalidBet = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100,
        gameType: 'plinko' as const,
        riskLevel: 'invalid' as any
      }
      expect(plinkoGame.validateGameSpecificBet(invalidBet)).toBe(false)
    })

    test('should calculate payouts correctly', () => {
      const plinkoGame = new PlinkoGame()

      const bet = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100,
        gameType: 'plinko' as const,
        riskLevel: 'high' as const
      }

      const resultData = {
        risk_level: 'high',
        ball_path: [0, 0, 0, 0],
        multiplier: 29,
        landing_slot: 0
      }

      const payout = plinkoGame.calculatePayout(bet, resultData)
      expect(payout).toBe(2900) // 100 * 29
    })
  })

  describe('Static Configuration', () => {
    test('should return correct board configuration', () => {
      const config = PlinkoGame.getBoardConfig()

      expect(config.rows).toBe(4)
      expect(config.slots).toBe(9)
      expect(config.startingPosition).toBe(4)
      expect(config.multipliers).toBeDefined()
      expect(config.multipliers.low).toHaveLength(9)
      expect(config.multipliers.medium).toHaveLength(9)
      expect(config.multipliers.high).toHaveLength(9)
    })

    test('should return risk level information', () => {
      const riskInfo = PlinkoGame.getRiskLevelInfo()

      expect(riskInfo.low).toBeDefined()
      expect(riskInfo.medium).toBeDefined()
      expect(riskInfo.high).toBeDefined()

      // Check that high risk has higher max multiplier than low risk
      expect(riskInfo.high.maxMultiplier).toBeGreaterThan(riskInfo.low.maxMultiplier)
    })

    test('should return valid peg positions', () => {
      const pegs = PlinkoGame.getPegPositions()

      expect(pegs.length).toBeGreaterThan(0)
      
      pegs.forEach(peg => {
        expect(peg.row).toBeGreaterThanOrEqual(0)
        expect(peg.row).toBeLessThan(4)
        expect(peg.position).toBeGreaterThanOrEqual(0)
        expect(peg.position).toBeLessThan(9)
      })
    })

    test('should validate ball path physics correctly', () => {
      // Test various ball paths
      expect(PlinkoGame.validateBallPath([0, 0, 0, 0], 0)).toBe(true) // All left -> slot 0
      expect(PlinkoGame.validateBallPath([1, 1, 1, 1], 8)).toBe(true) // All right -> slot 8
      expect(PlinkoGame.validateBallPath([1, 0, 1, 0], 4)).toBe(true) // Mixed -> middle
      
      // Invalid paths
      expect(PlinkoGame.validateBallPath([0, 1], 2)).toBe(false) // Wrong length
      expect(PlinkoGame.validateBallPath([0, 1, 2, 0], 3)).toBe(false) // Invalid values
      expect(PlinkoGame.validateBallPath([0, 0, 0, 0], 5)).toBe(false) // Wrong expected slot
    })
  })

  describe('Game Fairness', () => {
    test('should produce varied results over multiple games', async () => {
      const plinkoGame = new PlinkoGame()
      const results = []

      const bet = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100,
        gameType: 'plinko' as const,
        riskLevel: 'medium' as const
      }

      // Play multiple games
      for (let i = 0; i < 20; i++) {
        const result = await plinkoGame.play(bet)
        expect(result.success).toBe(true)
        results.push(result.resultData as any)
      }

      // Check for variation in landing slots
      const landingSlots = results.map(r => r.landing_slot)
      const uniqueSlots = new Set(landingSlots)
      expect(uniqueSlots.size).toBeGreaterThan(1) // Should have some variation

      // Check that all results have valid structure
      results.forEach(result => {
        expect(result.ball_path).toHaveLength(4)
        expect(result.landing_slot).toBeGreaterThanOrEqual(0)
        expect(result.landing_slot).toBeLessThan(9)
        expect(result.multiplier).toBeGreaterThanOrEqual(0)
        expect(result.risk_level).toBe('medium')
      })
    })

    test('should maintain consistent physics across games', async () => {
      const plinkoGame = new PlinkoGame()

      const bet = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100,
        gameType: 'plinko' as const,
        riskLevel: 'low' as const
      }

      for (let i = 0; i < 10; i++) {
        const result = await plinkoGame.play(bet)
        const plinkoResult = result.resultData as any

        // Manually verify physics
        let position = 4 // Starting position
        for (const move of plinkoResult.ball_path) {
          if (move === 0) {
            position = Math.max(0, position - 1)
          } else {
            position = Math.min(8, position + 1)
          }
        }

        expect(plinkoResult.landing_slot).toBe(position)
      }
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid bet amounts', async () => {
      const plinkoGame = new PlinkoGame()

      const invalidBets = [
        { amount: 0, riskLevel: 'medium' },
        { amount: -100, riskLevel: 'medium' },
        { amount: 20000, riskLevel: 'medium' }
      ]

      for (const betData of invalidBets) {
        const bet = {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          gameType: 'plinko' as const,
          ...betData
        }

        const result = await plinkoGame.play(bet)
        expect(result.success).toBe(false)
        expect(result.error).toBe('Invalid bet')
      }
    })

    test('should handle invalid user IDs', async () => {
      const plinkoGame = new PlinkoGame()

      const bet = {
        userId: '',
        amount: 100,
        gameType: 'plinko' as const,
        riskLevel: 'medium' as const
      }

      const result = await plinkoGame.play(bet)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid bet')
    })

    test('should handle wrong game type', async () => {
      const plinkoGame = new PlinkoGame()

      const bet = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100,
        gameType: 'roulette' as any,
        riskLevel: 'medium' as const
      }

      const result = await plinkoGame.play(bet)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid bet')
    })
  })
})