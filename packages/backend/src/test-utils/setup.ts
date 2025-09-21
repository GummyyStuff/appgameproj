/**
 * Test Setup Configuration
 * Global test setup and utilities for Bun test runner
 */

import { beforeEach, afterEach } from 'bun:test'

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.STARTING_BALANCE = '10000'
process.env.DAILY_BONUS = '1000'

// Global test utilities
export const testUtils = {
  // Mock user data
  createMockUser: (overrides = {}) => ({
    id: 'test-user-123',
    username: 'testuser',
    email: 'test@example.com',
    balance: 10000,
    created_at: '2024-01-01T00:00:00Z',
    last_login: '2024-01-15T10:00:00Z',
    daily_bonus_claimed_at: null,
    is_active: true,
    ...overrides
  }),

  // Mock game data
  createMockGameHistory: (overrides = {}) => ({
    id: 'game-123',
    user_id: 'test-user-123',
    game_type: 'roulette',
    bet_amount: 100,
    win_amount: 200,
    result_data: {
      bet_type: 'red',
      bet_value: 'red',
      winning_number: 7,
      multiplier: 2
    },
    created_at: '2024-01-15T10:00:00Z',
    ...overrides
  }),

  // Mock API responses
  createMockApiResponse: (data, success = true) => ({
    success,
    data,
    timestamp: new Date().toISOString(),
    ...(success ? {} : { error: 'Test error', message: 'Test error message' })
  }),

  // Test data generators
  generateRandomBetAmount: () => Math.floor(Math.random() * 1000) + 1,
  generateRandomUserId: () => `user-${Math.random().toString(36).substr(2, 9)}`,
  generateRandomGameId: () => `game-${Math.random().toString(36).substr(2, 9)}`,

  // Time utilities
  addDays: (date: Date, days: number) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  },

  // Validation helpers
  isValidEmail: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  isValidUsername: (username: string) => /^[a-zA-Z0-9_-]{3,20}$/.test(username),
  isValidPassword: (password: string) => password.length >= 8 && password.length <= 50,

  // Currency helpers
  formatTestCurrency: (amount: number, currency = 'roubles') => {
    const symbols = { roubles: '₽', dollars: '$', euros: '€' }
    return `${symbols[currency as keyof typeof symbols]}${amount.toLocaleString()}`
  },

  // Mock functions
  createMockFunction: () => {
    const calls: any[][] = []
    const fn = (...args: any[]) => {
      calls.push(args)
      return fn.mockReturnValue
    }
    fn.calls = calls
    fn.mockReturnValue = undefined
    fn.mockImplementation = (impl: Function) => {
      fn.implementation = impl
      return fn
    }
    fn.mockResolvedValue = (value: any) => {
      fn.mockReturnValue = Promise.resolve(value)
      return fn
    }
    fn.mockRejectedValue = (error: any) => {
      fn.mockReturnValue = Promise.reject(error)
      return fn
    }
    fn.mockClear = () => {
      calls.length = 0
      return fn
    }
    return fn
  }
}

// Custom matchers for Bun test
export const customMatchers = {
  toBeValidEmail: (received: string) => {
    const pass = testUtils.isValidEmail(received)
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid email`,
      pass
    }
  },

  toBeValidUsername: (received: string) => {
    const pass = testUtils.isValidUsername(received)
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid username`,
      pass
    }
  },

  toBeValidPassword: (received: string) => {
    const pass = testUtils.isValidPassword(received)
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid password`,
      pass
    }
  },

  toBeWithinRange: (received: number, min: number, max: number) => {
    const pass = received >= min && received <= max
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be within range ${min}-${max}`,
      pass
    }
  }
}

// Console override for cleaner test output
const originalConsoleError = console.error
console.error = (...args: any[]) => {
  // Suppress expected error messages in tests
  const message = args[0]
  if (typeof message === 'string' && (
    message.includes('Warning:') ||
    message.includes('React does not recognize')
  )) {
    return
  }
  originalConsoleError.apply(console, args)
}