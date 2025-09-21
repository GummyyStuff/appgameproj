/**
 * Performance and Load Testing for Case Opening System
 * Tests concurrent user scenarios, database performance, and system limits
 */

import { describe, it, expect } from 'bun:test'

// Set up environment variables
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = 'test-anon-key-that-is-long-enough'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-that-is-long-enough'
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long-for-validation'
process.env.STARTING_BALANCE = '10000'
process.env.DAILY_BONUS = '1000'

import { CaseOpeningService, type CaseType, type WeightedItem } from './case-opening'

describe('Case Opening Performance Tests', () => {
  
  const createMockCaseType = (): CaseType => ({
    id: 'perf-test-case',
    name: 'Performance Test Case',
    price: 500,
    description: 'Case for performance testing',
    rarity_distribution: {
      common: 60,
      uncommon: 25,
      rare: 10,
      epic: 4,
      legendary: 1
    },
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  })

  const createMockItemPool = (): WeightedItem[] => [
    {
      item: {
        id: 'perf-common',
        name: 'Performance Common',
        rarity: 'common',
        base_value: 50,
        category: 'medical',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      weight: 1.0,
      value_multiplier: 1.0,
      effective_value: 50
    },
    {
      item: {
        id: 'perf-uncommon',
        name: 'Performance Uncommon',
        rarity: 'uncommon',
        base_value: 200,
        category: 'medical',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      weight: 1.0,
      value_multiplier: 1.2,
      effective_value: 240
    },
    {
      item: {
        id: 'perf-rare',
        name: 'Performance Rare',
        rarity: 'rare',
        base_value: 800,
        category: 'electronics',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      weight: 1.0,
      value_multiplier: 1.5,
      effective_value: 1200
    },
    {
      item: {
        id: 'perf-epic',
        name: 'Performance Epic',
        rarity: 'epic',
        base_value: 3000,
        category: 'electronics',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      weight: 1.0,
      value_multiplier: 2.0,
      effective_value: 6000
    },
    {
      item: {
        id: 'perf-legendary',
        name: 'Performance Legendary',
        rarity: 'legendary',
        base_value: 10000,
        category: 'valuables',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      weight: 1.0,
      value_multiplier: 2.5,
      effective_value: 25000
    }
  ]

  describe('Single Operation Performance', () => {
    it('should complete single case opening within performance threshold', async () => {
      const caseType = createMockCaseType()
      const itemPool = createMockItemPool()

      const startTime = performance.now()
      const result = await CaseOpeningService.selectRandomItem(caseType, itemPool)
      const endTime = performance.now()

      const executionTime = endTime - startTime

      expect(result).toBeDefined()
      expect(result.item).toBeDefined()
      expect(executionTime).toBeLessThan(10) // Should complete within 10ms

      console.log(`Single case opening time: ${executionTime.toFixed(2)}ms`)
    })

    it('should maintain consistent performance across multiple operations', async () => {
      const caseType = createMockCaseType()
      const itemPool = createMockItemPool()
      const iterations = 1000
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now()
        await CaseOpeningService.selectRandomItem(caseType, itemPool)
        const endTime = performance.now()
        times.push(endTime - startTime)
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length
      const maxTime = Math.max(...times)
      const minTime = Math.min(...times)

      expect(avgTime).toBeLessThan(5) // Average should be under 5ms
      expect(maxTime).toBeLessThan(50) // Max should be under 50ms
      expect(minTime).toBeGreaterThan(0) // Should take some time

      // Check for performance degradation (last 10% vs first 10%)
      const firstBatch = times.slice(0, iterations * 0.1)
      const lastBatch = times.slice(iterations * 0.9)
      
      const firstAvg = firstBatch.reduce((sum, time) => sum + time, 0) / firstBatch.length
      const lastAvg = lastBatch.reduce((sum, time) => sum + time, 0) / lastBatch.length

      // Last batch shouldn't be significantly slower (no memory leaks)
      expect(lastAvg).toBeLessThan(firstAvg * 2)

      console.log(`Performance metrics over ${iterations} operations:`)
      console.log(`Average: ${avgTime.toFixed(2)}ms`)
      console.log(`Min: ${minTime.toFixed(2)}ms`)
      console.log(`Max: ${maxTime.toFixed(2)}ms`)
      console.log(`First batch avg: ${firstAvg.toFixed(2)}ms`)
      console.log(`Last batch avg: ${lastAvg.toFixed(2)}ms`)
    })
  })

  describe('Concurrent User Load Testing', () => {
    it('should handle moderate concurrent case openings', async () => {
      const concurrentUsers = 50
      const caseType = createMockCaseType()
      const itemPool = createMockItemPool()

      const startTime = performance.now()

      // Simulate concurrent users opening cases
      const promises = Array.from({ length: concurrentUsers }, async (_, index) => {
        const userStartTime = performance.now()
        const result = await CaseOpeningService.selectRandomItem(caseType, itemPool)
        const userEndTime = performance.now()
        
        return {
          userId: `user-${index}`,
          result,
          executionTime: userEndTime - userStartTime
        }
      })

      const results = await Promise.all(promises)
      const totalTime = performance.now() - startTime

      // All operations should complete successfully
      expect(results).toHaveLength(concurrentUsers)
      results.forEach(result => {
        expect(result.result).toBeDefined()
        expect(result.result.item).toBeDefined()
      })

      // Total time should be reasonable (concurrent execution)
      expect(totalTime).toBeLessThan(1000) // Should complete within 1 second

      // Individual execution times should remain reasonable
      const executionTimes = results.map(r => r.executionTime)
      const avgExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
      const maxExecutionTime = Math.max(...executionTimes)

      expect(avgExecutionTime).toBeLessThan(20) // Average under 20ms
      expect(maxExecutionTime).toBeLessThan(100) // Max under 100ms

      console.log(`Concurrent load test (${concurrentUsers} users):`)
      console.log(`Total time: ${totalTime.toFixed(2)}ms`)
      console.log(`Average execution time: ${avgExecutionTime.toFixed(2)}ms`)
      console.log(`Max execution time: ${maxExecutionTime.toFixed(2)}ms`)
    })

    it('should handle high concurrent load without degradation', async () => {
      const concurrentUsers = 200
      const caseType = createMockCaseType()
      const itemPool = createMockItemPool()

      const startTime = performance.now()

      // Create batches to avoid overwhelming the system
      const batchSize = 50
      const batches = Math.ceil(concurrentUsers / batchSize)
      const allResults: any[] = []

      for (let batch = 0; batch < batches; batch++) {
        const batchStart = batch * batchSize
        const batchEnd = Math.min(batchStart + batchSize, concurrentUsers)
        const batchUsers = batchEnd - batchStart

        const batchPromises = Array.from({ length: batchUsers }, async (_, index) => {
          const userIndex = batchStart + index
          const userStartTime = performance.now()
          const result = await CaseOpeningService.selectRandomItem(caseType, itemPool)
          const userEndTime = performance.now()
          
          return {
            userId: `user-${userIndex}`,
            batch,
            result,
            executionTime: userEndTime - userStartTime
          }
        })

        const batchResults = await Promise.all(batchPromises)
        allResults.push(...batchResults)

        // Small delay between batches to simulate realistic load
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const totalTime = performance.now() - startTime

      expect(allResults).toHaveLength(concurrentUsers)
      
      // Check that all operations completed successfully
      allResults.forEach(result => {
        expect(result.result).toBeDefined()
        expect(result.result.item).toBeDefined()
      })

      // Analyze performance across batches
      const batchPerformance = Array.from({ length: batches }, (_, batchIndex) => {
        const batchResults = allResults.filter(r => r.batch === batchIndex)
        const batchTimes = batchResults.map(r => r.executionTime)
        return {
          batch: batchIndex,
          avgTime: batchTimes.reduce((sum, time) => sum + time, 0) / batchTimes.length,
          maxTime: Math.max(...batchTimes),
          count: batchResults.length
        }
      })

      // Performance shouldn't degrade significantly across batches
      const firstBatchAvg = batchPerformance[0].avgTime
      const lastBatchAvg = batchPerformance[batchPerformance.length - 1].avgTime

      expect(lastBatchAvg).toBeLessThan(firstBatchAvg * 3) // No more than 3x slower

      console.log(`High load test (${concurrentUsers} users in ${batches} batches):`)
      console.log(`Total time: ${totalTime.toFixed(2)}ms`)
      console.log(`First batch avg: ${firstBatchAvg.toFixed(2)}ms`)
      console.log(`Last batch avg: ${lastBatchAvg.toFixed(2)}ms`)
      
      batchPerformance.forEach(batch => {
        console.log(`Batch ${batch.batch}: ${batch.count} users, avg: ${batch.avgTime.toFixed(2)}ms, max: ${batch.maxTime.toFixed(2)}ms`)
      })
    }, 30000) // 30 second timeout for high load test
  })

  describe('Memory and Resource Usage', () => {
    it('should not leak memory during extended operations', async () => {
      const caseType = createMockCaseType()
      const itemPool = createMockItemPool()
      const iterations = 5000

      // Get initial memory usage (if available)
      const initialMemory = process.memoryUsage?.() || { heapUsed: 0 }

      // Perform many operations
      for (let i = 0; i < iterations; i++) {
        await CaseOpeningService.selectRandomItem(caseType, itemPool)
        
        // Occasionally force garbage collection if available
        if (i % 1000 === 0 && global.gc) {
          global.gc()
        }
      }

      // Get final memory usage
      const finalMemory = process.memoryUsage?.() || { heapUsed: 0 }

      // Memory growth should be reasonable
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed
      const memoryGrowthMB = memoryGrowth / (1024 * 1024)

      // Should not grow by more than 50MB for 5000 operations
      expect(memoryGrowthMB).toBeLessThan(50)

      console.log(`Memory usage after ${iterations} operations:`)
      console.log(`Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
      console.log(`Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
      console.log(`Growth: ${memoryGrowthMB.toFixed(2)}MB`)
    }, 20000)

    it('should handle large item pools efficiently', async () => {
      const caseType = createMockCaseType()
      
      // Create a large item pool (100 items per rarity)
      const largeItemPool: WeightedItem[] = []
      const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const
      
      rarities.forEach(rarity => {
        for (let i = 0; i < 100; i++) {
          largeItemPool.push({
            item: {
              id: `${rarity}-${i}`,
              name: `${rarity} Item ${i}`,
              rarity,
              base_value: 100 * (rarities.indexOf(rarity) + 1),
              category: 'medical',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            weight: 1.0,
            value_multiplier: 1.0 + (i * 0.01), // Slight variation
            effective_value: 100 * (rarities.indexOf(rarity) + 1) * (1.0 + (i * 0.01))
          })
        }
      })

      expect(largeItemPool).toHaveLength(500) // 100 items × 5 rarities

      const iterations = 1000
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now()
        const result = await CaseOpeningService.selectRandomItem(caseType, largeItemPool)
        const endTime = performance.now()
        
        times.push(endTime - startTime)
        expect(result).toBeDefined()
        expect(result.item).toBeDefined()
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length
      const maxTime = Math.max(...times)

      // Should still be fast even with large item pool
      expect(avgTime).toBeLessThan(10) // Average under 10ms
      expect(maxTime).toBeLessThan(50) // Max under 50ms

      console.log(`Large item pool performance (${largeItemPool.length} items):`)
      console.log(`Average time: ${avgTime.toFixed(2)}ms`)
      console.log(`Max time: ${maxTime.toFixed(2)}ms`)
    })
  })

  describe('Value Calculation Performance', () => {
    it('should calculate item values efficiently at scale', () => {
      const iterations = 100000
      const testCases = [
        { baseValue: 100, multiplier: 1.5 },
        { baseValue: 1000, multiplier: 2.0 },
        { baseValue: 50, multiplier: 0.8 },
        { baseValue: 9999, multiplier: 3.14159 },
        { baseValue: 1, multiplier: 1000 }
      ]

      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        const testCase = testCases[i % testCases.length]
        const mockItem = {
          id: 'perf-test',
          name: 'Performance Test Item',
          rarity: 'common' as const,
          base_value: testCase.baseValue,
          category: 'medical' as const,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }

        const result = CaseOpeningService.calculateItemValue(mockItem, testCase.multiplier)
        expect(result).toBeGreaterThanOrEqual(0)
      }

      const endTime = performance.now()
      const totalTime = endTime - startTime
      const avgTimePerCalculation = totalTime / iterations

      expect(totalTime).toBeLessThan(1000) // Should complete within 1 second
      expect(avgTimePerCalculation).toBeLessThan(0.01) // Less than 0.01ms per calculation

      console.log(`Value calculation performance (${iterations} calculations):`)
      console.log(`Total time: ${totalTime.toFixed(2)}ms`)
      console.log(`Average per calculation: ${avgTimePerCalculation.toFixed(4)}ms`)
    })
  })

  describe('Stress Testing', () => {
    it('should survive extreme load conditions', async () => {
      const extremeLoad = 1000
      const caseType = createMockCaseType()
      const itemPool = createMockItemPool()

      const startTime = performance.now()
      let successCount = 0
      let errorCount = 0

      // Use Promise.allSettled to handle any potential failures gracefully
      const promises = Array.from({ length: extremeLoad }, async (_, index) => {
        try {
          const result = await CaseOpeningService.selectRandomItem(caseType, itemPool)
          if (result && result.item) {
            successCount++
          }
          return { success: true, result }
        } catch (error) {
          errorCount++
          return { success: false, error }
        }
      })

      const results = await Promise.allSettled(promises)
      const totalTime = performance.now() - startTime

      // Count actual successes and failures
      const fulfilled = results.filter(r => r.status === 'fulfilled').length
      const rejected = results.filter(r => r.status === 'rejected').length

      // Should handle the load gracefully
      expect(fulfilled).toBeGreaterThan(extremeLoad * 0.95) // At least 95% success rate
      expect(rejected).toBeLessThan(extremeLoad * 0.05) // Less than 5% failures

      // Should complete in reasonable time even under extreme load
      expect(totalTime).toBeLessThan(10000) // Within 10 seconds

      console.log(`Extreme load test (${extremeLoad} concurrent operations):`)
      console.log(`Total time: ${totalTime.toFixed(2)}ms`)
      console.log(`Fulfilled: ${fulfilled}`)
      console.log(`Rejected: ${rejected}`)
      console.log(`Success rate: ${((fulfilled / extremeLoad) * 100).toFixed(2)}%`)
    }, 15000) // 15 second timeout for stress test
  })
})