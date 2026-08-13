import type { WheelSegment, WheelSegmentType } from '../types/wheel'

interface SpecialConfig {
  type: WheelSegmentType
  label: string
  multiplier: number
  color: string
}

export const SPECIAL_POOL: SpecialConfig[] = [
  { type: 'free_spin', label: 'FREE', multiplier: 1, color: '#06b6d4' },
  { type: 'double_bet', label: '2x BET', multiplier: 2, color: '#f97316' },
  { type: 'double_winnings', label: '2x WIN', multiplier: 1, color: '#a855f7' },
  { type: 'jackpot', label: 'JACKPOT', multiplier: 100, color: '#fbbf24' }
]

interface BaseSegmentConfig {
  multiplier: number
  label: string
  color: string
}

const BASE_SEGMENTS: BaseSegmentConfig[] = [
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

const BONUS_SLOT_POSITIONS = [1, 4, 7]

const BASE_ANGLE = 35
const BONUS_ANGLE = 15

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

  const bonusTypes: SpecialConfig[] = []
  for (let i = 0; i < BONUS_SLOT_POSITIONS.length; i++) {
    const idx = rng.nextInt(0, SPECIAL_POOL.length - 1)
    bonusTypes.push(SPECIAL_POOL[idx])
  }

  const segments: WheelSegment[] = []
  let currentAngle = 0
  let segmentIndex = 0
  let baseIndex = 0
  let bonusIndex = 0

  for (let pos = 0; pos < 12; pos++) {
    const isBonusSlot = BONUS_SLOT_POSITIONS.includes(pos)

    if (isBonusSlot) {
      const bonus = bonusTypes[bonusIndex]
      segments.push({
        index: segmentIndex,
        type: bonus.type,
        label: bonus.label,
        multiplier: bonus.multiplier,
        color: bonus.color,
        startAngle: currentAngle,
        endAngle: currentAngle + BONUS_ANGLE,
        bettable: false
      })
      currentAngle += BONUS_ANGLE
      bonusIndex++
    } else {
      const base = BASE_SEGMENTS[baseIndex]
      segments.push({
        index: segmentIndex,
        type: 'multiplier',
        label: base.label,
        multiplier: base.multiplier,
        color: base.color,
        startAngle: currentAngle,
        endAngle: currentAngle + BASE_ANGLE,
        bettable: true
      })
      currentAngle += BASE_ANGLE
      baseIndex++
    }
    segmentIndex++
  }

  return segments
}

export function getBaseSegments(segments: WheelSegment[]): WheelSegment[] {
  return segments.filter(s => s.bettable)
}

export function getBonusSegments(segments: WheelSegment[]): WheelSegment[] {
  return segments.filter(s => !s.bettable)
}
