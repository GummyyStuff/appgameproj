import { describe, test, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'

const mockGetBalance = vi.fn()
const mockProcessGameTransaction = vi.fn()
const mockValidateBalance = vi.fn()
const mockGetCaseTypes = vi.fn()
const mockGetCaseType = vi.fn()
const mockGetItemPool = vi.fn()
const mockValidateCaseOpening = vi.fn()
const mockPreviewCase = vi.fn()
const mockOpenCase = vi.fn()
const mockGetCaseOpeningStats = vi.fn()
const mockHandleRouletteGameStart = vi.fn()
const mockHandleRouletteSpinStart = vi.fn()
const mockHandleRouletteGameComplete = vi.fn()
const mockHandleBalanceUpdate = vi.fn()
const mockAuditGamePlayStarted = vi.fn()
const mockAuditGameCompleted = vi.fn()
const mockGetInFlight = vi.fn()
const mockSetInFlight = vi.fn()

vi.mock('../middleware/auth', () => ({
  optionalAuthMiddleware: async (c: any, next: any) => {
    c.set('user', { id: 'test-user-123', email: 'test@example.com' })
    await next()
  },
  criticalAuthMiddleware: async (c: any, next: any) => {
    c.set('user', { id: 'test-user-123', email: 'test@example.com' })
    await next()
  },
  authMiddleware: async (c: any, next: any) => {
    c.set('user', { id: 'test-user-123', email: 'test@example.com' })
    await next()
  },
}))

vi.mock('../middleware/rate-limit', () => ({
  gameBetRateLimit: async (_c: any, next: any) => { await next() },
  apiRateLimit: async (_c: any, next: any) => { await next() },
}))

vi.mock('../middleware/audit', () => ({
  auditGame: () => async (_c: any, next: any) => { await next() },
  auditLog: {
    gamePlayStarted: (...args: any[]) => mockAuditGamePlayStarted(...args),
    gameCompleted: (...args: any[]) => mockAuditGameCompleted(...args),
  },
}))

vi.mock('../services/currency', () => ({
  CurrencyService: {
    getBalance: (...args: any[]) => mockGetBalance(...args),
    processGameTransaction: (...args: any[]) => mockProcessGameTransaction(...args),
    validateBalance: (...args: any[]) => mockValidateBalance(...args),
    formatCurrency: (amount: number) => `₽${amount}`,
  },
}))

vi.mock('../services/game-engine/wheel-of-chance-game', () => {
  class MockWheelOfChanceGame {
    static getSegmentCount() { return 10 }
    static getMultiplierPool() { return [0, 0.5, 1, 1.5, 2, 3, 5, 10, 50] }
    play = vi.fn().mockResolvedValue({
      success: true,
      winAmount: 200,
      resultData: {
        winning_segment: 3,
        segment_type: 'multiplier',
        multiplier: 2,
        total_bet: 100,
        total_win: 200,
        special_triggered: null,
        wheel_layout: [],
        bets: [],
        spin_sequence: [{ winning_segment: 3, segment_type: 'multiplier', multiplier: 2 }],
        environment_state: { type: 'clear_skies', spins_remaining: 2, modifiers: [] },
      },
    })
  }
  return { WheelOfChanceGame: MockWheelOfChanceGame }
})

vi.mock('../services/wheel-environment-state', () => ({
  wheelEnvironmentStateService: {
    getWheelEnvironment: vi.fn().mockResolvedValue({
      type: 'clear_skies',
      spins_remaining: 3,
      modifiers: [],
    }),
    saveWheelEnvironment: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../services/game-engine/wheel-layout', () => ({
  generateWheelLayout: vi.fn(() => [{ index: 0, type: 'multiplier', label: '0x', multiplier: 0, color: '#000', startAngle: 0, endAngle: 35, bettable: true }]),
  signWheelLayout: vi.fn(() => 'a'.repeat(64)),
  verifyWheelLayoutSignature: vi.fn(() => true),
  validateWheelLayout: vi.fn(() => true),
}))

vi.mock('../services/case-opening-appwrite', () => ({
  CaseOpeningService: {
    getCaseTypes: (...args: any[]) => mockGetCaseTypes(...args),
    getCaseType: (...args: any[]) => mockGetCaseType(...args),
    getItemPool: (...args: any[]) => mockGetItemPool(...args),
    validateCaseOpening: (...args: any[]) => mockValidateCaseOpening(...args),
    previewCase: (...args: any[]) => mockPreviewCase(...args),
    openCase: (...args: any[]) => mockOpenCase(...args),
    getCaseOpeningStats: (...args: any[]) => mockGetCaseOpeningStats(...args),
  },
}))

vi.mock('../services/realtime-game', () => ({
  realtimeGameService: {
    handleRouletteGameStart: (...args: any[]) => mockHandleRouletteGameStart(...args),
    handleRouletteSpinStart: (...args: any[]) => mockHandleRouletteSpinStart(...args),
    handleRouletteGameComplete: (...args: any[]) => mockHandleRouletteGameComplete(...args),
    handleBalanceUpdate: (...args: any[]) => mockHandleBalanceUpdate(...args),
  },
}))

vi.mock('../lib/sentry', () => ({
  Sentry: {
    addBreadcrumb: vi.fn(),
    captureMessage: vi.fn(),
    captureException: vi.fn(),
  },
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  startSpan: vi.fn().mockImplementation((_opts: any, fn: any) => {
    const mockSpan = {
      setAttribute: vi.fn(),
      setStatus: vi.fn(),
    }
    return fn(mockSpan)
  }),
}))

vi.mock('../config/appwrite', () => ({
  appwriteClient: {},
  validateSession: vi.fn(),
  SESSION_COOKIE_NAME: 'a_session_test',
}))

vi.mock('../services/request-deduplication', () => ({
  requestDeduplication: {
    getInFlight: (...args: any[]) => mockGetInFlight(...args),
    setInFlight: (...args: any[]) => mockSetInFlight(...args),
  },
}))

import { gameRoutes } from './games'
import { HTTPException } from 'hono/http-exception'

function createApp() {
  const app = new Hono()
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status)
    }
    return c.json({ error: 'Internal server error' }, 500)
  })
  app.route('/', gameRoutes)
  return app
}

