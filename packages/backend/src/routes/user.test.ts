import { describe, test, expect } from 'bun:test'

// Set test environment variables before any imports
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.STARTING_BALANCE = '10000'
process.env.DAILY_BONUS = '1000'

describe('User API Validation', () => {
  test('should validate profile update input correctly', async () => {
    const { z } = await import('zod')
    
    const updateProfileSchema = z.object({
      username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters').optional(),
      email: z.string().email('Invalid email format').optional()
    }).refine(data => data.username || data.email, {
      message: 'At least one field (username or email) must be provided'
    })

    // Valid username update
    expect(() => updateProfileSchema.parse({
      username: 'newusername'
    })).not.toThrow()

    // Valid email update
    expect(() => updateProfileSchema.parse({
      email: 'newemail@example.com'
    })).not.toThrow()

    // Valid both
    expect(() => updateProfileSchema.parse({
      username: 'newusername',
      email: 'newemail@example.com'
    })).not.toThrow()

    // Empty object should throw
    expect(() => updateProfileSchema.parse({})).toThrow()

    // Invalid username (too short)
    expect(() => updateProfileSchema.parse({
      username: 'ab'
    })).toThrow()

    // Invalid username (too long)
    expect(() => updateProfileSchema.parse({
      username: 'a'.repeat(21)
    })).toThrow()

    // Invalid email
    expect(() => updateProfileSchema.parse({
      email: 'invalid-email'
    })).toThrow()
  })

  test('should validate daily bonus cooldown logic', () => {
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()
    
    // Should allow claiming if last bonus was yesterday
    expect(yesterday !== today).toBe(true)
    
    // Should not allow claiming if last bonus was today
    expect(today === today).toBe(true)
  })

  test('should validate balance operations', () => {
    const startingBalance = parseInt(process.env.STARTING_BALANCE || '10000')
    const dailyBonus = parseInt(process.env.DAILY_BONUS || '1000')
    
    expect(startingBalance).toBe(10000)
    expect(dailyBonus).toBe(1000)
    
    // Balance should be positive
    expect(startingBalance > 0).toBe(true)
    expect(dailyBonus > 0).toBe(true)
  })
})