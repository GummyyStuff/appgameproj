import type { WheelSegment, EnvironmentState, EnvironmentType } from '../types/wheel'

const BASE_SEGMENTS: { multiplier: number; label: string; color: string }[] = [
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

export const ENVIRONMENT_META: Record<EnvironmentType, {
  label: string
  description: string
  color: string
  icon: string
}> = {
  clear_skies: {
    label: 'Clear Skies',
    description: 'Normal raid conditions. No modifiers active.',
    color: '#9ca3af',
    icon: 'sun'
  },
  scav_raid: {
    label: 'Scav Raid',
    description: '5 random segments gain +2x to +10x boost.',
    color: '#f97316',
    icon: 'skull'
  },
  emp_strike: {
    label: 'EMP Strike',
    description: '1-3 random segments gain +5x to +20x boost.',
    color: '#22d3ee',
    icon: 'bolt'
  },
  thermal_scan: {
    label: 'Thermal Scan',
    description: 'One random low segment is hot: it pays 10x.',
    color: '#ef4444',
    icon: 'crosshairs'
  },
  blackout: {
    label: 'Blackout',
    description: 'All multipliers shift up one tier.',
    color: '#7c3aed',
    icon: 'moon'
  }
}

export function formatMultiplierLabel(multiplier: number): string {
  return `${multiplier}x`
}

export function getBaseSegmentAngles(baseOrdinal: number): { startAngle: number; endAngle: number } {
  const start = baseOrdinal * BASE_ANGLE
  const end = baseOrdinal === 8 ? BASE_TOTAL_ANGLE : (baseOrdinal + 1) * BASE_ANGLE
  return { startAngle: start, endAngle: end }
}

export function generateWheelLayout(seed?: number): WheelSegment[] {
  void seed
  const segments: WheelSegment[] = []

  for (let i = 0; i < 9; i++) {
    const config = BASE_SEGMENTS[i]
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

export function applyEnvironmentModifiers(
  layout: WheelSegment[],
  environment: EnvironmentState
): WheelSegment[] {
  switch (environment.type) {
    case 'clear_skies':
      return layout

    case 'scav_raid':
    case 'emp_strike':
    case 'thermal_scan': {
      return layout.map(segment => {
        if (segment.type !== 'multiplier') return segment
        const modifier = environment.modifiers.find(m => m.segmentIndex === segment.index)
        if (!modifier) return segment
        const multiplier = modifier.operation === 'add'
          ? segment.multiplier + modifier.value
          : modifier.value
        return {
          ...segment,
          multiplier,
          label: formatMultiplierLabel(multiplier)
        }
      })
    }

    case 'blackout': {
      const tiers = BASE_SEGMENTS.map(s => s.multiplier)
      return layout.map(segment => {
        if (segment.type !== 'multiplier') return segment
        const currentIndex = tiers.indexOf(segment.multiplier)
        const nextIndex = Math.min((currentIndex === -1 ? 0 : currentIndex) + 1, tiers.length - 1)
        const multiplier = tiers[nextIndex]
        return {
          ...segment,
          multiplier,
          label: formatMultiplierLabel(multiplier)
        }
      })
    }
  }
}

export function transformLayoutForBonusWheel(layout: WheelSegment[]): WheelSegment[] {
  return layout.map(segment => {
    if (segment.type !== 'multiplier') return segment
    const multiplier = segment.multiplier * 2
    return {
      ...segment,
      multiplier,
      label: formatMultiplierLabel(multiplier)
    }
  })
}

export function getBaseSegments(segments: WheelSegment[]): WheelSegment[] {
  return segments.filter(s => s.bettable)
}

export function getBonusSegments(segments: WheelSegment[]): WheelSegment[] {
  return segments.filter(s => !s.bettable)
}