describe('Games API', () => {
  let app: Hono

  beforeEach(() => {
    vi.clearAllMocks()
    app = createApp()
  })

  describe('GET /', () => {
    test('should return games overview', async () => {
      const res = await app.request('/')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.message).toBe('Tarkov Casino Games API')
      expect(data.available_games).toBeDefined()
      expect(data.available_games.wheel_of_chance).toBe('/api/games/wheel-of-chance')
      expect(data.status).toBe('Games API ready')
    })
  })

  describe('GET /wheel-of-chance', () => {
    test('should return the signed wheel layout and game information', async () => {
      const res = await app.request('/wheel-of-chance')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.message).toBe('Wheel of Chance game information')
      expect(data.wheel_layout).toBeDefined()
      expect(data.layout_signature).toBeDefined()
      expect(data.min_bet).toBe(1)
      expect(data.max_bet).toBe(10000)
    })
  })

  describe('POST /wheel-of-chance/spin', () => {
    const validLayout = [
      { index: 0, type: 'multiplier', label: '0x', multiplier: 0, color: '#4a4a4a', startAngle: 0, endAngle: 38.333333333333336, bettable: true },
      { index: 1, type: 'multiplier', label: '0.5x', multiplier: 0.5, color: '#6b7280', startAngle: 38.333333333333336, endAngle: 76.66666666666667, bettable: true },
      { index: 2, type: 'multiplier', label: '1x', multiplier: 1, color: '#3b82f6', startAngle: 76.66666666666667, endAngle: 115, bettable: true },
      { index: 3, type: 'multiplier', label: '1.5x', multiplier: 1.5, color: '#8b5cf6', startAngle: 115, endAngle: 153.33333333333334, bettable: true },
      { index: 4, type: 'multiplier', label: '2x', multiplier: 2, color: '#10b981', startAngle: 153.33333333333334, endAngle: 191.66666666666669, bettable: true },
      { index: 5, type: 'multiplier', label: '3x', multiplier: 3, color: '#f59e0b', startAngle: 191.66666666666669, endAngle: 230, bettable: true },
      { index: 6, type: 'multiplier', label: '5x', multiplier: 5, color: '#ef4444', startAngle: 230, endAngle: 268.33333333333337, bettable: true },
      { index: 7, type: 'multiplier', label: '10x', multiplier: 10, color: '#ec4899', startAngle: 268.33333333333337, endAngle: 306.6666666666667, bettable: true },
      { index: 8, type: 'multiplier', label: '50x', multiplier: 50, color: '#fbbf24', startAngle: 306.6666666666667, endAngle: 345, bettable: true },
      { index: 9, type: 'bonus_wheel', label: 'BONUS', multiplier: 0, color: '#fbbf24', startAngle: 345, endAngle: 360, bettable: false }
    ]

    test('should return 400 when bet amount exceeds balance', async () => {
      mockGetBalance.mockResolvedValue(50)

      const res = await app.request('/wheel-of-chance/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 100,
          bets: [{ segmentIndex: 0, amount: 100 }],
          wheel_layout: validLayout,
          layout_signature: 'a'.repeat(64),
        }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Insufficient balance')
    })

    test('should return 400 when the layout signature is invalid', async () => {
      const { verifyWheelLayoutSignature } = await import('../services/game-engine/wheel-layout')
      ;(verifyWheelLayoutSignature as any).mockReturnValueOnce(false)
      mockGetBalance.mockResolvedValue(10000)

      const res = await app.request('/wheel-of-chance/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 100,
          bets: [{ segmentIndex: 0, amount: 100 }],
          wheel_layout: validLayout,
          layout_signature: 'bad'.repeat(32),
        }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('signature')
    })

    test('should return 400 when bets do not sum to the declared amount', async () => {
      mockGetBalance.mockResolvedValue(10000)

      const res = await app.request('/wheel-of-chance/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 500,
          bets: [{ segmentIndex: 0, amount: 100 }],
          wheel_layout: validLayout,
          layout_signature: 'a'.repeat(64),
        }),
      })

      expect(res.status).toBe(400)
    })

    test('should return 400 when validation fails', async () => {
      const res = await app.request('/wheel-of-chance/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    test('should successfully complete a spin with sufficient balance', async () => {
      mockGetBalance.mockResolvedValue(10000)
      mockProcessGameTransaction.mockResolvedValue({
        success: true,
        newBalance: 9900,
        previousBalance: 10000,
      })
      mockHandleBalanceUpdate.mockResolvedValue(undefined)
      mockAuditGamePlayStarted.mockResolvedValue(undefined)
      mockAuditGameCompleted.mockResolvedValue(undefined)

      const res = await app.request('/wheel-of-chance/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 100,
          bets: [{ segmentIndex: 0, amount: 100 }],
          wheel_layout: validLayout,
          layout_signature: 'a'.repeat(64),
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.bet_amount).toBe(100)
      expect(data.new_balance).toBe(9900)
      expect(data.game_id).toBeDefined()
    })
  })

  describe('GET /cases', () => {
    test('should return case types', async () => {
      mockGetCaseTypes.mockResolvedValue([
        { id: 'case-1', name: 'Basic Case', price: 100 },
      ])

      const res = await app.request('/cases')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.message).toBe('Case opening game information')
      expect(data.case_types).toHaveLength(1)
      expect(data.total_cases).toBe(1)
    })

    test('should return 500 when fetching case types fails', async () => {
      mockGetCaseTypes.mockRejectedValue(new Error('DB error'))

      const res = await app.request('/cases')
      expect(res.status).toBe(500)
    })
  })

  describe('GET /cases/:caseTypeId', () => {
    test('should return case type details', async () => {
      mockGetCaseType.mockResolvedValue({ id: 'case-1', name: 'Basic Case', price: 100 })
      mockGetItemPool.mockResolvedValue([
        { id: 'item-1', name: 'Item 1', rarity: 'common' },
      ])

      const res = await app.request('/cases/case-1')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.case_type.id).toBe('case-1')
      expect(data.item_pool).toHaveLength(1)
      expect(data.total_items).toBe(1)
    })

    test('should return 404 when case type not found', async () => {
      mockGetCaseType.mockResolvedValue(null)

      const res = await app.request('/cases/nonexistent')
      expect(res.status).toBe(404)
    })
  })

  describe('POST /cases/open', () => {
    test('should return error when validation fails', async () => {
      const res = await app.request('/cases/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    test('should return 400 when case opening validation fails', async () => {
      mockValidateCaseOpening.mockResolvedValue({
        isValid: false,
        error: 'Case type not found',
      })

      const res = await app.request('/cases/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseTypeId: 'invalid-case' }),
      })

      expect(res.status).toBe(400)
    })

    test('should return preview when previewOnly is true', async () => {
      mockValidateCaseOpening.mockResolvedValue({
        isValid: true,
        caseType: { id: 'case-1', name: 'Basic Case', price: 100 },
      })
      mockPreviewCase.mockResolvedValue({
        item_won: { id: 'item-1', name: 'Item 1', rarity: 'common' },
        currency_awarded: 150,
        opening_id: 'preview-1',
        timestamp: '2024-01-15T10:00:00Z',
      })

      const res = await app.request('/cases/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseTypeId: 'case-1', previewOnly: true }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.preview).toBe(true)
      expect(data.opening_result).toBeDefined()
    })

    test('should return 400 when balance is insufficient', async () => {
      mockValidateCaseOpening.mockResolvedValue({
        isValid: true,
        caseType: { id: 'case-1', name: 'Basic Case', price: 100 },
      })
      mockValidateBalance.mockResolvedValue({
        isValid: false,
        currentBalance: 50,
      })

      const res = await app.request('/cases/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseTypeId: 'case-1' }),
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /cases/stats/:userId?', () => {
    test('should return case opening stats', async () => {
      mockGetCaseOpeningStats.mockResolvedValue({
        totalOpenings: 10,
        totalSpent: 1000,
        totalWon: 1500,
      })

      const res = await app.request('/cases/stats/test-user-123')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.stats).toBeDefined()
    })
  })
})
