/**
 * Frontend Test Setup Configuration
 * Simplified setup for Bun test
 */

import { mock, expect } from 'bun:test'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend expect with Testing Library matchers
expect.extend(matchers)

// Basic DOM setup will be handled by individual test files
// This file provides utilities and mocks

// Global test utilities for frontend
global.testUtils = {
  // Mock React Query client
  createMockQueryClient: () => {
    const { QueryClient } = require('@tanstack/react-query')
    return new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    })
  },

  // Mock auth context value
  createMockAuthContext: (overrides = {}) => ({
    user: { id: 'test-user', email: 'test@example.com' },
    session: { access_token: 'test-token' },
    loading: false,
    signUp: mock(),
    signIn: mock(),
    signOut: mock(),
    resetPassword: mock(),
    ...overrides
  }),

  // Mock balance hook return
  createMockBalanceHook: (balance = 1000) => ({
    balance,
    refetch: mock(),
    isLoading: false,
    error: null
  }),

  // Mock sound effects hook
  createMockSoundEffects: () => ({
    playBetSound: mock(),
    playWinSound: mock(),
    playLoseSound: mock(),
    playSpinSound: mock(),
    playCardSound: mock(),
    setVolume: mock(),
    toggleMute: mock(),
    isMuted: false
  }),

  // Mock game API responses
  createMockRouletteResponse: (overrides = {}) => ({
    success: true,
    gameId: 'test-game-123',
    result: {
      bet_type: 'red',
      bet_value: 'red',
      winning_number: 7,
      multiplier: 1,
      payout: 100
    },
    balance: 1100,
    timestamp: '2024-01-15T10:00:00Z',
    ...overrides
  }),

  createMockBlackjackResponse: (overrides = {}) => ({
    success: true,
    gameId: 'test-game-123',
    gameState: {
      player_hand: [
        { suit: 'hearts', value: 'K' },
        { suit: 'spades', value: '7' }
      ],
      dealer_hand: [
        { suit: 'diamonds', value: 'A' },
        { suit: 'clubs', value: 'hidden' }
      ],
      player_value: 17,
      dealer_value: 11,
      status: 'playing',
      actions: ['hit', 'stand']
    },
    balance: 900,
    timestamp: '2024-01-15T10:00:00Z',
    ...overrides
  }),



  // Form validation helpers
  isValidBetAmount: (amount) => {
    const num = Number(amount)
    return !isNaN(num) && num > 0 && num <= 10000
  },

  isValidRiskLevel: (level) => ['low', 'medium', 'high'].includes(level),

  // Animation helpers
  mockAnimationFrame: () => {
    let id = 0
    global.requestAnimationFrame = mock((callback) => {
      setTimeout(callback, 16) // ~60fps
      return ++id
    })
    global.cancelAnimationFrame = mock()
  },

  // Event helpers
  createMockEvent: (type, properties = {}) => ({
    type,
    preventDefault: mock(),
    stopPropagation: mock(),
    target: { value: '' },
    currentTarget: { value: '' },
    ...properties
  }),

  // Async helpers
  waitForNextTick: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  // Mock fetch responses
  mockFetchSuccess: (data) => {
    global.fetch = mock(() => Promise.resolve({
      ok: true,
      json: async () => data,
      status: 200,
      statusText: 'OK'
    }))
  },

  mockFetchError: (error = 'Network error', status = 500) => {
    global.fetch = mock(() => Promise.reject(new Error(error)))
  },

  mockFetchApiError: (error, status = 400) => {
    global.fetch = mock(() => Promise.resolve({
      ok: false,
      json: async () => ({
        success: false,
        error: error.code || 'API_ERROR',
        message: error.message || 'API Error'
      }),
      status,
      statusText: 'Bad Request'
    }))
  }
}

// Custom render function with providers
export const renderWithProviders = (ui: any, options: any = {}) => {
  // This function would be implemented in individual test files
  // as it requires React imports and JSX
  throw new Error('renderWithProviders should be implemented in individual test files')
}

// Cleanup is handled automatically by Bun test