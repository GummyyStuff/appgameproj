import { describe, test, expect } from 'vitest'
import {
  generateWheelLayout,
  getBaseSegments,
  getBonusSegments,
  SPECIAL_POOL
} from './wheel-layout'

describe('wheel-layout', () => {
  test('creates 12 segments with angles summing to 360', () => {
    const layout = generateWheelLayout(12345)
    expect(layout.length).toBe(12)
    const total = layout.reduce((sum, seg) => sum + (seg.endAngle - seg.startAngle), 0)
    expect(total).toBe(360)
  })

  test('is deterministic for the same seed', () => {
    expect(generateWheelLayout(42)).toEqual(generateWheelLayout(42))
  })

  test('different seeds can produce different bonus assignments', () => {
    const layouts = new Set<number>()
    for (let seed = 0; seed < 30; seed++) {
      const layout = generateWheelLayout(seed)
      layouts.add(layout.filter(s => !s.bettable).map(s => s.type).join(','))
    }
    expect(layouts.size).toBeGreaterThan(1)
  })

  test('has 9 bettable base segments with fixed multipliers', () => {
    const layout = generateWheelLayout(1)
    const base = getBaseSegments(layout)
    expect(base.length).toBe(9)
    expect(base.map(s => s.multiplier)).toEqual([0, 0.5, 1, 1.5, 2, 3, 5, 10, 50])
    base.forEach(seg => {
      expect(seg.endAngle - seg.startAngle).toBe(35)
    })
  })

  test('has 3 bonus segments at positions 1, 4 and 7', () => {
    const layout = generateWheelLayout(2)
    const bonus = getBonusSegments(layout)
    expect(bonus.length).toBe(3)
    expect(bonus.map(s => s.index)).toEqual([1, 4, 7])
    bonus.forEach(seg => {
      expect(seg.endAngle - seg.startAngle).toBe(15)
      expect(SPECIAL_POOL.map(s => s.type)).toContain(seg.type)
    })
  })

  test('segment indices match array positions and are contiguous', () => {
    const layout = generateWheelLayout(3)
    expect(layout.map(s => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })
})
