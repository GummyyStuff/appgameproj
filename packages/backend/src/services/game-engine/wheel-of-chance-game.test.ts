import { describe, test, expect, vi } from 'vitest'
import { WheelOfChanceGame, WheelBet } from './wheel-of-chance-game'
import { generateWheelLayout, BONUS_SEGMENT_INDEX } from './wheel-layout'
import { ProvablyFairService } from './provably-fair-service'
import { clearSkiesEnvironment } from './wheel-environment'
import type { EnvironmentState } from '../../types/database'

const layout = generateWheelLayout(4242)

const makeBet = (overrides: Partial<WheelBet> = {}): WheelBet => ({
  userId: 'user1',
  amount: 200,
  gameType: 'wheel_of_chance',
  bets: [{ segmentIndex: 0, amount: 200 }],
  wheel_layout: layout,
  environment_state: clearSkiesEnvironment(),
  ...overrides
})

describe('WheelOfChanceGame', () => {
  const game = new WheelOfChanceGame()

  describe('static info', () => {
    test('exposes segment count and multiplier pool', () => {
      expect(WheelOfChanceGame.getSegmentCount()).toBe(10)
      expect(WheelOfChanceGame.getMultiplierPool()).toEqual([0, 0.5, 1, 1.5, 2, 3, 5, 10, 50])
    })
  })

  describe('bet validation', () => {
    test('rejects bets whose sum exceeds the declared amount', () => {
      const bet = makeBet({ amount: 100, bets: [{ segmentIndex: 0, amount: 200 }] })
      expect(game.validateGameSpecificBet(bet)).toBe(false)
    })

    test('rejects bets whose sum is below the declared amount', () => {
      const bet = makeBet({ amount: 500, bets: [{ segmentIndex: 0, amount: 200 }] })
      expect(game.validateGameSpecificBet(bet)).toBe(false)
    })

    test('rejects bets on out-of-range segment indices', () => {
      const bet = makeBet({ amount: 100, bets: [{ segmentIndex: 10, amount: 100 }] })
      expect(game.validateGameSpecificBet(bet)).toBe(false)
    })

    test('rejects bets on the bonus segment index', async () => {
      const bet = makeBet({ amount: 100, bets: [{ segmentIndex: BONUS_SEGMENT_INDEX, amount: 100 }] })
      const result = await game.play(bet)
      expect(result.success).toBe(false)
      expect(result.error).toContain('non-bettable')
    })

    test('rejects empty bet lists', () => {
      const bet = makeBet({ amount: 100, bets: [] })
      expect(game.validateGameSpecificBet(bet)).toBe(false)
    })

    test('rejects non-integer or sub-minimum bet amounts', () => {
      const bet = makeBet({ amount: 0.5, bets: [{ segmentIndex: 0, amount: 0.5 }] })
      expect(game.validateGameSpecificBet(bet)).toBe(false)
    })
  })

  describe('play', () => {
    test('rejects a missing layout', async () => {
      const bet = makeBet({ wheel_layout: undefined })
      const result = await game.play(bet)
      expect(result.success).toBe(false)
    })

    test('rejects a bet on the bonus (non-bettable) segment', async () => {
      const bet = makeBet({ amount: 100, bets: [{ segmentIndex: BONUS_SEGMENT_INDEX, amount: 100 }] })
      const result = await game.play(bet)
      expect(result.success).toBe(false)
      expect(result.error).toContain('non-bettable')
    })

    test('rejects amount mismatch even when the engine is otherwise happy', async () => {
      const bet = makeBet({ amount: 500, bets: [{ segmentIndex: 0, amount: 200 }] })
      const result = await game.play(bet)
      expect(result.success).toBe(false)
    })

    test('rejects an invalid environment state', async () => {
      const bet = makeBet({
        environment_state: { type: 'clear_skies', spins_remaining: 99, modifiers: [] }
      })
      const result = await game.play(bet)
      expect(result.success).toBe(false)
      expect(result.error).toContain('environment')
    })

    test('returns a winning segment within the layout, verification data and environment state', async () => {
      const bet = makeBet()
      const result = await game.play(bet)
      expect(result.success).toBe(true)
      const data = result.resultData as any
      expect(data.winning_segment).toBeGreaterThanOrEqual(0)
      expect(data.winning_segment).toBeLessThan(layout.length)
      expect(data.total_bet).toBe(200)
      expect(data.verification).toBeDefined()
      expect(data.verification.server_seed).toBeTruthy()
      expect(data.verification.client_seed).toBeTruthy()
      expect(data.verification.nonce).toBeGreaterThanOrEqual(0)
      expect(data.verification.random_value).toBeGreaterThanOrEqual(0)
      expect(data.verification.random_value).toBeLessThan(1)
      expect(data.spin_sequence).toBeDefined()
      expect(data.spin_sequence.length).toBeGreaterThanOrEqual(1)
      expect(data.environment_state).toBeDefined()
      expect(data.environment_state.type).toBe('clear_skies')
    })

    test('decrements the environment spins_remaining on each spin', async () => {
      const bet = makeBet({
        environment_state: { type: 'scav_raid', spins_remaining: 3, modifiers: [] }
      })
      const result = await game.play(bet)
      expect(result.success).toBe(true)
      const data = result.resultData as any
      expect(data.environment_state.spins_remaining).toBe(2)
      expect(data.environment_state.type).toBe('scav_raid')
    })

    test('generates a new environment with verification when spins run out', async () => {
      const bet = makeBet({
        environment_state: { type: 'clear_skies', spins_remaining: 1, modifiers: [] }
      })
      const result = await game.play(bet)
      expect(result.success).toBe(true)
      const data = result.resultData as any
      expect(data.environment_state.spins_remaining).toBe(3)
      expect(data.environment_verification).toBeDefined()
      expect(data.environment_verification.server_seed).toBeTruthy()
    })

    test('generates an environment when none is provided', async () => {
      const bet = makeBet({ environment_state: undefined })
      const result = await game.play(bet)
      expect(result.success).toBe(true)
      const data = result.resultData as any
      expect(data.environment_state).toBeDefined()
      expect(data.environment_state.spins_remaining).toBeGreaterThanOrEqual(2)
      expect(data.environment_state.spins_remaining).toBeLessThanOrEqual(3)
    })

    test('multiplier win pays only the winning segment bet times its multiplier', async () => {
      const bet = makeBet({
        amount: 300,
        bets: [
          { segmentIndex: 0, amount: 200 },
          { segmentIndex: 2, amount: 100 }
        ]
      })
      const result = await game.play(bet)
      expect(result.success).toBe(true)
      const data = result.resultData as any
      const winningSeg = data.wheel_layout[data.winning_segment]
      expect(winningSeg.type).toBe('multiplier')
      const finalEntry = data.spin_sequence[data.spin_sequence.length - 1]
      const expected = bet.bets
        .filter(b => b.segmentIndex === data.winning_segment)
        .reduce((s, b) => s + b.amount, 0) * finalEntry.multiplier
      expect(result.winAmount).toBeCloseTo(expected, 5)
      expect(data.total_win).toBeCloseTo(expected, 5)
    })

    test('applies additive environment boosts to payouts', async () => {
      const env: EnvironmentState = {
        type: 'scav_raid',
        spins_remaining: 3,
        modifiers: [{ segmentIndex: 6, operation: 'add', value: 3 }]
      }
      const bet = makeBet({
        amount: 100,
        bets: [{ segmentIndex: 6, amount: 100 }],
        environment_state: env
      })

      const stub = new ProvablyFairService()
      const outcomes = [0.7, 0.25]
      let call = 0
      stub.generateOutcome = vi.fn().mockImplementation(async (ctx: any) => {
        const value = outcomes[Math.min(call, outcomes.length - 1)]
        call++
        return {
          context: ctx,
          hash: 'a'.repeat(64),
          randomValue: value,
          isValid: true
        }
      })

      const forcedGame = new WheelOfChanceGame(stub)
      const result = await forcedGame.play(bet)
      expect(result.success).toBe(true)
      const data = result.resultData as any
      expect(data.winning_segment).toBe(6)
      expect(data.wheel_layout[6].multiplier).toBe(8)
      expect(data.multiplier).toBe(8)
      expect(result.winAmount).toBe(800)
      expect(data.special_triggered).toBeNull()
    })

    test('bonus trigger holds bets, doubles multipliers and re-spins automatically', async () => {
      const bet = makeBet({
        amount: 100,
        bets: [{ segmentIndex: 6, amount: 100 }]
      })

      const stub = new ProvablyFairService()
      const outcomes = [0.999, 0.7, 0.25]
      let call = 0
      stub.generateOutcome = vi.fn().mockImplementation(async (ctx: any) => {
        const value = outcomes[Math.min(call, outcomes.length - 1)]
        call++
        return {
          context: ctx,
          hash: 'b'.repeat(64),
          randomValue: value,
          isValid: true
        }
      })

      const forcedGame = new WheelOfChanceGame(stub)
      const result = await forcedGame.play(bet)
      expect(result.success).toBe(true)
      const data = result.resultData as any

      expect(data.special_triggered).toBe('bonus_wheel')
      expect(data.spin_sequence.length).toBe(2)
      expect(data.spin_sequence[0].winning_segment).toBe(BONUS_SEGMENT_INDEX)
      expect(data.spin_sequence[0].segment_type).toBe('bonus_wheel')
      expect(data.spin_sequence[1].segment_type).toBe('multiplier')
      expect(data.spin_sequence[1].verification.nonce).toBe(data.spin_sequence[0].verification.nonce + 1)

      expect(data.bonus_wheel_layout).toBeDefined()
      expect(data.bonus_wheel_layout[6].multiplier).toBe(10)

      expect(data.winning_segment).toBe(6)
      expect(data.multiplier).toBe(10)
      expect(result.winAmount).toBe(1000)
    })

    test('bonus re-spin landing on bonus again re-spins with the same doubled multipliers', async () => {
      const bet = makeBet({
        amount: 100,
        bets: [{ segmentIndex: 6, amount: 100 }]
      })

      const stub = new ProvablyFairService()
      const outcomes = [0.999, 0.999, 0.7, 0.25]
      let call = 0
      stub.generateOutcome = vi.fn().mockImplementation(async (ctx: any) => {
        const value = outcomes[Math.min(call, outcomes.length - 1)]
        call++
        return {
          context: ctx,
          hash: 'c'.repeat(64),
          randomValue: value,
          isValid: true
        }
      })

      const forcedGame = new WheelOfChanceGame(stub)
      const result = await forcedGame.play(bet)
      expect(result.success).toBe(true)
      const data = result.resultData as any
      expect(data.special_triggered).toBe('bonus_wheel')
      expect(data.spin_sequence.length).toBe(3)
      expect(data.spin_sequence.map((e: { segment_type: string }) => e.segment_type))
        .toEqual(['bonus_wheel', 'bonus_wheel', 'multiplier'])
      expect(data.multiplier).toBe(10)
      expect(result.winAmount).toBe(1000)
    })

    test('environment and bonus wheel stack multiplicatively', async () => {
      const bet = makeBet({
        amount: 100,
        bets: [{ segmentIndex: 6, amount: 100 }],
        environment_state: {
          type: 'scav_raid',
          spins_remaining: 3,
          modifiers: [{ segmentIndex: 6, operation: 'add', value: 3 }]
        }
      })

      const stub = new ProvablyFairService()
      const outcomes = [0.999, 0.7, 0.25]
      let call = 0
      stub.generateOutcome = vi.fn().mockImplementation(async (ctx: any) => {
        const value = outcomes[Math.min(call, outcomes.length - 1)]
        call++
        return {
          context: ctx,
          hash: 'd'.repeat(64),
          randomValue: value,
          isValid: true
        }
      })

      const forcedGame = new WheelOfChanceGame(stub)
      const result = await forcedGame.play(bet)
      expect(result.success).toBe(true)
      const data = result.resultData as any
      expect(data.special_triggered).toBe('bonus_wheel')
      expect(data.wheel_layout[6].multiplier).toBe(8)
      expect(data.bonus_wheel_layout[6].multiplier).toBe(16)
      expect(data.multiplier).toBe(16)
      expect(result.winAmount).toBe(1600)
    })
  })
})
