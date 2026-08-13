import { describe, test, expect } from 'vitest'
import {
  generateWheelLayout,
  validateWheelLayout,
  signWheelLayout,
  verifyWheelLayoutSignature,
  SEGMENT_COUNT,
  BASE_ANGLE,
  BONUS_ANGLE,
  BONUS_SEGMENT_INDEX,
  BASE_MULTIPLIERS
} from './wheel-layout'
import type { WheelSegment } from '../../types/database'

describe('wheel-layout', () => {
  describe('generateWheelLayout', () => {
    test('creates 10 segments whose angles sum to exactly 360', () => {
      const layout = generateWheelLayout(12345)
      expect(layout.length).toBe(SEGMENT_COUNT)
      const total = layout.reduce((sum, seg) => sum + (seg.endAngle - seg.startAngle), 0)
      expect(total).toBe(360)
    })

    test('places a single bonus segment at index 9 with a 15 degree span', () => {
      const layout = generateWheelLayout(42)
      expect(layout[BONUS_SEGMENT_INDEX].type).toBe('bonus_wheel')
      expect(layout[BONUS_SEGMENT_INDEX].bettable).toBe(false)
      expect(layout[BONUS_SEGMENT_INDEX].endAngle - layout[BONUS_SEGMENT_INDEX].startAngle).toBe(BONUS_ANGLE)
      const bonusCount = layout.filter(seg => !seg.bettable).length
      expect(bonusCount).toBe(1)
    })

    test('base segments have 38.33 degree spans and the fixed multiplier pool in order', () => {
      const layout = generateWheelLayout(7)
      const base = layout.filter(seg => seg.bettable)
      expect(base.length).toBe(9)
      base.forEach((seg, i) => {
        expect(seg.endAngle - seg.startAngle).toBeCloseTo(BASE_ANGLE, 6)
        expect(seg.multiplier).toBe(BASE_MULTIPLIERS[i])
      })
    })

    test('is deterministic across calls', () => {
      const a = generateWheelLayout(99)
      const b = generateWheelLayout(99)
      expect(a).toEqual(b)
    })

    test('produces only valid segment types', () => {
      const layout = generateWheelLayout(123)
      for (const seg of layout) {
        expect(['multiplier', 'bonus_wheel']).toContain(seg.type)
      }
    })
  })

  describe('validateWheelLayout', () => {
    test('accepts a generated layout', () => {
      const layout = generateWheelLayout(555)
      expect(validateWheelLayout(layout)).toBe(true)
    })

    test('rejects tampered angles', () => {
      const layout = generateWheelLayout(555)
      const tampered: WheelSegment[] = layout.map(seg =>
        seg.index === 0 ? { ...seg, endAngle: seg.endAngle + 100 } : seg
      )
      expect(validateWheelLayout(tampered)).toBe(false)
    })

    test('rejects tampered multipliers', () => {
      const layout = generateWheelLayout(555)
      const tampered: WheelSegment[] = layout.map(seg =>
        seg.index === 0 ? { ...seg, multiplier: 100000 } : seg
      )
      expect(validateWheelLayout(tampered)).toBe(false)
    })

    test('rejects a base segment marked as non-bettable', () => {
      const layout = generateWheelLayout(555)
      const tampered: WheelSegment[] = layout.map(seg =>
        seg.index === 0 ? { ...seg, bettable: false } : seg
      )
      expect(validateWheelLayout(tampered)).toBe(false)
    })

    test('rejects a bonus segment marked as bettable', () => {
      const layout = generateWheelLayout(555)
      const tampered: WheelSegment[] = layout.map(seg =>
        seg.index === BONUS_SEGMENT_INDEX ? { ...seg, bettable: true } : seg
      )
      expect(validateWheelLayout(tampered)).toBe(false)
    })

    test('rejects an old-style special type on the bonus segment', () => {
      const layout = generateWheelLayout(555)
      const tampered: WheelSegment[] = layout.map(seg =>
        seg.index === BONUS_SEGMENT_INDEX
          ? { ...seg, type: 'jackpot' as never, label: 'JACKPOT', multiplier: 100 }
          : seg
      )
      expect(validateWheelLayout(tampered)).toBe(false)
    })

    test('rejects layouts with the wrong segment count', () => {
      const layout = generateWheelLayout(555)
      expect(validateWheelLayout(layout.slice(0, 9))).toBe(false)
      expect(validateWheelLayout([...layout, layout[0]])).toBe(false)
    })

    test('rejects non-array input', () => {
      expect(validateWheelLayout(null)).toBe(false)
      expect(validateWheelLayout('nope')).toBe(false)
      expect(validateWheelLayout({})).toBe(false)
    })
  })

  describe('layout signatures', () => {
    test('signs and verifies a layout', () => {
      const layout = generateWheelLayout(777)
      const signature = signWheelLayout(layout)
      expect(verifyWheelLayoutSignature(layout, signature)).toBe(true)
    })

    test('rejects a tampered layout with a valid-looking signature', () => {
      const layout = generateWheelLayout(777)
      const signature = signWheelLayout(layout)
      const tampered: WheelSegment[] = layout.map(seg =>
        seg.index === BONUS_SEGMENT_INDEX ? { ...seg, type: 'multiplier', label: '50x', multiplier: 50 } : seg
      )
      expect(verifyWheelLayoutSignature(tampered, signature)).toBe(false)
    })

    test('rejects missing or malformed signatures', () => {
      const layout = generateWheelLayout(777)
      expect(verifyWheelLayoutSignature(layout, '')).toBe(false)
      expect(verifyWheelLayoutSignature(layout, 'deadbeef')).toBe(false)
    })
  })
})
