/**
 * RouletteWheel Accuracy Tests
 * Tests to ensure the wheel visually lands on the correct winning number
 */

import { describe, it, expect } from 'bun:test'
import { calculateWinningRotation, calculateFinalRotation } from '../RouletteWheel'

// European roulette wheel numbers in order
const wheelNumbers = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
]

describe('RouletteWheel Accuracy', () => {
  describe('Base Rotation Calculation', () => {
    it('calculates correct rotation for number 0 (first position)', () => {
      const rotation = calculateWinningRotation(0, wheelNumbers)
      expect(rotation).toBe(0) // First position should be 0 degrees
    })

    it('calculates correct rotation for number 32 (second position)', () => {
      const rotation = calculateWinningRotation(32, wheelNumbers)
      const segmentAngle = 360 / wheelNumbers.length // ~9.73 degrees
      const expectedRotation = -segmentAngle
      expect(rotation).toBeCloseTo(expectedRotation, 2)
    })

    it('calculates correct rotation for number 26 (last position)', () => {
      const rotation = calculateWinningRotation(26, wheelNumbers)
      const lastIndex = wheelNumbers.length - 1
      const segmentAngle = 360 / wheelNumbers.length
      const expectedRotation = -(lastIndex * segmentAngle)
      expect(rotation).toBeCloseTo(expectedRotation, 2)
    })

    it('returns 0 for null winning number', () => {
      const rotation = calculateWinningRotation(null, wheelNumbers)
      expect(rotation).toBe(0)
    })

    it('handles invalid numbers gracefully', () => {
      const rotation = calculateWinningRotation(99, wheelNumbers)
      expect(rotation).toBe(0) // Should return 0 for invalid numbers
    })

    it('handles negative numbers', () => {
      const rotation = calculateWinningRotation(-1, wheelNumbers)
      expect(rotation).toBe(0) // Should return 0 for invalid numbers
    })

    it('handles empty wheel array', () => {
      const rotation = calculateWinningRotation(0, [])
      expect(rotation).toBe(0) // Should return 0 for empty array
    })
  })

  describe('Final Rotation Calculation', () => {
    it('adds minimum spins to base rotation', () => {
      const baseRotation = calculateWinningRotation(0, wheelNumbers)
      const finalRotation = calculateFinalRotation(0, wheelNumbers, 0, 3)
      
      // Should be at least 3 full rotations (1080 degrees) ahead
      expect(finalRotation).toBeGreaterThanOrEqual(1080)
    })

    it('accounts for current rotation', () => {
      const currentRotation = 720 // Already spun 2 times
      const finalRotation = calculateFinalRotation(0, wheelNumbers, currentRotation, 2)
      
      // Should be at least currentRotation + 2 full rotations
      expect(finalRotation).toBeGreaterThanOrEqual(currentRotation + 720)
    })

    it('calculates different final rotations for different numbers', () => {
      const rotation0 = calculateFinalRotation(0, wheelNumbers, 0, 3)
      const rotation1 = calculateFinalRotation(1, wheelNumbers, 0, 3)
      
      // Should be different (accounting for full rotation differences)
      const diff = Math.abs(rotation0 - rotation1) % 360
      expect(diff).toBeGreaterThan(0)
    })

    it('handles null winning number', () => {
      const currentRotation = 360
      const finalRotation = calculateFinalRotation(null, wheelNumbers, currentRotation, 3)
      
      // Should return current rotation unchanged
      expect(finalRotation).toBe(currentRotation)
    })
  })

  describe('Wheel Layout Validation', () => {
    it('has correct number of segments', () => {
      expect(wheelNumbers.length).toBe(37) // 0-36 for European roulette
    })

    it('contains all numbers from 0 to 36', () => {
      for (let i = 0; i <= 36; i++) {
        expect(wheelNumbers).toContain(i)
      }
    })

    it('has no duplicate numbers', () => {
      const uniqueNumbers = [...new Set(wheelNumbers)]
      expect(uniqueNumbers.length).toBe(wheelNumbers.length)
    })

    it('follows European roulette wheel order', () => {
      // Test a few key positions to ensure correct wheel order
      expect(wheelNumbers[0]).toBe(0)   // Green zero at position 0
      expect(wheelNumbers[1]).toBe(32)  // Red 32 next to 0
      expect(wheelNumbers[2]).toBe(15)  // Black 15 next to 32
    })
  })

  describe('Visual Alignment', () => {
    it('positions winning number correctly relative to pointer', () => {
      // Test that different numbers get different rotations
      const rotations = [0, 7, 17, 23, 36].map(num => 
        calculateWinningRotation(num, wheelNumbers)
      )
      
      // All rotations should be different
      const uniqueRotations = [...new Set(rotations)]
      expect(uniqueRotations.length).toBe(rotations.length)
    })

    it('maintains consistent segment spacing', () => {
      const segmentAngle = 360 / wheelNumbers.length
      
      // Test consecutive numbers
      const rotation0 = calculateWinningRotation(wheelNumbers[0], wheelNumbers)
      const rotation1 = calculateWinningRotation(wheelNumbers[1], wheelNumbers)
      
      const angleDifference = Math.abs(rotation0 - rotation1)
      expect(angleDifference).toBeCloseTo(segmentAngle, 1)
    })
  })

  describe('Performance', () => {
    it('calculates rotations quickly for all numbers', () => {
      const startTime = performance.now()
      
      // Calculate rotation for all numbers multiple times
      for (let i = 0; i < 1000; i++) {
        for (let number = 0; number <= 36; number++) {
          calculateWinningRotation(number, wheelNumbers)
          calculateFinalRotation(number, wheelNumbers, i * 360, 3)
        }
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should complete in reasonable time (less than 100ms for 74,000 calculations)
      expect(duration).toBeLessThan(100)
    })
  })
})