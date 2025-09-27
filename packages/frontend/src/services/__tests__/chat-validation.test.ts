/**
 * Chat Validation Unit Tests (Bun Test)
 * Requirements: 1.4, 4.1, 4.2, 4.3
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  validateChatMessage,
  sanitizeMessage,
  sanitizeMessageAdvanced,
  hasExcessiveCaps,
  normalizeCaps,
  checkRateLimit,
  clearRateLimit,
  isApproachingLimit,
  getRemainingCharacters,
  formatCharacterCount,
  validateUsername,
} from '../../utils/chat-validation';

describe('Chat Validation', () => {
  beforeEach(() => {
    // Clear rate limit state before each test
    clearRateLimit('test-user');
  });

  describe('validateChatMessage', () => {
    it('should validate valid messages', () => {
      const result = validateChatMessage('Hello world');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedContent).toBe('Hello world');
    });

    it('should reject empty messages', () => {
      const result = validateChatMessage('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message content is required');
    });

    it('should reject messages that are too long', () => {
      const longMessage = 'a'.repeat(501);
      const result = validateChatMessage(longMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message cannot exceed 500 characters');
    });
  });

  describe('sanitizeMessage', () => {
    it('should trim whitespace', () => {
      expect(sanitizeMessage('  hello world  ')).toBe('hello world');
    });

    it('should replace multiple spaces with single space', () => {
      expect(sanitizeMessage('hello    world')).toBe('hello world');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeMessage('hello <script>alert("xss")</script> world')).toBe('hello scriptalert("xss")/script world');
    });
  });

  describe('sanitizeMessageAdvanced', () => {
    it('should replace URLs with placeholder', () => {
      expect(sanitizeMessageAdvanced('Check out https://example.com')).toBe('Check out [LINK]');
    });

    it('should remove javascript protocols', () => {
      expect(sanitizeMessageAdvanced('javascript:alert("xss")')).toBe('alert("xss")');
    });
  });

  describe('hasExcessiveCaps', () => {
    it('should detect excessive caps', () => {
      expect(hasExcessiveCaps('HELLO WORLD')).toBe(true);
    });

    it('should allow normal capitalization', () => {
      expect(hasExcessiveCaps('Hello World')).toBe(false);
    });

    it('should ignore short messages', () => {
      expect(hasExcessiveCaps('HI')).toBe(false);
    });
  });

  describe('normalizeCaps', () => {
    it('should normalize excessive caps', () => {
      expect(normalizeCaps('HELLO WORLD')).toBe('Hello world');
    });

    it('should leave normal text unchanged', () => {
      expect(normalizeCaps('Hello World')).toBe('Hello World');
    });
  });

  describe('checkRateLimit', () => {
    it('should allow messages within rate limit', () => {
      const result1 = checkRateLimit('test-user');
      expect(result1.allowed).toBe(true);

      const result2 = checkRateLimit('test-user');
      expect(result2.allowed).toBe(true);
    });

    it('should block messages when rate limit exceeded', () => {
      // Send maximum allowed messages
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit('test-user');
        expect(result.allowed).toBe(true);
      }

      // Next message should be blocked
      const result = checkRateLimit('test-user');
      expect(result.allowed).toBe(false);
      expect(result.resetTime).toBeDefined();
    });
  });

  describe('isApproachingLimit', () => {
    it('should detect when approaching character limit', () => {
      const nearLimit = 'a'.repeat(450); // 90% of 500
      expect(isApproachingLimit(nearLimit)).toBe(true);
    });

    it('should not trigger for short messages', () => {
      expect(isApproachingLimit('Hello world')).toBe(false);
    });
  });

  describe('getRemainingCharacters', () => {
    it('should calculate remaining characters correctly', () => {
      expect(getRemainingCharacters('Hello')).toBe(495);
      expect(getRemainingCharacters('a'.repeat(100))).toBe(400);
      expect(getRemainingCharacters('a'.repeat(500))).toBe(0);
    });
  });

  describe('formatCharacterCount', () => {
    it('should return empty string for short messages', () => {
      expect(formatCharacterCount('Hello world')).toBe('');
    });

    it('should show remaining characters when approaching limit', () => {
      const nearLimit = 'a'.repeat(450);
      expect(formatCharacterCount(nearLimit)).toBe('50 characters remaining');
    });
  });

  describe('validateUsername', () => {
    it('should validate valid usernames', () => {
      expect(validateUsername('testuser').isValid).toBe(true);
      expect(validateUsername('test_user').isValid).toBe(true);
      expect(validateUsername('test-user').isValid).toBe(true);
    });

    it('should reject empty usernames', () => {
      const result = validateUsername('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username is required');
    });

    it('should reject usernames that are too long', () => {
      const longUsername = 'a'.repeat(51);
      const result = validateUsername(longUsername);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username cannot exceed 50 characters');
    });
  });
});