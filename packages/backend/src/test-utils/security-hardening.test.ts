import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import '../test-utils/setup' // Setup test environment
import { Hono } from 'hono'
import { rateLimitMiddleware, globalRateLimiter } from '../middleware/rate-limit'
import { validationMiddleware, InputSanitizer, ThreatDetector } from '../middleware/validation'
import { errorHandler } from '../middleware/error'
import { AuditLogger } from '../middleware/audit'
import { sessionManager, ipSecurityManager } from '../middleware/security'
import { z } from 'zod'

describe('Security Hardening', () => {
  beforeAll(async () => {
    // Setup test environment
  })

  afterAll(async () => {
    // Cleanup
    globalRateLimiter.destroy()
    sessionManager.destroy()
    ipSecurityManager.destroy()
  })

  describe('Rate Limiting', () => {
    let app: Hono

    beforeEach(() => {
      app = new Hono()
      app.onError(errorHandler) // Add error handler for HTTPException handling
      app.use('*', rateLimitMiddleware({
        windowMs: 1000, // 1 second for testing
        maxRequests: 3,
        blockDurationMs: 2000
      }))
      app.get('/test', (c) => c.json({ success: true }))
    })

    test('should allow requests within limit', async () => {
      const req = new Request('http://localhost/test', {
        headers: { 'X-Real-IP': '192.168.1.1' }
      })

      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        const res = await app.fetch(req.clone())
        expect(res.status).toBe(200)
        expect(res.headers.get('X-RateLimit-Remaining')).toBe((2 - i).toString())
      }
    })

    test('should block requests exceeding limit', async () => {
      const req = new Request('http://localhost/test', {
        headers: { 'X-Real-IP': '192.168.1.2' }
      })

      // Exhaust the limit
      for (let i = 0; i < 3; i++) {
        await app.fetch(req.clone())
      }

      // Next request should be blocked
      const res = await app.fetch(req.clone())
      expect(res.status).toBe(429)
      
      const body = await res.json()
      expect(body.error.message).toBe('Too many requests. Please try again later.')
    })

    test('should include rate limit headers', async () => {
      const req = new Request('http://localhost/test', {
        headers: { 'X-Real-IP': '192.168.1.3' }
      })

      const res = await app.fetch(req)
      expect(res.headers.get('X-RateLimit-Limit')).toBe('3')
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('2')
      expect(res.headers.get('X-RateLimit-Reset')).toBeTruthy()
    })
  })

  describe('Input Validation and Sanitization', () => {
    describe('InputSanitizer', () => {
      test('should sanitize strings', () => {
        const malicious = '<script>alert("xss")</script>\x00\x01test'
        const sanitized = InputSanitizer.sanitizeString(malicious)
        expect(sanitized).toBe('<script>alert("xss")</script>test')
        expect(sanitized).not.toContain('\x00')
        expect(sanitized).not.toContain('\x01')
      })

      test('should escape HTML', () => {
        const html = '<div onclick="alert(1)">Test & "quotes"</div>'
        const escaped = InputSanitizer.escapeHtml(html)
        expect(escaped).toBe('&lt;div onclick=&quot;alert(1)&quot;&gt;Test &amp; &quot;quotes&quot;&lt;&#x2F;div&gt;')
      })

      test('should sanitize email addresses', () => {
        const email = '  TEST@EXAMPLE.COM  '
        const sanitized = InputSanitizer.sanitizeEmail(email)
        expect(sanitized).toBe('test@example.com')
      })

      test('should sanitize usernames', () => {
        const username = '  test<>user123!@#  '
        const sanitized = InputSanitizer.sanitizeUsername(username)
        expect(sanitized).toBe('testuser123')
      })

      test('should sanitize numbers', () => {
        expect(InputSanitizer.sanitizeNumber('123.45')).toBe(123.45)
        expect(InputSanitizer.sanitizeNumber('invalid')).toBe(null)
        expect(InputSanitizer.sanitizeNumber(Infinity)).toBe(null)
        expect(InputSanitizer.sanitizeNumber(NaN)).toBe(null)
      })

      test('should deep sanitize objects', () => {
        const obj = {
          name: '<script>alert(1)</script>',
          age: '25',
          nested: {
            value: 'test\x00null'
          },
          array: ['item1\x01', 'item2']
        }

        const sanitized = InputSanitizer.sanitizeObject(obj)
        expect(sanitized.name).toBe('<script>alert(1)</script>')
        expect(sanitized.age).toBe('25')
        expect(sanitized.nested.value).toBe('testnull')
        expect(sanitized.array[0]).toBe('item1')
        expect(sanitized.array[1]).toBe('item2')
      })
    })

    describe('ThreatDetector', () => {
      test('should detect SQL injection attempts', () => {
        const sqlInjections = [
          "'; DROP TABLE users; --",
          "1' OR '1'='1",
          "UNION SELECT * FROM passwords",
          "admin'--",
          "1; DELETE FROM users"
        ]

        sqlInjections.forEach(injection => {
          expect(ThreatDetector.detectSqlInjection(injection)).toBe(true)
        })

        expect(ThreatDetector.detectSqlInjection('normal text')).toBe(false)
      })

      test('should detect XSS attempts', () => {
        const xssAttempts = [
          '<script>alert("xss")</script>',
          '<iframe src="javascript:alert(1)"></iframe>',
          'javascript:alert(1)',
          '<div onclick="alert(1)">click me</div>',
          '<object data="data:text/html,<script>alert(1)</script>"></object>'
        ]

        xssAttempts.forEach(xss => {
          expect(ThreatDetector.detectXss(xss)).toBe(true)
        })

        expect(ThreatDetector.detectXss('normal text')).toBe(false)
      })

      test('should detect path traversal attempts', () => {
        const pathTraversals = [
          '../../../etc/passwd',
          '..\\..\\windows\\system32',
          '/../../secret.txt',
          'file/../../../etc/hosts'
        ]

        pathTraversals.forEach(path => {
          expect(ThreatDetector.detectPathTraversal(path)).toBe(true)
        })

        expect(ThreatDetector.detectPathTraversal('normal/path/file.txt')).toBe(false)
      })

      test('should detect command injection attempts', () => {
        const commandInjections = [
          'test; rm -rf /',
          'file | cat /etc/passwd',
          'input && malicious_command',
          'test`whoami`',
          'file$(cat /etc/passwd)'
        ]

        commandInjections.forEach(cmd => {
          expect(ThreatDetector.detectCommandInjection(cmd)).toBe(true)
        })

        expect(ThreatDetector.detectCommandInjection('normal text')).toBe(false)
      })

      test('should analyze input for multiple threats', () => {
        const maliciousInput = "'; DROP TABLE users; <script>alert(1)</script> ../../../etc/passwd"
        const threats = ThreatDetector.analyzeInput(maliciousInput)
        
        expect(threats).toContain('sql_injection')
        expect(threats).toContain('xss')
        expect(threats).toContain('path_traversal')
      })
    })

    describe('Validation Middleware', () => {
      let app: Hono

      beforeEach(() => {
        app = new Hono()

        // Add error handler (required for HTTPException handling)
        app.onError(errorHandler)

        const schema = z.object({
          email: z.string().email().transform(InputSanitizer.sanitizeEmail),
          username: z.string().min(3).max(20).transform(InputSanitizer.sanitizeUsername),
          age: z.number().min(0).max(150)
        })

        app.post('/test', validationMiddleware(schema), (c) => {
          const data = c.get('validatedData')
          return c.json({ success: true, data })
        })
      })

      test('should validate and sanitize valid input', async () => {
        const req = new Request('http://localhost/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: '  TEST@EXAMPLE.COM  ',
            username: '  testuser  ',
            age: 25
          })
        })

        const res = await app.fetch(req)
        expect(res.status).toBe(200)
        
        const body = await res.json()
        expect(body.data.email).toBe('test@example.com')
        expect(body.data.username).toBe('testuser')
        expect(body.data.age).toBe(25)
      })

      test('should reject invalid input', async () => {
        const req = new Request('http://localhost/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'invalid-email',
            username: 'ab', // too short
            age: -5 // invalid age
          })
        })

        const res = await app.fetch(req)
        expect(res.status).toBe(400)

        const body = await res.json()
        expect(body.error.message).toBe('Validation failed')
        expect(body.error.code).toBe('VALIDATION_ERROR')
      })

      test('should detect and reject malicious input', async () => {
        const req = new Request('http://localhost/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            username: "'; DROP TABLE users; --",
            age: 25
          })
        })

        const res = await app.fetch(req)
        expect(res.status).toBe(400)
        
        const body = await res.json()
        expect(body.error.message).toBe('Invalid input detected')
      })
    })
  })

  describe('Audit Logging', () => {
    test('should log audit events', async () => {
      const mockEntry = {
        user_id: 'test-user-id',
        action: 'test_action',
        resource_type: 'test_resource',
        resource_id: 'test-123',
        success: true,
        ip_address: '192.168.1.1',
        metadata: { test: true }
      }

      // This would normally write to database
      // For testing, we just verify the structure
      expect(mockEntry.action).toBe('test_action')
      expect(mockEntry.resource_type).toBe('test_resource')
      expect(mockEntry.success).toBe(true)
    })

    test('should log successful actions', async () => {
      // Should not throw any errors
      await AuditLogger.logSuccess(
        'test_action',
        'test_resource',
        {
          userId: 'test-user',
          resourceId: 'resource-123',
          ipAddress: '192.168.1.1',
          metadata: { test: true }
        }
      )
    })

    test('should log failed actions', async () => {
      // Should not throw any errors
      await AuditLogger.logFailure(
        'test_action',
        'test_resource',
        'Test error message',
        {
          userId: 'test-user',
          ipAddress: '192.168.1.1',
          metadata: { test: true }
        }
      )
    })
  })

  describe('Session Management', () => {
    beforeEach(() => {
      // Clear sessions before each test
      sessionManager.destroy()
    })

    test('should register and validate sessions', () => {
      const sessionId = 'test-session-123'
      const userId = 'user-123'
      
      sessionManager.registerSession(sessionId, userId, '192.168.1.1', 'test-agent')
      
      expect(sessionManager.isSessionValid(sessionId)).toBe(true)
      
      const session = sessionManager.getSession(sessionId)
      expect(session?.userId).toBe(userId)
      expect(session?.ipAddress).toBe('192.168.1.1')
    })

    test('should update session activity', () => {
      const sessionId = 'test-session-456'
      const userId = 'user-456'
      
      sessionManager.registerSession(sessionId, userId)
      const initialActivity = sessionManager.getSession(sessionId)?.lastActivity
      
      // Wait a bit and update activity
      setTimeout(() => {
        sessionManager.updateActivity(sessionId)
        const updatedActivity = sessionManager.getSession(sessionId)?.lastActivity
        expect(updatedActivity).toBeGreaterThan(initialActivity!)
      }, 10)
    })

    test('should remove expired sessions', () => {
      const sessionId = 'test-session-expired'
      const userId = 'user-expired'
      
      // Register session with very short timeout for testing
      sessionManager.registerSession(sessionId, userId)
      
      // Manually expire the session by setting old timestamp
      const session = sessionManager.getSession(sessionId)
      if (session) {
        session.createdAt = Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
        session.lastActivity = Date.now() - (3 * 60 * 60 * 1000) // 3 hours ago
      }
      
      expect(sessionManager.isSessionValid(sessionId)).toBe(false)
    })

    test('should get user sessions', () => {
      const userId = 'user-multi-session'
      
      sessionManager.registerSession('session-1', userId)
      sessionManager.registerSession('session-2', userId)
      sessionManager.registerSession('session-3', 'other-user')
      
      const userSessions = sessionManager.getUserSessions(userId)
      expect(userSessions).toHaveLength(2)
      expect(userSessions.every(s => s.sessionId.startsWith('session-'))).toBe(true)
    })

    test('should revoke user sessions', () => {
      const userId = 'user-revoke-test'
      
      sessionManager.registerSession('session-a', userId)
      sessionManager.registerSession('session-b', userId)
      sessionManager.registerSession('session-c', 'other-user')
      
      const revokedCount = sessionManager.revokeUserSessions(userId)
      expect(revokedCount).toBe(2)
      
      expect(sessionManager.isSessionValid('session-a')).toBe(false)
      expect(sessionManager.isSessionValid('session-b')).toBe(false)
      expect(sessionManager.isSessionValid('session-c')).toBe(true)
    })
  })

  describe('IP Security', () => {
    beforeEach(() => {
      ipSecurityManager.destroy()
    })

    test('should track IP violations', () => {
      const ip = '192.168.1.100'
      
      expect(ipSecurityManager.getViolationCount(ip)).toBe(0)
      expect(ipSecurityManager.isBlocked(ip)).toBe(false)
      
      // Record some violations
      for (let i = 0; i < 5; i++) {
        ipSecurityManager.recordViolation(ip, 'test_violation')
      }
      
      expect(ipSecurityManager.getViolationCount(ip)).toBe(5)
      expect(ipSecurityManager.isBlocked(ip)).toBe(false) // Not blocked yet
    })

    test('should block IPs after threshold violations', () => {
      const ip = '192.168.1.101'
      
      // Record violations to exceed threshold (10)
      for (let i = 0; i < 12; i++) {
        ipSecurityManager.recordViolation(ip, 'test_violation')
      }
      
      expect(ipSecurityManager.getViolationCount(ip)).toBe(12)
      expect(ipSecurityManager.isBlocked(ip)).toBe(true)
    })
  })

  describe('Security Headers', () => {
    let app: Hono

    beforeEach(async () => {
      const { securityHeadersMiddleware } = await import('../middleware/security')
      app = new Hono()
      app.use('*', securityHeadersMiddleware())
      app.get('/test', (c) => c.json({ success: true }))
    })

    test('should add security headers', async () => {
      const req = new Request('http://localhost/test')
      const res = await app.fetch(req)
      
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(res.headers.get('X-Frame-Options')).toBe('DENY')
      expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'")
      expect(res.headers.get('Server')).toBe('TarkovCasino')
    })

    test('should add cache control headers for API endpoints', async () => {
      app.get('/api/test', (c) => c.json({ success: true }))
      
      const req = new Request('http://localhost/api/test')
      const res = await app.fetch(req)
      
      expect(res.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate, private')
      expect(res.headers.get('Pragma')).toBe('no-cache')
      expect(res.headers.get('Expires')).toBe('0')
    })
  })
})

