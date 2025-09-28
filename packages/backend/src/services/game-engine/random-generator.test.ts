/**
 * Tests for SecureRandomGenerator
 * Validates cryptographic security and provably fair algorithms
 */

import { describe, test, expect, beforeEach } from 'bun:test'
import { SecureRandomGenerator } from './random-generator'
import { ProvablyFairSeed } from './types'

describe('SecureRandomGenerator', () => {
  let generator: SecureRandomGenerator

  beforeEach(() => {
    generator = new SecureRandomGenerator()
  })

  describe('generateSecureRandom', () => {
    test('should generate random numbers between 0 and 1', async () => {
      const results = []
      for (let i = 0; i < 100; i++) {
        const random = await generator.generateSecureRandom()
        expect(random).toBeGreaterThanOrEqual(0)
        expect(random).toBeLessThan(1)
        results.push(random)
      }

      // Check for reasonable distribution (not all the same)
      const unique = new Set(results)
      expect(unique.size).toBeGreaterThan(50) // Should have good variety
    })

    test('should generate different values on subsequent calls', async () => {
      const value1 = await generator.generateSecureRandom()
      const value2 = await generator.generateSecureRandom()
      expect(value1).not.toBe(value2)
    })
  })

  describe('generateSecureRandomInt', () => {
    test('should generate integers within specified range', async () => {
      for (let i = 0; i < 50; i++) {
        const random = await generator.generateSecureRandomInt(1, 10)
        expect(random).toBeGreaterThanOrEqual(1)
        expect(random).toBeLessThanOrEqual(10)
        expect(Number.isInteger(random)).toBe(true)
      }
    })

    test('should handle single value range', async () => {
      const random = await generator.generateSecureRandomInt(5, 5)
      expect(random).toBe(5)
    })

    test('should throw error for invalid range', async () => {
      await expect(generator.generateSecureRandomInt(10, 5)).rejects.toThrow('Min must be less than max')
    })

    test('should generate good distribution across range', async () => {
      const results = []
      for (let i = 0; i < 1000; i++) {
        const random = await generator.generateSecureRandomInt(1, 6)
        results.push(random)
      }

      // Check that all values 1-6 appear
      const unique = new Set(results)
      expect(unique.size).toBe(6)
      expect(Array.from(unique).sort()).toEqual([1, 2, 3, 4, 5, 6])
    })
  })

  describe('generateSecureBytes', () => {
    test('should generate buffer of correct length', async () => {
      const bytes = await generator.generateSecureBytes(32)
      expect(bytes).toBeInstanceOf(Buffer)
      expect(bytes.length).toBe(32)
    })

    test('should generate different bytes on subsequent calls', async () => {
      const bytes1 = await generator.generateSecureBytes(16)
      const bytes2 = await generator.generateSecureBytes(16)
      expect(bytes1.equals(bytes2)).toBe(false)
    })
  })

  describe('generateSeed', () => {
    test('should generate hex string of correct length', async () => {
      const seed = await generator.generateSeed()
      expect(typeof seed).toBe('string')
      expect(seed.length).toBe(64) // 32 bytes = 64 hex chars
      expect(/^[0-9a-f]+$/.test(seed)).toBe(true)
    })

    test('should generate unique seeds', async () => {
      const seeds = []
      for (let i = 0; i < 10; i++) {
        const seed = await generator.generateSeed()
        seeds.push(seed)
      }

      const unique = new Set(seeds)
      expect(unique.size).toBe(10)
    })
  })

  describe('generateProvablyFairResult', () => {
    test('should generate consistent results for same seed', async () => {
      const seed: ProvablyFairSeed = {
        serverSeed: 'test_server_seed',
        clientSeed: 'test_client_seed',
        nonce: 1
      }

      const result1 = await generator.generateProvablyFairResult(seed)
      const result2 = await generator.generateProvablyFairResult(seed)

      expect(result1.hash).toBe(result2.hash)
      expect(result1.randomValue).toBe(result2.randomValue)
      expect(result1.isValid).toBe(true)
      expect(result2.isValid).toBe(true)
    })

    test('should generate different results for different nonces', async () => {
      const baseSeed: ProvablyFairSeed = {
        serverSeed: 'test_server_seed',
        clientSeed: 'test_client_seed',
        nonce: 1
      }

      const result1 = await generator.generateProvablyFairResult(baseSeed)
      const result2 = await generator.generateProvablyFairResult({ ...baseSeed, nonce: 2 })

      expect(result1.hash).not.toBe(result2.hash)
      expect(result1.randomValue).not.toBe(result2.randomValue)
    })

    test('should generate different results for different seeds', async () => {
      const seed1: ProvablyFairSeed = {
        serverSeed: 'server_seed_1',
        clientSeed: 'client_seed_1',
        nonce: 1
      }

      const seed2: ProvablyFairSeed = {
        serverSeed: 'server_seed_2',
        clientSeed: 'client_seed_2',
        nonce: 1
      }

      const result1 = await generator.generateProvablyFairResult(seed1)
      const result2 = await generator.generateProvablyFairResult(seed2)

      expect(result1.hash).not.toBe(result2.hash)
      expect(result1.randomValue).not.toBe(result2.randomValue)
    })

    test('should generate random values between 0 and 1', async () => {
      for (let i = 0; i < 100; i++) {
        const seed: ProvablyFairSeed = {
          serverSeed: `server_${i}`,
          clientSeed: `client_${i}`,
          nonce: i
        }

        const result = await generator.generateProvablyFairResult(seed)
        expect(result.randomValue).toBeGreaterThanOrEqual(0)
        expect(result.randomValue).toBeLessThan(1)
        expect(result.isValid).toBe(true)
      }
    })
  })

  describe('verifyProvablyFairResult', () => {
    test('should verify valid results', async () => {
      const seed: ProvablyFairSeed = {
        serverSeed: 'test_server_seed',
        clientSeed: 'test_client_seed',
        nonce: 1
      }

      const result = await generator.generateProvablyFairResult(seed)
      const isValid = await generator.verifyProvablyFairResult(result)
      expect(isValid).toBe(true)
    })

    test('should reject tampered results', async () => {
      const seed: ProvablyFairSeed = {
        serverSeed: 'test_server_seed',
        clientSeed: 'test_client_seed',
        nonce: 1
      }

      const result = await generator.generateProvablyFairResult(seed)
      
      // Tamper with the result
      const tamperedResult = { ...result, randomValue: 0.5 }
      const isValid = await generator.verifyProvablyFairResult(tamperedResult)
      expect(isValid).toBe(false)
    })
  })

  describe('generateMultipleFromSeed', () => {
    test('should generate multiple consistent random values', async () => {
      const seed: ProvablyFairSeed = {
        serverSeed: 'test_server_seed',
        clientSeed: 'test_client_seed',
        nonce: 1
      }

      const values1 = await generator.generateMultipleFromSeed(seed, 5)
      const values2 = await generator.generateMultipleFromSeed(seed, 5)

      expect(values1).toEqual(values2)
      expect(values1.length).toBe(5)
      
      // All values should be between 0 and 1
      values1.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(1)
      })
    })

    test('should generate different values for each position', async () => {
      const seed: ProvablyFairSeed = {
        serverSeed: 'test_server_seed',
        clientSeed: 'test_client_seed',
        nonce: 1
      }

      const values = await generator.generateMultipleFromSeed(seed, 10)
      const unique = new Set(values)
      
      // Should have good variety (not all identical)
      expect(unique.size).toBeGreaterThan(5)
    })
  })

  describe('hashServerSeed', () => {
    test('should generate consistent hash for same seed', () => {
      const seed = 'test_server_seed'
      const hash1 = generator.hashServerSeed(seed)
      const hash2 = generator.hashServerSeed(seed)
      
      expect(hash1).toBe(hash2)
      expect(typeof hash1).toBe('string')
      expect(hash1.length).toBe(64) // SHA256 hex length
    })

    test('should generate different hashes for different seeds', () => {
      const hash1 = generator.hashServerSeed('seed1')
      const hash2 = generator.hashServerSeed('seed2')
      
      expect(hash1).not.toBe(hash2)
    })
  })
})