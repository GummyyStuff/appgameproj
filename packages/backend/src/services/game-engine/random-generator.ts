/**
 * Cryptographically secure random number generator
 * Uses Node.js crypto module for provably fair gaming
 */

import { randomBytes, createHash, createHmac } from 'crypto'
import { IRandomGenerator, ProvablyFairSeed, ProvablyFairResult } from './types'

export class SecureRandomGenerator implements IRandomGenerator {
  /**
   * Generate a cryptographically secure random number between 0 and 1
   */
  async generateSecureRandom(): Promise<number> {
    const bytes = await this.generateSecureBytes(4)
    const uint32 = bytes.readUInt32BE(0)
    return uint32 / 0x100000000 // Convert to 0-1 range
  }

  /**
   * Generate a cryptographically secure random integer between min and max (inclusive)
   */
  async generateSecureRandomInt(min: number, max: number): Promise<number> {
    if (min > max) {
      throw new Error('Min must be less than max')
    }
    
    const range = max - min + 1
    const random = await this.generateSecureRandom()
    return Math.floor(random * range) + min
  }

  /**
   * Generate cryptographically secure random bytes
   */
  async generateSecureBytes(length: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      randomBytes(length, (err, buf) => {
        if (err) reject(err)
        else resolve(buf)
      })
    })
  }

  /**
   * Generate a secure seed string
   */
  async generateSeed(): Promise<string> {
    const bytes = await this.generateSecureBytes(32)
    return bytes.toString('hex')
  }

  /**
   * Generate provably fair result using server seed, client seed, and nonce
   * This allows players to verify the fairness of game results
   */
  async generateProvablyFairResult(seed: ProvablyFairSeed): Promise<ProvablyFairResult> {
    try {
      // Create HMAC hash using server seed as key and client seed + nonce as message
      const message = `${seed.clientSeed}:${seed.nonce}`
      const hash = createHmac('sha256', seed.serverSeed)
        .update(message)
        .digest('hex')

      // Convert first 8 characters of hash to decimal for random value
      const hexSubstring = hash.substring(0, 8)
      const decimal = parseInt(hexSubstring, 16)
      const randomValue = decimal / 0x100000000 // Convert to 0-1 range

      return {
        seed,
        hash,
        randomValue,
        isValid: true
      }
    } catch (error) {
      return {
        seed,
        hash: '',
        randomValue: 0,
        isValid: false
      }
    }
  }

  /**
   * Verify a provably fair result
   */
  async verifyProvablyFairResult(result: ProvablyFairResult): Promise<boolean> {
    try {
      const regenerated = await this.generateProvablyFairResult(result.seed)
      return regenerated.hash === result.hash && 
             Math.abs(regenerated.randomValue - result.randomValue) < 0.0000001
    } catch {
      return false
    }
  }

  /**
   * Generate multiple random values from a single seed (for games requiring multiple randoms)
   */
  async generateMultipleFromSeed(seed: ProvablyFairSeed, count: number): Promise<number[]> {
    const results: number[] = []
    
    for (let i = 0; i < count; i++) {
      const currentSeed = { ...seed, nonce: seed.nonce + i }
      const result = await this.generateProvablyFairResult(currentSeed)
      results.push(result.randomValue)
    }
    
    return results
  }

  /**
   * Create a hash of the server seed for client verification
   * This allows revealing the server seed after the game without compromising security
   */
  hashServerSeed(serverSeed: string): string {
    return createHash('sha256').update(serverSeed).digest('hex')
  }
}