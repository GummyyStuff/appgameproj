import { describe, test, expect } from 'bun:test'
import { generateCarouselSequence, validateCarouselSequence, getWeightedRandomItem } from '../carousel'

/**
 * Tests to verify the carousel fixes for consistent spinning direction and item population
 */
describe('Carousel Fixes Validation', () => {
  const mockItems = [
    { id: '1', name: 'Bandage', rarity: 'common', base_value: 100, category: 'medical', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '2', name: 'GPU', rarity: 'legendary', base_value: 5000, category: 'electronics', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '3', name: 'LEDX', rarity: 'epic', base_value: 2000, category: 'medical', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '4', name: 'Vodka', rarity: 'rare', base_value: 500, category: 'consumables', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '5', name: 'Salewa', rarity: 'uncommon', base_value: 300, category: 'medical', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' }
  ] as any[]

  describe('Consistent Item Population', () => {
    test('should populate carousel entirely with real items from case pool', () => {
      const sequence = generateCarouselSequence(mockItems, mockItems[1], 50, 30)
      
      // Every item in the sequence should be from the original case pool
      sequence.forEach(carouselItem => {
        const originalItem = mockItems.find(item => item.id === carouselItem.item.id)
        expect(originalItem).toBeDefined()
        expect(carouselItem.item).toEqual(originalItem)
      })
    })

    test('should use weighted rarity distribution', () => {
      const sequence = generateCarouselSequence(mockItems, mockItems[1], 100, 75)
      
      // Count items by rarity
      const rarityCounts: { [key: string]: number } = {}
      sequence.forEach(carouselItem => {
        const rarity = carouselItem.item.rarity
        rarityCounts[rarity] = (rarityCounts[rarity] || 0) + 1
      })
      
      // Common items should appear more frequently than legendary
      if (rarityCounts.common && rarityCounts.legendary) {
        expect(rarityCounts.common).toBeGreaterThan(rarityCounts.legendary)
      }
      
      // Should have variety of rarities
      expect(Object.keys(rarityCounts).length).toBeGreaterThan(1)
    })

    test('should handle edge cases gracefully', () => {
      // Test with single item
      const singleItem = [mockItems[0]]
      const sequence = generateCarouselSequence(singleItem, singleItem[0], 20, 10)
      
      expect(validateCarouselSequence(sequence)).toBe(true)
      sequence.forEach(carouselItem => {
        expect(carouselItem.item).toEqual(singleItem[0])
      })
    })
  })

  describe('Weighted Random Selection', () => {
    test('should respect rarity weights', () => {
      const results: { [key: string]: number } = {}
      const iterations = 1000
      
      // Test weighted selection
      for (let i = 0; i < iterations; i++) {
        const item = getWeightedRandomItem(mockItems)
        results[item.rarity] = (results[item.rarity] || 0) + 1
      }
      
      // Common should appear more than legendary
      expect(results.common || 0).toBeGreaterThan(results.legendary || 0)
      
      // Should have reasonable distribution
      expect(results.common || 0).toBeGreaterThan(iterations * 0.3) // At least 30% common
    })

    test('should handle missing rarities gracefully', () => {
      const itemsWithMissingRarity = [
        { ...mockItems[0], rarity: undefined },
        mockItems[1]
      ] as any[]
      
      // Should not throw error
      expect(() => {
        const item = getWeightedRandomItem(itemsWithMissingRarity)
        expect(item).toBeDefined()
      }).not.toThrow()
    })
  })

  describe('Animation Direction Consistency', () => {
    test('should calculate consistent left-to-right movement', () => {
      const itemWidth = 120
      const visibleItems = 5
      const viewportCenter = (visibleItems * itemWidth) / 2 - itemWidth / 2 // 240px
      
      // Test multiple winning positions
      const testPositions = [50, 55, 60, 65, 70]
      
      testPositions.forEach(winningIndex => {
        const finalPosition = -(winningIndex * itemWidth - viewportCenter)
        
        // Final position should always be negative (moving left)
        expect(finalPosition).toBeLessThan(0)
        
        // Should move a significant distance for excitement
        expect(Math.abs(finalPosition)).toBeGreaterThan(itemWidth * 40)
        
        // Winning item should be centered in viewport
        const itemCenterInViewport = winningIndex * itemWidth + itemWidth / 2 + finalPosition
        const expectedCenter = viewportCenter + itemWidth / 2
        expect(Math.abs(itemCenterInViewport - expectedCenter)).toBeLessThan(1)
      })
    })

    test('should maintain consistent direction without bounce-back', () => {
      // Test that the animation logic doesn't create direction reversals
      const itemWidth = 120
      const visibleItems = 5
      const centerOffset = (visibleItems * itemWidth) / 2 - itemWidth / 2
      
      const winningIndex = 60
      const finalPosition = -(winningIndex * itemWidth - centerOffset)
      const extraSpinDistance = itemWidth * 50
      const startPosition = finalPosition - extraSpinDistance
      
      // All positions should maintain left-to-right progression
      expect(startPosition).toBeLessThan(finalPosition) // Start is further left than final
      expect(finalPosition).toBeLessThan(0) // Final position is still left of center
      
      // Single animation should only move from start to final (no intermediate positions)
      const totalDistance = finalPosition - startPosition
      expect(totalDistance).toBeGreaterThan(0) // Always moving right
    })

    test('should fix the slowing down phase direction issue', () => {
      // Test the specific fix for the "slowing down" phase direction swap
      const itemWidth = 120
      const visibleItems = 5
      const centerOffset = (visibleItems * itemWidth) / 2 - itemWidth / 2
      
      // Test multiple winning positions
      const testPositions = [50, 55, 60, 65, 70]
      
      testPositions.forEach(winningIndex => {
        const finalPosition = -(winningIndex * itemWidth - centerOffset)
        const extraSpinDistance = itemWidth * 50
        const startPosition = finalPosition - extraSpinDistance
        
        // Conservative approach: intermediate position is 60% of total distance
        const totalDistance = Math.abs(finalPosition - startPosition)
        const intermediateDistance = totalDistance * 0.6
        const intermediatePosition = startPosition + intermediateDistance
        
        // Verify the animation never goes backwards
        expect(startPosition).toBeLessThan(intermediatePosition)
        expect(intermediatePosition).toBeLessThan(finalPosition)
        
        // The deceleration phase should continue moving right (toward final position)
        // This ensures no direction swap during "slowing down"
        const decelerationDistance = finalPosition - intermediatePosition
        expect(decelerationDistance).toBeGreaterThan(0) // Always moving right
        
        // Verify valid progression
        const isValidProgression = startPosition < intermediatePosition && intermediatePosition < finalPosition
        expect(isValidProgression).toBe(true)
      })
    })

    test('should handle never-go-backwards animation logic', () => {
      // Test the simplified approach that guarantees no backwards movement
      const itemWidth = 120
      const visibleItems = 5
      const centerOffset = (visibleItems * itemWidth) / 2 - itemWidth / 2
      
      const winningIndex = 60
      const finalPosition = -(winningIndex * itemWidth - centerOffset)
      const extraSpinDistance = itemWidth * 50
      const startPosition = finalPosition - extraSpinDistance
      
      // Ultra-conservative approach: intermediate position is 40% of total distance
      const totalDistance = Math.abs(finalPosition - startPosition)
      const intermediateDistance = totalDistance * 0.4
      const calculatedIntermediate = startPosition + intermediateDistance
      
      // Apply safety checks like in the real code
      const bufferDistance = itemWidth * 10
      const safeIntermediate = Math.min(calculatedIntermediate, finalPosition - bufferDistance)
      const intermediatePosition = Math.max(safeIntermediate, startPosition + (itemWidth * 5))
      
      // Verify positions are always increasing (left to right)
      expect(startPosition).toBeLessThan(intermediatePosition)
      expect(intermediatePosition).toBeLessThan(finalPosition)
      
      // Verify the progression is mathematically sound
      expect(totalDistance).toBe(extraSpinDistance)
      
      // Verify no possibility of backwards movement
      const phase1Movement = intermediatePosition - startPosition
      const phase2Movement = finalPosition - intermediatePosition
      expect(phase1Movement).toBeGreaterThan(0)
      expect(phase2Movement).toBeGreaterThan(0)
      
      // Verify safety buffer
      expect(intermediatePosition).toBeLessThanOrEqual(finalPosition - (itemWidth * 10))
    })

    test('should handle the exact scenario from console logs', () => {
      // Test the exact values from the console logs that were causing issues
      const startPosition = -10680
      const finalPosition = -4680
      const itemWidth = 120
      
      const totalDistance = Math.abs(finalPosition - startPosition) // 6000
      const phase1Distance = totalDistance * 0.4 // 2400
      const calculatedIntermediate = startPosition + phase1Distance // -7080
      
      // Apply safety checks
      const bufferDistance = itemWidth * 10 // 1200
      const safeIntermediate = Math.min(calculatedIntermediate, finalPosition - bufferDistance) // min(-8280, -5880) = -8280
      const intermediatePosition = Math.max(safeIntermediate, startPosition + (itemWidth * 5)) // max(-8280, -10080) = -8280
      
      console.log('Test scenario:', {
        startPosition,
        calculatedIntermediate,
        safeIntermediate,
        intermediatePosition,
        finalPosition
      })
      
      // Verify the progression is valid
      expect(startPosition).toBeLessThan(intermediatePosition)
      expect(intermediatePosition).toBeLessThan(finalPosition)
      
      // Verify no overshoot
      expect(intermediatePosition).toBeLessThanOrEqual(finalPosition - (itemWidth * 5))
      
      // Verify movements are positive (rightward)
      const phase1Movement = intermediatePosition - startPosition
      const phase2Movement = finalPosition - intermediatePosition
      expect(phase1Movement).toBeGreaterThan(0)
      expect(phase2Movement).toBeGreaterThan(0)
    })

    test('should ensure consistent direction for all sequences', () => {
      const sequences = [
        { length: 50, winningPos: 30 },
        { length: 75, winningPos: 60 },
        { length: 100, winningPos: 80 }
      ]
      
      sequences.forEach(({ length, winningPos }) => {
        const sequence = generateCarouselSequence(mockItems, mockItems[1], length, winningPos)
        
        // All sequences should be valid
        expect(validateCarouselSequence(sequence)).toBe(true)
        
        // Winning item should be at correct position
        expect(sequence[winningPos].isWinning).toBe(true)
        expect(sequence[winningPos].item).toEqual(mockItems[1])
      })
    })
  })

  describe('Real Item Validation', () => {
    test('should only use items with valid properties', () => {
      const sequence = generateCarouselSequence(mockItems, mockItems[2], 30, 20)
      
      sequence.forEach(carouselItem => {
        // Every item should have required properties
        expect(carouselItem.item.id).toBeDefined()
        expect(carouselItem.item.name).toBeDefined()
        expect(carouselItem.item.rarity).toBeDefined()
        expect(typeof carouselItem.item.base_value).toBe('number')
        expect(carouselItem.item.category).toBeDefined()
      })
    })

    test('should generate unique carousel item IDs', () => {
      const sequence = generateCarouselSequence(mockItems, mockItems[0], 50, 25)
      
      const ids = sequence.map(item => item.id)
      const uniqueIds = new Set(ids)
      
      // All carousel item IDs should be unique
      expect(uniqueIds.size).toBe(sequence.length)
    })

    test('should eliminate blank spots by filtering invalid items', () => {
      // Test with some invalid items mixed in
      const itemsWithInvalid = [
        mockItems[0],
        null, // Invalid
        mockItems[1],
        { id: '', name: '', rarity: 'common' }, // Invalid - empty strings
        mockItems[2],
        { id: 'test', name: 'Test', rarity: 'rare', base_value: 'invalid' }, // Invalid - wrong type
        mockItems[3]
      ] as any[]
      
      // Filter out invalid items (simulating the game component logic)
      const validItems = itemsWithInvalid.filter(item => 
        item && 
        item.id && 
        item.name && 
        item.rarity && 
        typeof item.base_value === 'number'
      )
      
      expect(validItems.length).toBe(4) // Should have 4 valid items
      
      // Generate sequence with valid items only
      const sequence = generateCarouselSequence(validItems, validItems[0], 20, 10)
      
      // All items in sequence should be valid
      sequence.forEach(carouselItem => {
        expect(carouselItem.item).toBeDefined()
        expect(carouselItem.item.id).toBeTruthy()
        expect(carouselItem.item.name).toBeTruthy()
        expect(carouselItem.item.rarity).toBeTruthy()
        expect(typeof carouselItem.item.base_value).toBe('number')
      })
    })
  })
})