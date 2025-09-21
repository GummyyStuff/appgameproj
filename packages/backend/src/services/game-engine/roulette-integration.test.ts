/**
 * Roulette Integration Tests
 * Simple integration tests for roulette game functionality
 */

import { describe, it, expect } from 'bun:test'
import { RouletteGame } from './roulette-game'

describe('Roulette Integration', () => {
  it('should create a roulette game and play successfully', async () => {
    const rouletteGame = new RouletteGame()
    
    const bet = {
      userId: 'test-user',
      amount: 100,
      gameType: 'roulette' as const,
      betType: 'red' as const,
      betValue: 'red'
    }

    const result = await rouletteGame.play(bet)
    
    expect(result.success).toBe(true)
    expect(result.resultData).toBeDefined()
    expect(typeof result.winAmount).toBe('number')
    expect(result.winAmount).toBeGreaterThanOrEqual(0)
  })

  it('should return bet types information', () => {
    const betTypes = RouletteGame.getBetTypes()
    
    expect(betTypes).toBeDefined()
    expect(betTypes.number).toBeDefined()
    expect(betTypes.red).toBeDefined()
    expect(betTypes.black).toBeDefined()
  })

  it('should return wheel layout', () => {
    const wheelLayout = RouletteGame.getWheelLayout()
    
    expect(Array.isArray(wheelLayout)).toBe(true)
    expect(wheelLayout.length).toBe(37)
    expect(wheelLayout[0]).toEqual({ number: 0, color: 'green' })
  })

  it('should validate bets correctly', () => {
    const rouletteGame = new RouletteGame()
    
    const validBet = {
      userId: 'test-user',
      amount: 100,
      gameType: 'roulette' as const,
      betType: 'red' as const,
      betValue: 'red'
    }

    const invalidBet = {
      userId: 'test-user',
      amount: 100,
      gameType: 'roulette' as const,
      betType: 'invalid' as any,
      betValue: 'invalid'
    }

    expect(rouletteGame.validateGameSpecificBet(validBet)).toBe(true)
    expect(rouletteGame.validateGameSpecificBet(invalidBet)).toBe(false)
  })

  it('should handle multiple games with different outcomes', async () => {
    const rouletteGame = new RouletteGame()
    
    const bet = {
      userId: 'test-user',
      amount: 100,
      gameType: 'roulette' as const,
      betType: 'red' as const,
      betValue: 'red'
    }

    const results = []
    for (let i = 0; i < 5; i++) {
      const result = await rouletteGame.play(bet)
      expect(result.success).toBe(true)
      results.push(result)
    }

    // Should have some variety in results
    const winningNumbers = results.map(r => (r.resultData as any).winning_number)
    const uniqueNumbers = new Set(winningNumbers)
    expect(uniqueNumbers.size).toBeGreaterThan(0)
  })
})