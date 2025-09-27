/**
 * Chat Validation Utilities Unit Tests
 * Requirements: 1.4, 4.1, 4.2, 4.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateChatMessage,
  validateMessageComprehensive,
  sanitizeMessage,
  sanitizeMessageAdvanced,
  hasExcessiveCaps,
  normalizeCaps,
  checkRateLimit,
  clearRateLimit,
  getRateLimitStatus,
  isApproachingLimit,
  getRemainingCharacters,
  formatCharacterCount,
  validateUsername,
  CHAT_CONSTRAINTS,
} from '../chat-validation';

describe('Chat Validation Utilities', () => {
  beforeEach(() => {
    // Clear rate limit state before each test
    clearRateLimit('test-user');
  });

  describe('validateChatMessage', () => {
    it('should validate valid messages', () => {
      const result = validateChatMessage('Hello world');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedContent).toBe('Hello world');
      expect(result.error).toBeUndefined();
    });

    it('should reject empty messages', () => {
      const result = validateChatMessage('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message content is required');
    });

    it('should reject whitespace-only messages', () => {
      const result = validateChatMessage('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });

    it('should reject messages that are too long', () => {
      const longMessage = 'a'.repeat(501);
      const result = validateChatMessage(longMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message cannot exceed 500 characters');
    });

    it('should reject messages with profanity', () => {
      const result = validateChatMessage('This is spam');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message contains inappropriate content');
    });

    it('should handle null/undefined input', () => {
      expect(validateChatMessage(null as any).isValid).toBe(false);
      expect(validateChatMessage(undefined as any).isValid).toBe(false);
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

    it('should truncate to max length', () => {
      const longMessage = 'a'.repeat(600);
      const result = sanitizeMessage(longMessage);
      expect(result.length).toBe(500);
    });
  });

  describe('sanitizeMessageAdvanced', () => {
    it('should perform basic sanitization', () => {
      expect(sanitizeMessageAdvanced('  hello    world  ')).toBe('hello world');
    });

    it('should remove javascript protocols', () => {
      expect(sanitizeMessageAdvanced('javascript:alert("xss")')).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      expect(sanitizeMessageAdvanced('onclick=alert("xss")')).toBe('alert("xss")');
    });

    it('should replace URLs with placeholder', () => {
      expect(sanitizeMessageAdvanced('Check out https://example.com')).toBe('Check out [LINK]');
      expect(sanitizeMessageAdvanced('Visit http://test.org for more')).toBe('Visit [LINK] for more');
    });

    it('should handle multiple URLs', () => {
      const message = 'Visit https://example.com and http://test.org';
      expect(sanitizeMessageAdvanced(message)).toBe('Visit [LINK] and [LINK]');
    });
  });

  describe('hasExcessiveCaps', () => {
    it('should detect excessive caps', () => {
      expect(hasExcessiveCaps('HELLO WORLD')).toBe(true);
      expect(hasExcessiveCaps('THIS IS SHOUTING')).toBe(true);
    });

    it('should allow normal capitalization', () => {
      expect(hasExcessiveCaps('Hello World')).toBe(false);
      expect(hasExcessiveCaps('This is normal text')).toBe(false);
    });

    it('should ignore short messages', () => {
      expect(hasExcessiveCaps('HI')).toBe(false);
      expect(hasExcessiveCaps('OK')).toBe(false);
    });

    it('should handle mixed content', () => {
      expect(hasExcessiveCaps('Hello WORLD 123')).toBe(false);
      expect(hasExcessiveCaps('HELLO WORLD 123')).toBe(true);
    });
  });

  describe('normalizeCaps', () => {
    it('should normalize excessive caps', () => {
      expect(normalizeCaps('HELLO WORLD')).toBe('Hello world');
      expect(normalizeCaps('THIS IS SHOUTING')).toBe('This is shouting');
    });

    it('should leave normal text unchanged', () => {
      expect(normalizeCaps('Hello World')).toBe('Hello World');
      expect(normalizeCaps('This is normal')).toBe('This is normal');
    });

    it('should handle empty strings', () => {
      expect(normalizeCaps('')).toBe('');
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

    it('should reset rate limit after time window', () => {
      // Mock Date.now to control time
      const originalNow = Date.now;
      let currentTime = 1000000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      // Send maximum messages
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test-user');
      }

      // Should be blocked
      expect(checkRateLimit('test-user').allowed).toBe(false);

      // Advance time past window
      currentTime += 11000; // 11 seconds

      // Should be allowed again
      expect(checkRateLimit('test-user').allowed).toBe(true);

      // Restore original Date.now
      Date.now = originalNow;
    });

    it('should handle different users independently', () => {
      // User 1 hits rate limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit('user1');
      }
      expect(checkRateLimit('user1').allowed).toBe(false);

      // User 2 should still be allowed
      expect(checkRateLimit('user2').allowed).toBe(true);
    });

    it('should respect custom rate limit config', () => {
      const customConfig = { maxMessages: 2, windowMs: 5000 };
      
      expect(checkRateLimit('test-user', customConfig).allowed).toBe(true);
      expect(checkRateLimit('test-user', customConfig).allowed).toBe(true);
      expect(checkRateLimit('test-user', customConfig).allowed).toBe(false);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return null for users with no rate limit state', () => {
      const status = getRateLimitStatus('new-user');
      expect(status).toBeNull();
    });

    it('should return correct status for users with rate limit state', () => {
      checkRateLimit('test-user');
      checkRateLimit('test-user');

      const status = getRateLimitStatus('test-user');
      expect(status).not.toBeNull();
      expect(status!.count).toBe(2);
      expect(status!.remaining).toBe(3);
      expect(status!.resetTime).toBeGreaterThan(Date.now());
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

    it('should respect custom threshold', () => {
      const message = 'a'.repeat(400); // 80% of 500
      expect(isApproachingLimit(message, 0.7)).toBe(true);
      expect(isApproachingLimit(message, 0.9)).toBe(false);
    });
  });

  describe('getRemainingCharacters', () => {
    it('should calculate remaining characters correctly', () => {
      expect(getRemainingCharacters('Hello')).toBe(495);
      expect(getRemainingCharacters('a'.repeat(100))).toBe(400);
      expect(getRemainingCharacters('a'.repeat(500))).toBe(0);
      expect(getRemainingCharacters('a'.repeat(600))).toBe(0); // Should not go negative
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

    it('should show zero when at limit', () => {
      const atLimit = 'a'.repeat(500);
      expect(formatCharacterCount(atLimit)).toBe('0 characters remaining');
    });
  });

  describe('validateUsername', () => {
    it('should validate valid usernames', () => {
      expect(validateUsername('testuser').isValid).toBe(true);
      expect(validateUsername('test_user').isValid).toBe(true);
      expect(validateUsername('test-user').isValid).toBe(true);
      expect(validateUsername('test user').isValid).toBe(true);
      expect(validateUsername('TestUser123').isValid).toBe(true);
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

    it('should reject usernames with invalid characters', () => {
      const result = validateUsername('test@user');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username can only contain letters, numbers, spaces, underscores, and hyphens');
    });

    it('should handle null/undefined input', () => {
      expect(validateUsername(null as any).isValid).toBe(false);
      expect(validateUsername(undefined as any).isValid).toBe(false);
    });
  });

  describe('validateMessageComprehensive', () => {
    it('should perform all validation checks', () => {
      const result = validateMessageComprehensive('Hello world', 'test-user');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedContent).toBe('Hello world');
    });

    it('should handle rate limiting', () => {
      // Hit rate limit
      for (let i = 0; i < 5; i++) {
        validateMessageComprehensive('test', 'test-user');
      }

      const result = validateMessageComprehensive('test', 'test-user');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too quickly');
      expect(result.rateLimitInfo).toBeDefined();
    });

    it('should normalize caps in comprehensive validation', () => {
      const result = validateMessageComprehensive('HELLO WORLD', 'test-user');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedContent).toBe('Hello world');
    });

    it('should work without user ID', () => {
      const result = validateMessageComprehensive('Hello world');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedContent).toBe('Hello world');
    });
  });

  describe('CHAT_CONSTRAINTS', () => {
    it('should export correct constants', () => {
      expect(CHAT_CONSTRAINTS.MESSAGE_MIN_LENGTH).toBe(1);
      expect(CHAT_CONSTRAINTS.MESSAGE_MAX_LENGTH).toBe(500);
      expect(CHAT_CONSTRAINTS.USERNAME_MIN_LENGTH).toBe(1);
      expect(CHAT_CONSTRAINTS.USERNAME_MAX_LENGTH).toBe(50);
    });
  });
});