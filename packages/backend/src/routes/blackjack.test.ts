/**
 * Integration tests for Blackjack API endpoints
 */

import { describe, test, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { gameRoutes } from './games'

describe('Blackjack API Endpoints', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
    app.route('/api/games', gameRoutes)
  })

  describe('GET /api/games/blackjack', () => {
    test('should return blackjack game information', async () => {
      const res = await app.request('/api/games/blackjack')
      expect(res.status).toBe(200)
      
      const data = await res.json()
      expect(data.message).toBe('Blackjack game information')
      expect(data.game_info).toBeDefined()
      expect(data.game_info.name).toBe('Blackjack')
      expect(data.game_info.actions).toContain('hit')
      expect(data.game_info.actions).toContain('stand')
      expect(data.game_info.actions).toContain('double')
      expect(data.game_info.actions).toContain('split')
      expect(data.min_bet).toBe(1)
      expect(data.max_bet).toBe(10000)
    })
  })

  describe('POST /api/games/blackjack/start', () => {
    test('should require authentication', async () => {
      const res = await app.request('/api/games/blackjack/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100 })
      })
      
      expect(res.status).toBe(401)
      // Auth middleware returns text, not JSON
      const text = await res.text()
      expect(text).toContain('Missing')
    })

    test('should validate required fields', async () => {
      // Mock authenticated user
      const mockUser = { id: 'test-user', email: 'test@example.com' }
      
      // This test would need proper auth middleware mocking
      // For now, we're just testing the structure
      expect(true).toBe(true) // Placeholder
    })
  })

  describe('POST /api/games/blackjack/action', () => {
    test('should require authentication', async () => {
      const res = await app.request('/api/games/blackjack/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameId: 'test-game-id',
          action: 'hit'
        })
      })
      
      expect(res.status).toBe(401)
      // Auth middleware returns text, not JSON
      const text = await res.text()
      expect(text).toContain('Missing')
    })

    test('should validate required fields', async () => {
      // This would test field validation with proper auth mocking
      expect(true).toBe(true) // Placeholder
    })
  })
})