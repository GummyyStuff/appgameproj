import { describe, test, expect } from 'vitest'
import {
  generateWheelLayout,
  getBaseSegments,
  getBonusSegments,
  applyEnvironmentModifiers,
  transformLayoutForBonusWheel,
  BONUS_SEGMENT_INDEX
} from './wheel-layout'
import type { EnvironmentState } from '../types/wheel'

const environment = (overrides: Partial<EnvironmentState> = {}): EnvironmentState => ({
  type: 'clear_skies',
  spins_remaining: 3,
  modifiers: [],
  ...overrides
})

describe('wheel-layout', () => {
  test('creates 10 segments with angles summing to 360', () => {
    const layout = generateWheelLayout(12345)
    expect(layout.length).toBe(10)
    const total = layout.reduce((sum, seg) => sum + (seg.endAngle - seg.startAngle), 0)
    expect(total).toBe(360)
  })

  test('is deterministic across calls', () => {
    expect(generateWheelLayout(42)).toEqual(generateWheelLayout(42))
  })

  test('has 9 bettable base segments with fixed multipliers', () => {
    const layout = generateWheelLayout(1)
    const base = getBaseSegments(layout)
    expect(base.length).toBe(9)
    expect(base.map(s => s.multiplier)).toEqual([0, 0.5, 1, 1.5, 2, 3, 5, 10, 50])
    base.forEach(seg => {
      expect(seg.endAngle - seg.startAngle).toBeCloseTo(38.3333, 3)
    })
  })

  test('has a single bonus segment at index 9 with a 15 degree span', () => {
    const layout = generateWheelLayout(2)
    const bonus = getBonusSegments(layout)
    expect(bonus.length).toBe(1)
    expect(bonus.map(s => s.index)).toEqual([BONUS_SEGMENT_INDEX])
    bonus.forEach(seg => {
      expect(seg.type).toBe('bonus_wheel')
      expect(seg.endAngle - seg.startAngle).toBe(15)
    })
  })

  test('segment indices match array positions and are contiguous', () => {
    const layout = generateWheelLayout(3)
    expect(layout.map(s => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})

describe('applyEnvironmentModifiers', () => {
  const layout = generateWheelLayout(1)

  test('clear skies leaves the layout unchanged', () => {
    expect(applyEnvironmentModifiers(layout, environment())).toEqual(layout)
  })

  test('adds scav raid boosts to the right segments with updated labels', () => {
    const modified = applyEnvironmentModifiers(layout, environment({
      type: 'scav_raid',
      modifiers: [{ segmentIndex: 6, operation: 'add', value: 3 }]
    }))
    expect(modified[6].multiplier).toBe(8)
    expect(modified[6].label).toBe('8x')
    expect(modified[0].multiplier).toBe(0)
    expect(modified[BONUS_SEGMENT_INDEX].multiplier).toBe(0)
  })

  test('thermal scan sets a segment to 10x', () => {
    const modified = applyEnvironmentModifiers(layout, environment({
      type: 'thermal_scan',
      modifiers: [{ segmentIndex: 0, operation: 'set', value: 10 }]
    }))
    expect(modified[0].multiplier).toBe(10)
    expect(modified[0].label).toBe('10x')
  })

  test('blackout shifts all tiers and caps at 50x', () => {
    const modified = applyEnvironmentModifiers(layout, environment({ type: 'blackout' }))
    expect(modified[0].multiplier).toBe(0.5)
    expect(modified[7].multiplier).toBe(50)
    expect(modified[8].multiplier).toBe(50)
  })
})

describe('transformLayoutForBonusWheel', () => {
  test('doubles multiplier segments and leaves the bonus segment untouched', () => {
    const layout = generateWheelLayout(1)
    const doubled = transformLayoutForBonusWheel(layout)
    expect(doubled[2].multiplier).toBe(2)
    expect(doubled[8].multiplier).toBe(100)
    expect(doubled[BONUS_SEGMENT_INDEX].multiplier).toBe(0)
    expect(doubled[2].label).toBe('2x')
  })
})
