import { describe, test, expect } from 'vitest'
import { WheelOfChanceGame, WheelBet } from './wheel-of-chance-game'
import { generateWheelLayout } from './wheel-layout'

describe('WheelOfChanceGame', () => {
  const game = new WheelOfChanceGame()
  const layout = generateWheelLayout(4242)

  const makeBet = (overrides: Partial<WheelBet> = {}): WheelBet => ({
    userId: 'user1',
    amount: 200,
    gameType: 'wheel_of_chance',
    bets: [{ segmentIndex: 0, amount: 200 }],
    wheel_layout: layout,
    ...overrides
  })

  describe('static info', () => {
    test('exposes segment count and pools', () => {
      expect(WheelOfChanceGame.getSegmentCount()).toBe(12)
      expect(WheelOfChanceGame.getMultiplierPool()).toEqual([0, 0.5, 1, 1.5, 2, 3, 5, 10, 50])
      expect(WheelOfChanceGame.getSpecialPool()).toContain('jackpot')
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
      const bet = makeBet({ amount: 100, bets: [{ segmentIndex: 12, amount: 100 }] })
      expect(game.validateGameSpecificBet(bet)).toBe(false)
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

    test('rejects a bet on a bonus (non-bettable) segment', async () => {
      const bet = makeBet({ amount: 100, bets: [{ segmentIndex: 1, amount: 100 }] })
      const result = await game.play(bet)
      expect(result.success).toBe(false)
      expect(result.error).toContain('non-bettable')
    })

    test('rejects amount mismatch even when the engine is otherwise happy', async () => {
      const bet = makeBet({ amount: 500, bets: [{ segmentIndex: 0, amount: 200 }] })
      const result = await game.play(bet)
      expect(result.success).toBe(false)
    })

    test('returns a winning segment within the layout and verification data', async () => {
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
      const winningSeg = layout[data.winning_segment]
      const expected = (winningSeg.type === 'multiplier')
        ? bet.bets.filter(b => b.segmentIndex === data.winning_segment).reduce((s, b) => s + b.amount, 0) * winningSeg.multiplier
        : null
      if (expected !== null) {
        expect(result.winAmount).toBeCloseTo(expected, 5)
      }
    })
  })
})
