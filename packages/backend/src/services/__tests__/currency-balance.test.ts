import { describe, test, expect, beforeEach, vi } from 'vitest'
import { CurrencyService } from '../currency'
import { UserService } from '../user-service'

vi.mock('../user-service', () => ({
  UserService: {
    getUserProfile: vi.fn(),
    getUserBalance: vi.fn(),
  }
}))

vi.mock('../appwrite-database', () => ({
  appwriteDb: {
    decrementDocumentAttribute: vi.fn(),
    incrementDocumentAttribute: vi.fn(),
    createDocument: vi.fn(),
    listDocuments: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
  }
}))

vi.mock('../cache-service', () => ({
  CacheService: {
    invalidateUserProfile: vi.fn(),
    invalidateUserBalance: vi.fn(),
    invalidateUserStats: vi.fn(),
  }
}))

vi.mock('../game-service', () => ({
  GameService: {
    getGameStatistics: vi.fn(),
  }
}))

vi.mock('../../lib/sentry', () => ({
  Sentry: {},
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  startSpan: vi.fn((_opts: any, fn: any) => fn({ setAttribute: vi.fn(), setStatus: vi.fn() })),
}))

describe('CurrencyService - Balance Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('validateBalance should return valid for sufficient funds', async () => {
    vi.mocked(UserService.getUserBalance).mockResolvedValue(10000)

    const result = await CurrencyService.validateBalance('test-user', 5000)

    expect(result.isValid).toBe(true)
    expect(result.currentBalance).toBe(10000)
    expect(result.requiredAmount).toBe(5000)
    expect(result.shortfall).toBeUndefined()
  })

  test('validateBalance should return invalid for insufficient funds', async () => {
    vi.mocked(UserService.getUserBalance).mockResolvedValue(3000)

    const result = await CurrencyService.validateBalance('test-user', 5000)

    expect(result.isValid).toBe(false)
    expect(result.currentBalance).toBe(3000)
    expect(result.requiredAmount).toBe(5000)
    expect(result.shortfall).toBe(2000)
  })

  test('validateBalance should reject negative amounts', async () => {
    vi.mocked(UserService.getUserBalance).mockResolvedValue(10000)

    await expect(CurrencyService.validateBalance('test-user', -100)).rejects.toThrow('positive')
  })

  test('validateBalance should reject zero amounts', async () => {
    vi.mocked(UserService.getUserBalance).mockResolvedValue(10000)

    await expect(CurrencyService.validateBalance('test-user', 0)).rejects.toThrow('positive')
  })
})

describe('CurrencyService - Transaction Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('processGameTransaction should reject bet amount that would cause negative balance', async () => {
    vi.mocked(UserService.getUserProfile).mockResolvedValue({
      $id: 'profile-id',
      userId: 'test-user',
      username: 'testuser',
      balance: 5000,
      totalWagered: 0,
      totalWon: 0,
      gamesPlayed: 0,
      isModerator: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any)

    const { appwriteDb } = await import('../appwrite-database')
    vi.mocked(appwriteDb.decrementDocumentAttribute).mockResolvedValue({
      data: null,
      error: 'Insufficient balance'
    } as any)

    await expect(
      CurrencyService.processGameTransaction('test-user', 'roulette', 10000, 0, { test: true })
    ).rejects.toThrow()
  })

  test('processGameTransaction should prevent negative bet amounts', async () => {
    vi.mocked(UserService.getUserProfile).mockResolvedValue({
      userId: 'test-user',
      username: 'testuser',
      balance: 10000,
      totalWagered: 0,
      totalWon: 0,
      gamesPlayed: 0,
      isModerator: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any)

    await expect(
      CurrencyService.processGameTransaction('test-user', 'roulette', -100, 0, { test: true })
    ).rejects.toThrow('positive')
  })

  test('processGameTransaction should prevent negative win amounts', async () => {
    vi.mocked(UserService.getUserProfile).mockResolvedValue({
      userId: 'test-user',
      username: 'testuser',
      balance: 10000,
      totalWagered: 0,
      totalWon: 0,
      gamesPlayed: 0,
      isModerator: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any)

    await expect(
      CurrencyService.processGameTransaction('test-user', 'roulette', 1000, -100, { test: true })
    ).rejects.toThrow('cannot be negative')
  })
})

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('balance of exactly 0 should be valid', async () => {
    vi.mocked(UserService.getUserBalance).mockResolvedValue(0)

    const result = await CurrencyService.validateBalance('test-user', 100)

    expect(result.isValid).toBe(false)
    expect(result.currentBalance).toBe(0)
  })

  test('very small balance should work correctly', async () => {
    vi.mocked(UserService.getUserBalance).mockResolvedValue(1)

    const result = await CurrencyService.validateBalance('test-user', 1)

    expect(result.isValid).toBe(true)
    expect(result.currentBalance).toBe(1)
  })

  test('very large balance should work correctly', async () => {
    vi.mocked(UserService.getUserBalance).mockResolvedValue(999999999)

    const result = await CurrencyService.validateBalance('test-user', 1000000)

    expect(result.isValid).toBe(true)
    expect(result.currentBalance).toBe(999999999)
  })
})
