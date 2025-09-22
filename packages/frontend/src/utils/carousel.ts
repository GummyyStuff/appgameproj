import { TarkovItem } from '../components/games/ItemReveal'
import { CaseType } from '../components/games/CaseSelector'
import { CarouselItemData } from '../components/games/CaseOpeningCarousel'

/**
 * Generates a sequence of items for the carousel animation
 * Places the winning item at a specific position and fills the rest with random items
 * Ensures proper rarity distribution and real item population
 */
export function generateCarouselSequence(
  caseItems: TarkovItem[],
  winningItem: TarkovItem,
  sequenceLength: number = 75,
  winningPosition: number = 60
): CarouselItemData[] {
  if (caseItems.length === 0) {
    throw new Error('Case items array cannot be empty')
  }

  if (winningPosition >= sequenceLength) {
    throw new Error('Winning position must be less than sequence length')
  }

  // Ensure we have valid items to work with
  const validItems = caseItems.filter(item => item && item.id && item.name)
  if (validItems.length === 0) {
    throw new Error('No valid items found in case items array')
  }

  const sequence: CarouselItemData[] = []

  // Generate the full sequence with proper rarity distribution
  for (let i = 0; i < sequenceLength; i++) {
    let item: TarkovItem
    let isWinning = false

    if (i === winningPosition) {
      // Place the winning item at the specified position
      item = winningItem
      isWinning = true
    } else {
      // Fill with weighted random items from the case pool to match realistic probabilities
      item = getWeightedRandomItem(validItems, {
        common: 60,
        uncommon: 25,
        rare: 10,
        epic: 4,
        legendary: 1
      })
    }

    sequence.push({
      item,
      id: `carousel-item-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isWinning
    })
  }

  return sequence
}

/**
 * Selects a random item from the case pool based on rarity distribution
 */
function getRandomItemFromPool(items: TarkovItem[]): TarkovItem {
  // Use weighted random selection to match case opening probabilities
  return getWeightedRandomItem(items)
}

/**
 * Calculates the optimal winning position based on animation timing
 * Places the winning item far enough to create suspense but not too far
 */
export function calculateWinningPosition(
  sequenceLength: number,
  minPosition: number = 30,
  maxPosition: number = 45
): number {
  // Place the winning item in the MIDDLE of the sequence to prevent overshoot
  // This ensures the animation never has to go backwards to reach it
  const range = maxPosition - minPosition
  const randomOffset = Math.floor(Math.random() * range)
  const position = minPosition + randomOffset
  
  // Ensure we have enough buffer on both sides, but adapt to sequence length
  const bufferSize = Math.min(10, Math.floor(sequenceLength * 0.1)) // 10% buffer or 10 items, whichever is smaller
  const safePosition = Math.max(bufferSize, Math.min(position, sequenceLength - bufferSize))
  
  console.log('Winning position calculation:', {
    sequenceLength,
    minPosition,
    maxPosition,
    calculatedPosition: position,
    safePosition,
    bufferFromEnd: sequenceLength - safePosition
  })
  
  return safePosition
}

/**
 * Validates that the carousel sequence is properly configured
 */
export function validateCarouselSequence(sequence: CarouselItemData[]): boolean {
  if (sequence.length === 0) {
    return false
  }

  // Check that exactly one item is marked as winning
  const winningItems = sequence.filter(item => item.isWinning)
  if (winningItems.length !== 1) {
    console.error(`Expected exactly 1 winning item, found ${winningItems.length}`)
    return false
  }

  // Check that all items have required properties
  for (const itemData of sequence) {
    if (!itemData.item || !itemData.id) {
      console.error('Invalid item data in carousel sequence')
      return false
    }
  }

  return true
}

/**
 * Creates a weighted random selection based on rarity distribution
 */
export function getWeightedRandomItem(
  items: TarkovItem[],
  rarityWeights: Record<string, number> = {
    common: 60,
    uncommon: 25,
    rare: 10,
    epic: 4,
    legendary: 1
  }
): TarkovItem {
  if (!items || items.length === 0) {
    throw new Error('Items array cannot be empty')
  }

  // Group items by rarity
  const itemsByRarity: Record<string, TarkovItem[]> = {}
  items.forEach(item => {
    const rarity = item.rarity || 'common' // Default to common if rarity is missing
    if (!itemsByRarity[rarity]) {
      itemsByRarity[rarity] = []
    }
    itemsByRarity[rarity].push(item)
  })

  // Get available rarities that have items
  const availableRarities = Object.keys(itemsByRarity).filter(rarity => 
    itemsByRarity[rarity].length > 0
  )

  if (availableRarities.length === 0) {
    // Fallback to random item if no valid rarities found
    return items[Math.floor(Math.random() * items.length)]
  }

  // Calculate total weight for available rarities only
  const availableWeights = availableRarities.reduce((acc, rarity) => {
    acc[rarity] = rarityWeights[rarity] || 1 // Default weight of 1 if not specified
    return acc
  }, {} as Record<string, number>)

  const totalWeight = Object.values(availableWeights).reduce((sum, weight) => sum + weight, 0)
  
  // Generate random number
  let random = Math.random() * totalWeight
  
  // Select rarity based on weights
  for (const [rarity, weight] of Object.entries(availableWeights)) {
    random -= weight
    if (random <= 0 && itemsByRarity[rarity] && itemsByRarity[rarity].length > 0) {
      // Select random item from this rarity
      const rarityItems = itemsByRarity[rarity]
      return rarityItems[Math.floor(Math.random() * rarityItems.length)]
    }
  }

  // Final fallback to random item
  return items[Math.floor(Math.random() * items.length)]
}

/**
 * Animation timing constants for carousel
 */
export const CAROUSEL_TIMING = {
  FAST_SPIN_DURATION: 2000, // 2 seconds
  DECELERATION_DURATION: 3000, // 3 seconds
  SETTLE_DURATION: 500, // 0.5 seconds
  TOTAL_DURATION: 5500, // Total animation time
  ITEM_WIDTH: 120, // Width of each carousel item
  VISIBLE_ITEMS: 5, // Number of items visible at once
  SEQUENCE_LENGTH: 75, // Total items in carousel
  WINNING_POSITION_MIN: 55, // Minimum position for winning item
  WINNING_POSITION_MAX: 65 // Maximum position for winning item
} as const

/**
 * Easing functions for carousel animation
 */
export const CAROUSEL_EASING = {
  FAST_SPIN: 'linear',
  DECELERATION: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  SETTLE: 'easeOut'
} as const