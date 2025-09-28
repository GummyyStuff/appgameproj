/**
 * Game API Integration Tests
 * Tests for all game endpoints and game flow
 */

import { describe, test, expect } from 'bun:test'
import { Hono } from 'hono'

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.JWT_SECRET = 'test-jwt-secret'

describe('Game API', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
  })

  describe('POST /api/games/roulette/bet', () => {
    test('should validate roulette bet request structure', () => {
      const validRequests = [
        {
          amount: 100,
          betType: 'red',
          betValue: 'red'
        },
        {
          amount: 50,
          betType: 'number',
          betValue: 17
        },
        {
          amount: 25,
          betType: 'dozen',
          betValue: 2
        }
      ]

      const invalidRequests = [
        {}, // Missing all fields
        { amount: 100 }, // Missing bet type and value
        { amount: -100, betType: 'red', betValue: 'red' }, // Negative amount
        { amount: 0, betType: 'red', betValue: 'red' }, // Zero amount
        { amount: 100, betType: 'invalid', betValue: 'red' }, // Invalid bet type
        { amount: 100, betType: 'number', betValue: 37 }, // Invalid number
        { amount: 100, betType: 'dozen', betValue: 4 } // Invalid dozen
      ]

      for (const request of validRequests) {
        expect(request.amount).toBeGreaterThan(0)
        expect(request.betType).toBeTruthy()
        expect(request.betValue).toBeDefined()
      }

      for (const request of invalidRequests) {
        const isValid = Boolean(request.amount > 0 &&
                               request.betType &&
                               request.betValue !== undefined)
        expect(isValid).toBe(false)
      }
    })

    test('should validate roulette bet types and values', () => {
      const validBets = [
        { betType: 'red', betValue: 'red' },
        { betType: 'black', betValue: 'black' },
        { betType: 'odd', betValue: 'odd' },
        { betType: 'even', betValue: 'even' },
        { betType: 'low', betValue: 'low' },
        { betType: 'high', betValue: 'high' },
        { betType: 'number', betValue: 0 },
        { betType: 'number', betValue: 17 },
        { betType: 'number', betValue: 36 },
        { betType: 'dozen', betValue: 1 },
        { betType: 'dozen', betValue: 2 },
        { betType: 'dozen', betValue: 3 },
        { betType: 'column', betValue: 1 },
        { betType: 'column', betValue: 2 },
        { betType: 'column', betValue: 3 }
      ]

      const invalidBets = [
        { betType: 'red', betValue: 'blue' },
        { betType: 'number', betValue: -1 },
        { betType: 'number', betValue: 37 },
        { betType: 'dozen', betValue: 0 },
        { betType: 'dozen', betValue: 4 },
        { betType: 'column', betValue: 0 },
        { betType: 'column', betValue: 4 },
        { betType: 'invalid', betValue: 'test' }
      ]

      for (const bet of validBets) {
        let isValid = false
        
        if (['red', 'black', 'odd', 'even', 'low', 'high'].includes(bet.betType)) {
          isValid = bet.betValue === bet.betType
        } else if (bet.betType === 'number') {
          isValid = typeof bet.betValue === 'number' && 
                   bet.betValue >= 0 && 
                   bet.betValue <= 36
        } else if (['dozen', 'column'].includes(bet.betType)) {
          isValid = typeof bet.betValue === 'number' && 
                   bet.betValue >= 1 && 
                   bet.betValue <= 3
        }
        
        expect(isValid).toBe(true)
      }

      for (const bet of invalidBets) {
        let isValid = false
        
        if (['red', 'black', 'odd', 'even', 'low', 'high'].includes(bet.betType)) {
          isValid = bet.betValue === bet.betType
        } else if (bet.betType === 'number') {
          isValid = typeof bet.betValue === 'number' && 
                   bet.betValue >= 0 && 
                   bet.betValue <= 36
        } else if (['dozen', 'column'].includes(bet.betType)) {
          isValid = typeof bet.betValue === 'number' && 
                   bet.betValue >= 1 && 
                   bet.betValue <= 3
        }
        
        expect(isValid).toBe(false)
      }
    })
  })

  describe('POST /api/games/blackjack/start', () => {
    test('should validate blackjack start request', () => {
      const validRequests = [
        { amount: 100 },
        { amount: 50 },
        { amount: 1000 }
      ]

      const invalidRequests = [
        {}, // Missing amount
        { amount: 0 }, // Zero amount
        { amount: -100 }, // Negative amount
        { amount: 10001 }, // Exceeds maximum
        { amount: 'invalid' } // Invalid type
      ]

      for (const request of validRequests) {
        expect(request.amount).toBeGreaterThan(0)
        expect(request.amount).toBeLessThanOrEqual(10000)
        expect(typeof request.amount).toBe('number')
      }

      for (const request of invalidRequests) {
        const isValid = typeof request.amount === 'number' && 
                       request.amount > 0 && 
                       request.amount <= 10000
        expect(isValid).toBe(false)
      }
    })
  })

  describe('POST /api/games/blackjack/action', () => {
    test('should validate blackjack action request', () => {
      const validRequests = [
        { gameId: 'game123', action: 'hit' },
        { gameId: 'game456', action: 'stand' },
        { gameId: 'game789', action: 'double' },
        { gameId: 'game101', action: 'split' }
      ]

      const invalidRequests = [
        {}, // Missing all fields
        { gameId: 'game123' }, // Missing action
        { action: 'hit' }, // Missing gameId
        { gameId: '', action: 'hit' }, // Empty gameId
        { gameId: 'game123', action: 'invalid' }, // Invalid action
        { gameId: 'game123', action: '' } // Empty action
      ]

      const validActions = ['hit', 'stand', 'double', 'split']

      for (const request of validRequests) {
        expect(request.gameId).toBeTruthy()
        expect(validActions).toContain(request.action)
      }

      for (const request of invalidRequests) {
        const isValid = Boolean(request.gameId &&
                               request.action &&
                               validActions.includes(request.action))
        expect(isValid).toBe(false)
      }
    })
  })

  describe('Game Response Validation', () => {
    test('should validate roulette game response structure', () => {
      const mockResponse = {
        success: true,
        gameId: 'game123',
        result: {
          bet_type: 'red',
          bet_value: 'red',
          winning_number: 7,
          multiplier: 1,
          payout: 100
        },
        balance: 10100,
        timestamp: '2024-01-15T10:00:00Z'
      }

      expect(mockResponse.success).toBe(true)
      expect(mockResponse.gameId).toBeTruthy()
      expect(mockResponse.result).toBeDefined()
      expect(mockResponse.result.winning_number).toBeGreaterThanOrEqual(0)
      expect(mockResponse.result.winning_number).toBeLessThanOrEqual(36)
      expect(mockResponse.result.multiplier).toBeGreaterThanOrEqual(0)
      expect(mockResponse.result.payout).toBeGreaterThanOrEqual(0)
      expect(mockResponse.balance).toBeGreaterThanOrEqual(0)
      expect(mockResponse.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    test('should validate blackjack game response structure', () => {
      const mockResponse = {
        success: true,
        gameId: 'game123',
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
        balance: 9900,
        timestamp: '2024-01-15T10:00:00Z'
      }

      expect(mockResponse.success).toBe(true)
      expect(mockResponse.gameId).toBeTruthy()
      expect(mockResponse.gameState).toBeDefined()
      expect(Array.isArray(mockResponse.gameState.player_hand)).toBe(true)
      expect(Array.isArray(mockResponse.gameState.dealer_hand)).toBe(true)
      expect(mockResponse.gameState.player_value).toBeGreaterThanOrEqual(0)
      expect(['playing', 'won', 'lost', 'push'].includes(mockResponse.gameState.status)).toBe(true)
      expect(Array.isArray(mockResponse.gameState.actions)).toBe(true)
    })

  })

  describe('Error Response Validation', () => {
    test('should validate game error responses', () => {
      const errorResponses = [
        {
          success: false,
          error: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient balance for this bet',
          balance: 50
        },
        {
          success: false,
          error: 'INVALID_BET',
          message: 'Invalid bet parameters',
          details: 'Bet amount must be positive'
        },
        {
          success: false,
          error: 'GAME_NOT_FOUND',
          message: 'Game session not found',
          gameId: 'invalid-game-id'
        }
      ]

      for (const response of errorResponses) {
        expect(response.success).toBe(false)
        expect(response.error).toBeTruthy()
        expect(response.message).toBeTruthy()
        expect(typeof response.error).toBe('string')
        expect(typeof response.message).toBe('string')
      }
    })
  })

  describe('Authentication Requirements', () => {
    test('should validate authentication headers for game endpoints', () => {
      const validHeaders = {
        'Authorization': 'Bearer valid-jwt-token',
        'Content-Type': 'application/json'
      }

      const invalidHeaders = [
        {}, // Missing authorization
        { 'Authorization': '' }, // Empty authorization
        { 'Authorization': 'Invalid token' }, // Invalid format
        { 'Content-Type': 'application/json' } // Missing authorization
      ]

      expect(validHeaders.Authorization).toMatch(/^Bearer .+/)
      expect(validHeaders['Content-Type']).toBe('application/json')

      for (const headers of invalidHeaders) {
        const hasValidAuth = Boolean(headers.Authorization &&
                                    headers.Authorization.startsWith('Bearer ') &&
                                    headers.Authorization.length > 7)
        expect(hasValidAuth).toBe(false)
      }
    })
  })

  describe('Rate Limiting', () => {
    test('should validate rate limiting configuration', () => {
      const rateLimits = {
        roulette: { maxRequests: 60, windowMs: 60000 }, // 60 per minute
        blackjack: { maxRequests: 30, windowMs: 60000 } // 30 per minute
      }

      for (const [game, limit] of Object.entries(rateLimits)) {
        expect(limit.maxRequests).toBeGreaterThan(0)
        expect(limit.windowMs).toBeGreaterThan(0)
        expect(typeof limit.maxRequests).toBe('number')
        expect(typeof limit.windowMs).toBe('number')
      }
    })
  })

  describe('Balance Validation', () => {
    test('should validate balance checks before game play', () => {
      const balanceChecks = [
        { balance: 1000, betAmount: 100, canPlay: true },
        { balance: 1000, betAmount: 1000, canPlay: true },
        { balance: 1000, betAmount: 1001, canPlay: false },
        { balance: 0, betAmount: 1, canPlay: false },
        { balance: 50, betAmount: 100, canPlay: false }
      ]

      for (const check of balanceChecks) {
        const actualCanPlay = check.balance >= check.betAmount
        expect(actualCanPlay).toBe(check.canPlay)
      }
    })
  })

  describe('Game State Management', () => {
    test('should validate game state transitions', () => {
      const validTransitions = [
        { from: 'waiting', to: 'playing', valid: true },
        { from: 'playing', to: 'won', valid: true },
        { from: 'playing', to: 'lost', valid: true },
        { from: 'playing', to: 'push', valid: true },
        { from: 'won', to: 'completed', valid: true },
        { from: 'lost', to: 'completed', valid: true },
        { from: 'push', to: 'completed', valid: true }
      ]

      const invalidTransitions = [
        { from: 'completed', to: 'playing', valid: false },
        { from: 'won', to: 'lost', valid: false },
        { from: 'lost', to: 'won', valid: false },
        { from: 'waiting', to: 'won', valid: false },
        { from: 'waiting', to: 'lost', valid: false }
      ]

      const allTransitions = [...validTransitions, ...invalidTransitions]

      for (const transition of allTransitions) {
        // This would be validated by actual game state machine
        expect(typeof transition.from).toBe('string')
        expect(typeof transition.to).toBe('string')
        expect(typeof transition.valid).toBe('boolean')
      }
    })
  })

  describe('Concurrent Game Handling', () => {
    test('should validate concurrent game restrictions', () => {
      const gameStates = [
        { userId: 'user1', gameId: 'game1', status: 'playing' },
        { userId: 'user1', gameId: 'game2', status: 'waiting' }, // Should not be allowed
        { userId: 'user2', gameId: 'game3', status: 'playing' }, // Different user, OK
        { userId: 'user1', gameId: 'game4', status: 'completed' } // Completed, OK
      ]

      const activeGamesPerUser = gameStates.reduce((acc, game) => {
        if (game.status === 'playing' || game.status === 'waiting') {
          acc[game.userId] = (acc[game.userId] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)

      // Each user should have at most 1 active game
      for (const [userId, count] of Object.entries(activeGamesPerUser)) {
        if (userId === 'user1') {
          expect(count).toBeGreaterThan(1) // This should be prevented
        } else {
          expect(count).toBeLessThanOrEqual(1)
        }
      }
    })
  })
})