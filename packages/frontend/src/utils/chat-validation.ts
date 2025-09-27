/**
 * Chat validation utilities for frontend
 * Uses shared validation logic for consistency
 * Requirements: 1.4, 4.1, 4.2, 4.3
 */

import type { MessageValidationResult, RateLimitConfig } from '../types/chat';
import { CHAT_CONFIG } from '../types/chat';

// Import shared validation constants
const CHAT_CONSTRAINTS = {
  MESSAGE_MIN_LENGTH: 1,
  MESSAGE_MAX_LENGTH: CHAT_CONFIG.MAX_MESSAGE_LENGTH,
  USERNAME_MIN_LENGTH: 1,
  USERNAME_MAX_LENGTH: 50,
} as const;

// Rate limiting state
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

/**
 * Validate chat message content on the frontend
 */
export function validateChatMessage(content: string): MessageValidationResult {
  if (!content || typeof content !== 'string') {
    return {
      isValid: false,
      error: 'Message content is required',
    };
  }

  const trimmed = content.trim();
  
  if (trimmed.length < CHAT_CONSTRAINTS.MESSAGE_MIN_LENGTH) {
    return {
      isValid: false,
      error: 'Message cannot be empty',
    };
  }

  if (trimmed.length > CHAT_CONSTRAINTS.MESSAGE_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Message cannot exceed ${CHAT_CONSTRAINTS.MESSAGE_MAX_LENGTH} characters`,
    };
  }

  // Basic client-side sanitization
  const sanitized = sanitizeMessage(trimmed);
  
  // Basic profanity check (client-side only, server will do more thorough check)
  if (containsBasicProfanity(sanitized)) {
    return {
      isValid: false,
      error: 'Message contains inappropriate content',
    };
  }

  return {
    isValid: true,
    sanitizedContent: sanitized,
  };
}

/**
 * Sanitize message content for display
 */
export function sanitizeMessage(content: string): string {
  return content
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, CHAT_CONSTRAINTS.MESSAGE_MAX_LENGTH);
}

/**
 * Basic client-side profanity detection
 * This is a simple implementation - server should do more thorough checking
 */
function containsBasicProfanity(content: string): boolean {
  const basicProfanityList = [
    'spam', 'scam', 'hack', 'cheat', 'bot', 'admin', 'moderator'
  ];

  const lowerContent = content.toLowerCase();
  return basicProfanityList.some(word => lowerContent.includes(word));
}

/**
 * Advanced message sanitization
 */
export function sanitizeMessageAdvanced(content: string): string {
  return content
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/\b(https?:\/\/[^\s]+)/gi, '[LINK]') // Replace URLs with placeholder
    .substring(0, CHAT_CONSTRAINTS.MESSAGE_MAX_LENGTH);
}

/**
 * Check for excessive caps
 */
export function hasExcessiveCaps(content: string): boolean {
  const capsCount = (content.match(/[A-Z]/g) || []).length;
  const totalLetters = (content.match(/[A-Za-z]/g) || []).length;
  
  if (totalLetters < 3) return false; // Too short to matter
  
  const capsRatio = capsCount / totalLetters;
  return capsRatio > 0.7; // More than 70% caps
}

/**
 * Convert excessive caps to normal case
 */
export function normalizeCaps(content: string): string {
  if (hasExcessiveCaps(content)) {
    return content.toLowerCase().replace(/^\w/, c => c.toUpperCase());
  }
  return content;
}

/**
 * Rate limiting check for user
 */
export function checkRateLimit(
  userId: string, 
  config: RateLimitConfig = {
    maxMessages: CHAT_CONFIG.RATE_LIMIT_MAX_MESSAGES,
    windowMs: CHAT_CONFIG.RATE_LIMIT_WINDOW_MS,
  }
): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userState = rateLimitMap.get(userId);

  if (!userState) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return { allowed: true };
  }

  // Check if we're in a new window
  if (now - userState.windowStart > config.windowMs) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return { allowed: true };
  }

  // Check if user has exceeded rate limit
  if (userState.count >= config.maxMessages) {
    const resetTime = userState.windowStart + config.windowMs;
    return { allowed: false, resetTime };
  }

  // Increment count
  userState.count++;
  return { allowed: true };
}

/**
 * Clear rate limit for user (for testing or admin purposes)
 */
export function clearRateLimit(userId: string): void {
  rateLimitMap.delete(userId);
}

/**
 * Get rate limit status for user
 */
export function getRateLimitStatus(userId: string): {
  count: number;
  remaining: number;
  resetTime: number;
} | null {
  const userState = rateLimitMap.get(userId);
  if (!userState) {
    return null;
  }

  const maxMessages = CHAT_CONFIG.RATE_LIMIT_MAX_MESSAGES;
  const remaining = Math.max(0, maxMessages - userState.count);
  const resetTime = userState.windowStart + CHAT_CONFIG.RATE_LIMIT_WINDOW_MS;

  return {
    count: userState.count,
    remaining,
    resetTime,
  };
}

/**
 * Check if message length is approaching limit
 */
export function isApproachingLimit(content: string, threshold = 0.9): boolean {
  return content.length >= CHAT_CONSTRAINTS.MESSAGE_MAX_LENGTH * threshold;
}

/**
 * Get remaining character count
 */
export function getRemainingCharacters(content: string): number {
  return Math.max(0, CHAT_CONSTRAINTS.MESSAGE_MAX_LENGTH - content.length);
}

/**
 * Format character count for display
 */
export function formatCharacterCount(content: string): string {
  const remaining = getRemainingCharacters(content);
  const isNearLimit = isApproachingLimit(content);
  
  if (isNearLimit) {
    return `${remaining} characters remaining`;
  }
  
  return '';
}

/**
 * Validate username format
 */
export function validateUsername(username: string): {
  isValid: boolean;
  error?: string;
} {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();
  
  if (trimmed.length < CHAT_CONSTRAINTS.USERNAME_MIN_LENGTH) {
    return { isValid: false, error: 'Username cannot be empty' };
  }

  if (trimmed.length > CHAT_CONSTRAINTS.USERNAME_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Username cannot exceed ${CHAT_CONSTRAINTS.USERNAME_MAX_LENGTH} characters` 
    };
  }

  // Basic username validation (alphanumeric, spaces, underscores, hyphens)
  const usernameRegex = /^[a-zA-Z0-9\s_-]+$/;
  if (!usernameRegex.test(trimmed)) {
    return { 
      isValid: false, 
      error: 'Username can only contain letters, numbers, spaces, underscores, and hyphens' 
    };
  }

  return { isValid: true };
}

/**
 * Comprehensive message validation with all checks
 */
export function validateMessageComprehensive(
  content: string,
  userId?: string
): MessageValidationResult & { rateLimitInfo?: { resetTime: number } } {
  // Basic validation
  const basicValidation = validateChatMessage(content);
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  let sanitized = basicValidation.sanitizedContent!;

  // Rate limiting check
  if (userId) {
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return {
        isValid: false,
        error: 'You are sending messages too quickly. Please wait a moment.',
        rateLimitInfo: { resetTime: rateLimitCheck.resetTime! },
      };
    }
  }

  // Normalize caps
  sanitized = normalizeCaps(sanitized);

  // Advanced sanitization
  sanitized = sanitizeMessageAdvanced(sanitized);

  return {
    isValid: true,
    sanitizedContent: sanitized,
  };
}

// Export constants for use in components
export { CHAT_CONSTRAINTS };