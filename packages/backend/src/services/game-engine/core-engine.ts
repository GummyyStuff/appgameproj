/**
 * Core game engine implementation
 * Orchestrates all game components for provably fair gaming
 */

import { GameBet, GameResult, IGameEngine, ProvablyFairSeed, ProvablyFairResult } from './types'
import { SecureRandomGenerator } from './random-generator'
import { PayoutCalculator } from './payout-calculator'
import { GameValidator } from './game-validator'
import { GameStateManager } from './game-state-manager'
import { GameResultData } from '../../types/database'

export class CoreGameEngine implements IGameEngine {
  private randomGenerator: SecureRandomGenerator
  private payoutCalculator: PayoutCalculator
  private gameValidator: GameValidator
  private gameStateManager: GameStateManager

  constructor() {
    this.randomGenerator = new SecureRandomGenerator()
    this.payoutCalculator = new PayoutCalculator()
    this.gameValidator = new GameValidator()
    this.gameStateManager = new GameStateManager()
  }

  /**
   * Validate a bet before processing
   */
  async validateBet(bet: GameBet): Promise<boolean> {
    try {
      // Basic bet validation
      if (!bet.userId || bet.amount <= 0 || bet.amount > 10000) {
        return false
      }

      // Game type validation
      const validGameTypes = ['roulette', 'blackjack', 'plinko']
      if (!validGameTypes.includes(bet.gameType)) {
        return false
      }

      // Check for pending games (prevent concurrent games)
      const hasPending = await this.gameStateManager.hasPendingGames(bet.userId)
      if (hasPending) {
        return false
      }

      return true
    } catch (error) {
      console.error('Bet validation error:', error)
      return false
    }
  }

  /**
   * Generate provably fair result
   */
  async generateProvablyFairResult(seed: ProvablyFairSeed): Promise<ProvablyFairResult> {
    return await this.randomGenerator.generateProvablyFairResult(seed)
  }

  /**
   * Calculate payout for a game result
   */
  calculatePayout(bet: GameBet, result: GameResultData): number {
    switch (bet.gameType) {
      case 'roulette':
        const rouletteResult = result as any
        return this.payoutCalculator.calculateRoulettePayout(
          rouletteResult.bet_type,
          rouletteResult.bet_value,
          rouletteResult.winning_number,
          bet.amount
        )
      case 'blackjack':
        const blackjackResult = result as any
        return this.payoutCalculator.calculateBlackjackPayout(
          blackjackResult.result,
          bet.amount
        )
      case 'plinko':
        const plinkoResult = result as any
        return this.payoutCalculator.calculatePlinkoPayout(
          plinkoResult.multiplier,
          bet.amount
        )
      default:
        return 0
    }
  }

