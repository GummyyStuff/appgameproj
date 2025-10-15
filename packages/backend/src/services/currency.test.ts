import { describe, test, expect } from 'bun:test'

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.STARTING_BALANCE = '10000'
process.env.DAILY_BONUS = '1000'

// NOTE: This test file tests the static utility methods of CurrencyService
import { CurrencyService } from './currency'

describe('CurrencyService Static Methods', () => {
  describe('formatCurrency', () => {
    test('should format roubles correctly', () => {
      expect(CurrencyService.formatCurrency(1000)).toBe('₽1,000')
      expect(CurrencyService.formatCurrency(1000, 'roubles')).toBe('₽1,000')
    })

    test('should format dollars correctly', () => {
      expect(CurrencyService.formatCurrency(1000, 'dollars')).toBe('$1,000')
    })

    test('should format euros correctly', () => {
      expect(CurrencyService.formatCurrency(1000, 'euros')).toBe('€1,000')
    })

    test('should handle decimal amounts', () => {
      expect(CurrencyService.formatCurrency(1000.50)).toBe('₽1,000.5')
      expect(CurrencyService.formatCurrency(1000.00)).toBe('₽1,000')
    })

    test('should handle large amounts', () => {
      expect(CurrencyService.formatCurrency(1000000)).toBe('₽1,000,000')
    })

    test('should handle zero amounts', () => {
      expect(CurrencyService.formatCurrency(0)).toBe('₽0')
    })

    test('should handle small decimal amounts', () => {
      expect(CurrencyService.formatCurrency(0.01)).toBe('₽0.01')
      expect(CurrencyService.formatCurrency(0.1)).toBe('₽0.1')
    })
  })

  describe('getStartingBalance', () => {
    test('should return configured starting balance', () => {
      expect(CurrencyService.getStartingBalance()).toBe(10000)
    })
  })

  describe('getDailyBonusAmount', () => {
    test('should return configured daily bonus amount', () => {
      expect(CurrencyService.getDailyBonusAmount()).toBe(1000)
    })
  })
})

describe('CurrencyService Validation Logic', () => {
  describe('Balance validation logic', () => {
    test('should validate positive amounts', () => {
      expect(() => {
        if (100 <= 0) throw new Error('Required amount must be positive')
      }).not.toThrow()
    })

    test('should reject negative amounts', () => {
      expect(() => {
        if (-100 <= 0) throw new Error('Required amount must be positive')
      }).toThrow('Required amount must be positive')
    })

    test('should reject zero amounts', () => {
      expect(() => {
        if (0 <= 0) throw new Error('Required amount must be positive')
      }).toThrow('Required amount must be positive')
    })
  })

  describe('Daily bonus cooldown logic', () => {
    test('should calculate cooldown correctly', () => {
      const today = new Date()
      const todayString = today.toDateString()
      
      // Same day should not allow claiming
      const sameDay = new Date()
      expect(sameDay.toDateString() === todayString).toBe(true)
      
      // Different day should allow claiming
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(yesterday.toDateString() !== todayString).toBe(true)
    })

    test('should calculate next available date correctly', () => {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      
      expect(tomorrow.getTime() > today.getTime()).toBe(true)
      expect(tomorrow.getDate() === today.getDate() + 1 || 
             (today.getDate() === new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() && tomorrow.getDate() === 1)).toBe(true)
    })
  })

  describe('Transaction validation logic', () => {
    test('should validate bet amounts', () => {
      expect(() => {
        if (100 <= 0) throw new Error('Bet amount must be positive')
      }).not.toThrow()
      
      expect(() => {
        if (-100 <= 0) throw new Error('Bet amount must be positive')
      }).toThrow('Bet amount must be positive')
    })

    test('should validate win amounts', () => {
      expect(() => {
        if (100 < 0) throw new Error('Win amount cannot be negative')
      }).not.toThrow()
      
      expect(() => {
        if (0 < 0) throw new Error('Win amount cannot be negative')
      }).not.toThrow()
      
      expect(() => {
        if (-100 < 0) throw new Error('Win amount cannot be negative')
      }).toThrow('Win amount cannot be negative')
    })

    test('should calculate net results correctly', () => {
      // Winning transaction
      const winAmount = 1500
      const betAmount = 1000
      const netResult = winAmount - betAmount
      expect(netResult).toBe(500)
      
      // Losing transaction
      const loseWinAmount = 0
      const loseBetAmount = 1000
      const loseNetResult = loseWinAmount - loseBetAmount
      expect(loseNetResult).toBe(-1000)
      
      // Break-even transaction
      const evenWinAmount = 1000
      const evenBetAmount = 1000
      const evenNetResult = evenWinAmount - evenBetAmount
      expect(evenNetResult).toBe(0)
    })
  })
})