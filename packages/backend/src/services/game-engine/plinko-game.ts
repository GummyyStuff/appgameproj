/**
 * Plinko Game Implementation
 * Handles physics simulation, risk levels, and payout calculations for plinko
 */

import { BaseGame, GameBet, GameResult, ProvablyFairSeed } from './types'
import { PlinkoResult, GameResultData } from '../../types/database'
import { SecureRandomGenerator } from './random-generator'
import { PayoutCalculator } from './payout-calculator'

export interface PlinkoBet extends GameBet {
  gameType: 'plinko'
  riskLevel: 'low' | 'medium' | 'high'
}

export class PlinkoGame extends BaseGame {
  private randomGenerator: SecureRandomGenerator
  private payoutCalculator: PayoutCalculator

  // Plinko board configuration
  private static readonly BOARD_ROWS = 4 // Number of peg rows
  private static readonly SLOTS = 9 // Number of landing slots (0-8)
  private static readonly STARTING_POSITION = 4 // Middle starting position

  constructor() {
    super('plinko', 1, 10000)
    this.randomGenerator = new SecureRandomGenerator()
    this.payoutCalculator = new PayoutCalculator()
  }

  /**
   * Play a plinko game
   */
  async play(bet: PlinkoBet): Promise<GameResult> {
    try {
      // Validate bet
      if (!this.validateBaseBet(bet) || !this.validateGameSpecificBet(bet)) {
        return {
          success: false,
          winAmount: 0,
          resultData: {} as GameResultData,
          error: 'Invalid bet'
        }
      }

      // Generate provably fair result
      const serverSeed = await this.randomGenerator.generateSeed()
      const clientSeed = await this.randomGenerator.generateSeed() // In real implementation, from client
      const nonce = Math.floor(Math.random() * 1000000)

      const seed: ProvablyFairSeed = { serverSeed, clientSeed, nonce }

      // Simulate ball drop physics
      const ballPath = await this.simulateBallDrop(seed)
      const landingSlot = this.calculateLandingSlot(ballPath)
      const multiplier = this.payoutCalculator.getPlinkoMultiplier(bet.riskLevel, landingSlot)

      // Create result data
      const resultData: PlinkoResult = {
        risk_level: bet.riskLevel,
        ball_path: ballPath,
        multiplier,
        landing_slot: landingSlot
      }

      // Calculate payout
      const winAmount = this.calculatePayout(bet, resultData)

      return {
        success: true,
        winAmount,
        resultData: resultData as GameResultData
      }
    } catch (error) {
      console.error('Plinko game error:', error)
      return {
        success: false,
        winAmount: 0,
        resultData: {} as GameResultData,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Calculate payout for plinko result
   */
  calculatePayout(bet: PlinkoBet, result: GameResultData): number {
    const plinkoResult = result as PlinkoResult
    return this.payoutCalculator.calculatePlinkoPayout(
      plinkoResult.multiplier,
      bet.amount
    )
  }

  /**
   * Validate plinko-specific bet parameters
   */
  validateGameSpecificBet(bet: PlinkoBet): boolean {
    if (!bet.riskLevel || !this.isValidRiskLevel(bet.riskLevel)) {
      return false
    }

    return true
  }

  /**
   * Simulate ball drop physics using provably fair randomization
   */
  private async simulateBallDrop(seed: ProvablyFairSeed): Promise<number[]> {
    // Generate random values for each peg row
    const randomValues = await this.randomGenerator.generateMultipleFromSeed(
      seed, 
      PlinkoGame.BOARD_ROWS
    )

    // Convert random values to left (0) or right (1) movements
    const ballPath = randomValues.map(value => value < 0.5 ? 0 : 1)

    return ballPath
  }

  /**
   * Calculate final landing slot based on ball path
   */
  private calculateLandingSlot(ballPath: number[]): number {
    let position = PlinkoGame.STARTING_POSITION

    // Apply each movement in the ball path
    for (const movement of ballPath) {
      if (movement === 0) {
        position = Math.max(0, position - 1) // Move left, don't go below 0
      } else {
        position = Math.min(PlinkoGame.SLOTS - 1, position + 1) // Move right, don't exceed max slot
      }
    }

    return position
  }

  /**
   * Check if risk level is valid
   */
  private isValidRiskLevel(riskLevel: string): riskLevel is PlinkoBet['riskLevel'] {
    const validLevels = ['low', 'medium', 'high']
    return validLevels.includes(riskLevel)
  }

  /**
   * Get multipliers for all risk levels and slots
   */
  static getMultiplierTable(): Record<string, number[]> {
    return {
      low: [1.5, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.5],
      medium: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
      high: [29, 4, 1.5, 1.1, 1.0, 1.1, 1.5, 4, 29]
    }
  }

  /**
   * Get board configuration for display purposes
   */
  static getBoardConfig(): {
    rows: number
    slots: number
    startingPosition: number
    multipliers: Record<string, number[]>
  } {
    return {
      rows: PlinkoGame.BOARD_ROWS,
      slots: PlinkoGame.SLOTS,
      startingPosition: PlinkoGame.STARTING_POSITION,
      multipliers: PlinkoGame.getMultiplierTable()
    }
  }

  /**
   * Validate ball path for result verification
   */
  static validateBallPath(ballPath: number[], expectedSlot: number): boolean {
    if (ballPath.length !== PlinkoGame.BOARD_ROWS) {
      return false
    }

    // Check that all movements are 0 or 1
    if (!ballPath.every(move => move === 0 || move === 1)) {
      return false
    }

    // Calculate expected landing slot
    let position = PlinkoGame.STARTING_POSITION
    for (const movement of ballPath) {
      if (movement === 0) {
        position = Math.max(0, position - 1)
      } else {
        position = Math.min(PlinkoGame.SLOTS - 1, position + 1)
      }
    }

    return position === expectedSlot
  }

  /**
   * Get risk level descriptions and expected returns
   */
  static getRiskLevelInfo(): Record<string, { 
    description: string
    maxMultiplier: number
    minMultiplier: number
    expectedReturn: number
  }> {
    const multipliers = PlinkoGame.getMultiplierTable()
    
    return {
      low: {
        description: 'Lower risk with consistent smaller wins',
        maxMultiplier: Math.max(...multipliers.low),
        minMultiplier: Math.min(...multipliers.low),
        expectedReturn: 0.98 // Slightly below 1.0 for house edge
      },
      medium: {
        description: 'Balanced risk with moderate potential wins',
        maxMultiplier: Math.max(...multipliers.medium),
        minMultiplier: Math.min(...multipliers.medium),
        expectedReturn: 0.99
      },
      high: {
        description: 'High risk with potential for massive wins',
        maxMultiplier: Math.max(...multipliers.high),
        minMultiplier: Math.min(...multipliers.high),
        expectedReturn: 0.99
      }
    }
  }

  /**
   * Calculate theoretical return to player (RTP) for a risk level
   */
  static calculateRTP(riskLevel: 'low' | 'medium' | 'high'): number {
    const multipliers = PlinkoGame.getMultiplierTable()[riskLevel]
    
    // Assuming equal probability for each slot (simplified)
    const averageMultiplier = multipliers.reduce((sum, mult) => sum + mult, 0) / multipliers.length
    
    return averageMultiplier
  }

  /**
   * Get peg positions for visual representation
   */
  static getPegPositions(): { row: number; position: number }[] {
    const pegs: { row: number; position: number }[] = []
    
    for (let row = 0; row < PlinkoGame.BOARD_ROWS; row++) {
      // Each row has one more peg than the previous, centered
      const pegsInRow = row + 2
      const startPosition = (PlinkoGame.SLOTS - pegsInRow) / 2
      
      for (let peg = 0; peg < pegsInRow; peg++) {
        pegs.push({
          row,
          position: startPosition + peg
        })
      }
    }
    
    return pegs
  }
}