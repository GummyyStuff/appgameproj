import { describe, test, expect } from 'bun:test'
import { z } from 'zod'

// Test the updated gameId validation schema
const gameIdSchema = z.string().min(10).max(200).regex(/^[a-zA-Z0-9\-_]+$/, 'Invalid game ID format')

describe('Blackjack Game ID Validation', () => {
  test('should accept blackjack game ID format', () => {
    const blackjackGameId = 'blackjack-1758476684395-c6e8eac9-9398-40f0-a366-07b521d8d433'
    
    expect(() => gameIdSchema.parse(blackjackGameId)).not.toThrow()
    
    const result = gameIdSchema.parse(blackjackGameId)
    expect(result).toBe(blackjackGameId)
  })

  test('should accept other game ID formats', () => {
    const validGameIds = [
      'roulette-123456789-user-id',
      'blackjack-987654321-another-user',
      'game_id_with_underscores',
      'simple-game-id',
      'a1b2c3d4e5f6'
    ]

    validGameIds.forEach(gameId => {
      expect(() => gameIdSchema.parse(gameId)).not.toThrow()
    })
  })

  test('should reject invalid game ID formats', () => {
    const invalidGameIds = [
      'short',  // too short
      'game id with spaces',  // contains spaces
      'game@id#with$special%chars',  // special characters
      'game/id\\with/slashes',  // slashes
      '',  // empty
      'a'.repeat(201)  // too long
    ]

    invalidGameIds.forEach(gameId => {
      expect(() => gameIdSchema.parse(gameId)).toThrow()
    })
  })

  test('should work with blackjack action schema', () => {
    const blackjackActionSchema = z.object({
      gameId: gameIdSchema,
      action: z.enum(['hit', 'stand', 'double', 'split']),
      handIndex: z.number().int().min(0).max(3).optional()
    })

    const validAction = {
      gameId: 'blackjack-1758476684395-c6e8eac9-9398-40f0-a366-07b521d8d433',
      action: 'hit' as const,
      handIndex: 0
    }

    expect(() => blackjackActionSchema.parse(validAction)).not.toThrow()
    
    const result = blackjackActionSchema.parse(validAction)
    expect(result.gameId).toBe(validAction.gameId)
    expect(result.action).toBe('hit')
    expect(result.handIndex).toBe(0)
  })
})