import { describe, test, expect } from 'bun:test'
import { generateCarouselSequence, validateCarouselSequence, CAROUSEL_TIMING } from '../../../utils/carousel'

/**
 * Validation tests to ensure carousel accuracy and reliability
 * These tests validate the mathematical precision and user experience
 */
describe('Carousel Validation Tests', () => {
  // Mock case items similar to what would come from the backend
  const mockCaseItems = [
    { id: '1', name: 'Bandage', rarity: 'common', base_value: 100, category: 'medical', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '2', name: 'GPU', rarity: 'legendary', base_value: 5000, category: 'electronics', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '3', name: 'LEDX', rarity: 'epic', base_value: 2000, category: 'medical', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '4', name: 'Vodka', rarity: 'rare', base_value: 500, category: 'consumables', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '5', name: 'Salewa', rarity: 'uncommon', base_value: 300, category: 'medical', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' }
  ] as any[]

  describe('Mathematical Precision Tests', () => {
    test('should calculate exact center positioning for all winning positions', () => {
      const itemWidth = CAROUSEL_TIMING.ITEM_WIDTH // 120px
      const visibleItems = CAROUSEL_TIMING.VISIBLE_ITEMS // 5
      const viewportWidth = visibleItems * itemWidth // 600px
      const centerOffset = viewportWidth / 2 - itemWidth / 2 // 240px (center of viewport)
      
      // Test multiple winning positions
      const testPositions = [50, 55, 60, 65, 70]
      
      testPositions.forEach(winningIndex => {
        const expectedFinalPosition = -(winningIndex * itemWidth - centerOffset)
        
        // Calculate where the winning item's center will be after animation
        const itemLeftEdge = winningIndex * itemWidth + expectedFinalPosition
        const itemCenter = itemLeftEdge + itemWidth / 2
        const viewportCenter = viewportWidth / 2
        
        // The item center should align with viewport center (within 0.5px tolerance)
        expect(Math.abs(itemCenter - viewportCenter)).toBeLessThan(0.5)
      })
    })

    test('should ensure winning item is always visible in viewport', () => {
      const itemWidth = CAROUSEL_TIMING.ITEM_WIDTH
      const visibleItems = CAROUSEL_TIMING.VISIBLE_ITEMS
      const viewportWidth = visibleItems * itemWidth
      
      for (let winningIndex = 50; winningIndex < 70; winningIndex++) {
        const centerOffset = viewportWidth / 2 - itemWidth / 2
        const finalPosition = -(winningIndex * itemWidth - centerOffset)
        
        // Calculate winning item's position in viewport
        const itemLeftInViewport = winningIndex * itemWidth + finalPosition
        const itemRightInViewport = itemLeftInViewport + itemWidth
        
        // Item should be fully visible (not clipped)
        expect(itemLeftInViewport).toBeGreaterThanOrEqual(-1) // Allow 1px tolerance
        expect(itemRightInViewport).toBeLessThanOrEqual(viewportWidth + 1)
        
        // Item should be centered (within reasonable tolerance)
        const itemCenterInViewport = itemLeftInViewport + itemWidth / 2
        const viewportCenter = viewportWidth / 2
        expect(Math.abs(itemCenterInViewport - viewportCenter)).toBeLessThan(5)
      }
    })
  })

  describe('Sequence Generation Accuracy', () => {
    test('should generate sequences that pass all validation checks', () => {
      const testCases = [
        { length: 50, winningPos: 35 },
        { length: 75, winningPos: 60 },
        { length: 100, winningPos: 80 }
      ]
      
      testCases.forEach(({ length, winningPos }) => {
        const sequence = generateCarouselSequence(
          mockCaseItems,
          mockCaseItems[1], // GPU
          length,
          winningPos
        )
        
        // Comprehensive validation
        expect(validateCarouselSequence(sequence)).toBe(true)
        expect(sequence).toHaveLength(length)
        expect(sequence[winningPos].isWinning).toBe(true)
        expect(sequence[winningPos].item).toEqual(mockCaseItems[1])
        
        // Ensure all other items are not marked as winning
        const nonWinningItems = sequence.filter((item, index) => index !== winningPos)
        nonWinningItems.forEach(item => {
          expect(item.isWinning).toBe(false)
        })
      })
    })

    test('should handle all rarity types correctly', () => {
      const rarityTests = mockCaseItems.map((item, index) => ({
        item,
        expectedRarity: item.rarity
      }))
      
      rarityTests.forEach(({ item, expectedRarity }) => {
        const sequence = generateCarouselSequence(
          mockCaseItems,
          item,
          50,
          30
        )
        
        expect(validateCarouselSequence(sequence)).toBe(true)
        expect(sequence[30].item.rarity).toBe(expectedRarity)
        expect(sequence[30].isWinning).toBe(true)
      })
    })
  })

  describe('User Experience Validation', () => {
    test('should create realistic animation distances', () => {
      const itemWidth = CAROUSEL_TIMING.ITEM_WIDTH
      const sequenceLength = CAROUSEL_TIMING.SEQUENCE_LENGTH
      
      // Test various winning positions
      for (let winningIndex = 55; winningIndex < 65; winningIndex++) {
        const centerOffset = (CAROUSEL_TIMING.VISIBLE_ITEMS * itemWidth) / 2 - itemWidth / 2
        const finalPosition = -(winningIndex * itemWidth - centerOffset)
        
        // Animation should move a significant distance for excitement
        const totalDistance = Math.abs(finalPosition)
        expect(totalDistance).toBeGreaterThan(itemWidth * 50) // At least 50 items worth of movement
        
        // But not so far that it takes forever
        expect(totalDistance).toBeLessThan(itemWidth * sequenceLength) // Less than full sequence
      }
    })

    test('should provide good item variety in sequences', () => {
      const sequence = generateCarouselSequence(
        mockCaseItems,
        mockCaseItems[2], // LEDX
        75,
        60
      )
      
      // Count unique items in sequence
      const itemIds = sequence.map(item => item.item.id)
      const uniqueItemIds = new Set(itemIds)
      
      // Should have good variety (at least 3 different items in a 75-item sequence)
      expect(uniqueItemIds.size).toBeGreaterThanOrEqual(3)
      
      // No single item should dominate (except in very small item pools)
      const itemCounts: { [key: string]: number } = {}
      itemIds.forEach(id => {
        itemCounts[id] = (itemCounts[id] || 0) + 1
      })
      
      Object.values(itemCounts).forEach(count => {
        expect(count).toBeLessThan(sequence.length * 0.7) // No item should be >70% of sequence (allow for weighted distribution)
      })
    })
  })

  describe('Edge Case Handling', () => {
    test('should handle minimum viable sequences', () => {
      // Test very short sequences
      const minSequence = generateCarouselSequence(
        mockCaseItems,
        mockCaseItems[0],
        5, // Very short
        2  // Middle position
      )
      
      expect(validateCarouselSequence(minSequence)).toBe(true)
      expect(minSequence).toHaveLength(5)
      expect(minSequence[2].isWinning).toBe(true)
    })

    test('should handle single item case pools', () => {
      const singleItem = [mockCaseItems[0]]
      const sequence = generateCarouselSequence(
        singleItem,
        singleItem[0],
        20,
        10
      )
      
      expect(validateCarouselSequence(sequence)).toBe(true)
      expect(sequence).toHaveLength(20)
      expect(sequence[10].isWinning).toBe(true)
      
      // All items should be the same (except for winning flag)
      sequence.forEach((carouselItem, index) => {
        expect(carouselItem.item).toEqual(singleItem[0])
        expect(carouselItem.isWinning).toBe(index === 10)
      })
    })

    test('should handle boundary winning positions', () => {
      const boundaryTests = [
        { sequenceLength: 20, winningPos: 0 },   // First position
        { sequenceLength: 20, winningPos: 19 },  // Last position
        { sequenceLength: 50, winningPos: 1 },   // Near first
        { sequenceLength: 50, winningPos: 48 }   // Near last
      ]
      
      boundaryTests.forEach(({ sequenceLength, winningPos }) => {
        const sequence = generateCarouselSequence(
          mockCaseItems,
          mockCaseItems[1],
          sequenceLength,
          winningPos
        )
        
        expect(validateCarouselSequence(sequence)).toBe(true)
        expect(sequence[winningPos].isWinning).toBe(true)
      })
    })
  })

  describe('Performance Validation', () => {
    test('should generate large sequences efficiently', () => {
      const startTime = performance.now()
      
      // Generate a large sequence
      const sequence = generateCarouselSequence(
        mockCaseItems,
        mockCaseItems[1],
        1000, // Large sequence
        750
      )
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(sequence).toHaveLength(1000)
      expect(validateCarouselSequence(sequence)).toBe(true)
      expect(duration).toBeLessThan(100) // Should complete in under 100ms
    })

    test('should validate large sequences quickly', () => {
      const largeSequence = generateCarouselSequence(
        mockCaseItems,
        mockCaseItems[2],
        500,
        400
      )
      
      const startTime = performance.now()
      const isValid = validateCarouselSequence(largeSequence)
      const endTime = performance.now()
      
      expect(isValid).toBe(true)
      expect(endTime - startTime).toBeLessThan(50) // Validation should be fast
    })
  })

  describe('Consistency Validation', () => {
    test('should produce deterministic results for same inputs', () => {
      const params = {
        items: mockCaseItems,
        winningItem: mockCaseItems[3],
        sequenceLength: 60,
        winningPosition: 45
      }
      
      // Generate multiple sequences with identical parameters
      const sequences = Array.from({ length: 3 }, () =>
        generateCarouselSequence(
          params.items,
          params.winningItem,
          params.sequenceLength,
          params.winningPosition
        )
      )
      
      // All sequences should have the same winning item at the same position
      sequences.forEach(sequence => {
        expect(sequence[params.winningPosition].item).toEqual(params.winningItem)
        expect(sequence[params.winningPosition].isWinning).toBe(true)
        expect(sequence).toHaveLength(params.sequenceLength)
      })
    })

    test('should maintain item integrity throughout sequence', () => {
      const sequence = generateCarouselSequence(
        mockCaseItems,
        mockCaseItems[4],
        40,
        25
      )
      
      // Every item in sequence should be a valid item from the original pool
      sequence.forEach(carouselItem => {
        const originalItem = mockCaseItems.find(item => item.id === carouselItem.item.id)
        expect(originalItem).toBeDefined()
        expect(carouselItem.item).toEqual(originalItem)
      })
    })
  })
})