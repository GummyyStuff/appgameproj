/**
 * Game result validation system
 * Validates game results, payouts, and provably fair outcomes
 */

import { GameResultData, RouletteResult, BlackjackResult, PlinkoResult, Card } from '../../types/database'
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
      case 'plinko':
        return this.validatePlinkoResult(result as PlinkoResult)
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
      case 'plinko':
        const plinkoResult = result as PlinkoResult
        expectedPayout = this.payoutCalculator.calculatePlinkoPayout(
          plinkoResult.multiplier,
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
   * Validate plinko result
   */
  private validatePlinkoResult(result: PlinkoResult): boolean {
    // Validate risk level
    if (!['low', 'medium', 'high'].includes(result.risk_level)) {
      return false
    }

    // Validate ball path
    if (!Array.isArray(result.ball_path)) {
      return false
    }

    // Ball path should contain only 0s and 1s
    if (!result.ball_path.every(move => move === 0 || move === 1)) {
      return false
    }

    // Validate landing slot
    if (result.landing_slot < 0 || result.landing_slot > 8) {
      return false
    }

    // Validate multiplier matches the slot for the risk level
    const expectedMultiplier = this.payoutCalculator.getPlinkoMultiplier(
      result.risk_level,
      result.landing_slot
    )
    if (Math.abs(result.multiplier - expectedMultiplier) > 0.01) {
      return false
    }

    // Validate ball path leads to correct slot
    const calculatedSlot = this.calculatePlinkoSlot(result.ball_path)
    if (calculatedSlot !== result.landing_slot) {
      return false
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
   * Calculate plinko landing slot from ball path
   */
  private calculatePlinkoSlot(ballPath: number[]): number {
    // Start at the middle position
    let position = 4
    
    // Each move: 0 = left, 1 = right
    for (const move of ballPath) {
      if (move === 0) {
        position = Math.max(0, position - 1)
      } else {
        position = Math.min(8, position + 1)
      }
    }

    return position
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