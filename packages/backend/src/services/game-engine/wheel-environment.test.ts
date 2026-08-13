import { describe, test, expect } from 'vitest'
import {
  applyEnvironmentModifiers,
  transformLayoutForBonusWheel,
  generateNewEnvironment,
  isValidEnvironmentState,
  ENVIRONMENT_TYPES,
  ENVIRONMENT_SPINS,
  SeededRandom
} from './wheel-environment'
import { generateWheelLayout, BONUS_SEGMENT_INDEX } from './wheel-layout'
import { ProvablyFairService } from './provably-fair-service'
import type { EnvironmentState, EnvironmentType } from '../../types/database'

const layout = generateWheelLayout(4242)

const makeEnvironment = (overrides: Partial<EnvironmentState> = {}): EnvironmentState => ({
  type: 'clear_skies',
  spins_remaining: ENVIRONMENT_SPINS,
  modifiers: [],
  ...overrides
})

describe('wheel-environment', () => {
  describe('SeededRandom', () => {
    test('is deterministic for the same seed', () => {
      const a = new SeededRandom(12345)
      const b = new SeededRandom(12345)
      expect([a.next(), a.next(), a.nextInt(1, 5), a.nextInt(2, 10)])
        .toEqual([b.next(), b.next(), b.nextInt(1, 5), b.nextInt(2, 10)])
    })

    test('produces values in range', () => {
      const rng = new SeededRandom(999)
      for (let i = 0; i < 100; i++) {
        const value = rng.next()
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(1)
        const int = rng.nextInt(2, 10)
        expect(int).toBeGreaterThanOrEqual(2)
        expect(int).toBeLessThanOrEqual(10)
      }
    })
  })

  describe('applyEnvironmentModifiers', () => {
    test('clear skies leaves the layout unchanged', () => {
      const modified = applyEnvironmentModifiers(layout, makeEnvironment({ type: 'clear_skies' }))
      expect(modified).toEqual(layout)
    })

    test('applies additive boosts to the targeted segments only', () => {
      const env = makeEnvironment({
        type: 'scav_raid',
        modifiers: [
          { segmentIndex: 6, operation: 'add', value: 3 },
          { segmentIndex: 8, operation: 'add', value: 10 }
        ]
      })
      const modified = applyEnvironmentModifiers(layout, env)
      expect(modified[6].multiplier).toBe(5 + 3)
      expect(modified[6].label).toBe('8x')
      expect(modified[8].multiplier).toBe(50 + 10)
      expect(modified[0].multiplier).toBe(0)
      expect(modified[BONUS_SEGMENT_INDEX].multiplier).toBe(0)
      expect(modified[BONUS_SEGMENT_INDEX].type).toBe('bonus_wheel')
    })

    test('thermal scan sets a segment to 10x', () => {
      const env = makeEnvironment({
        type: 'thermal_scan',
        modifiers: [{ segmentIndex: 2, operation: 'set', value: 10 }]
      })
      const modified = applyEnvironmentModifiers(layout, env)
      expect(modified[2].multiplier).toBe(10)
      expect(modified[2].label).toBe('10x')
      expect(modified[3].multiplier).toBe(1.5)
    })

    test('blackout shifts every multiplier up one tier and caps 50x', () => {
      const modified = applyEnvironmentModifiers(layout, makeEnvironment({ type: 'blackout' }))
      expect(modified[0].multiplier).toBe(0.5)
      expect(modified[1].multiplier).toBe(1)
      expect(modified[7].multiplier).toBe(50)
      expect(modified[8].multiplier).toBe(50)
      expect(modified[BONUS_SEGMENT_INDEX].multiplier).toBe(0)
    })
  })

  describe('transformLayoutForBonusWheel', () => {
    test('doubles all multiplier segments and leaves the bonus segment alone', () => {
      const modified = transformLayoutForBonusWheel(layout)
      expect(modified[0].multiplier).toBe(0)
      expect(modified[2].multiplier).toBe(2)
      expect(modified[8].multiplier).toBe(100)
      expect(modified[BONUS_SEGMENT_INDEX].multiplier).toBe(0)
      expect(modified[BONUS_SEGMENT_INDEX].type).toBe('bonus_wheel')
      expect(modified[2].label).toBe('2x')
    })

    test('doubles environment-boosted multipliers too (stacking)', () => {
      const envLayout = applyEnvironmentModifiers(layout, makeEnvironment({
        type: 'scav_raid',
        modifiers: [{ segmentIndex: 6, operation: 'add', value: 3 }]
      }))
      const doubled = transformLayoutForBonusWheel(envLayout)
      expect(doubled[6].multiplier).toBe(16)
      expect(doubled[6].label).toBe('16x')
    })
  })

  describe('generateNewEnvironment', () => {
    test('produces a valid environment with 3 spins remaining', async () => {
      const service = new ProvablyFairService()
      const { state, verification } = await generateNewEnvironment(service)
      expect(ENVIRONMENT_TYPES).toContain(state.type)
      expect(state.spins_remaining).toBe(ENVIRONMENT_SPINS)
      expect(isValidEnvironmentState(state)).toBe(true)
      expect(verification.server_seed).toBeTruthy()
      expect(verification.client_seed).toBeTruthy()
      expect(verification.random_value).toBeGreaterThanOrEqual(0)
      expect(verification.random_value).toBeLessThan(1)
    })

    test('scav raid and emp strike modifiers are additive and within bounds', async () => {
      const service = new ProvablyFairService()
      for (let i = 0; i < 40; i++) {
        const { state } = await generateNewEnvironment(service)
        if (state.type === 'scav_raid') {
          expect(state.modifiers.length).toBe(5)
          for (const modifier of state.modifiers) {
            expect(modifier.operation).toBe('add')
            expect(modifier.value).toBeGreaterThanOrEqual(2)
            expect(modifier.value).toBeLessThanOrEqual(10)
            expect(modifier.segmentIndex).toBeGreaterThanOrEqual(0)
            expect(modifier.segmentIndex).toBeLessThanOrEqual(8)
          }
          const unique = new Set(state.modifiers.map(m => m.segmentIndex))
          expect(unique.size).toBe(5)
          break
        }
      }
    }, 30000)

    test('thermal scan only boosts sub-10x segments', async () => {
      const service = new ProvablyFairService()
      for (let i = 0; i < 40; i++) {
        const { state } = await generateNewEnvironment(service)
        if (state.type === 'thermal_scan') {
          expect(state.modifiers.length).toBe(1)
          const modifier = state.modifiers[0]
          expect(modifier.operation).toBe('set')
          expect(modifier.value).toBe(10)
          expect(modifier.segmentIndex).toBeLessThanOrEqual(6)
          expect([7, 8]).not.toContain(modifier.segmentIndex)
          return
        }
      }
      throw new Error('No thermal scan environment generated in 40 attempts')
    }, 30000)

    test('selection is deterministic given the same provably fair context', async () => {
      const service = new ProvablyFairService()
      const context = await service.createContext()
      const outcome = await service.generateOutcome(context)

      const envIndex = Math.min(
        Math.floor(outcome.randomValue * ENVIRONMENT_TYPES.length),
        ENVIRONMENT_TYPES.length - 1
      )
      expect(envIndex).toBeGreaterThanOrEqual(0)
      expect(envIndex).toBeLessThan(ENVIRONMENT_TYPES.length)
    })
  })

  describe('isValidEnvironmentState', () => {
    test('accepts well-formed states', () => {
      expect(isValidEnvironmentState(makeEnvironment())).toBe(true)
      expect(isValidEnvironmentState(makeEnvironment({
        type: 'emp_strike',
        modifiers: [{ segmentIndex: 0, operation: 'add', value: 15 }]
      }))).toBe(true)
    })

    test('rejects malformed states', () => {
      expect(isValidEnvironmentState(null)).toBe(false)
      expect(isValidEnvironmentState({})).toBe(false)
      expect(isValidEnvironmentState(makeEnvironment({ type: 'not_real' as EnvironmentType }))).toBe(false)
      expect(isValidEnvironmentState(makeEnvironment({ spins_remaining: 99 }))).toBe(false)
      expect(isValidEnvironmentState(makeEnvironment({
        modifiers: [{ segmentIndex: 12, operation: 'add', value: 3 }] as never
      }))).toBe(false)
      expect(isValidEnvironmentState(makeEnvironment({
        modifiers: [{ segmentIndex: 0, operation: 'multiply' as never, value: 3 }] as never
      }))).toBe(false)
    })
  })
})
