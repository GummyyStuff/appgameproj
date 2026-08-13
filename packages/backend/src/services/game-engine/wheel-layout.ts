import { createHmac, timingSafeEqual } from 'crypto'
import type { WheelSegment } from '../../types/database'
import { env } from '../../config/env'

export const BASE_MULTIPLIERS = [0, 0.5, 1, 1.5, 2, 3, 5, 10, 50] as const
export const BONUS_ANGLE = 15
export const BASE_TOTAL_ANGLE = 360 - BONUS_ANGLE
export const BASE_ANGLE = BASE_TOTAL_ANGLE / 9
export const BONUS_SEGMENT_INDEX = 9
export const SEGMENT_COUNT = 10

const BONUS_CONFIG = {
  type: 'bonus_wheel' as const,
  label: 'BONUS',
  multiplier: 0,
  color: '#fbbf24'
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

export function getBaseSegmentAngles(baseOrdinal: number): { startAngle: number; endAngle: number } {
  const start = baseOrdinal * BASE_ANGLE
  const end = baseOrdinal === 8 ? BASE_TOTAL_ANGLE : (baseOrdinal + 1) * BASE_ANGLE
  return { startAngle: start, endAngle: end }
}

export function generateWheelLayout(_seed?: number): WheelSegment[] {
  const segments: WheelSegment[] = []

  for (let i = 0; i < 9; i++) {
    const config = BASE_CONFIG[i]
    const { startAngle, endAngle } = getBaseSegmentAngles(i)
    segments.push({
      index: i,
      type: 'multiplier',
      label: config.label,
      multiplier: config.multiplier,
      color: config.color,
      startAngle,
      endAngle,
      bettable: true
    })
  }

  segments.push({
    index: BONUS_SEGMENT_INDEX,
    type: BONUS_CONFIG.type,
    label: BONUS_CONFIG.label,
    multiplier: BONUS_CONFIG.multiplier,
    color: BONUS_CONFIG.color,
    startAngle: BASE_TOTAL_ANGLE,
    endAngle: 360,
    bettable: false
  })

  return segments
}

export function validateWheelLayout(layout: unknown): layout is WheelSegment[] {
  if (!Array.isArray(layout) || layout.length !== SEGMENT_COUNT) return false

  for (let pos = 0; pos < SEGMENT_COUNT; pos++) {
    const seg = layout[pos] as WheelSegment
    if (!seg || typeof seg !== 'object') return false
    if (seg.index !== pos) return false
    if (typeof seg.startAngle !== 'number' || typeof seg.endAngle !== 'number') return false

    if (pos === BONUS_SEGMENT_INDEX) {
      if (seg.type !== BONUS_CONFIG.type) return false
      if (seg.bettable !== false) return false
      if (seg.label !== BONUS_CONFIG.label) return false
      if (seg.multiplier !== BONUS_CONFIG.multiplier) return false
      if (seg.startAngle !== BASE_TOTAL_ANGLE || seg.endAngle !== 360) return false
      continue
    }

    const expected = BASE_CONFIG[pos]
    if (seg.type !== 'multiplier') return false
    if (seg.bettable !== true) return false
    if (seg.label !== expected.label) return false
    if (seg.multiplier !== expected.multiplier) return false
    const { startAngle, endAngle } = getBaseSegmentAngles(pos)
    if (seg.startAngle !== startAngle || seg.endAngle !== endAngle) return false
  }

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