  /**
   * Process a complete game from bet to result
   */
  async processGame(bet: GameBet): Promise<GameResult> {
    try {
      // Validate bet first
      const isValidBet = await this.validateBet(bet)
      if (!isValidBet) {
        return {
          success: false,
          winAmount: 0,
          resultData: {} as GameResultData,
          error: 'Invalid bet'
        }
      }

      // Create game state
      const gameState = await this.gameStateManager.createGameState(bet)
      await this.gameStateManager.updateGameState(gameState.gameId, { status: 'active' })

      // Generate provably fair seeds
      const serverSeed = await this.randomGenerator.generateSeed()
      const clientSeed = await this.randomGenerator.generateSeed() // In real implementation, this comes from client
      const nonce = Math.floor(Math.random() * 1000000)

      const seed: ProvablyFairSeed = { serverSeed, clientSeed, nonce }

      // Generate game result based on game type
      let resultData: GameResultData
      let winAmount: number

      switch (bet.gameType) {
        case 'roulette':
          resultData = await this.generateRouletteResult(seed, bet)
          break
        case 'blackjack':
          resultData = await this.generateBlackjackResult(seed, bet)
          break
        case 'plinko':
          resultData = await this.generatePlinkoResult(seed, bet)
          break
        default:
          throw new Error(`Unsupported game type: ${bet.gameType}`)
      }

      // Calculate payout
      winAmount = this.calculatePayout(bet, resultData)

      // Validate result
      const isValidResult = this.gameValidator.validateGameResult(bet.gameType, resultData)
      const isValidPayout = this.gameValidator.validatePayout(bet, resultData, winAmount)

      if (!isValidResult || !isValidPayout) {
        await this.gameStateManager.updateGameState(gameState.gameId, { status: 'cancelled' })
        return {
          success: false,
          winAmount: 0,
          resultData,
          gameId: gameState.gameId,
          error: 'Invalid game result or payout'
        }
      }

      // Complete game
      const result: GameResult = {
        success: true,
        winAmount,
        resultData,
        gameId: gameState.gameId
      }

      await this.gameStateManager.completeGame(gameState.gameId, result)

      return result
    } catch (error) {
      console.error('Game processing error:', error)
      return {
        success: false,
        winAmount: 0,
        resultData: {} as GameResultData,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generate roulette game result
   */
  private async generateRouletteResult(seed: ProvablyFairSeed, bet: GameBet): Promise<GameResultData> {
    const fairResult = await this.generateProvablyFairResult(seed)
    const winningNumber = Math.floor(fairResult.randomValue * 37) // 0-36

    // For demo purposes, assume a simple number bet
    const rouletteResult = {
      bet_type: 'number',
      bet_value: Math.floor(Math.random() * 37), // Random bet for demo
      winning_number: winningNumber,
      multiplier: winningNumber === Number(bet.amount) ? 35 : 0
    }

    return rouletteResult as GameResultData
  }

  /**
   * Generate blackjack game result
   */
  private async generateBlackjackResult(seed: ProvablyFairSeed, bet: GameBet): Promise<GameResultData> {
    // Generate multiple random values for card dealing
    const randomValues = await this.randomGenerator.generateMultipleFromSeed(seed, 10)
    
    // Simple blackjack simulation
    const playerCards = this.dealCards(randomValues.slice(0, 2))
    const dealerCards = this.dealCards(randomValues.slice(2, 4))
    
    const playerValue = this.calculateHandValue(playerCards)
    const dealerValue = this.calculateHandValue(dealerCards)
    
    let result: string
    if (playerValue > 21) {
      result = 'bust'
    } else if (dealerValue > 21) {
      result = 'player_win'
    } else if (playerValue > dealerValue) {
      result = 'player_win'
    } else if (dealerValue > playerValue) {
      result = 'dealer_win'
    } else {
      result = 'push'
    }

    const blackjackResult = {
      player_hand: playerCards,
      dealer_hand: dealerCards,
      player_value: playerValue,
      dealer_value: dealerValue,
      result
    }

    return blackjackResult as GameResultData
  }

  /**
   * Generate plinko game result
   */
  private async generatePlinkoResult(seed: ProvablyFairSeed, bet: any): Promise<GameResultData> {
    const riskLevel = bet.riskLevel || 'medium' // Use bet risk level or default
    const pathLength = 4 // Number of pegs to bounce off
    
    // Generate ball path
    const randomValues = await this.randomGenerator.generateMultipleFromSeed(seed, pathLength)
    const ballPath = randomValues.map(val => val < 0.5 ? 0 : 1)
    
    // Calculate landing slot - start at position 4 (middle)
    let position = 4
    for (const move of ballPath) {
      position += move === 0 ? -1 : 1
    }
    const landingSlot = Math.max(0, Math.min(8, position))
    
    // Get multiplier for slot
    const multiplier = this.payoutCalculator.getPlinkoMultiplier(riskLevel, landingSlot)

    const plinkoResult = {
      risk_level: riskLevel,
      ball_path: ballPath,
      multiplier,
      landing_slot: landingSlot
    }

    return plinkoResult as GameResultData
  }

  /**
   * Deal cards from random values
   */
  private dealCards(randomValues: number[]): any[] {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades']
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    
    return randomValues.map(random => ({
      suit: suits[Math.floor(random * suits.length)],
      value: values[Math.floor(random * values.length)]
    }))
  }

  /**
   * Calculate blackjack hand value
   */
  private calculateHandValue(cards: any[]): number {
    let value = 0
    let aces = 0

    for (const card of cards) {
      if (card.value === 'A') {
        aces++
        value += 11
      } else if (['J', 'Q', 'K'].includes(card.value)) {
        value += 10
      } else {
        value += parseInt(card.value)
      }
    }

    while (value > 21 && aces > 0) {
      value -= 10
      aces--
    }

    return value
  }

  /**
   * Get game engine statistics
   */
  async getEngineStatistics() {
    return await this.gameStateManager.getGameStatistics()
  }

  /**
   * Cleanup old game states
   */
  async cleanup(maxAgeHours: number = 24) {
    return await this.gameStateManager.cleanupOldStates(maxAgeHours)
  }
}