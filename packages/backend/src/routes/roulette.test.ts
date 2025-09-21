/**
 * Roulette API Integration Tests
 * Tests for roulette game API endpoints including authentication, validation, and game flow
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { Hono } from 'hono'
import { RouletteGame } from '../services/game-engine/roulette-game'

describe('Roulette API Endpoints', () => {
  let app: Hono
  let mockCurrencyService: any

  beforeEach(() => {
    app = new Hono()
    
    // Mock currency service
    mockCurrencyService = {
      getBalance: mock(() => Promise.resolve(1000)),
      processGameTransaction: mock(() => Promise.resolve({
        success: true,
        new_balance: 900,
        previous_balance: 1000,
        bet_amount: 100,
        win_amount: 0
      }))
    }

    // Mock auth middleware
    app.use('*', (c, next) => {
      c.set('user', { id: 'test-user-123', email: 'test@example.com' })
      return next()
    })

    // Roulette info endpoint
    app.get('/roulette', async (c) => {
      return c.json({
        message: 'Roulette game information',
        bet_types: RouletteGame.getBetTypes(),
        wheel_layout: RouletteGame.getWheelLayout(),
        min_bet: 1,
        max_bet: 10000
      })
    })

    // Roulette bet endpoint
    app.post('/roulette/bet', async (c) => {
      const user = c.get('user')
      if (!user) {
        return c.json({ error: 'Authentication required' }, 401)
      }

      const body = await c.req.json()
      const { amount, betType, betValue } = body

      // Validate input
      if (amount === undefined || !betType || betValue === undefined) {
        return c.json({ error: 'Missing required fields: amount, betType, betValue' }, 400)
      }

      // Validate bet amount
      if (typeof amount !== 'number' || amount <= 0 || amount > 10000) {
        return c.json({ error: 'Invalid bet amount' }, 400)
      }

      // Check user balance
      const balance = await mockCurrencyService.getBalance()
      if (balance < amount) {
        return c.json({ error: 'Insufficient balance' }, 400)
      }

      try {
        // Create roulette game
        const rouletteGame = new RouletteGame()

        // Create bet object
        const bet = {
          userId: user.id,
          amount,
          gameType: 'roulette' as const,
          betType,
          betValue
        }

        // Play the game
        const result = await rouletteGame.play(bet)

        if (!result.success) {
          return c.json({ error: result.error || 'Game failed' }, 400)
        }

        // Process transaction
        const transactionResult = await mockCurrencyService.processGameTransaction()

        if (!transactionResult.success) {
          return c.json({ error: 'Transaction failed' }, 500)
        }

        const gameId = `roulette-${Date.now()}-${user.id}`

        return c.json({
          success: true,
          game_result: result.resultData,
          bet_amount: amount,
          win_amount: result.winAmount,
          net_result: result.winAmount - amount,
          new_balance: transactionResult.new_balance,
          game_id: gameId
        })
      } catch (error) {
        console.error('Roulette bet error:', error)
        return c.json({ error: 'Internal server error' }, 500)
      }
    })

    // Reset mocks
    mockCurrencyService.getBalance.mockClear()
    mockCurrencyService.processGameTransaction.mockClear()
  })

  describe('GET /roulette', () => {
    it('should return roulette game information', async () => {
      const res = await app.request('/roulette')
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.message).toBe('Roulette game information')
      expect(data.bet_types).toBeDefined()
      expect(data.wheel_layout).toBeDefined()
      expect(data.min_bet).toBe(1)
      expect(data.max_bet).toBe(10000)

      // Check bet types structure
      expect(data.bet_types.number).toBeDefined()
      expect(data.bet_types.red).toBeDefined()
      expect(data.bet_types.black).toBeDefined()

      // Check wheel layout structure
      expect(Array.isArray(data.wheel_layout)).toBe(true)
      expect(data.wheel_layout.length).toBe(37)
      expect(data.wheel_layout[0]).toEqual({
        number: 0,
        color: 'green'
      })
    })
  })

  describe('POST /roulette/bet', () => {
    it('should successfully place a valid roulette bet', async () => {
      const betData = {
        amount: 100,
        betType: 'red',
        betValue: 'red'
      }

      const res = await app.request('/roulette/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData)
      })

      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.game_result).toBeDefined()
      expect(data.bet_amount).toBe(100)
      expect(typeof data.win_amount).toBe('number')
      expect(typeof data.net_result).toBe('number')
      expect(data.new_balance).toBe(900)
      expect(data.game_id).toBeDefined()

      // Verify currency service was called
      expect(mockCurrencyService.getBalance).toHaveBeenCalled()
      expect(mockCurrencyService.processGameTransaction).toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      const invalidBets = [
        {}, // Missing all fields
        { amount: 100 }, // Missing betType and betValue
        { amount: 100, betType: 'red' }, // Missing betValue
        { betType: 'red', betValue: 'red' }, // Missing amount
      ]

      for (const betData of invalidBets) {
        const res = await app.request('/roulette/bet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(betData)
        })

        const data = await res.json()
        expect(res.status).toBe(400)
        expect(data.error).toBe('Missing required fields: amount, betType, betValue')
      }
    })

    it('should validate bet amounts', async () => {
      const invalidAmounts = [-10, 0, 10001]

      for (const amount of invalidAmounts) {
        const betData = {
          amount,
          betType: 'red',
          betValue: 'red'
        }

        const res = await app.request('/roulette/bet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(betData)
        })

        const data = await res.json()
        expect(res.status).toBe(400)
        expect(data.error).toBe('Invalid bet amount')
      }
    })

    it('should reject bets with insufficient balance', async () => {
      // Mock insufficient balance
      mockCurrencyService.getBalance.mockResolvedValueOnce(50)

      const betData = {
        amount: 100,
        betType: 'red',
        betValue: 'red'
      }

      const res = await app.request('/roulette/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData)
      })

      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('Insufficient balance')
      expect(mockCurrencyService.processGameTransaction).not.toHaveBeenCalled()
    })

    it('should handle different bet types correctly', async () => {
      const betTypes = [
        { betType: 'number', betValue: 17 },
        { betType: 'red', betValue: 'red' },
        { betType: 'black', betValue: 'black' }
      ]

      for (const { betType, betValue } of betTypes) {
        const betData = {
          amount: 100,
          betType,
          betValue
        }

        const res = await app.request('/roulette/bet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(betData)
        })

        const data = await res.json()
        expect(res.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.game_result.bet_type).toBe(betType)
        expect(data.game_result.bet_value).toBe(betValue)
      }
    })

    it('should validate winning number range in game results', async () => {
      const betData = {
        amount: 100,
        betType: 'red',
        betValue: 'red'
      }

      const res = await app.request('/roulette/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData)
      })

      const data = await res.json()
      expect(res.status).toBe(200)
      expect(data.game_result.winning_number).toBeGreaterThanOrEqual(0)
      expect(data.game_result.winning_number).toBeLessThanOrEqual(36)
      expect(Number.isInteger(data.game_result.winning_number)).toBe(true)
    })
  })
})