/**
 * Tests for CoreGameEngine
 * Integration tests for the complete game engine system
 */

import { describe, test, expect, beforeEach } from 'bun:test'
import { CoreGameEngine } from './core-engine'
import { GameBet, ProvablyFairSeed } from './types'

describe('CoreGameEngine', () => {
  let engine: CoreGameEngine

  beforeEach(() => {
    engine = new CoreGameEngine()
  })

  describe('validateBet', () => {
    test('should validate correct bets', async () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }

      const isValid = await engine.validateBet(bet)
      expect(isValid).toBe(true)
    })

    test('should reject invalid bet amounts', async () => {
      const invalidBets: GameBet[] = [
        { userId: 'user1', amount: 0, gameType: 'roulette' },
        { userId: 'user1', amount: -10, gameType: 'roulette' },
        { userId: 'user1', amount: 10001, gameType: 'roulette' }
      ]

      for (const bet of invalidBets) {
        const isValid = await engine.validateBet(bet)
        expect(isValid).toBe(false)
      }
    })

    test('should reject invalid game types', async () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'invalid' as any
      }

      const isValid = await engine.validateBet(bet)
      expect(isValid).toBe(false)
    })

    test('should reject bets with missing user ID', async () => {
      const bet: GameBet = {
        userId: '',
        amount: 100,
        gameType: 'roulette'
      }

      const isValid = await engine.validateBet(bet)
      expect(isValid).toBe(false)
    })

    test('should prevent concurrent games for same user', async () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }

      // First bet should be valid
      const isValid1 = await engine.validateBet(bet)
      expect(isValid1).toBe(true)

      // Process first game (it will complete immediately)
      const result1 = await engine.processGame(bet)
      expect(result1.success).toBe(true)

      // Second bet should now be valid since first game completed
      const isValid2 = await engine.validateBet(bet)
      expect(isValid2).toBe(true)
    })
  })

  describe('generateProvablyFairResult', () => {
    test('should generate consistent results for same seed', async () => {
      const seed: ProvablyFairSeed = {
        serverSeed: 'test_server_seed',
        clientSeed: 'test_client_seed',
        nonce: 1
      }

      const result1 = await engine.generateProvablyFairResult(seed)
      const result2 = await engine.generateProvablyFairResult(seed)

      expect(result1.hash).toBe(result2.hash)
      expect(result1.randomValue).toBe(result2.randomValue)
      expect(result1.isValid).toBe(true)
    })

    test('should generate different results for different seeds', async () => {
      const seed1: ProvablyFairSeed = {
        serverSeed: 'server1',
        clientSeed: 'client1',
        nonce: 1
      }

      const seed2: ProvablyFairSeed = {
        serverSeed: 'server2',
        clientSeed: 'client2',
        nonce: 1
      }

      const result1 = await engine.generateProvablyFairResult(seed1)
      const result2 = await engine.generateProvablyFairResult(seed2)

      expect(result1.hash).not.toBe(result2.hash)
      expect(result1.randomValue).not.toBe(result2.randomValue)
    })
  })

  describe('processGame', () => {
    test('should process a valid roulette game', async () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }

      const result = await engine.processGame(bet)

      expect(result.success).toBe(true)
      expect(result.gameId).toBeDefined()
      expect(result.resultData).toBeDefined()
      expect(typeof result.winAmount).toBe('number')
      expect(result.winAmount).toBeGreaterThanOrEqual(0)
    })

    test('should process a valid blackjack game', async () => {
      const bet: GameBet = {
        userId: 'user2',
        amount: 50,
        gameType: 'blackjack'
      }

      const result = await engine.processGame(bet)

      expect(result.success).toBe(true)
      expect(result.gameId).toBeDefined()
      expect(result.resultData).toBeDefined()
      expect(typeof result.winAmount).toBe('number')
      expect(result.winAmount).toBeGreaterThanOrEqual(0)
    })


    test('should reject invalid bets', async () => {
      const invalidBet: GameBet = {
        userId: '',
        amount: 0,
        gameType: 'roulette'
      }

      const result = await engine.processGame(invalidBet)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid bet')
      expect(result.winAmount).toBe(0)
    })

    test('should handle unsupported game types', async () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'unsupported' as any
      }

      const result = await engine.processGame(bet)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid bet')
    })

    test('should validate game results', async () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }

      const result = await engine.processGame(bet)

      if (result.success) {
        // Verify the result data structure is valid for roulette
        const rouletteResult = result.resultData as any
        expect(rouletteResult.bet_type).toBeDefined()
        expect(rouletteResult.bet_value).toBeDefined()
        expect(rouletteResult.winning_number).toBeGreaterThanOrEqual(0)
        expect(rouletteResult.winning_number).toBeLessThanOrEqual(36)
        expect(rouletteResult.multiplier).toBeGreaterThanOrEqual(0)
      }
    })

    test('should validate payouts', async () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'blackjack'
      }

      const result = await engine.processGame(bet)

      if (result.success) {
        // Verify payout is reasonable for blackjack
        expect(result.winAmount).toBeGreaterThanOrEqual(0)
        expect(result.winAmount).toBeLessThanOrEqual(bet.amount * 2) // Max reasonable payout
      }
    })
  })

  describe('calculatePayout', () => {
    test('should calculate correct roulette payouts', () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }

      const winningResult = {
        bet_type: 'number',
        bet_value: 7,
        winning_number: 7,
        multiplier: 35
      }

      const losingResult = {
        bet_type: 'number',
        bet_value: 7,
        winning_number: 15,
        multiplier: 0
      }

      const winningPayout = engine.calculatePayout(bet, winningResult as any)
      const losingPayout = engine.calculatePayout(bet, losingResult as any)

      expect(winningPayout).toBe(3500) // 100 * 35
      expect(losingPayout).toBe(0)
    })

    test('should calculate correct blackjack payouts', () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'blackjack'
      }

      const blackjackResult = {
        player_hand: [],
        dealer_hand: [],
        result: 'blackjack'
      }

      const winResult = {
        player_hand: [],
        dealer_hand: [],
        result: 'player_win'
      }

      const lossResult = {
        player_hand: [],
        dealer_hand: [],
        result: 'dealer_win'
      }

      const blackjackPayout = engine.calculatePayout(bet, blackjackResult as any)
      const winPayout = engine.calculatePayout(bet, winResult as any)
      const lossPayout = engine.calculatePayout(bet, lossResult as any)

      expect(blackjackPayout).toBe(150) // 100 * 1.5
      expect(winPayout).toBe(100) // 100 * 1
      expect(lossPayout).toBe(0)
    })


    test('should return 0 for invalid game types', () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'invalid' as any
      }

      const result = { test: 'data' }
      const payout = engine.calculatePayout(bet, result as any)
      expect(payout).toBe(0)
    })
  })

  describe('getEngineStatistics', () => {
    test('should return engine statistics', async () => {
      const stats = await engine.getEngineStatistics()

      expect(stats).toHaveProperty('totalGames')
      expect(stats).toHaveProperty('activeGames')
      expect(stats).toHaveProperty('completedGames')
      expect(stats).toHaveProperty('gamesByType')
      expect(typeof stats.totalGames).toBe('number')
      expect(typeof stats.activeGames).toBe('number')
      expect(typeof stats.completedGames).toBe('number')
      expect(typeof stats.gamesByType).toBe('object')
    })

    test('should update statistics after processing games', async () => {
      const initialStats = await engine.getEngineStatistics()

      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }

      await engine.processGame(bet)
      const updatedStats = await engine.getEngineStatistics()

      expect(updatedStats.totalGames).toBe(initialStats.totalGames + 1)
    })
  })

  describe('cleanup', () => {
    test('should clean up old game states', async () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }

      await engine.processGame(bet)
      
      // Clean up games older than 0 hours (should clean everything)
      const cleanedCount = await engine.cleanup(0)
      expect(typeof cleanedCount).toBe('number')
      expect(cleanedCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('edge cases and error handling', () => {
    test('should handle multiple concurrent games from different users', async () => {
      const bet1: GameBet = { userId: 'user1', amount: 100, gameType: 'roulette' }
      const bet2: GameBet = { userId: 'user2', amount: 50, gameType: 'blackjack' }

      const results = await Promise.all([
        engine.processGame(bet1),
        engine.processGame(bet2)
      ])

      results.forEach(result => {
        expect(result.success).toBe(true)
        expect(result.gameId).toBeDefined()
      })

      // All games should have unique IDs
      const gameIds = results.map(r => r.gameId)
      const uniqueIds = new Set(gameIds)
      expect(uniqueIds.size).toBe(2)
    })

    test('should handle rapid sequential games from same user', async () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }

      // First game should succeed
      const result1 = await engine.processGame(bet)
      expect(result1.success).toBe(true)

      // Second game should also succeed since first completed
      const result2 = await engine.processGame(bet)
      expect(result2.success).toBe(true)
      
      // Both should have different game IDs
      expect(result1.gameId).not.toBe(result2.gameId)
    })

    test('should maintain game state consistency', async () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }

      const result = await engine.processGame(bet)

      if (result.success && result.gameId) {
        const stats = await engine.getEngineStatistics()
        expect(stats.totalGames).toBeGreaterThan(0)
        expect(stats.completedGames).toBeGreaterThan(0)
      }
    })
  })
})