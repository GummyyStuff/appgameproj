/**
 * Payout calculation system for all casino games
 * Handles odds and multipliers for roulette, blackjack, and plinko
 */

import { IPayoutCalculator } from './types'

export class PayoutCalculator implements IPayoutCalculator {
  // Roulette payout multipliers
  private readonly ROULETTE_PAYOUTS = {
    number: 35,      // Single number bet (35:1)
    red: 1,          // Red/Black (1:1)
    black: 1,        // Red/Black (1:1)
    odd: 1,          // Odd/Even (1:1)
    even: 1,         // Odd/Even (1:1)
    low: 1,          // 1-18 (1:1)
    high: 1,         // 19-36 (1:1)
    dozen: 2,        // Dozens (2:1)
    column: 2        // Columns (2:1)
  } as const

  // Blackjack payout multipliers
  private readonly BLACKJACK_PAYOUTS = {
    blackjack: 1.5,     // Natural blackjack (3:2)
    win: 1,             // Regular win (1:1)
    push: 0,            // Tie (return bet)
    loss: -1            // Loss (lose bet)
  } as const

  // Plinko multipliers by risk level
  private readonly PLINKO_MULTIPLIERS = {
    low: [1.5, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.5],
    medium: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    high: [29, 4, 1.5, 1.1, 1.0, 1.1, 1.5, 4, 29]
  } as const

  /**
   * Calculate roulette payout based on bet type and winning number
   */
  calculateRoulettePayout(
    betType: string, 
    betValue: number | string, 
    winningNumber: number, 
    betAmount: number
  ): number {
    if (!this.isValidRouletteBet(betType, betValue, winningNumber)) {
      return 0
    }

    const isWinningBet = this.isWinningRouletteBet(betType, betValue, winningNumber)
    if (!isWinningBet) {
      return 0
    }

    const multiplier = this.ROULETTE_PAYOUTS[betType as keyof typeof this.ROULETTE_PAYOUTS]
    return betAmount * multiplier
  }

  /**
   * Calculate blackjack payout based on game result
   */
  calculateBlackjackPayout(result: string, betAmount: number): number {
    switch (result) {
      case 'blackjack':
        return betAmount * 1.5 // 3:2 payout (1.5x winnings)
      case 'player_win':
        return betAmount * 1 // 1:1 payout (1x winnings)
      case 'push':
        return 0 // No winnings, bet is returned separately
      case 'dealer_win':
      case 'bust':
      case 'dealer_blackjack':
        return 0 // Loss (no winnings)
      default:
        return 0
    }
  }

  /**
   * Calculate plinko payout based on multiplier
   */
  calculatePlinkoPayout(multiplier: number, betAmount: number): number {
    if (multiplier < 0) {
      return 0
    }
    return betAmount * multiplier
  }

  /**
   * Get plinko multiplier for specific slot and risk level
   */
  getPlinkoMultiplier(riskLevel: 'low' | 'medium' | 'high', slot: number): number {
    const multipliers = this.PLINKO_MULTIPLIERS[riskLevel]
    if (slot < 0 || slot >= multipliers.length) {
      return 0
    }
    return multipliers[slot]
  }

  /**
   * Validate if a roulette bet is valid and winning
   */
  private isWinningRouletteBet(betType: string, betValue: number | string, winningNumber: number): boolean {
    switch (betType) {
      case 'number':
        return Number(betValue) === winningNumber
      case 'red':
        return this.isRedNumber(winningNumber)
      case 'black':
        return this.isBlackNumber(winningNumber)
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
        if (column === 1) return winningNumber > 0 && winningNumber % 3 === 1
        if (column === 2) return winningNumber > 0 && winningNumber % 3 === 2
        if (column === 3) return winningNumber > 0 && winningNumber % 3 === 0
        return false
      default:
        return false
    }
  }

  /**
   * Validate roulette bet parameters
   */
  private isValidRouletteBet(betType: string, betValue: number | string, winningNumber: number): boolean {
    if (winningNumber < 0 || winningNumber > 36) {
      return false
    }

    if (!Object.keys(this.ROULETTE_PAYOUTS).includes(betType)) {
      return false
    }

    // Validate bet value for specific bet types
    switch (betType) {
      case 'number':
        const num = Number(betValue)
        return num >= 0 && num <= 36
      case 'dozen':
        const dozen = Number(betValue)
        return dozen >= 1 && dozen <= 3
      case 'column':
        const column = Number(betValue)
        return column >= 1 && column <= 3
      default:
        return true
    }
  }

  /**
   * Check if a roulette number is red
   */
  private isRedNumber(number: number): boolean {
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
    return redNumbers.includes(number)
  }

  /**
   * Check if a roulette number is black
   */
  private isBlackNumber(number: number): boolean {
    return number > 0 && number <= 36 && !this.isRedNumber(number)
  }

  /**
   * Calculate house edge for different games (for testing and validation)
   */
  getHouseEdge(gameType: string, betType?: string): number {
    switch (gameType) {
      case 'roulette':
        return 2.7 // European roulette house edge
      case 'blackjack':
        return 0.5 // Optimal play blackjack house edge
      case 'plinko':
        return 1.0 // Configurable plinko house edge
      default:
        return 0
    }
  }
}