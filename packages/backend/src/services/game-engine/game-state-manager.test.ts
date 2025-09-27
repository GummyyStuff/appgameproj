/**
 * Tests for GameStateManager
 * Validates game state lifecycle management
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GameStateManager } from './game-state-manager'
import { GameBet, GameResult } from './types'

describe('GameStateManager', () => {
  let manager: GameStateManager

  beforeEach(() => {
    manager = new GameStateManager()
  })

  describe('createGameState', () => {
    it('should create a new game state', async () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }

      const gameState = await manager.createGameState(bet)

      expect(gameState.gameId).toBeDefined()
      expect(gameState.userId).toBe('user1')
      expect(gameState.gameType).toBe('roulette')
      expect(gameState.betAmount).toBe(100)
      expect(gameState.status).toBe('pending')
      expect(gameState.createdAt).toBeInstanceOf(Date)
      expect(gameState.completedAt).toBeUndefined()
    })

    it('should generate unique game IDs', async () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }

      const state1 = await manager.createGameState(bet)
      const state2 = await manager.createGameState(bet)

      expect(state1.gameId).not.toBe(state2.gameId)
    })
  })

  describe('updateGameState', () => {
    it('should update existing game state', async () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }

      const gameState = await manager.createGameState(bet)
      const updatedState = await manager.updateGameState(gameState.gameId, {
        status: 'active'
      })

      expect(updatedState.status).toBe('active')
      expect(updatedState.gameId).toBe(gameState.gameId)
      expect(updatedState.userId).toBe(gameState.userId)
    })

    it('should throw error for non-existent game', async () => {
      await expect(
        manager.updateGameState('non-existent', { status: 'active' })
      ).rejects.toThrow('Game state not found: non-existent')
    })

    it('should preserve unchanged fields', async () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }

      const gameState = await manager.createGameState(bet)
      const updatedState = await manager.updateGameState(gameState.gameId, {
        status: 'active'
      })

      expect(updatedState.userId).toBe(gameState.userId)
      expect(updatedState.betAmount).toBe(gameState.betAmount)
      expect(updatedState.gameType).toBe(gameState.gameType)
      expect(updatedState.createdAt).toEqual(gameState.createdAt)
    })
  })

  describe('getGameState', () => {
    it('should retrieve existing game state', async () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }

      const gameState = await manager.createGameState(bet)
      const retrieved = await manager.getGameState(gameState.gameId)

      expect(retrieved).toEqual(gameState)
    })

    it('should return null for non-existent game', async () => {
      const retrieved = await manager.getGameState('non-existent')
      expect(retrieved).toBeNull()
    })
  })

  describe('completeGame', () => {
    it('should complete a game successfully', async () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }

      const gameState = await manager.createGameState(bet)
      const result: GameResult = {
        success: true,
        winAmount: 200,
        resultData: {} as any
      }

      const completedState = await manager.completeGame(gameState.gameId, result)

      expect(completedState.status).toBe('completed')
      expect(completedState.completedAt).toBeInstanceOf(Date)
    })

    it('should handle failed games', async () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }

      const gameState = await manager.createGameState(bet)
      const result: GameResult = {
        success: false,
        winAmount: 0,
        resultData: {} as any,
        error: 'Game failed'
      }

      const completedState = await manager.completeGame(gameState.gameId, result)

      expect(completedState.status).toBe('cancelled')
      expect(completedState.completedAt).toBeInstanceOf(Date)
    })

    it('should throw error for non-existent game', async () => {
      const result: GameResult = {
        success: true,
        winAmount: 200,
        resultData: {} as any
      }

      await expect(
        manager.completeGame('non-existent', result)
      ).rejects.toThrow('Game state not found: non-existent')
    })
  })

  describe('getActiveGamesForUser', () => {
    it('should return active games for user', async () => {
      const bet1: GameBet = { userId: 'user1', amount: 100, gameType: 'roulette' }
      const bet2: GameBet = { userId: 'user1', amount: 50, gameType: 'blackjack' }

      const state1 = await manager.createGameState(bet1)
      const state2 = await manager.createGameState(bet2)

      await manager.updateGameState(state1.gameId, { status: 'active' })
      await manager.updateGameState(state2.gameId, { status: 'active' })

      const activeGames = await manager.getActiveGamesForUser('user1')

      expect(activeGames).toHaveLength(2)
      expect(activeGames.map(g => g.gameId)).toContain(state1.gameId)
      expect(activeGames.map(g => g.gameId)).toContain(state2.gameId)
      expect(activeGames.map(g => g.gameId)).not.toContain(state3.gameId)
    })

    it('should return empty array for user with no active games', async () => {
      const activeGames = await manager.getActiveGamesForUser('user1')
      expect(activeGames).toHaveLength(0)
    })
  })

  describe('getGameHistoryForUser', () => {
    it('should return completed games for user', async () => {
      const bet: GameBet = { userId: 'user1', amount: 100, gameType: 'roulette' }
      const gameState = await manager.createGameState(bet)
      
      const result: GameResult = {
        success: true,
        winAmount: 200,
        resultData: {} as any
      }

      await manager.completeGame(gameState.gameId, result)
      const history = await manager.getGameHistoryForUser('user1')

      expect(history).toHaveLength(1)
      expect(history[0].gameId).toBe(gameState.gameId)
      expect(history[0].status).toBe('completed')
    })

    it('should respect limit parameter', async () => {
      const bet: GameBet = { userId: 'user1', amount: 100, gameType: 'roulette' }
      const result: GameResult = {
        success: true,
        winAmount: 200,
        resultData: {} as any
      }

      // Create multiple completed games
      for (let i = 0; i < 5; i++) {
        const state = await manager.createGameState(bet)
        await manager.completeGame(state.gameId, result)
      }

      const history = await manager.getGameHistoryForUser('user1', 3)
      expect(history).toHaveLength(3)
    })

    it('should sort by completion date (most recent first)', async () => {
      const bet: GameBet = { userId: 'user1', amount: 100, gameType: 'roulette' }
      const result: GameResult = {
        success: true,
        winAmount: 200,
        resultData: {} as any
      }

      const state1 = await manager.createGameState(bet)
      await manager.completeGame(state1.gameId, result)
      
      await new Promise(resolve => setTimeout(resolve, 10)) // Small delay
      
      const state2 = await manager.createGameState(bet)
      await manager.completeGame(state2.gameId, result)

      const history = await manager.getGameHistoryForUser('user1')
      expect(history[0].gameId).toBe(state2.gameId) // More recent first
      expect(history[1].gameId).toBe(state1.gameId)
    })
  })

  describe('cleanupOldStates', () => {
    it('should clean up old completed games', async () => {
      const bet: GameBet = { userId: 'user1', amount: 100, gameType: 'roulette' }
      const gameState = await manager.createGameState(bet)
      
      const result: GameResult = {
        success: true,
        winAmount: 200,
        resultData: {} as any
      }

      await manager.completeGame(gameState.gameId, result)
      
      // Clean up games older than 0 hours (should clean everything)
      const cleanedCount = await manager.cleanupOldStates(0)
      expect(cleanedCount).toBe(1)

      const retrieved = await manager.getGameState(gameState.gameId)
      expect(retrieved).toBeNull()
    })

    it('should not clean up recent games', async () => {
      const bet: GameBet = { userId: 'user1', amount: 100, gameType: 'roulette' }
      const gameState = await manager.createGameState(bet)
      
      const result: GameResult = {
        success: true,
        winAmount: 200,
        resultData: {} as any
      }

      await manager.completeGame(gameState.gameId, result)
      
      // Clean up games older than 24 hours (should not clean recent games)
      const cleanedCount = await manager.cleanupOldStates(24)
      expect(cleanedCount).toBe(0)

      const retrieved = await manager.getGameState(gameState.gameId)
      expect(retrieved).not.toBeNull()
    })

    it('should not clean up active games', async () => {
      const bet: GameBet = { userId: 'user1', amount: 100, gameType: 'roulette' }
      const gameState = await manager.createGameState(bet)
      await manager.updateGameState(gameState.gameId, { status: 'active' })
      
      const cleanedCount = await manager.cleanupOldStates(0)
      expect(cleanedCount).toBe(0)

      const retrieved = await manager.getGameState(gameState.gameId)
      expect(retrieved).not.toBeNull()
    })
  })

  describe('getGameStatistics', () => {
    it('should return correct statistics', async () => {
      const bet1: GameBet = { userId: 'user1', amount: 100, gameType: 'roulette' }
      const bet2: GameBet = { userId: 'user1', amount: 50, gameType: 'blackjack' }
      const bet3: GameBet = { userId: 'user2', amount: 75, gameType: 'roulette' }

      const state1 = await manager.createGameState(bet1)
      const state2 = await manager.createGameState(bet2)
      const state3 = await manager.createGameState(bet3)

      await manager.updateGameState(state1.gameId, { status: 'active' })
      await manager.completeGame(state2.gameId, { success: true, winAmount: 100, resultData: {} as any })

      const stats = await manager.getGameStatistics()

      expect(stats.totalGames).toBe(3)
      expect(stats.activeGames).toBe(1)
      expect(stats.completedGames).toBe(1)
      expect(stats.gamesByType.roulette).toBe(2)
      expect(stats.gamesByType.blackjack).toBe(1)
    })
  })

  describe('hasPendingGames', () => {
    it('should detect pending games', async () => {
      const bet: GameBet = { userId: 'user1', amount: 100, gameType: 'roulette' }
      await manager.createGameState(bet)

      const hasPending = await manager.hasPendingGames('user1')
      expect(hasPending).toBe(true)
    })

    it('should detect active games as pending', async () => {
      const bet: GameBet = { userId: 'user1', amount: 100, gameType: 'roulette' }
      const state = await manager.createGameState(bet)
      await manager.updateGameState(state.gameId, { status: 'active' })

      const hasPending = await manager.hasPendingGames('user1')
      expect(hasPending).toBe(true)
    })

    it('should return false for completed games', async () => {
      const bet: GameBet = { userId: 'user1', amount: 100, gameType: 'roulette' }
      const state = await manager.createGameState(bet)
      await manager.completeGame(state.gameId, { success: true, winAmount: 100, resultData: {} as any })

      const hasPending = await manager.hasPendingGames('user1')
      expect(hasPending).toBe(false)
    })
  })

  describe('cancelPendingGames', () => {
    it('should cancel pending and active games', async () => {
      const bet1: GameBet = { userId: 'user1', amount: 100, gameType: 'roulette' }
      const bet2: GameBet = { userId: 'user1', amount: 50, gameType: 'blackjack' }

      const state1 = await manager.createGameState(bet1)
      const state2 = await manager.createGameState(bet2)
      await manager.updateGameState(state2.gameId, { status: 'active' })

      const cancelledCount = await manager.cancelPendingGames('user1')
      expect(cancelledCount).toBe(2)

      const updatedState1 = await manager.getGameState(state1.gameId)
      const updatedState2 = await manager.getGameState(state2.gameId)

      expect(updatedState1?.status).toBe('cancelled')
      expect(updatedState2?.status).toBe('cancelled')
    })

    it('should not cancel completed games', async () => {
      const bet: GameBet = { userId: 'user1', amount: 100, gameType: 'roulette' }
      const state = await manager.createGameState(bet)
      await manager.completeGame(state.gameId, { success: true, winAmount: 100, resultData: {} as any })

      const cancelledCount = await manager.cancelPendingGames('user1')
      expect(cancelledCount).toBe(0)

      const updatedState = await manager.getGameState(state.gameId)
      expect(updatedState?.status).toBe('completed')
    })
  })
})