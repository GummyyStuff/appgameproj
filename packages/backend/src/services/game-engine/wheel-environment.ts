import type {
  EnvironmentState,
  EnvironmentType,
  EnvironmentSegmentModifier,
  WheelSegment,
  WheelOfChanceVerification
} from '../../types/database'
import { ProvablyFairService } from './provably-fair-service'
import { BASE_MULTIPLIERS } from './wheel-layout'

export const ENVIRONMENT_TYPES: readonly EnvironmentType[] = [
  'clear_skies',
  'scav_raid',
  'emp_strike',
  'thermal_scan',
  'blackout'
] as const

export const ENVIRONMENT_SPINS = 3
export const MAX_BONUS_RESPINS = 10

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

export class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = Math.abs(Math.floor(seed)) % 2147483647
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

export function formatMultiplierLabel(multiplier: number): string {
  if (Number.isInteger(multiplier)) return `${multiplier}x`
  return `${multiplier}x`
}

function pickDistinctIndices(rng: SeededRandom, count: number, max: number): number[] {
  const pool: number[] = []
  for (let i = 0; i <= max; i++) pool.push(i)

  const picked: number[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = rng.nextInt(0, pool.length - 1)
    picked.push(pool[idx])
    pool.splice(idx, 1)
  }
  return picked
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
      const tiers = [...BASE_MULTIPLIERS]
      return layout.map(segment => {
        if (segment.type !== 'multiplier') return segment
        const currentIndex = tiers.indexOf(segment.multiplier as (typeof tiers)[number])
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

export interface GeneratedEnvironment {
  state: EnvironmentState
  verification: WheelOfChanceVerification
}

export async function generateNewEnvironment(
  provablyFair: ProvablyFairService
): Promise<GeneratedEnvironment> {
  const context = await provablyFair.createContext()
  const outcome = await provablyFair.generateOutcome(context)

  const rng = new SeededRandom(parseInt(outcome.hash.substring(0, 8), 16))
  const type = ENVIRONMENT_TYPES[Math.min(
    Math.floor(outcome.randomValue * ENVIRONMENT_TYPES.length),
    ENVIRONMENT_TYPES.length - 1
  )]

  const modifiers: EnvironmentSegmentModifier[] = []

  if (type === 'scav_raid') {
    const indices = pickDistinctIndices(rng, 5, 8)
    for (const index of indices) {
      modifiers.push({ segmentIndex: index, operation: 'add', value: rng.nextInt(2, 10) })
    }
  } else if (type === 'emp_strike') {
    const count = rng.nextInt(1, 3)
    const indices = pickDistinctIndices(rng, count, 8)
    for (const index of indices) {
      modifiers.push({ segmentIndex: index, operation: 'add', value: rng.nextInt(5, 20) })
    }
  } else if (type === 'thermal_scan') {
    const eligibleIndices = BASE_MULTIPLIERS
      .map((multiplier, index) => ({ multiplier, index }))
      .filter(entry => entry.multiplier < 10)
      .map(entry => entry.index)
    const picked = rng.nextInt(0, eligibleIndices.length - 1)
    modifiers.push({ segmentIndex: eligibleIndices[picked], operation: 'set', value: 10 })
  }

  return {
    state: {
      type,
      spins_remaining: ENVIRONMENT_SPINS,
      modifiers
    },
    verification: {
      server_seed: context.serverSeed,
      server_seed_hash: provablyFair.hashServerSeed(context.serverSeed),
      client_seed: context.clientSeed,
      nonce: context.nonce,
      random_value: outcome.randomValue
    }
  }
}

export function isValidEnvironmentState(state: unknown): state is EnvironmentState {
  if (!state || typeof state !== 'object') return false
  const env = state as EnvironmentState
  if (!ENVIRONMENT_TYPES.includes(env.type)) return false
  if (typeof env.spins_remaining !== 'number' || env.spins_remaining < 0 || env.spins_remaining > ENVIRONMENT_SPINS) return false
  if (!Array.isArray(env.modifiers)) return false
  return env.modifiers.every((modifier: EnvironmentSegmentModifier) =>
    typeof modifier === 'object' &&
    typeof modifier.segmentIndex === 'number' &&
    modifier.segmentIndex >= 0 &&
    modifier.segmentIndex <= 8 &&
    (modifier.operation === 'add' || modifier.operation === 'set') &&
    typeof modifier.value === 'number' &&
    Number.isFinite(modifier.value) &&
    modifier.value > 0
  )
}

export function clearSkiesEnvironment(): EnvironmentState {
  return { type: 'clear_skies', spins_remaining: ENVIRONMENT_SPINS, modifiers: [] }
}
