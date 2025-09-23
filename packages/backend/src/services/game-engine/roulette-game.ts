/**
 * Roulette Game Implementation
 * Handles all roulette-specific game logic, betting validation, and payout calculations
 */

import { BaseGame, GameBet, GameResult, ProvablyFairSeed } from './types'
import { RouletteResult, GameResultData } from '../../types/database'
import { SecureRandomGenerator } from './random-generator'
import { PayoutCalculator } from './payout-calculator'

export interface RouletteBet extends GameBet {
  gameType: 'roulette'
  betType: 'number' | 'red' | 'black' | 'odd' | 'even' | 'low' | 'high' | 'dozen' | 'column'
  betValue: number | string
}

export class RouletteGame extends BaseGame {
  private randomGenerator: SecureRandomGenerator
  private payoutCalculator: PayoutCalculator

  // Roulette wheel configuration (European roulette: 0-36)
  private static readonly WHEEL_NUMBERS = Array.from({ length: 37 }, (_, i) => i)
  private static readonly RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
  private static readonly BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]

  constructor() {
    super('roulette', 1, 10000)
    this.randomGenerator = new SecureRandomGenerator()
    this.payoutCalculator = new PayoutCalculator()
  }

  /**
   * Play a roulette game
   */
  async play(bet: RouletteBet): Promise<GameResult> {
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
      const nonce = await this.randomGenerator.generateSecureRandomInt(0, 1_000_000)

      const seed: ProvablyFairSeed = { serverSeed, clientSeed, nonce }
      const fairResult = await this.randomGenerator.generateProvablyFairResult(seed)

      // Generate winning number (0-36)
      const winningNumber = Math.floor(fairResult.randomValue * 37)

      // Create result data
      const resultData: RouletteResult = {
        bet_type: bet.betType,
        bet_value: bet.betValue,
        winning_number: winningNumber,
        multiplier: this.calculateMultiplier(bet.betType, bet.betValue, winningNumber)
      }

      // Calculate payout
      const winAmount = this.calculatePayout(bet, resultData)

      return {
        success: true,
        winAmount,
        resultData: resultData as GameResultData
      }
    } catch (error) {
      console.error('Roulette game error:', error)
      return {
        success: false,
        winAmount: 0,
        resultData: {} as GameResultData,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Calculate payout for roulette result
   */
  calculatePayout(bet: RouletteBet, result: GameResultData): number {
    const rouletteResult = result as RouletteResult
    return this.payoutCalculator.calculateRoulettePayout(
      rouletteResult.bet_type,
      rouletteResult.bet_value,
      rouletteResult.winning_number,
      bet.amount
    )
  }

  /**
   * Validate roulette-specific bet parameters
   */
  validateGameSpecificBet(bet: RouletteBet): boolean {
    if (!bet.betType || !this.isValidBetType(bet.betType)) {
      return false
    }

    return this.validateBetValue(bet.betType, bet.betValue)
  }

  /**
   * Check if bet type is valid
   */
  private isValidBetType(betType: string): betType is RouletteBet['betType'] {
    const validTypes = ['number', 'red', 'black', 'odd', 'even', 'low', 'high', 'dozen', 'column']
    return validTypes.includes(betType)
  }

  /**
   * Validate bet value based on bet type
   */
  private validateBetValue(betType: RouletteBet['betType'], betValue: number | string): boolean {
    switch (betType) {
      case 'number':
        const num = Number(betValue)
        return Number.isInteger(num) && num >= 0 && num <= 36
      
      case 'red':
      case 'black':
      case 'odd':
      case 'even':
      case 'low':
      case 'high':
        return betValue === betType
      
      case 'dozen':
        const dozen = Number(betValue)
        return [1, 2, 3].includes(dozen)
      
      case 'column':
        const column = Number(betValue)
        return [1, 2, 3].includes(column)
      
      default:
        return false
    }
  }

  /**
   * Calculate multiplier for winning bet
   */
  private calculateMultiplier(betType: RouletteBet['betType'], betValue: number | string, winningNumber: number): number {
    if (!this.isWinningBet(betType, betValue, winningNumber)) {
      return 0
    }

    switch (betType) {
      case 'number':
        return 35 // 35:1 payout for straight number bet
      
      case 'red':
      case 'black':
      case 'odd':
      case 'even':
      case 'low':
      case 'high':
        return 1 // 1:1 payout for even money bets
      
      case 'dozen':
      case 'column':
        return 2 // 2:1 payout for dozen/column bets
      
      default:
        return 0
    }
  }

  /**
   * Check if a bet wins based on the winning number
   */
  private isWinningBet(betType: RouletteBet['betType'], betValue: number | string, winningNumber: number): boolean {
    // Zero always loses on outside bets
    if (winningNumber === 0 && betType !== 'number') {
      return false
    }

    switch (betType) {
      case 'number':
        return Number(betValue) === winningNumber
      
      case 'red':
        return RouletteGame.RED_NUMBERS.includes(winningNumber)
      
      case 'black':
        return RouletteGame.BLACK_NUMBERS.includes(winningNumber)
      
      case 'odd':
        return winningNumber > 0 && winningNumber % 2 === 1
      
      case 'even':
        return winningNumber > 0 && winningNumber % 2 === 0
      
      case 'low':
        return winningNumber >= 1 && winningNumber <= 18
      
      case 'high':
        return winningNumber >= 19 && winningNumber <= 36
      
      case 'dozen':
        const dozen = Number(betValue)
        if (dozen === 1) return winningNumber >= 1 && winningNumber <= 12
        if (dozen === 2) return winningNumber >= 13 && winningNumber <= 24
        if (dozen === 3) return winningNumber >= 25 && winningNumber <= 36
        return false
      
      case 'column':
        const column = Number(betValue)
        if (winningNumber === 0) return false
        return (winningNumber - column) % 3 === 0
      
      default:
        return false
    }
  }

  /**
   * Get all possible bet types and their descriptions
   */
  static getBetTypes(): Record<string, { description: string; payout: string; example: string }> {
    return {
      number: {
        description: 'Bet on a specific number (0-36)',
        payout: '35:1',
        example: 'Bet on number 17'
      },
      red: {
        description: 'Bet on red numbers',
        payout: '1:1',
        example: 'All red numbers win'
      },
      black: {
        description: 'Bet on black numbers',
        payout: '1:1',
        example: 'All black numbers win'
      },
      odd: {
        description: 'Bet on odd numbers (1-35)',
        payout: '1:1',
        example: '1, 3, 5, 7, etc.'
      },
      even: {
        description: 'Bet on even numbers (2-36)',
        payout: '1:1',
        example: '2, 4, 6, 8, etc.'
      },
      low: {
        description: 'Bet on low numbers (1-18)',
        payout: '1:1',
        example: 'Numbers 1 through 18'
      },
      high: {
        description: 'Bet on high numbers (19-36)',
        payout: '1:1',
        example: 'Numbers 19 through 36'
      },
      dozen: {
        description: 'Bet on dozens (1st: 1-12, 2nd: 13-24, 3rd: 25-36)',
        payout: '2:1',
        example: 'Bet on 1st dozen (1-12)'
      },
      column: {
        description: 'Bet on columns (1st, 2nd, or 3rd column)',
        payout: '2:1',
        example: 'Bet on 1st column'
      }
    }
  }

  /**
   * Get wheel layout for display purposes
   */
  static getWheelLayout(): { number: number; color: 'red' | 'black' | 'green' }[] {
    return RouletteGame.WHEEL_NUMBERS.map(num => ({
      number: num,
      color: num === 0 ? 'green' : 
             RouletteGame.RED_NUMBERS.includes(num) ? 'red' : 'black'
    }))
  }
}