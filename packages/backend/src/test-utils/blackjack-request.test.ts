import { describe, it, expect } from 'bun:test'
import { z } from 'zod'

// Replicate the exact validation schema used in the games route
const commonSchemas = {
  gameId: z.string().min(10).max(200).regex(/^[a-zA-Z0-9\-_]+$/, 'Invalid game ID format'),
  blackjackAction: z.enum(['hit', 'stand', 'double', 'split'])
}

const blackjackActionSchema = z.object({
  gameId: commonSchemas.gameId,
  action: commonSchemas.blackjackAction,
  handIndex: z.number().int().min(0).max(3).optional()
})

describe('Blackjack Request Validation', () => {
  it('should validate the exact request from frontend', () => {
    // This is the exact request format from the frontend logs
    const frontendRequest = {
      gameId: "blackjack-1758476684395-c6e8eac9-9398-40f0-a366-07b521d8d433",
      action: "hit",
      handIndex: 0
    }

    // This should not throw
    expect(() => blackjackActionSchema.parse(frontendRequest)).not.toThrow()
    
    const result = blackjackActionSchema.parse(frontendRequest)
    expect(result.gameId).toBe(frontendRequest.gameId)
    expect(result.action).toBe('hit')
    expect(result.handIndex).toBe(0)
  })

  it('should handle optional handIndex', () => {
    const requestWithoutHandIndex = {
      gameId: "blackjack-1758476684395-c6e8eac9-9398-40f0-a366-07b521d8d433",
      action: "stand"
    }

    expect(() => blackjackActionSchema.parse(requestWithoutHandIndex)).not.toThrow()
    
    const result = blackjackActionSchema.parse(requestWithoutHandIndex)
    expect(result.handIndex).toBeUndefined()
  })

  it('should validate all blackjack actions', () => {
    const actions = ['hit', 'stand', 'double', 'split'] as const
    
    actions.forEach(action => {
      const request = {
        gameId: "blackjack-1758476684395-c6e8eac9-9398-40f0-a366-07b521d8d433",
        action,
        handIndex: 0
      }
      
      expect(() => blackjackActionSchema.parse(request)).not.toThrow()
    })
  })

  it('should reject invalid actions', () => {
    const invalidRequest = {
      gameId: "blackjack-1758476684395-c6e8eac9-9398-40f0-a366-07b521d8d433",
      action: "invalid_action",
      handIndex: 0
    }

    expect(() => blackjackActionSchema.parse(invalidRequest)).toThrow()
  })

  it('should reject invalid handIndex', () => {
    const invalidRequest = {
      gameId: "blackjack-1758476684395-c6e8eac9-9398-40f0-a366-07b521d8d433",
      action: "hit",
      handIndex: -1  // Invalid: below minimum
    }

    expect(() => blackjackActionSchema.parse(invalidRequest)).toThrow()

    const invalidRequest2 = {
      gameId: "blackjack-1758476684395-c6e8eac9-9398-40f0-a366-07b521d8d433",
      action: "hit",
      handIndex: 4  // Invalid: above maximum
    }

    expect(() => blackjackActionSchema.parse(invalidRequest2)).toThrow()
  })
})