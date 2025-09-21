/**
 * Core game engine types and interfaces
 */

import { GameResultData } from '../../types/database'

// Base game interfaces
export interface GameBet {
  userId: string
  amount: number
  gameType: 'roulette' | 'blackjack' | 'case_opening'
}

export interface GameResult {
  success: boolean
  winAmount: number
  resultData: GameResultData
  gameId?: string
  error?: string
  betAmount?: number
}

export interface GameState {
  gameId: string
  userId: string
  gameType: string
  betAmount: number
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  createdAt: Date
  completedAt?: Date
}

// Provably fair interfaces
export interface ProvablyFairSeed {
  serverSeed: string
  clientSeed: string
  nonce: number
}

export interface ProvablyFairResult {
  seed: ProvablyFairSeed
  hash: string
  randomValue: number
  isValid: boolean
}

// Game engine interface
export interface IGameEngine {
  validateBet(bet: GameBet): Promise<boolean>
  generateProvablyFairResult(seed: ProvablyFairSeed): Promise<ProvablyFairResult>
  calculatePayout(bet: GameBet, result: GameResultData): number
  processGame(bet: GameBet): Promise<GameResult>
}

// Abstract base game class
export abstract class BaseGame {
  protected gameType: string
  protected minBet: number
  protected maxBet: number

  constructor(gameType: string, minBet: number = 1, maxBet: number = 10000) {
    this.gameType = gameType
    this.minBet = minBet
    this.maxBet = maxBet
  }

  abstract play(bet: GameBet): Promise<GameResult>
  abstract calculatePayout(bet: GameBet, result: GameResultData): number
  abstract validateGameSpecificBet(bet: GameBet): boolean

  protected validateBaseBet(bet: GameBet): boolean {
    return (
      bet.amount >= this.minBet &&
      bet.amount <= this.maxBet &&
      bet.amount > 0 &&
      bet.gameType === this.gameType &&
      typeof bet.userId === 'string' &&
      bet.userId.length > 0
    )
  }
}

// Random number generation interface
export interface IRandomGenerator {
  generateSecureRandom(): Promise<number>
  generateSecureRandomInt(min: number, max: number): Promise<number>
  generateSecureBytes(length: number): Promise<Buffer>
  generateSeed(): Promise<string>
}

// Game state manager interface
export interface IGameStateManager {
  createGameState(bet: GameBet): Promise<GameState>
  updateGameState(gameId: string, updates: Partial<GameState>): Promise<GameState>
  getGameState(gameId: string): Promise<GameState | null>
  completeGame(gameId: string, result: GameResult): Promise<GameState>
}

// Payout calculator interface
export interface IPayoutCalculator {
  calculateRoulettePayout(betType: string, betValue: number | string, winningNumber: number, betAmount: number): number
  calculateBlackjackPayout(result: string, betAmount: number): number
  calculateCaseOpeningPayout(itemValue: number): number
}

// Game validation interface
export interface IGameValidator {
  validateGameResult(gameType: string, result: GameResultData): boolean
  validatePayout(bet: GameBet, result: GameResultData, payout: number): boolean
  validateProvablyFairResult(seed: ProvablyFairSeed, result: ProvablyFairResult): boolean
}