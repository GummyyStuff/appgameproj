import { vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

export const createMockQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export const createMockAuthContext = (overrides = {}) => ({
  user: { id: 'test-user', email: 'test@example.com' },
  session: { access_token: 'test-token' },
  loading: false,
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  ...overrides,
})

export const createMockBalanceHook = (balance = 1000) => ({
  balance,
  refetch: vi.fn(),
  isLoading: false,
  error: null,
})

export const createMockSoundEffects = () => ({
  playBetSound: vi.fn(),
  playWinSound: vi.fn(),
  playLoseSound: vi.fn(),
  playSpinSound: vi.fn(),
  playCardSound: vi.fn(),
  setVolume: vi.fn(),
  toggleMute: vi.fn(),
  isMuted: false,
})

export const createMockWheelResponse = (overrides = {}) => ({
  success: true,
  gameId: 'test-game-123',
  result: {
    winning_segment: 3,
    segment_type: 'multiplier',
    multiplier: 2,
    total_bet: 100,
    total_win: 200,
    special_triggered: null,
  },
  balance: 1100,
  timestamp: '2024-01-15T10:00:00Z',
  ...overrides,
})

export const createMockBlackjackResponse = (overrides = {}) => ({
  success: true,
  gameId: 'test-game-123',
  gameState: {
    player_hand: [
      { suit: 'hearts', value: 'K' },
      { suit: 'spades', value: '7' },
    ],
    dealer_hand: [
      { suit: 'diamonds', value: 'A' },
      { suit: 'clubs', value: 'hidden' },
    ],
    player_value: 17,
    dealer_value: 11,
    status: 'playing',
    actions: ['hit', 'stand'],
  },
  balance: 900,
  timestamp: '2024-01-15T10:00:00Z',
  ...overrides,
})

export const createMockUserProfile = (overrides = {}) => ({
  $id: 'profile-id-123',
  userId: 'test-user-123',
  username: 'testplayer',
  displayName: 'Test Player',
  balance: 5000,
  totalWagered: 1000,
  totalWon: 1200,
  gamesPlayed: 50,
  isModerator: false,
  avatarPath: 'default.png',
  chatRulesVersion: 1,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})
