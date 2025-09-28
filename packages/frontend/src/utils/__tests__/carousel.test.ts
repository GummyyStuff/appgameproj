import { describe, test, expect } from 'bun:test'
import { 
  generateCarouselSequence, 
  calculateWinningPosition, 
  validateCarouselSequence,
  getWeightedRandomItem,
  CAROUSEL_TIMING 
} from '../carousel'
import { TarkovItem } from '../../components/games/ItemReveal'

// Mock Tarkov items for testing
const mockItems: TarkovItem[] = [
  {
    id: '1',
    name: 'Bandage',
    rarity: 'common',
    base_value: 100,
    category: 'medical',
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '2',
    name: 'GPU',
    rarity: 'legendary',
    base_value: 5000,
    category: 'electronics',
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '3',
    name: 'LEDX',
    rarity: 'epic',
    base_value: 2000,
    category: 'medical',
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '4',
    name: 'Vodka',
    rarity: 'rare',
    base_value: 500,
    category: 'consumables',
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
]

describe('Carousel Utilities', () => {
  describe('generateCarouselSequence', () => {
    test('should generate a sequence with the correct length', () => {
      const sequence = generateCarouselSequence(mockItems, mockItems[1], 50, 30)
      expect(sequence).toHaveLength(50)
    })

    test('should place the winning item at the specified position', () => {
      const winningItem = mockItems[1] // GPU
      const winningPosition = 30
      const sequence = generateCarouselSequence(mockItems, winningItem, 50, winningPosition)
      
      expect(sequence[winningPosition].item).toEqual(winningItem)
      expect(sequence[winningPosition].isWinning).toBe(true)
    })

    test('should only have one winning item in the sequence', () => {
      const sequence = generateCarouselSequence(mockItems, mockItems[1], 50, 30)
      const winningItems = sequence.filter(item => item.isWinning)
      expect(winningItems).toHaveLength(1)
    })

    test('should generate unique IDs for each carousel item', () => {
      const sequence = generateCarouselSequence(mockItems, mockItems[1], 50, 30)
      const ids = sequence.map(item => item.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(sequence.length)
    })

    test('should throw error for empty items array', () => {
      expect(() => {
        generateCarouselSequence([], mockItems[0], 50, 30)
      }).toThrow('Case items array cannot be empty')
    })

    test('should throw error for invalid winning position', () => {
      expect(() => {
        generateCarouselSequence(mockItems, mockItems[0], 50, 60)
      }).toThrow('Winning position must be less than sequence length')
    })
  })

  describe('calculateWinningPosition', () => {
    test('should return a position within the specified range', () => {
      const position = calculateWinningPosition(75, 50, 65)
      expect(position).toBeGreaterThanOrEqual(50)
      expect(position).toBeLessThanOrEqual(65)
    })

    test('should not exceed sequence length minus buffer', () => {
      const sequenceLength = 75
      const position = calculateWinningPosition(sequenceLength)
      expect(position).toBeLessThan(sequenceLength - 5)
    })

    test('should handle edge cases', () => {
      const position = calculateWinningPosition(10, 5, 8)
      expect(position).toBeGreaterThanOrEqual(5)
      expect(position).toBeLessThanOrEqual(8)
    })
  })

  describe('validateCarouselSequence', () => {
    test('should validate a correct sequence', () => {
      const sequence = generateCarouselSequence(mockItems, mockItems[1], 50, 30)
      expect(validateCarouselSequence(sequence)).toBe(true)
    })

    test('should reject empty sequence', () => {
      expect(validateCarouselSequence([])).toBe(false)
    })

    test('should reject sequence with no winning items', () => {
      const sequence = generateCarouselSequence(mockItems, mockItems[1], 50, 30)
      // Remove winning flag from all items
      sequence.forEach(item => item.isWinning = false)
      expect(validateCarouselSequence(sequence)).toBe(false)
    })

    test('should reject sequence with multiple winning items', () => {
      const sequence = generateCarouselSequence(mockItems, mockItems[1], 50, 30)
      // Add another winning item
      sequence[10].isWinning = true
      expect(validateCarouselSequence(sequence)).toBe(false)
    })

    test('should reject sequence with invalid item data', () => {
      const sequence = generateCarouselSequence(mockItems, mockItems[1], 50, 30)
      // Corrupt an item
      sequence[5].item = null as any
      expect(validateCarouselSequence(sequence)).toBe(false)
    })
  })

  describe('getWeightedRandomItem', () => {
    test('should return an item from the provided array', () => {
      const item = getWeightedRandomItem(mockItems)
      expect(mockItems).toContain(item)
    })

    test('should respect rarity weights over multiple calls', () => {
      const results: { [key: string]: number } = {}
      const iterations = 1000
      
      // Run many iterations to test probability distribution
      for (let i = 0; i < iterations; i++) {
        const item = getWeightedRandomItem(mockItems)
        results[item.rarity] = (results[item.rarity] || 0) + 1
      }
      
      // Common items should appear more frequently than legendary
      expect(results.common || 0).toBeGreaterThan(results.legendary || 0)
    })

    test('should handle custom weights', () => {
      const customWeights = {
        common: 10,
        uncommon: 10,
        rare: 10,
        epic: 10,
        legendary: 60 // Make legendary very likely
      }
      
      const results: { [key: string]: number } = {}
      const iterations = 100
      
      for (let i = 0; i < iterations; i++) {
        const item = getWeightedRandomItem(mockItems, customWeights)
        results[item.rarity] = (results[item.rarity] || 0) + 1
      }
      
      // With high legendary weight, it should appear frequently
      expect(results.legendary || 0).toBeGreaterThan(10)
    })

    test('should fallback gracefully with empty rarity groups', () => {
      const limitedItems = [mockItems[0]] // Only common items
      const item = getWeightedRandomItem(limitedItems)
      expect(item).toBe(mockItems[0])
    })
  })

  describe('CAROUSEL_TIMING constants', () => {
    test('should have reasonable timing values', () => {
      expect(CAROUSEL_TIMING.FAST_SPIN_DURATION).toBeGreaterThan(1000)
      expect(CAROUSEL_TIMING.DECELERATION_DURATION).toBeGreaterThan(2000)
      expect(CAROUSEL_TIMING.TOTAL_DURATION).toBeGreaterThan(5000)
    })

    test('should have consistent item dimensions', () => {
      expect(CAROUSEL_TIMING.ITEM_WIDTH).toBeGreaterThan(100)
      expect(CAROUSEL_TIMING.VISIBLE_ITEMS).toBeGreaterThan(3)
    })

    test('should have reasonable sequence parameters', () => {
      expect(CAROUSEL_TIMING.SEQUENCE_LENGTH).toBeGreaterThan(50)
      expect(CAROUSEL_TIMING.WINNING_POSITION_MIN).toBeLessThan(CAROUSEL_TIMING.WINNING_POSITION_MAX)
      expect(CAROUSEL_TIMING.WINNING_POSITION_MAX).toBeLessThan(CAROUSEL_TIMING.SEQUENCE_LENGTH)
    })
  })

  describe('Mathematical accuracy tests', () => {
    test('should calculate precise final positions', () => {
      const itemWidth = CAROUSEL_TIMING.ITEM_WIDTH
      const visibleItems = CAROUSEL_TIMING.VISIBLE_ITEMS
      const viewportCenter = (visibleItems * itemWidth) / 2 - itemWidth / 2
      
      // Test winning position calculation
      const winningIndex = 60
      const expectedFinalPosition = -(winningIndex * itemWidth - viewportCenter)
      
      // This should center the winning item in the viewport
      expect(expectedFinalPosition).toBeLessThan(0) // Should be negative for left movement
      expect(Math.abs(expectedFinalPosition)).toBeGreaterThan(itemWidth * 50) // Should move significant distance
    })

    test('should handle edge case positions', () => {
      const sequence = generateCarouselSequence(mockItems, mockItems[0], 10, 0)
      expect(sequence[0].isWinning).toBe(true)
      
      const sequence2 = generateCarouselSequence(mockItems, mockItems[0], 10, 9)
      expect(sequence2[9].isWinning).toBe(true)
    })
  })

  describe('Performance tests', () => {
    test('should generate large sequences efficiently', () => {
      const startTime = performance.now()
      const sequence = generateCarouselSequence(mockItems, mockItems[1], 1000, 500)
      const endTime = performance.now()
      
      expect(sequence).toHaveLength(1000)
      expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
    })

    test('should validate large sequences efficiently', () => {
      const sequence = generateCarouselSequence(mockItems, mockItems[1], 1000, 500)
      
      const startTime = performance.now()
      const isValid = validateCarouselSequence(sequence)
      const endTime = performance.now()
      
      expect(isValid).toBe(true)
      expect(endTime - startTime).toBeLessThan(50) // Should validate in under 50ms
    })
  })
})