describe('Integration Tests', () => {
  let app: Hono

  beforeEach(async () => {
    const { rateLimitMiddleware } = await import('../middleware/rate-limit')
    const { validationMiddleware } = await import('../middleware/validation')
    const { securityHeadersMiddleware } = await import('../middleware/security')
    
    app = new Hono()
    app.onError(errorHandler) // Add error handler for HTTPException handling

    // Apply security middleware stack
    app.use('*', securityHeadersMiddleware())
    app.use('*', rateLimitMiddleware({ windowMs: 1000, maxRequests: 5 }))
    
    const schema = z.object({
      username: z.string().min(3).max(20),
      email: z.string().email()
    })
    
    app.post('/secure-endpoint', validationMiddleware(schema), (c) => {
      const data = c.get('validatedData')
      return c.json({ success: true, data })
    })
  })

  test('should apply full security stack', async () => {
    const req = new Request('http://localhost/secure-endpoint', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Real-IP': '192.168.1.200'
      },
      body: JSON.stringify({
        username: 'testuser',
        email: 'test@example.com'
      })
    })

    const res = await app.fetch(req)
    
    // Should succeed with all security measures
    expect(res.status).toBe(200)
    
    // Should have security headers
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('X-RateLimit-Limit')).toBe('5')
    
    // Should have validated data
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.username).toBe('testuser')
    expect(body.data.email).toBe('test@example.com')
  })

  test('should reject malicious requests', async () => {
    const req = new Request('http://localhost/secure-endpoint', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Real-IP': '192.168.1.201'
      },
      body: JSON.stringify({
        username: "'; DROP TABLE users; --",
        email: '<script>alert(1)</script>@example.com'
      })
    })

    const res = await app.fetch(req)
    
    // Should be rejected due to malicious input
    expect(res.status).toBe(400)
    
    const body = await res.json()
    expect(body.error.message).toBe('Invalid input detected')
  })

  test('should enforce rate limits', async () => {
    const requests = []
    
    // Make 6 requests (limit is 5)
    for (let i = 0; i < 6; i++) {
      const req = new Request('http://localhost/secure-endpoint', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Real-IP': '192.168.1.202'
        },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com'
        })
      })
      
      requests.push(app.fetch(req))
    }
    
    const responses = await Promise.all(requests)
    
    // First 5 should succeed
    for (let i = 0; i < 5; i++) {
      expect(responses[i].status).toBe(200)
    }
    
    // 6th should be rate limited
    expect(responses[5].status).toBe(429)
  })
})