/**
 * Tests for GameValidator
 * Validates game result validation and payout verification
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GameValidator } from './game-validator'
import { GameBet } from './types'
import { RouletteResult, BlackjackResult, PlinkoResult } from '../../types/database'

describe('GameValidator', () => {
  let validator: GameValidator

  beforeEach(() => {
    validator = new GameValidator()
  })

  describe('validateGameResult', () => {
    describe('roulette validation', () => {
      it('should validate correct roulette result', () => {
        const result: RouletteResult = {
          bet_type: 'number',
          bet_value: 7,
          winning_number: 7,
          multiplier: 35
        }
        
        expect(validator.validateGameResult('roulette', result)).toBe(true)
      })

      it('should reject invalid winning number', () => {
        const result: RouletteResult = {
          bet_type: 'number',
          bet_value: 7,
          winning_number: 37, // Invalid (max is 36)
          multiplier: 35
        }
        
        expect(validator.validateGameResult('roulette', result)).toBe(false)
      })

      it('should reject invalid bet type', () => {
        const result: RouletteResult = {
          bet_type: 'invalid' as any,
          bet_value: 7,
          winning_number: 7,
          multiplier: 35
        }
        
        expect(validator.validateGameResult('roulette', result)).toBe(false)
      })

      it('should reject invalid multiplier', () => {
        const result: RouletteResult = {
          bet_type: 'number',
          bet_value: 7,
          winning_number: 7,
          multiplier: 100 // Too high
        }
        
        expect(validator.validateGameResult('roulette', result)).toBe(false)
      })

      it('should validate dozen bets', () => {
        const validResult: RouletteResult = {
          bet_type: 'dozen',
          bet_value: 2,
          winning_number: 15,
          multiplier: 2
        }
        
        const invalidResult: RouletteResult = {
          bet_type: 'dozen',
          bet_value: 4, // Invalid dozen
          winning_number: 15,
          multiplier: 2
        }
        
        expect(validator.validateGameResult('roulette', validResult)).toBe(true)
        expect(validator.validateGameResult('roulette', invalidResult)).toBe(false)
      })
    })

    describe('blackjack validation', () => {
      it('should validate correct blackjack result', () => {
        const result: BlackjackResult = {
          player_hand: [
            { suit: 'hearts', value: 'A' },
            { suit: 'spades', value: 'K' }
          ],
          dealer_hand: [
            { suit: 'diamonds', value: '10' },
            { suit: 'clubs', value: '7' }
          ],
          player_value: 21,
          dealer_value: 17,
          result: 'blackjack'
        }
        
        expect(validator.validateGameResult('blackjack', result)).toBe(true)
      })

      it('should reject missing hands', () => {
        const result: BlackjackResult = {
          player_hand: [],
          dealer_hand: [
            { suit: 'diamonds', value: '10' },
            { suit: 'clubs', value: '7' }
          ],
          result: 'player_win'
        }
        
        expect(validator.validateGameResult('blackjack', result)).toBe(false)
      })

      it('should reject invalid cards', () => {
        const result: BlackjackResult = {
          player_hand: [
            { suit: 'invalid' as any, value: 'A' },
            { suit: 'spades', value: 'K' }
          ],
          dealer_hand: [
            { suit: 'diamonds', value: '10' },
            { suit: 'clubs', value: '7' }
          ],
          result: 'player_win'
        }
        
        expect(validator.validateGameResult('blackjack', result)).toBe(false)
      })

      it('should reject invalid result type', () => {
        const result: BlackjackResult = {
          player_hand: [
            { suit: 'hearts', value: 'A' },
            { suit: 'spades', value: 'K' }
          ],
          dealer_hand: [
            { suit: 'diamonds', value: '10' },
            { suit: 'clubs', value: '7' }
          ],
          result: 'invalid' as any
        }
        
        expect(validator.validateGameResult('blackjack', result)).toBe(false)
      })

      it('should validate hand values when provided', () => {
        const correctResult: BlackjackResult = {
          player_hand: [
            { suit: 'hearts', value: '10' },
            { suit: 'spades', value: '7' }
          ],
          dealer_hand: [
            { suit: 'diamonds', value: '10' },
            { suit: 'clubs', value: '6' }
          ],
          player_value: 17,
          dealer_value: 16,
          result: 'player_win'
        }
        
        const incorrectResult: BlackjackResult = {
          player_hand: [
            { suit: 'hearts', value: '10' },
            { suit: 'spades', value: '7' }
          ],
          dealer_hand: [
            { suit: 'diamonds', value: '10' },
            { suit: 'clubs', value: '6' }
          ],
          player_value: 20, // Incorrect calculation
          dealer_value: 16,
          result: 'player_win'
        }
        
        expect(validator.validateGameResult('blackjack', correctResult)).toBe(true)
        expect(validator.validateGameResult('blackjack', incorrectResult)).toBe(false)
      })
    })

    describe('plinko validation', () => {
      it('should validate correct plinko result', () => {
        const result: PlinkoResult = {
          risk_level: 'medium',
          ball_path: [1, 1, 1, 1], // Path that leads to slot 8
          multiplier: 5.6, // Correct multiplier for medium risk slot 8
          landing_slot: 8
        }
        
        expect(validator.validateGameResult('plinko', result)).toBe(true)
      })

      it('should reject invalid risk level', () => {
        const result: PlinkoResult = {
          risk_level: 'invalid' as any,
          ball_path: [1, 0, 1, 1, 0, 1, 0, 1],
          multiplier: 2.1,
          landing_slot: 7
        }
        
        expect(validator.validateGameResult('plinko', result)).toBe(false)
      })

      it('should reject invalid ball path', () => {
        const result: PlinkoResult = {
          risk_level: 'medium',
          ball_path: [1, 0, 2, 1, 0, 1, 0, 1], // Contains invalid value (2)
          multiplier: 2.1,
          landing_slot: 7
        }
        
        expect(validator.validateGameResult('plinko', result)).toBe(false)
      })

      it('should reject invalid landing slot', () => {
        const result: PlinkoResult = {
          risk_level: 'medium',
          ball_path: [1, 0, 1, 1, 0, 1, 0, 1],
          multiplier: 2.1,
          landing_slot: 9 // Invalid (max is 8)
        }
        
        expect(validator.validateGameResult('plinko', result)).toBe(false)
      })

      it('should validate multiplier matches slot', () => {
        const correctResult: PlinkoResult = {
          risk_level: 'low',
          ball_path: [0, 0, 0, 0, 0, 0, 0, 0], // Should land in slot 0
          multiplier: 1.5, // Correct multiplier for low risk slot 0
          landing_slot: 0
        }
        
        const incorrectResult: PlinkoResult = {
          risk_level: 'low',
          ball_path: [0, 0, 0, 0, 0, 0, 0, 0], // Should land in slot 0
          multiplier: 2.0, // Incorrect multiplier for low risk slot 0
          landing_slot: 0
        }
        
        expect(validator.validateGameResult('plinko', correctResult)).toBe(true)
        expect(validator.validateGameResult('plinko', incorrectResult)).toBe(false)
      })
    })

    it('should reject invalid game types', () => {
      const result = {} as any
      expect(validator.validateGameResult('invalid', result)).toBe(false)
    })
  })

  describe('validatePayout', () => {
    it('should validate correct roulette payout', () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }
      
      const result: RouletteResult = {
        bet_type: 'number',
        bet_value: 7,
        winning_number: 7,
        multiplier: 35
      }
      
      const payout = 3500 // 100 * 35
      expect(validator.validatePayout(bet, result, payout)).toBe(true)
    })

    it('should validate correct blackjack payout', () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'blackjack'
      }
      
      const result: BlackjackResult = {
        player_hand: [
          { suit: 'hearts', value: 'A' },
          { suit: 'spades', value: 'K' }
        ],
        dealer_hand: [
          { suit: 'diamonds', value: '10' },
          { suit: 'clubs', value: '7' }
        ],
        result: 'blackjack'
      }
      
      const payout = 150 // 100 * 1.5
      expect(validator.validatePayout(bet, result, payout)).toBe(true)
    })

    it('should validate correct plinko payout', () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'plinko'
      }
      
      const result: PlinkoResult = {
        risk_level: 'medium',
        ball_path: [1, 0, 1, 1, 0, 1, 0, 1],
        multiplier: 2.1,
        landing_slot: 7
      }
      
      const payout = 210 // 100 * 2.1
      expect(validator.validatePayout(bet, result, payout)).toBe(true)
    })

    it('should reject incorrect payouts', () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'roulette'
      }
      
      const result: RouletteResult = {
        bet_type: 'number',
        bet_value: 7,
        winning_number: 7,
        multiplier: 35
      }
      
      const incorrectPayout = 1000 // Should be 3500
      expect(validator.validatePayout(bet, result, incorrectPayout)).toBe(false)
    })

    it('should handle floating point precision', () => {
      const bet: GameBet = {
        userId: 'user1',
        amount: 100,
        gameType: 'plinko'
      }
      
      const result: PlinkoResult = {
        risk_level: 'low',
        ball_path: [1, 0, 1, 1, 0, 1, 0, 1],
        multiplier: 1.1,
        landing_slot: 6
      }
      
      const payout = 110.001 // Very close to correct (110)
      expect(validator.validatePayout(bet, result, payout)).toBe(true)
    })
  })

  describe('validateBetAmount', () => {
    it('should validate correct bet amounts', () => {
      expect(validator.validateBetAmount(100, 1000)).toBe(true)
      expect(validator.validateBetAmount(1, 1000)).toBe(true)
      expect(validator.validateBetAmount(1000, 1000)).toBe(true)
    })

    it('should reject invalid bet amounts', () => {
      expect(validator.validateBetAmount(0, 1000)).toBe(false) // Zero bet
      expect(validator.validateBetAmount(-10, 1000)).toBe(false) // Negative bet
      expect(validator.validateBetAmount(1001, 1000)).toBe(false) // Exceeds balance
      expect(validator.validateBetAmount(10001, 20000)).toBe(false) // Exceeds max bet
      expect(validator.validateBetAmount(0.5, 1000)).toBe(false) // Non-integer
    })
  })

  describe('validateGameStateConsistency', () => {
    it('should validate consistent game state', () => {
      const result: RouletteResult = {
        bet_type: 'red',
        bet_value: 'red',
        winning_number: 1, // Red number
        multiplier: 1
      }
      
      const isValid = validator.validateGameStateConsistency('roulette', 100, result, 100)
      expect(isValid).toBe(true)
    })

    it('should reject inconsistent game state', () => {
      const result: RouletteResult = {
        bet_type: 'red',
        bet_value: 'red',
        winning_number: 2, // Black number
        multiplier: 1
      }
      
      const isValid = validator.validateGameStateConsistency('roulette', 100, result, 100)
      expect(isValid).toBe(false)
    })
  })
})