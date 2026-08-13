import { createHmac, timingSafeEqual } from 'crypto'
import type { WheelSegment, WheelSegmentType } from '../../types/database'
import { env } from '../../config/env'

export const BASE_MULTIPLIERS = [0, 0.5, 1, 1.5, 2, 3, 5, 10, 50] as const
export const SPECIAL_TYPES: readonly WheelSegmentType[] = ['free_spin', 'double_bet', 'double_winnings', 'jackpot'] as const
export const BONUS_SLOT_POSITIONS = [1, 4, 7] as const
export const BASE_ANGLE = 35
export const BONUS_ANGLE = 15
export const SEGMENT_COUNT = 12

const SPECIAL_CONFIG: Record<WheelSegmentType, { label: string; multiplier: number; color: string }> = {
  free_spin: { label: 'FREE', multiplier: 1, color: '#06b6d4' },
  double_bet: { label: '2x BET', multiplier: 2, color: '#f97316' },
  double_winnings: { label: '2x WIN', multiplier: 1, color: '#a855f7' },
  jackpot: { label: 'JACKPOT', multiplier: 100, color: '#fbbf24' },
  multiplier: { label: '', multiplier: 0, color: '' }
}

const BASE_CONFIG: { multiplier: number; label: string; color: string }[] = [
  { multiplier: 0, label: '0x', color: '#4a4a4a' },
  { multiplier: 0.5, label: '0.5x', color: '#6b7280' },
  { multiplier: 1, label: '1x', color: '#3b82f6' },
  { multiplier: 1.5, label: '1.5x', color: '#8b5cf6' },
  { multiplier: 2, label: '2x', color: '#10b981' },
  { multiplier: 3, label: '3x', color: '#f59e0b' },
  { multiplier: 5, label: '5x', color: '#ef4444' },
  { multiplier: 10, label: '10x', color: '#ec4899' },
  { multiplier: 50, label: '50x', color: '#fbbf24' }
]

class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed % 2147483647
    if (this.seed <= 0) this.seed += 2147483646
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647
    return (this.seed - 1) / 2147483646
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
}

export function generateWheelLayout(seed?: number): WheelSegment[] {
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 2147483647))

  const bonusTypes: WheelSegmentType[] = []
  for (let i = 0; i < BONUS_SLOT_POSITIONS.length; i++) {
    const idx = rng.nextInt(0, SPECIAL_TYPES.length - 1)
    bonusTypes.push(SPECIAL_TYPES[idx] as WheelSegmentType)
  }

  const segments: WheelSegment[] = []
  let currentAngle = 0
  let baseIndex = 0
  let bonusIndex = 0

  for (let pos = 0; pos < SEGMENT_COUNT; pos++) {
    if (BONUS_SLOT_POSITIONS.includes(pos as (typeof BONUS_SLOT_POSITIONS)[number])) {
      const type = bonusTypes[bonusIndex]
      const config = SPECIAL_CONFIG[type]
      segments.push({
        index: pos,
        type,
        label: config.label,
        multiplier: config.multiplier,
        color: config.color,
        startAngle: currentAngle,
        endAngle: currentAngle + BONUS_ANGLE,
        bettable: false
      })
      currentAngle += BONUS_ANGLE
      bonusIndex++
    } else {
      const config = BASE_CONFIG[baseIndex]
      segments.push({
        index: pos,
        type: 'multiplier',
        label: config.label,
        multiplier: config.multiplier,
        color: config.color,
        startAngle: currentAngle,
        endAngle: currentAngle + BASE_ANGLE,
        bettable: true
      })
      currentAngle += BASE_ANGLE
      baseIndex++
    }
  }

  return segments
}

export function validateWheelLayout(layout: unknown): layout is WheelSegment[] {
  if (!Array.isArray(layout) || layout.length !== SEGMENT_COUNT) return false

  let currentAngle = 0
  let baseIndex = 0
  let bonusIndex = 0

  for (let pos = 0; pos < SEGMENT_COUNT; pos++) {
    const seg = layout[pos] as WheelSegment
    if (!seg || typeof seg !== 'object') return false
    if (seg.index !== pos) return false
    if (typeof seg.startAngle !== 'number' || typeof seg.endAngle !== 'number') return false

    if (BONUS_SLOT_POSITIONS.includes(pos as (typeof BONUS_SLOT_POSITIONS)[number])) {
      const expectedType = seg.type
      if (!SPECIAL_TYPES.includes(expectedType as WheelSegmentType)) return false
      const config = SPECIAL_CONFIG[expectedType as WheelSegmentType]
      if (seg.bettable !== false) return false
      if (seg.label !== config.label) return false
      if (seg.multiplier !== config.multiplier) return false
      if (seg.startAngle !== currentAngle || seg.endAngle !== currentAngle + BONUS_ANGLE) return false
      currentAngle += BONUS_ANGLE
      bonusIndex++
    } else {
      const expected = BASE_CONFIG[baseIndex]
      if (seg.type !== 'multiplier') return false
      if (seg.bettable !== true) return false
      if (seg.label !== expected.label) return false
      if (seg.multiplier !== expected.multiplier) return false
      if (seg.startAngle !== currentAngle || seg.endAngle !== currentAngle + BASE_ANGLE) return false
      currentAngle += BASE_ANGLE
      baseIndex++
    }
  }

  if (currentAngle !== 360 || baseIndex !== 9 || bonusIndex !== 3) return false
  return true
}

const getLayoutSecret = (): string => {
  return env.JWT_SECRET || 'wheel-of-chance-dev-secret-change-me'
}

const layoutFingerprint = (layout: WheelSegment[]): string => {
  return JSON.stringify(layout.map(seg => [seg.index, seg.type, seg.startAngle, seg.endAngle]))
}

export function signWheelLayout(layout: WheelSegment[]): string {
  return createHmac('sha256', getLayoutSecret()).update(layoutFingerprint(layout)).digest('hex')
}

export function verifyWheelLayoutSignature(layout: WheelSegment[], signature: string): boolean {
  if (typeof signature !== 'string' || signature.length === 0) return false
  const expected = signWheelLayout(layout)
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(signature, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
