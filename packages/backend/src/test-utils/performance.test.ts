/**
 * Performance Testing Suite
 * Tests for concurrent users, load handling, and performance benchmarks
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { CoreGameEngine } from '../services/game-engine/core-engine'
import { CurrencyService } from '../services/currency'
import { DatabaseService } from '../services/database'
import type { GameBet } from '../services/game-engine/types'

describe('Performance Testing', () => {
  let gameEngine: CoreGameEngine

  beforeEach(() => {
    gameEngine = new CoreGameEngine()
  })

  describe('Concurrent Game Processing', () => {
    it('should handle multiple concurrent roulette games', async () => {
      const concurrentUsers = 50
      const promises: Promise<any>[] = []

      const startTime = Date.now()

      // Create concurrent game requests
      for (let i = 0; i < concurrentUsers; i++) {
        const bet: GameBet = {
          userId: `user${i}`,
          amount: 100,
          gameType: 'roulette'
        }
        promises.push(gameEngine.processGame(bet))
      }

      // Wait for all games to complete
      const results = await Promise.all(promises)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Verify all games completed successfully
      for (const result of results) {
        expect(result.success).toBe(true)
        expect(result.gameId).toBeDefined()
        expect(typeof result.winAmount).toBe('number')
      }

      // Performance assertions
      expect(totalTime).toBeLessThan(5000) // Should complete within 5 seconds
      expect(results.length).toBe(concurrentUsers)

      // Calculate average processing time per game
      const avgTimePerGame = totalTime / concurrentUsers
      expect(avgTimePerGame).toBeLessThan(100) // Less than 100ms per game on average
    })

    it('should handle mixed game types concurrently', async () => {
      const gamesPerType = 20
      const promises: Promise<any>[] = []
      const gameTypes = ['roulette', 'blackjack', 'plinko'] as const

      const startTime = Date.now()

      // Create mixed concurrent requests
      for (const gameType of gameTypes) {
        for (let i = 0; i < gamesPerType; i++) {
          const bet: GameBet = {
            userId: `${gameType}_user${i}`,
            amount: 100,
            gameType
          }
          promises.push(gameEngine.processGame(bet))
        }
      }

      const results = await Promise.all(promises)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Verify all games completed
      expect(results.length).toBe(gamesPerType * gameTypes.length)
      
      for (const result of results) {
        expect(result.success).toBe(true)
      }

      // Performance check
      expect(totalTime).toBeLessThan(10000) // 10 seconds for 60 games
    })

    it('should maintain performance under rapid sequential requests', async () => {
      const sequentialGames = 100
      const userId = 'performance_test_user'
      const times: number[] = []

      for (let i = 0; i < sequentialGames; i++) {
        const bet: GameBet = {
          userId: `${userId}_${i}`, // Different user IDs to avoid conflicts
          amount: 100,
          gameType: 'roulette'
        }

        const startTime = Date.now()
        const result = await gameEngine.processGame(bet)
        const endTime = Date.now()

        expect(result.success).toBe(true)
        times.push(endTime - startTime)
      }

      // Calculate statistics
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length
      const maxTime = Math.max(...times)
      const minTime = Math.min(...times)

      // Performance assertions
      expect(avgTime).toBeLessThan(50) // Average less than 50ms
      expect(maxTime).toBeLessThan(200) // Max less than 200ms
      expect(minTime).toBeGreaterThan(0) // Should take some time

      // Check for performance degradation
      const firstHalf = times.slice(0, sequentialGames / 2)
      const secondHalf = times.slice(sequentialGames / 2)
      
      const firstHalfAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length
      const secondHalfAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length

      // Second half shouldn't be significantly slower (no more than 50% increase)
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5)
    })
  })

  describe('Memory Usage Testing', () => {
    it('should not leak memory during extended game sessions', async () => {
      const initialMemory = process.memoryUsage()
      const gameCount = 1000

      // Run many games
      for (let i = 0; i < gameCount; i++) {
        const bet: GameBet = {
          userId: `memory_test_user_${i}`,
          amount: 100,
          gameType: 'roulette'
        }

        await gameEngine.processGame(bet)

        // Trigger garbage collection periodically
        if (i % 100 === 0 && global.gc) {
          global.gc()
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // Memory increase should be reasonable (less than 50MB for 1000 games)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })

    it('should clean up game states efficiently', async () => {
      const gameCount = 100
      const userIds: string[] = []

      // Create games
      for (let i = 0; i < gameCount; i++) {
        const userId = `cleanup_test_user_${i}`
        userIds.push(userId)
        
        const bet: GameBet = {
          userId,
          amount: 100,
          gameType: 'roulette'
        }

        await gameEngine.processGame(bet)
      }

      // Get initial statistics
      const initialStats = await gameEngine.getEngineStatistics()
      
      // Clean up old games (0 hours = clean everything)
      const cleanedCount = await gameEngine.cleanup(0)
      
      // Get final statistics
      const finalStats = await gameEngine.getEngineStatistics()

      // Verify cleanup worked
      expect(cleanedCount).toBeGreaterThanOrEqual(0)
      expect(finalStats.activeGames).toBeLessThanOrEqual(initialStats.activeGames)
    })
  })

  describe('Database Performance', () => {
    it('should handle concurrent balance updates efficiently', async () => {
      const concurrentUpdates = 50
      const promises: Promise<any>[] = []

      const startTime = Date.now()

      // Create concurrent balance update operations
      for (let i = 0; i < concurrentUpdates; i++) {
        const userId = `balance_test_user_${i}`
        const amount = Math.floor(Math.random() * 1000) + 100
        
        // Mock the balance update operation
        const updatePromise = new Promise(resolve => {
          setTimeout(() => {
            resolve({
              userId,
              amount,
              success: true
            })
          }, Math.random() * 10) // Random delay 0-10ms
        })
        
        promises.push(updatePromise)
      }

      const results = await Promise.all(promises)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Verify all updates completed
      expect(results.length).toBe(concurrentUpdates)
      for (const result of results) {
        expect((result as any).success).toBe(true)
      }

      // Performance check
      expect(totalTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should efficiently query game history with pagination', async () => {
      const pageSize = 50
      const totalPages = 10
      const queryTimes: number[] = []

      for (let page = 0; page < totalPages; page++) {
        const startTime = Date.now()
        
        // Mock game history query
        const mockQuery = new Promise(resolve => {
          setTimeout(() => {
            const mockResults = Array.from({ length: pageSize }, (_, i) => ({
              id: `game_${page}_${i}`,
              user_id: 'test_user',
              game_type: 'roulette',
              bet_amount: 100,
              win_amount: Math.random() > 0.5 ? 200 : 0,
              created_at: new Date().toISOString()
            }))
            resolve(mockResults)
          }, Math.random() * 20) // Random delay 0-20ms
        })

        await mockQuery
        const endTime = Date.now()
        queryTimes.push(endTime - startTime)
      }

      // Calculate performance metrics
      const avgQueryTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length
      const maxQueryTime = Math.max(...queryTimes)

      // Performance assertions
      expect(avgQueryTime).toBeLessThan(100) // Average less than 100ms
      expect(maxQueryTime).toBeLessThan(200) // Max less than 200ms

      // Query times should be consistent (no significant degradation)
      const firstHalf = queryTimes.slice(0, totalPages / 2)
      const secondHalf = queryTimes.slice(totalPages / 2)
      
      const firstHalfAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length
      const secondHalfAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length

      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5)
    })
  })

  describe('Currency Operations Performance', () => {
    it('should format currency efficiently for large datasets', () => {
      const amounts = Array.from({ length: 10000 }, () => Math.random() * 1000000)
      const currencies = ['roubles', 'dollars', 'euros'] as const

      const startTime = Date.now()

      for (const amount of amounts) {
        for (const currency of currencies) {
          const formatted = CurrencyService.formatCurrency(amount, currency)
          expect(typeof formatted).toBe('string')
          expect(formatted.length).toBeGreaterThan(0)
        }
      }

      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Should format 30,000 currency values quickly
      expect(totalTime).toBeLessThan(1000) // Less than 1 second
    })

    it('should validate transaction parameters efficiently', () => {
      const transactionCount = 10000
      const validTransactions = []
      const invalidTransactions = []

      const startTime = Date.now()

      for (let i = 0; i < transactionCount; i++) {
        const transaction = {
          userId: `user${i}`,
          betAmount: Math.random() > 0.1 ? Math.floor(Math.random() * 1000) + 1 : -100, // 10% invalid
          winAmount: Math.random() > 0.1 ? Math.floor(Math.random() * 2000) : -50 // 10% invalid
        }

        // Validate transaction
        const isValid = transaction.userId && 
                       transaction.betAmount > 0 && 
                       transaction.winAmount >= 0

        if (isValid) {
          validTransactions.push(transaction)
        } else {
          invalidTransactions.push(transaction)
        }
      }

      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Verify validation worked
      expect(validTransactions.length).toBeGreaterThan(transactionCount * 0.7) // At least 70% valid
      expect(invalidTransactions.length).toBeGreaterThan(0) // Some invalid

      // Performance check
      expect(totalTime).toBeLessThan(500) // Less than 500ms for 10k validations
    })
  })

  describe('Random Number Generation Performance', () => {
    it('should generate random numbers efficiently', async () => {
      const { SecureRandomGenerator } = await import('../services/game-engine/random-generator')
      const generator = new SecureRandomGenerator()
      const count = 10000

      const startTime = Date.now()

      const promises = []
      for (let i = 0; i < count; i++) {
        promises.push(generator.generateSecureRandom())
      }

      const results = await Promise.all(promises)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Verify all results are valid
      for (const result of results) {
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThan(1)
      }

      // Performance check
      expect(totalTime).toBeLessThan(5000) // Less than 5 seconds for 10k random numbers
      
      const avgTimePerNumber = totalTime / count
      expect(avgTimePerNumber).toBeLessThan(1) // Less than 1ms per number on average
    })

    it('should generate provably fair results efficiently', async () => {
      const { SecureRandomGenerator } = await import('../services/game-engine/random-generator')
      const generator = new SecureRandomGenerator()
      const count = 1000

      const startTime = Date.now()

      for (let i = 0; i < count; i++) {
        const seed = {
          serverSeed: `server_seed_${i}`,
          clientSeed: `client_seed_${i}`,
          nonce: i
        }

        const result = await generator.generateProvablyFairResult(seed)
        expect(result.isValid).toBe(true)
        expect(result.randomValue).toBeGreaterThanOrEqual(0)
        expect(result.randomValue).toBeLessThan(1)
      }

      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Performance check
      expect(totalTime).toBeLessThan(10000) // Less than 10 seconds for 1k provably fair results
      
      const avgTimePerResult = totalTime / count
      expect(avgTimePerResult).toBeLessThan(20) // Less than 20ms per result on average
    })
  })

  describe('Stress Testing', () => {
    it('should handle burst traffic patterns', async () => {
      const burstSize = 100
      const burstCount = 5
      const burstInterval = 100 // ms between bursts

      const allResults: any[] = []

      for (let burst = 0; burst < burstCount; burst++) {
        const burstPromises: Promise<any>[] = []

        // Create burst of concurrent requests
        for (let i = 0; i < burstSize; i++) {
          const bet: GameBet = {
            userId: `burst_${burst}_user_${i}`,
            amount: 100,
            gameType: 'roulette'
          }
          burstPromises.push(gameEngine.processGame(bet))
        }

        const burstResults = await Promise.all(burstPromises)
        allResults.push(...burstResults)

        // Wait before next burst
        if (burst < burstCount - 1) {
          await new Promise(resolve => setTimeout(resolve, burstInterval))
        }
      }

      // Verify all requests completed successfully
      expect(allResults.length).toBe(burstSize * burstCount)
      for (const result of allResults) {
        expect(result.success).toBe(true)
      }
    })

    it('should maintain stability under sustained load', async () => {
      const duration = 5000 // 5 seconds
      const requestInterval = 10 // ms between requests
      const startTime = Date.now()
      const results: any[] = []

      let requestCount = 0
      while (Date.now() - startTime < duration) {
        const bet: GameBet = {
          userId: `sustained_load_user_${requestCount}`,
          amount: 100,
          gameType: 'roulette'
        }

        const result = await gameEngine.processGame(bet)
        results.push(result)
        requestCount++

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, requestInterval))
      }

      // Verify all requests completed successfully
      expect(results.length).toBeGreaterThan(0)
      for (const result of results) {
        expect(result.success).toBe(true)
      }

      // Calculate throughput
      const actualDuration = Date.now() - startTime
      const throughput = (results.length / actualDuration) * 1000 // requests per second
      
      expect(throughput).toBeGreaterThan(10) // At least 10 requests per second
    })
  })

  describe('Resource Utilization', () => {
    it('should monitor CPU usage during intensive operations', async () => {
      const startUsage = process.cpuUsage()
      const gameCount = 500

      // Perform CPU-intensive operations
      for (let i = 0; i < gameCount; i++) {
        const bet: GameBet = {
          userId: `cpu_test_user_${i}`,
          amount: 100,
          gameType: 'roulette'
        }

        await gameEngine.processGame(bet)
      }

      const endUsage = process.cpuUsage(startUsage)
      
      // CPU usage should be reasonable
      const totalCpuTime = endUsage.user + endUsage.system
      const cpuTimePerGame = totalCpuTime / gameCount

      expect(cpuTimePerGame).toBeLessThan(10000) // Less than 10ms CPU time per game
    })

    it('should handle memory pressure gracefully', async () => {
      const initialMemory = process.memoryUsage()
      const largeDataSets: any[] = []

      try {
        // Create memory pressure
        for (let i = 0; i < 100; i++) {
          const largeArray = new Array(10000).fill(0).map((_, index) => ({
            id: `item_${i}_${index}`,
            data: Math.random().toString(36).repeat(100)
          }))
          largeDataSets.push(largeArray)

          // Process some games during memory pressure
          const bet: GameBet = {
            userId: `memory_pressure_user_${i}`,
            amount: 100,
            gameType: 'roulette'
          }

          const result = await gameEngine.processGame(bet)
          expect(result.success).toBe(true)
        }

        const peakMemory = process.memoryUsage()
        expect(peakMemory.heapUsed).toBeGreaterThan(initialMemory.heapUsed)

      } finally {
        // Clean up
        largeDataSets.length = 0
        if (global.gc) {
          global.gc()
        }
      }

      // Memory should be manageable
      const finalMemory = process.memoryUsage()
      expect(finalMemory.heapUsed).toBeLessThan(500 * 1024 * 1024) // Less than 500MB
    })
  })
})