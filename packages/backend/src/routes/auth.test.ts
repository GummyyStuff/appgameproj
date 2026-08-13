import { describe, test, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'

const mockValidateSession = vi.fn()
const mockAppwriteLogout = vi.fn()
const mockGetUserProfile = vi.fn()
const mockCreateUserProfile = vi.fn()
const mockRetryAppwriteOperation = vi.fn()
const mockUsersGet = vi.fn()

vi.mock('../config/appwrite', () => ({
  validateSession: (...args: any[]) => mockValidateSession(...args),
  logout: (...args: any[]) => mockAppwriteLogout(...args),
  SESSION_COOKIE_NAME: 'a_session_test',
  SESSION_MAX_AGE: 604800,
  appwriteClient: {},
}))

vi.mock('../middleware/rate-limit', () => ({
  authRateLimit: async (_c: any, next: any) => { await next() },
}))

vi.mock('../services/user-service', () => ({
  UserService: {
    getUserProfile: (...args: any[]) => mockGetUserProfile(...args),
    createUserProfile: (...args: any[]) => mockCreateUserProfile(...args),
  },
}))

vi.mock('../utils/appwrite-retry', () => ({
  retryAppwriteOperation: (...args: any[]) => mockRetryAppwriteOperation(...args),
}))

vi.mock('node-appwrite', () => {
  class MockUsers {
    get = (...args: any[]) => mockUsersGet(...args)
  }
  class MockAccount {
    createEmailPasswordSession = vi.fn()
  }
  class MockClient {
    setEndpoint() { return this }
    setProject() { return this }
    setKey() { return this }
  }
  return {
    Client: MockClient,
    Account: MockAccount,
    Users: MockUsers,
  }
})

import { authRoutes } from './auth'
import { HTTPException } from 'hono/http-exception'

function createApp() {
  const app = new Hono()
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status)
    }
    return c.json({ error: 'Internal server error' }, 500)
  })
  app.route('/', authRoutes)
  return app
}

describe('Auth API', () => {
  let app: Hono

  beforeEach(() => {
    vi.clearAllMocks()
    app = createApp()
    mockValidateSession.mockReset()
    mockAppwriteLogout.mockReset()
    mockGetUserProfile.mockReset()
    mockCreateUserProfile.mockReset()
    mockRetryAppwriteOperation.mockReset()
    mockUsersGet.mockReset()
  })

  describe('GET /me', () => {
    test('should return 401 when no session or header is provided', async () => {
      const res = await app.request('/me')
      expect(res.status).toBe(401)
    })

    test('should return user data when valid session cookie exists', async () => {
      mockValidateSession.mockResolvedValue({ id: 'user-123', provider: 'discord' })
      mockRetryAppwriteOperation.mockResolvedValue({
        email: 'test@example.com',
        name: 'Test User',
        prefs: {},
      })
      mockGetUserProfile.mockResolvedValue({
        username: 'testuser',
        displayName: 'Test User',
        balance: 10000,
        avatarPath: 'defaults/default-avatar.svg',
      })

      const res = await app.request('/me', {
        headers: {
          Cookie: 'a_session_test=valid-session-secret',
        },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe('user-123')
      expect(data.email).toBe('test@example.com')
      expect(data.username).toBe('testuser')
      expect(data.balance).toBe(10000)
    })

    test('should return user data when X-Appwrite-User-Id header is provided', async () => {
      mockRetryAppwriteOperation.mockResolvedValue({
        email: 'test@example.com',
        name: 'Test User',
        prefs: {},
      })
      mockGetUserProfile.mockResolvedValue({
        username: 'testuser',
        displayName: 'Test User',
        balance: 10000,
        avatarPath: 'defaults/default-avatar.svg',
      })

      const res = await app.request('/me', {
        headers: {
          'X-Appwrite-User-Id': 'user-123',
        },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe('user-123')
    })

    test('should create profile if none exists on first login', async () => {
      mockValidateSession.mockResolvedValue({ id: 'user-123', provider: 'discord' })
      mockRetryAppwriteOperation.mockResolvedValue({
        email: 'new@example.com',
        name: 'New User',
        prefs: {},
      })
      mockGetUserProfile.mockResolvedValue(null)
      mockCreateUserProfile.mockResolvedValue({
        username: 'New User',
        displayName: 'New User',
        balance: 10000,
        avatarPath: 'defaults/default-avatar.svg',
      })

      const res = await app.request('/me', {
        headers: {
          Cookie: 'a_session_test=valid-session-secret',
        },
      })

      expect(res.status).toBe(200)
      expect(mockCreateUserProfile).toHaveBeenCalled()
    })

    test('should return 401 when session validation fails', async () => {
      mockValidateSession.mockResolvedValue(null)

      const res = await app.request('/me', {
        headers: {
          Cookie: 'a_session_test=invalid-session',
        },
      })

      expect(res.status).toBe(401)
    })

    test('should return security headers', async () => {
      mockValidateSession.mockResolvedValue({ id: 'user-123', provider: 'discord' })
      mockRetryAppwriteOperation.mockResolvedValue({
        email: 'test@example.com',
        name: 'Test',
        prefs: {},
      })
      mockGetUserProfile.mockResolvedValue({
        username: 'testuser',
        displayName: 'Test',
        balance: 10000,
        avatarPath: '',
      })

      const res = await app.request('/me', {
        headers: {
          Cookie: 'a_session_test=valid-session-secret',
        },
      })

      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(res.headers.get('X-Frame-Options')).toBe('DENY')
    })
  })

  describe('POST /logout', () => {
    test('should return success and clear cookies', async () => {
      mockAppwriteLogout.mockResolvedValue(true)

      const res = await app.request('/logout', {
        method: 'POST',
        headers: {
          'X-Appwrite-User-Id': 'user-123',
        },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    test('should work without user ID header', async () => {
      const res = await app.request('/logout', {
        method: 'POST',
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })

  describe('POST /test-login', () => {
    test('should return 400 when email or password is missing', async () => {
      const res = await app.request('/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      expect(res.status).toBe(400)
    })

    test('should return 400 when body is empty', async () => {
      const res = await app.request('/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
    })

    test('should return 500 when login fails', async () => {
      mockRetryAppwriteOperation.mockRejectedValue(new Error('Invalid credentials'))

      const res = await app.request('/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'wrongpass' }),
      })

      expect(res.status).toBe(500)
    })
  })
})
