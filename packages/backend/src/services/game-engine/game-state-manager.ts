/**
 * Game state management system
 * Handles game session lifecycle and state persistence
 */

import { GameBet, GameResult, GameState, IGameStateManager } from './types'
import { randomUUID } from 'crypto'

export class GameStateManager implements IGameStateManager {
  private gameStates: Map<string, GameState> = new Map()

  /**
   * Create a new game state for a bet
   */
  async createGameState(bet: GameBet): Promise<GameState> {
    const gameId = randomUUID()
    const gameState: GameState = {
      gameId,
      userId: bet.userId,
      gameType: bet.gameType,
      betAmount: bet.amount,
      status: 'pending',
      createdAt: new Date()
    }

    this.gameStates.set(gameId, gameState)
    return gameState
  }

  /**
   * Update an existing game state
   */
  async updateGameState(gameId: string, updates: Partial<GameState>): Promise<GameState> {
    const existingState = this.gameStates.get(gameId)
    if (!existingState) {
      throw new Error(`Game state not found: ${gameId}`)
    }

    const updatedState: GameState = {
      ...existingState,
      ...updates
    }

    this.gameStates.set(gameId, updatedState)
    return updatedState
  }

  /**
   * Get game state by ID
   */
  async getGameState(gameId: string): Promise<GameState | null> {
    return this.gameStates.get(gameId) || null
  }

  /**
   * Complete a game and update state
   */
  async completeGame(gameId: string, result: GameResult): Promise<GameState> {
    const gameState = await this.getGameState(gameId)
    if (!gameState) {
      throw new Error(`Game state not found: ${gameId}`)
    }

    const updates: Partial<GameState> = {
      status: result.success ? 'completed' : 'cancelled',
      completedAt: new Date()
    }

    return await this.updateGameState(gameId, updates)
  }

  /**
   * Get all active games for a user
   */
  async getActiveGamesForUser(userId: string): Promise<GameState[]> {
    const activeGames: GameState[] = []
    
    for (const gameState of this.gameStates.values()) {
      if (gameState.userId === userId && gameState.status === 'active') {
        activeGames.push(gameState)
      }
    }

    return activeGames
  }

  /**
   * Get game history for a user (completed games)
   */
  async getGameHistoryForUser(userId: string, limit: number = 50): Promise<GameState[]> {
    const completedGames: GameState[] = []
    
    for (const gameState of this.gameStates.values()) {
      if (gameState.userId === userId && gameState.status === 'completed') {
        completedGames.push(gameState)
      }
    }

    // Sort by completion date (most recent first)
    completedGames.sort((a, b) => {
      const aTime = a.completedAt?.getTime() || a.createdAt.getTime()
      const bTime = b.completedAt?.getTime() || b.createdAt.getTime()
      return bTime - aTime
    })

    return completedGames.slice(0, limit)
  }

  /**
   * Clean up old game states (for memory management)
   */
  async cleanupOldStates(maxAgeHours: number = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)
    let cleanedCount = 0

    for (const [gameId, gameState] of this.gameStates.entries()) {
      const stateTime = gameState.completedAt || gameState.createdAt
      if (stateTime <= cutoffTime && gameState.status === 'completed') {
        this.gameStates.delete(gameId)
        cleanedCount++
      }
    }

    return cleanedCount
  }

  /**
   * Get game statistics
   */
  async getGameStatistics(): Promise<{
    totalGames: number
    activeGames: number
    completedGames: number
    gamesByType: Record<string, number>
  }> {
    const stats = {
      totalGames: this.gameStates.size,
      activeGames: 0,
      completedGames: 0,
      gamesByType: {} as Record<string, number>
    }

    for (const gameState of this.gameStates.values()) {
      // Count by status
      if (gameState.status === 'active') {
        stats.activeGames++
      } else if (gameState.status === 'completed') {
        stats.completedGames++
      }

      // Count by game type
      stats.gamesByType[gameState.gameType] = (stats.gamesByType[gameState.gameType] || 0) + 1
    }

    return stats
  }

  /**
   * Validate game state transitions
   */
  private validateStateTransition(currentStatus: GameState['status'], newStatus: GameState['status']): boolean {
    const validTransitions: Record<GameState['status'], GameState['status'][]> = {
      pending: ['active', 'cancelled'],
      active: ['completed', 'cancelled'],
      completed: [], // Terminal state
      cancelled: []  // Terminal state
    }

    return validTransitions[currentStatus]?.includes(newStatus) || false
  }

  /**
   * Force update game state (with validation)
   */
  async forceUpdateGameState(gameId: string, updates: Partial<GameState>): Promise<GameState> {
    const existingState = this.gameStates.get(gameId)
    if (!existingState) {
      throw new Error(`Game state not found: ${gameId}`)
    }

    // Validate status transition if status is being updated
    if (updates.status && !this.validateStateTransition(existingState.status, updates.status)) {
      throw new Error(`Invalid state transition from ${existingState.status} to ${updates.status}`)
    }

    return await this.updateGameState(gameId, updates)
  }

  /**
   * Check if user has any pending games
   */
  async hasPendingGames(userId: string): Promise<boolean> {
    for (const gameState of this.gameStates.values()) {
      if (gameState.userId === userId && (gameState.status === 'pending' || gameState.status === 'active')) {
        return true
      }
    }
    return false
  }

  /**
   * Cancel all pending games for a user
   */
  async cancelPendingGames(userId: string): Promise<number> {
    let cancelledCount = 0

    for (const gameState of this.gameStates.values()) {
      if (gameState.userId === userId && (gameState.status === 'pending' || gameState.status === 'active')) {
        await this.updateGameState(gameState.gameId, { 
          status: 'cancelled',
          completedAt: new Date()
        })
        cancelledCount++
      }
    }

    return cancelledCount
  }
}