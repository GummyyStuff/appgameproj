import { BaseGame, GameBet, GameResult } from './types'
import {
  WheelSegment,
  WheelSegmentType,
  WheelBetPlacement,
  WheelOfChanceResult,
  GameResultData
} from '../../types/database'
import { ProvablyFairService, ProvablyFairContext } from './provably-fair-service'
import { BASE_MULTIPLIERS, SPECIAL_TYPES, SEGMENT_COUNT } from './wheel-layout'

export interface WheelBet extends GameBet {
  gameType: 'wheel_of_chance'
  bets: WheelBetPlacement[]
  wheel_layout?: WheelSegment[]
}

const JACKPOT_MULTIPLIER = 100

export class WheelOfChanceGame extends BaseGame {
  private provablyFair: ProvablyFairService

  constructor() {
    super('wheel_of_chance', 1, 10000)
    this.provablyFair = new ProvablyFairService()
  }

  static getSegmentCount(): number {
    return SEGMENT_COUNT
  }

  static getMultiplierPool(): number[] {
    return [...BASE_MULTIPLIERS]
  }

  static getSpecialPool(): string[] {
    return [...SPECIAL_TYPES]
  }

  async play(bet: WheelBet): Promise<GameResult> {
    try {
      if (!this.validateBaseBet(bet) || !this.validateGameSpecificBet(bet)) {
        return { success: false, winAmount: 0, resultData: {} as GameResultData, error: 'Invalid bet' }
      }

      const totalBet = bet.bets.reduce((sum, b) => sum + b.amount, 0)
      if (totalBet !== bet.amount) {
        return { success: false, winAmount: 0, resultData: {} as GameResultData, error: 'Sum of bets must equal declared amount' }
      }

      if (!bet.wheel_layout || bet.wheel_layout.length !== SEGMENT_COUNT) {
        return { success: false, winAmount: 0, resultData: {} as GameResultData, error: 'Wheel layout required' }
      }

      const wheelLayout = bet.wheel_layout

      for (const placement of bet.bets) {
        const seg = wheelLayout[placement.segmentIndex]
        if (!seg || !seg.bettable || seg.type !== 'multiplier') {
          return { success: false, winAmount: 0, resultData: {} as GameResultData, error: 'Cannot bet on non-bettable segment' }
        }
      }

      const spinContext = await this.provablyFair.createContext()
      const spinOutcome = await this.provablyFair.generateOutcome(spinContext)

      const weights = wheelLayout.map(seg => seg.endAngle - seg.startAngle)
      const totalWeight = weights.reduce((s, w) => s + w, 0)
      if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
        return { success: false, winAmount: 0, resultData: {} as GameResultData, error: 'Invalid wheel layout weights' }
      }
      const roll = spinOutcome.randomValue * totalWeight
      let cumulative = 0
      let winningIndex = 0
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i]
        if (roll < cumulative) {
          winningIndex = i
          break
        }
      }

      const segment = wheelLayout[winningIndex]
      let totalWin = 0
      let specialTriggered: WheelSegmentType | null = null
      let effectiveMultiplier = segment.multiplier

      if (segment.type === 'multiplier') {
        const segmentBets = bet.bets.filter(b => b.segmentIndex === winningIndex)
        const segmentBetTotal = segmentBets.reduce((sum, b) => sum + b.amount, 0)
        totalWin = segmentBetTotal * segment.multiplier
      } else {
        specialTriggered = segment.type
        switch (segment.type) {
          case 'free_spin':
            totalWin = totalBet
            effectiveMultiplier = 1
            break
          case 'double_bet':
            totalWin = totalBet * 2
            effectiveMultiplier = 2
            break
          case 'double_winnings': {
            const normalWins = bet.bets.reduce((sum, b) => {
              const seg = wheelLayout[b.segmentIndex]
              return sum + (seg && seg.type === 'multiplier' ? b.amount * seg.multiplier : 0)
            }, 0)
            totalWin = normalWins * 2
            effectiveMultiplier = 2
            break
          }
          case 'jackpot':
            totalWin = totalBet * JACKPOT_MULTIPLIER
            effectiveMultiplier = JACKPOT_MULTIPLIER
            break
        }
      }

      const resultData: WheelOfChanceResult = {
        wheel_layout: wheelLayout,
        bets: bet.bets,
        winning_segment: winningIndex,
        segment_type: segment.type,
        multiplier: effectiveMultiplier,
        total_bet: totalBet,
        total_win: totalWin,
        special_triggered: specialTriggered,
        verification: {
          server_seed: spinContext.serverSeed,
          server_seed_hash: this.provablyFair.hashServerSeed(spinContext.serverSeed),
          client_seed: spinContext.clientSeed,
          nonce: spinContext.nonce,
          random_value: spinOutcome.randomValue
        }
      }

      return {
        success: true,
        winAmount: totalWin,
        resultData: resultData as GameResultData,
        betAmount: totalBet
      }
    } catch (error) {
      return {
        success: false,
        winAmount: 0,
        resultData: {} as GameResultData,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  calculatePayout(bet: WheelBet, result: GameResultData): number {
    const wheelResult = result as WheelOfChanceResult
    return wheelResult.total_win
  }

  validateGameSpecificBet(bet: WheelBet): boolean {
    if (!bet.bets || !Array.isArray(bet.bets) || bet.bets.length === 0) {
      return false
    }

    for (const placement of bet.bets) {
      if (
        typeof placement.segmentIndex !== 'number' ||
        placement.segmentIndex < 0 ||
        placement.segmentIndex >= SEGMENT_COUNT ||
        typeof placement.amount !== 'number' ||
        placement.amount < 1 ||
        !Number.isInteger(placement.amount)
      ) {
        return false
      }
    }

    const totalBet = bet.bets.reduce((sum, b) => sum + b.amount, 0)
    return totalBet >= this.minBet && totalBet <= this.maxBet && totalBet === bet.amount
  }
}
