import { describe, test, expect } from 'bun:test'
import { InputSanitizer, ThreatDetector } from '../middleware/validation'

describe('Security Core Functions', () => {
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
})