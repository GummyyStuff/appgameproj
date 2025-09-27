/**
 * Game result validation system
 * Validates game results, payouts, and provably fair outcomes
 */

import { GameResultData, RouletteResult, BlackjackResult, Card } from '../../types/database'
import { IGameValidator, GameBet, ProvablyFairSeed, ProvablyFairResult } from './types'
import { PayoutCalculator } from './payout-calculator'
import { SecureRandomGenerator } from './random-generator'

export class GameValidator implements IGameValidator {
  private payoutCalculator: PayoutCalculator
  private randomGenerator: SecureRandomGenerator

  constructor() {
    this.payoutCalculator = new PayoutCalculator()
    this.randomGenerator = new SecureRandomGenerator()
  }

  /**
   * Validate game result data structure and values
   */
  validateGameResult(gameType: string, result: GameResultData): boolean {
    switch (gameType) {
      case 'roulette':
        return this.validateRouletteResult(result as RouletteResult)
      case 'blackjack':
        return this.validateBlackjackResult(result as BlackjackResult)
      default:
        return false
    }
  }

  /**
   * Validate that payout matches expected calculation
   */
  validatePayout(bet: GameBet, result: GameResultData, payout: number): boolean {
    let expectedPayout: number

    switch (bet.gameType) {
      case 'roulette':
        const rouletteResult = result as RouletteResult
        expectedPayout = this.payoutCalculator.calculateRoulettePayout(
          rouletteResult.bet_type,
          rouletteResult.bet_value,
          rouletteResult.winning_number,
          bet.amount
        )
        break
      case 'blackjack':
        const blackjackResult = result as BlackjackResult
        expectedPayout = this.payoutCalculator.calculateBlackjackPayout(
          blackjackResult.result,
          bet.amount
        )
        break
      default:
        return false
    }

    // Allow small floating point differences
    return Math.abs(payout - expectedPayout) < 0.01
  }

  /**
   * Validate provably fair result
   */
  async validateProvablyFairResult(seed: ProvablyFairSeed, result: ProvablyFairResult): Promise<boolean> {
    try {
      return await this.randomGenerator.verifyProvablyFairResult(result)
    } catch {
      return false
    }
  }

  /**
   * Validate roulette result
   */
  private validateRouletteResult(result: RouletteResult): boolean {
    // Validate winning number
    if (result.winning_number < 0 || result.winning_number > 36) {
      return false
    }

    // Validate bet type
    const validBetTypes = ['number', 'red', 'black', 'odd', 'even', 'low', 'high', 'dozen', 'column']
    if (!validBetTypes.includes(result.bet_type)) {
      return false
    }

    // Validate bet value based on bet type
    switch (result.bet_type) {
      case 'number':
        const num = Number(result.bet_value)
        if (num < 0 || num > 36) return false
        break
      case 'dozen':
        const dozen = Number(result.bet_value)
        if (dozen < 1 || dozen > 3) return false
        break
      case 'column':
        const column = Number(result.bet_value)
        if (column < 1 || column > 3) return false
        break
    }

    // Validate multiplier is reasonable
    if (result.multiplier < 0 || result.multiplier > 35) {
      return false
    }

    return true
  }

  /**
   * Validate blackjack result
   */
  private validateBlackjackResult(result: BlackjackResult): boolean {
    // Validate hands exist and are not empty
    if (!result.player_hand || !result.dealer_hand || 
        result.player_hand.length === 0 || result.dealer_hand.length === 0) {
      return false
    }

    // Validate cards in hands
    if (!this.validateCards(result.player_hand) || !this.validateCards(result.dealer_hand)) {
      return false
    }

    // Validate result type
    const validResults = ['player_win', 'dealer_win', 'push', 'blackjack', 'dealer_blackjack', 'bust']
    if (!validResults.includes(result.result)) {
      return false
    }

    // Validate hand values if provided
    if (result.player_value !== undefined) {
      const calculatedValue = this.calculateBlackjackHandValue(result.player_hand)
      if (Math.abs(calculatedValue - result.player_value) > 0) {
        return false
      }
    }

    if (result.dealer_value !== undefined) {
      const calculatedValue = this.calculateBlackjackHandValue(result.dealer_hand)
      if (Math.abs(calculatedValue - result.dealer_value) > 0) {
        return false
      }
    }

    return true
  }


  /**
   * Validate array of cards
   */
  private validateCards(cards: Card[]): boolean {
    const validSuits = ['hearts', 'diamonds', 'clubs', 'spades']
    const validValues = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

    return cards.every(card => 
      validSuits.includes(card.suit) && validValues.includes(card.value)
    )
  }

  /**
   * Calculate blackjack hand value
   */
  private calculateBlackjackHandValue(cards: Card[]): number {
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

    // Adjust for aces
    while (value > 21 && aces > 0) {
      value -= 10
      aces--
    }

    return value
  }


  /**
   * Validate bet amount and user balance
   */
  validateBetAmount(betAmount: number, userBalance: number): boolean {
    return (
      betAmount > 0 &&
      betAmount <= userBalance &&
      betAmount >= 1 &&
      betAmount <= 10000 &&
      Number.isInteger(betAmount)
    )
  }

  /**
   * Validate game state consistency
   */
  validateGameStateConsistency(gameType: string, betAmount: number, result: GameResultData, winAmount: number): boolean {
    // Validate payout calculation
    const mockBet: GameBet = {
      userId: 'test',
      amount: betAmount,
      gameType: gameType as any
    }

    return this.validatePayout(mockBet, result, winAmount)
  }
}