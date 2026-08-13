import { BaseGame, GameBet, GameResult } from './types'
import {
  WheelSegment,
  WheelSegmentType,
  WheelBetPlacement,
  WheelOfChanceResult,
  WheelSpinSequenceEntry,
  WheelOfChanceVerification,
  EnvironmentState,
  GameResultData
} from '../../types/database'
import { ProvablyFairService } from './provably-fair-service'
import { BASE_MULTIPLIERS, SEGMENT_COUNT, BONUS_SEGMENT_INDEX } from './wheel-layout'
import {
  applyEnvironmentModifiers,
  transformLayoutForBonusWheel,
  generateNewEnvironment,
  isValidEnvironmentState,
  MAX_BONUS_RESPINS
} from './wheel-environment'

export interface WheelBet extends GameBet {
  gameType: 'wheel_of_chance'
  bets: WheelBetPlacement[]
  wheel_layout?: WheelSegment[]
  environment_state?: EnvironmentState
}

export class WheelOfChanceGame extends BaseGame {
  private provablyFair: ProvablyFairService

  constructor(provablyFair?: ProvablyFairService) {
    super('wheel_of_chance', 1, 10000)
    this.provablyFair = provablyFair || new ProvablyFairService()
  }

  static getSegmentCount(): number {
    return SEGMENT_COUNT
  }

  static getMultiplierPool(): number[] {
    return [...BASE_MULTIPLIERS]
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

      const providedEnvironment = bet.environment_state
      if (providedEnvironment && !isValidEnvironmentState(providedEnvironment)) {
        return { success: false, winAmount: 0, resultData: {} as GameResultData, error: 'Invalid environment state' }
      }

      let environment: EnvironmentState
      let environmentVerification: WheelOfChanceVerification | undefined
      if (providedEnvironment && providedEnvironment.spins_remaining > 0) {
        environment = providedEnvironment
      } else {
        const generated = await generateNewEnvironment(this.provablyFair)
        environment = generated.state
        environmentVerification = generated.verification
      }

      const environmentLayout = applyEnvironmentModifiers(wheelLayout, environment)

      const spinContext = await this.provablyFair.createContext()

      const spinSequence: WheelSpinSequenceEntry[] = []
      let spinLayout = environmentLayout
      let doubled = false
      let finalEntry: WheelSpinSequenceEntry | null = null

      for (let i = 0; i <= MAX_BONUS_RESPINS; i++) {
        const spinOutcome = await this.provablyFair.generateOutcome({
          ...spinContext,
          nonce: spinContext.nonce + i
        })

        const weights = spinLayout.map(seg => seg.endAngle - seg.startAngle)
        const totalWeight = weights.reduce((s, w) => s + w, 0)
        if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
          return { success: false, winAmount: 0, resultData: {} as GameResultData, error: 'Invalid wheel layout weights' }
        }
        const roll = spinOutcome.randomValue * totalWeight
        let cumulative = 0
        let winningIndex = 0
        for (let w = 0; w < weights.length; w++) {
          cumulative += weights[w]
          if (roll < cumulative) {
            winningIndex = w
            break
          }
        }

        const segment = spinLayout[winningIndex]
        const entry: WheelSpinSequenceEntry = {
          winning_segment: winningIndex,
          segment_type: segment.type,
          multiplier: segment.multiplier,
          verification: {
            server_seed: spinContext.serverSeed,
            server_seed_hash: this.provablyFair.hashServerSeed(spinContext.serverSeed),
            client_seed: spinContext.clientSeed,
            nonce: spinContext.nonce + i,
            random_value: spinOutcome.randomValue
          }
        }
        spinSequence.push(entry)

        if (segment.type === 'multiplier') {
          finalEntry = entry
          break
        }

        if (!doubled) {
          spinLayout = transformLayoutForBonusWheel(spinLayout)
          doubled = true
        }
      }

      if (!finalEntry) {
        const lastEntry = spinSequence[spinSequence.length - 1]
        finalEntry = lastEntry
      }

      const finalLayout = spinLayout
      let totalWin = 0
      if (finalEntry.segment_type === 'multiplier') {
        const segmentBets = bet.bets.filter(b => b.segmentIndex === finalEntry.winning_segment)
        const segmentBetTotal = segmentBets.reduce((sum, b) => sum + b.amount, 0)
        totalWin = segmentBetTotal * finalEntry.multiplier
      }

      const bonusTriggered = spinSequence.length > 1

      const nextEnvironment: EnvironmentState = {
        ...environment,
        spins_remaining: environment.spins_remaining - 1
      }
      if (nextEnvironment.spins_remaining <= 0) {
        const regenerated = await generateNewEnvironment(this.provablyFair)
        nextEnvironment.type = regenerated.state.type
        nextEnvironment.spins_remaining = regenerated.state.spins_remaining
        nextEnvironment.modifiers = regenerated.state.modifiers
        environmentVerification = regenerated.verification
      }

      const resultData: WheelOfChanceResult = {
        wheel_layout: environmentLayout,
        bonus_wheel_layout: bonusTriggered ? finalLayout : undefined,
        bets: bet.bets,
        winning_segment: finalEntry.winning_segment,
        segment_type: finalEntry.segment_type,
        multiplier: finalEntry.multiplier,
        total_bet: totalBet,
        total_win: totalWin,
        special_triggered: bonusTriggered ? 'bonus_wheel' : null,
        spin_sequence: spinSequence,
        environment_state: nextEnvironment,
        environment_verification: environmentVerification,
        verification: finalEntry.verification
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
