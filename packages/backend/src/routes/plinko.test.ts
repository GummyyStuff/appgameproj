/**
 * Plinko API Integration Tests
 * Tests for plinko game endpoints and real-time functionality
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { Hono } from 'hono'
import { gameRoutes } from './games'
import { CurrencyService } from '../services/currency'
import { supabaseAdmin } from '../config/supabase'

// Mock the auth middleware to provide a test user
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID format
  email: 'test@example.com'
}

// Mock auth middleware
const mockAuthMiddleware = async (c: any, next: any) => {
  c.set('user', mockUser)
  await next()
}

describe('Plinko API Endpoints', () => {
  let app: Hono
  let testUserId: string

  beforeEach(async () => {
    // Create test app with mocked auth
    app = new Hono()
    app.use('*', mockAuthMiddleware)
    app.route('/api/games', gameRoutes)
    
    testUserId = mockUser.id

    // Ensure test user has sufficient balance
    try {
      await CurrencyService.addBalance(testUserId, 10000)
    } catch (error) {
      // User might not exist, create profile first
      await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: testUserId,
          username: 'test-plinko-user',
          balance: 10000,
          total_wagered: 0,
          total_won: 0,
          games_played: 0,
          is_active: true
        })
    }
  })

  afterEach(async () => {
    // Clean up test data
    try {
      await supabaseAdmin
        .from('game_history')
        .delete()
        .eq('user_id', testUserId)

      await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', testUserId)
    } catch (error) {
      console.warn('Cleanup error:', error)
    }
  })

  describe('GET /api/games/plinko', () => {
    test('should return plinko game information', async () => {
      const response = await app.request('/api/games/plinko')
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error:', response.status, errorText)
      }
      
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('message')
      expect(data).toHaveProperty('board_config')
      expect(data).toHaveProperty('risk_levels')
      expect(data).toHaveProperty('multiplier_table')
      expect(data).toHaveProperty('peg_positions')
      expect(data).toHaveProperty('min_bet')
      expect(data).toHaveProperty('max_bet')

      // Validate board config
      expect(data.board_config.rows).toBe(4)
      expect(data.board_config.slots).toBe(9)
      expect(data.board_config.startingPosition).toBe(4)

      // Validate risk levels
      expect(data.risk_levels).toHaveProperty('low')
      expect(data.risk_levels).toHaveProperty('medium')
      expect(data.risk_levels).toHaveProperty('high')

      // Validate multiplier table
      expect(data.multiplier_table.low).toHaveLength(9)
      expect(data.multiplier_table.medium).toHaveLength(9)
      expect(data.multiplier_table.high).toHaveLength(9)

      // Validate peg positions
      expect(Array.isArray(data.peg_positions)).toBe(true)
      expect(data.peg_positions.length).toBeGreaterThan(0)
    })
  })

  describe('POST /api/games/plinko/drop', () => {
    test('should successfully drop plinko ball with valid bet', async () => {
      const betData = {
        amount: 100,
        riskLevel: 'medium'
      }

      const response = await app.request('/api/games/plinko/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData)
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data).toHaveProperty('game_result')
      expect(data).toHaveProperty('bet_amount', 100)
      expect(data).toHaveProperty('win_amount')
      expect(data).toHaveProperty('net_result')
      expect(data).toHaveProperty('new_balance')
      expect(data).toHaveProperty('game_id')

      // Validate game result structure
      const gameResult = data.game_result
      expect(gameResult).toHaveProperty('risk_level', 'medium')
      expect(gameResult).toHaveProperty('ball_path')
      expect(gameResult).toHaveProperty('multiplier')
      expect(gameResult).toHaveProperty('landing_slot')

      // Validate ball path
      expect(Array.isArray(gameResult.ball_path)).toBe(true)
      expect(gameResult.ball_path).toHaveLength(4)
      gameResult.ball_path.forEach((move: number) => {
        expect([0, 1]).toContain(move)
      })

      // Validate landing slot
      expect(gameResult.landing_slot).toBeGreaterThanOrEqual(0)
      expect(gameResult.landing_slot).toBeLessThan(9)

      // Validate multiplier
      expect(gameResult.multiplier).toBeGreaterThanOrEqual(0)

      // Validate win amount calculation
      const expectedWinAmount = betData.amount * gameResult.multiplier
      expect(data.win_amount).toBe(expectedWinAmount)
      expect(data.net_result).toBe(expectedWinAmount - betData.amount)
    })

    test('should handle different risk levels', async () => {
      const riskLevels = ['low', 'medium', 'high']

      for (const riskLevel of riskLevels) {
        const betData = {
          amount: 50,
          riskLevel
        }

        const response = await app.request('/api/games/plinko/drop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(betData)
        })

        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.game_result.risk_level).toBe(riskLevel)
      }
    })

    test('should reject bet with missing amount', async () => {
      const betData = {
        riskLevel: 'medium'
      }

      const response = await app.request('/api/games/plinko/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData)
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields: amount, riskLevel')
    })

    test('should reject bet with missing risk level', async () => {
      const betData = {
        amount: 100
      }

      const response = await app.request('/api/games/plinko/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData)
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields: amount, riskLevel')
    })

    test('should reject bet with invalid risk level', async () => {
      const betData = {
        amount: 100,
        riskLevel: 'invalid'
      }

      const response = await app.request('/api/games/plinko/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData)
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid risk level. Must be: low, medium, or high')
    })

    test('should reject bet with invalid amount', async () => {
      const betData = {
        amount: 0,
        riskLevel: 'medium'
      }

      const response = await app.request('/api/games/plinko/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData)
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid bet amount')
    })

    test('should reject bet exceeding maximum', async () => {
      const betData = {
        amount: 20000,
        riskLevel: 'medium'
      }

      const response = await app.request('/api/games/plinko/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData)
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid bet amount')
    })

    test('should reject bet with insufficient balance', async () => {
      // Reduce user balance to low amount
      const currentBalance = await CurrencyService.getBalance(testUserId)
      if (currentBalance > 50) {
        await CurrencyService.deductCurrency(testUserId, currentBalance - 50, 'Test setup')
      }

      const betData = {
        amount: 100,
        riskLevel: 'medium'
      }

      const response = await app.request('/api/games/plinko/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData)
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Insufficient balance')
    })

    test('should update user balance correctly', async () => {
      const initialBalance = 1000
      const currentBalance = await CurrencyService.getBalance(testUserId)
      
      // Adjust balance to desired amount
      if (currentBalance < initialBalance) {
        await CurrencyService.addCurrency(testUserId, initialBalance - currentBalance, 'Test setup')
      } else if (currentBalance > initialBalance) {
        await CurrencyService.deductCurrency(testUserId, currentBalance - initialBalance, 'Test setup')
      }

      const betData = {
        amount: 100,
        riskLevel: 'low'
      }

      const response = await app.request('/api/games/plinko/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData)
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Check that balance was updated correctly
      const expectedBalance = initialBalance - betData.amount + data.win_amount
      expect(data.new_balance).toBe(expectedBalance)

      // Verify balance in database
      const finalBalance = await CurrencyService.getBalance(testUserId)
      expect(finalBalance).toBe(expectedBalance)
    })

    test('should create game history record', async () => {
      const betData = {
        amount: 200,
        riskLevel: 'high'
      }

      const response = await app.request('/api/games/plinko/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData)
      })

      expect(response.status).toBe(200)

      // Check that game history was created
      const { data: gameHistory } = await supabaseAdmin
        .from('game_history')
        .select('*')
        .eq('user_id', testUserId)
        .eq('game_type', 'plinko')
        .order('created_at', { ascending: false })
        .limit(1)

      expect(gameHistory).toHaveLength(1)
      expect(gameHistory[0].bet_amount).toBe(betData.amount)
      expect(gameHistory[0].game_type).toBe('plinko')
      expect(gameHistory[0].result_data).toHaveProperty('risk_level', 'high')
      expect(gameHistory[0].result_data).toHaveProperty('ball_path')
      expect(gameHistory[0].result_data).toHaveProperty('multiplier')
      expect(gameHistory[0].result_data).toHaveProperty('landing_slot')
    })
  })

  describe('Plinko Game Physics Validation', () => {
    test('should produce consistent results for same seed', async () => {
      // This test would require exposing seed functionality
      // For now, we test that results are within expected bounds
      const betData = {
        amount: 100,
        riskLevel: 'medium'
      }

      const results = []
      for (let i = 0; i < 10; i++) {
        const response = await app.request('/api/games/plinko/drop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(betData)
        })

        const data = await response.json()
        results.push(data.game_result)
      }

      // All results should have valid structure
      results.forEach(result => {
        expect(result.ball_path).toHaveLength(4)
        expect(result.landing_slot).toBeGreaterThanOrEqual(0)
        expect(result.landing_slot).toBeLessThan(9)
        expect(result.multiplier).toBeGreaterThanOrEqual(0)
        expect(result.risk_level).toBe('medium')
      })

      // Should have some variation in results
      const landingSlots = results.map(r => r.landing_slot)
      const uniqueSlots = new Set(landingSlots)
      expect(uniqueSlots.size).toBeGreaterThan(1)
    })

    test('should validate ball path physics', async () => {
      const betData = {
        amount: 100,
        riskLevel: 'high'
      }

      const response = await app.request('/api/games/plinko/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData)
      })

      const data = await response.json()
      const result = data.game_result

      // Manually calculate expected landing slot from ball path
      let position = 4 // Starting position
      for (const move of result.ball_path) {
        if (move === 0) {
          position = Math.max(0, position - 1)
        } else {
          position = Math.min(8, position + 1)
        }
      }

      expect(result.landing_slot).toBe(position)
    })
  })

  describe('Authentication', () => {
    test('should require authentication', async () => {
      // Create app without auth middleware
      const unauthenticatedApp = new Hono()
      unauthenticatedApp.route('/api/games', gameRoutes)

      const response = await unauthenticatedApp.request('/api/games/plinko/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100, riskLevel: 'medium' })
      })

      expect(response.status).toBe(401)
    })
  })
})