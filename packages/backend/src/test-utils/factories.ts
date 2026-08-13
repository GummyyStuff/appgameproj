import { vi } from 'vitest'

export const createMockUser = (overrides = {}) => ({
  id: 'test-user-123',
  username: 'testuser',
  email: 'test@example.com',
  balance: 10000,
  created_at: '2024-01-01T00:00:00Z',
  last_login: '2024-01-15T10:00:00Z',
  daily_bonus_claimed_at: null,
  is_active: true,
  ...overrides,
})

export const createMockGameHistory = (overrides = {}) => ({
  id: 'game-123',
  user_id: 'test-user-123',
  game_type: 'wheel_of_chance',
  bet_amount: 100,
  win_amount: 200,
  result_data: {
    bet_type: 'red',
    bet_value: 'red',
    winning_number: 7,
    multiplier: 2,
  },
  created_at: '2024-01-15T10:00:00Z',
  ...overrides,
})

export const createMockApiResponse = <T>(data: T, success = true) => ({
  success,
  data,
  timestamp: new Date().toISOString(),
  ...(success ? {} : { error: 'Test error', message: 'Test error message' }),
})

export const createMockFunction = () => {
  return vi.fn()
}

export const createMockResolvedValue = <T>(value: T) => {
  return vi.fn().mockResolvedValue(value)
}

export const createMockRejectedValue = (error: Error) => {
  return vi.fn().mockRejectedValue(error)
}
