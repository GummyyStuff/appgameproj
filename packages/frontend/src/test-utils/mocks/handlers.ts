import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

export const handlers = [
  http.post('/api/auth/register', () => {
    return HttpResponse.json({
      success: true,
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        username: 'testuser',
      },
      token: 'test-jwt-token',
    })
  }),

  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      success: true,
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        username: 'testuser',
      },
      token: 'test-jwt-token',
    })
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
  }),

  http.get('/api/user/profile', () => {
    return HttpResponse.json({
      success: true,
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        username: 'testuser',
        balance: 10000,
      },
    })
  }),

  http.get('/api/games/wheel-of-chance', () => {
    return HttpResponse.json({
      message: 'Wheel of Chance game information',
      wheel_layout: [
        { index: 0, type: 'multiplier', label: '0x', multiplier: 0, color: '#4a4a4a', startAngle: 0, endAngle: 35, bettable: true }
      ],
      layout_signature: 'a'.repeat(64),
      min_bet: 1,
      max_bet: 10000
    })
  }),

  http.post('/api/games/wheel-of-chance/spin', () => {
    return HttpResponse.json({
      success: true,
      game_result: {
        wheel_layout: [],
        bets: [],
        winning_segment: 3,
        segment_type: 'multiplier',
        multiplier: 2,
        total_bet: 100,
        total_win: 200,
        special_triggered: null
      },
      bet_amount: 100,
      win_amount: 200,
      net_result: 100,
      new_balance: 10100,
      game_id: 'wheel-test-1'
    })
  }),
]

export const server = setupServer(...handlers)
