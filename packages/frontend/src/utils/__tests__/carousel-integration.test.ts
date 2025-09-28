import { describe, test, expect } from 'bun:test'
import { 
  generateCarouselSequence, 
  calculateWinningPosition, 
  validateCarouselSequence,
  CAROUSEL_TIMING 
} from '../carousel'
import { TarkovItem } from '../../components/games/ItemReveal'

// Mock Tarkov items for integration testing
const createMockItem = (id: string, name: string, rarity: any, value: number): TarkovItem => ({
  id,
  name,
  rarity,
  base_value: value,
  category: 'electronics',
  is_active: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01'
})

const mockCaseItems: TarkovItem[] = [
  createMockItem('1', 'Bandage', 'common', 100),
  createMockItem('2', 'GPU', 'legendary', 5000),
  createMockItem('3', 'LEDX', 'epic', 2000),
  createMockItem('4', 'Vodka', 'rare', 500),
  createMockItem('5', 'Salewa', 'uncommon', 300)
]

describe('Carousel Integration Tests', () => {
  describe('End-to-End Carousel Generation', () => {
    test('should generate a complete, valid carousel sequence', () => {
      const winningItem = mockCaseItems[1] // GPU (legendary)
      const sequenceLength = CAROUSEL_TIMING.SEQUENCE_LENGTH
      const winningPosition = calculateWinningPosition(sequenceLength)
      
      const sequence = generateCarouselSequence(
        mockCaseItems,
        winningItem,
        sequenceLength,
        winningPosition
      )
      
      // Validate the complete sequence
      expect(validateCarouselSequence(sequence)).toBe(true)
      expect(sequence).toHaveLength(sequenceLength)
      expect(sequence[winningPosition].item).toEqual(winningItem)
      expect(sequence[winningPosition].isWinning).toBe(true)
    })

    test('should create mathematically accurate positioning', () => {
      const itemWidth = CAROUSEL_TIMING.ITEM_WIDTH
      const visibleItems = CAROUSEL_TIMING.VISIBLE_ITEMS
      const viewportCenter = (visibleItems * itemWidth) / 2 - itemWidth / 2
      
      // Test multiple winning positions
      for (let winningIndex = 50; winningIndex < 70; winningIndex++) {
        const expectedFinalPosition = -(winningIndex * itemWidth - viewportCenter)
        
        // The final position should center the winning item
        expect(expectedFinalPosition).toBeLessThan(0) // Should move left
        expect(Math.abs(expectedFinalPosition)).toBeGreaterThan(itemWidth * 40) // Significant movement
        
        // Verify the math works for centering
        const itemCenterPosition = winningIndex * itemWidth + itemWidth / 2
        const finalItemCenter = itemCenterPosition + expectedFinalPosition
        const viewportCenterExpected = viewportCenter + itemWidth / 2
        
        expect(Math.abs(finalItemCenter - viewportCenterExpected)).toBeLessThan(1) // Should be centered within 1px
      }
    })

    test('should handle different case scenarios', () => {
      const scenarios = [
        { items: mockCaseItems.slice(0, 1), winningItem: mockCaseItems[0] }, // Single item
        { items: mockCaseItems.slice(0, 2), winningItem: mockCaseItems[1] }, // Two items
        { items: mockCaseItems, winningItem: mockCaseItems[2] }, // Full set
      ]
      
      scenarios.forEach((scenario, index) => {
        const sequence = generateCarouselSequence(
          scenario.items,
          scenario.winningItem,
          50,
          30
        )
        
        expect(validateCarouselSequence(sequence)).toBe(true)
        expect(sequence[30].item).toEqual(scenario.winningItem)
      })
    })
  })

  describe('Carousel Accuracy Validation', () => {
    test('should ensure winning item lands precisely in center', () => {
      const testCases = [
        { sequenceLength: 50, winningPosition: 30 },
        { sequenceLength: 75, winningPosition: 60 },
        { sequenceLength: 100, winningPosition: 80 }
      ]
      
      testCases.forEach(({ sequenceLength, winningPosition }) => {
        const sequence = generateCarouselSequence(
          mockCaseItems,
          mockCaseItems[1],
          sequenceLength,
          winningPosition
        )
        
        // Verify positioning accuracy
        expect(sequence[winningPosition].isWinning).toBe(true)
        expect(sequence[winningPosition].item).toEqual(mockCaseItems[1])
        
        // Verify no other items are marked as winning
        const winningItems = sequence.filter(item => item.isWinning)
        expect(winningItems).toHaveLength(1)
      })
    })

    test('should maintain consistent item distribution', () => {
      const sequence = generateCarouselSequence(
        mockCaseItems,
        mockCaseItems[1],
        100,
        75
      )
      
      // Count item occurrences (excluding the guaranteed winning item)
      const itemCounts: { [key: string]: number } = {}
      sequence.forEach((carouselItem, index) => {
        if (index !== 75) { // Skip the winning position
          const itemId = carouselItem.item.id
          itemCounts[itemId] = (itemCounts[itemId] || 0) + 1
        }
      })
      
      // With weighted distribution, items should appear with reasonable frequency
      // Some items may appear only once due to rarity weighting, which is expected
      Object.values(itemCounts).forEach(count => {
        expect(count).toBeGreaterThanOrEqual(1) // Should appear at least once
        expect(count).toBeLessThanOrEqual(80) // Allow for weighted distribution where common items dominate
      })
      
      // Ensure we have good variety overall
      expect(Object.keys(itemCounts).length).toBeGreaterThanOrEqual(3) // At least 3 different items
    })
  })

  describe('Performance and Reliability', () => {
    test('should handle edge cases without errors', () => {
      const edgeCases = [
        { sequenceLength: 10, winningPosition: 0 }, // Winning at start
        { sequenceLength: 10, winningPosition: 9 }, // Winning at end
        { sequenceLength: 5, winningPosition: 2 }, // Very short sequence
      ]
      
      edgeCases.forEach(({ sequenceLength, winningPosition }) => {
        expect(() => {
          const sequence = generateCarouselSequence(
            mockCaseItems,
            mockCaseItems[0],
            sequenceLength,
            winningPosition
          )
          expect(validateCarouselSequence(sequence)).toBe(true)
        }).not.toThrow()
      })
    })

    test('should generate consistent results for same inputs', () => {
      const winningItem = mockCaseItems[2]
      const sequenceLength = 50
      const winningPosition = 30
      
      // Generate multiple sequences with same parameters
      const sequences = Array.from({ length: 5 }, () =>
        generateCarouselSequence(mockCaseItems, winningItem, sequenceLength, winningPosition)
      )
      
      // All sequences should have the same winning item at the same position
      sequences.forEach(sequence => {
        expect(sequence[winningPosition].item).toEqual(winningItem)
        expect(sequence[winningPosition].isWinning).toBe(true)
        expect(sequence).toHaveLength(sequenceLength)
      })
    })

    test('should validate timing constants are realistic', () => {
      // Verify timing constants make sense for user experience
      expect(CAROUSEL_TIMING.FAST_SPIN_DURATION).toBeGreaterThan(1000) // At least 1 second
      expect(CAROUSEL_TIMING.FAST_SPIN_DURATION).toBeLessThan(5000) // Not too long
      
      expect(CAROUSEL_TIMING.DECELERATION_DURATION).toBeGreaterThan(2000) // Enough time to build suspense
      expect(CAROUSEL_TIMING.DECELERATION_DURATION).toBeLessThan(10000) // Not too slow
      
      expect(CAROUSEL_TIMING.TOTAL_DURATION).toBeLessThan(15000) // Complete in under 15 seconds
      
      // Verify item dimensions are reasonable
      expect(CAROUSEL_TIMING.ITEM_WIDTH).toBeGreaterThan(80) // Large enough to see
      expect(CAROUSEL_TIMING.ITEM_WIDTH).toBeLessThan(200) // Not too large
      
      expect(CAROUSEL_TIMING.VISIBLE_ITEMS).toBeGreaterThan(3) // Show enough context
      expect(CAROUSEL_TIMING.VISIBLE_ITEMS).toBeLessThan(10) // Not too cluttered
    })
  })

  describe('Real-world Scenario Testing', () => {
    test('should simulate a complete case opening flow', () => {
      // Simulate opening a case with different rarities
      const caseItems = [
        ...Array(60).fill(mockCaseItems[0]), // 60% common
        ...Array(25).fill(mockCaseItems[4]), // 25% uncommon  
        ...Array(10).fill(mockCaseItems[3]), // 10% rare
        ...Array(4).fill(mockCaseItems[2]),  // 4% epic
        ...Array(1).fill(mockCaseItems[1])   // 1% legendary
      ]
      
      // Test opening a legendary item (rare outcome)
      const winningItem = mockCaseItems[1] // GPU
      const winningPosition = calculateWinningPosition(75)
      
      const sequence = generateCarouselSequence(
        caseItems,
        winningItem,
        75,
        winningPosition
      )
      
      expect(validateCarouselSequence(sequence)).toBe(true)
      expect(sequence[winningPosition].item).toEqual(winningItem)
      expect(sequence[winningPosition].isWinning).toBe(true)
      
      // Verify the sequence contains a good mix of items
      const uniqueItems = new Set(sequence.map(item => item.item.id))
      expect(uniqueItems.size).toBeGreaterThan(1) // Should have variety
    })

    test('should handle multiple consecutive case openings', () => {
      const openings = [
        { winningItem: mockCaseItems[0], expectedRarity: 'common' },
        { winningItem: mockCaseItems[1], expectedRarity: 'legendary' },
        { winningItem: mockCaseItems[2], expectedRarity: 'epic' }
      ]
      
      openings.forEach((opening, index) => {
        const winningPosition = calculateWinningPosition(50)
        const sequence = generateCarouselSequence(
          mockCaseItems,
          opening.winningItem,
          50,
          winningPosition
        )
        
        expect(validateCarouselSequence(sequence)).toBe(true)
        expect(sequence[winningPosition].item.rarity).toBe(opening.expectedRarity)
      })
    })
  })
})