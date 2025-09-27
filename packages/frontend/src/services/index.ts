/**
 * Chat Services - Export all chat-related services
 * Requirements: 1.1, 1.4, 2.1, 2.3, 4.3, 5.1, 5.2, 6.2, 6.3
 */

// Service classes
export { ChatService } from './chat-service';
export { PresenceService } from './presence-service';
export { ConnectionManager } from './connection-manager';

// Service instances (singletons)
export { default as chatService } from './chat-service';
export { default as presenceService } from './presence-service';
export { default as connectionManager } from './connection-manager';

// Re-export types for convenience
export type {
  ChatMessage,
  OnlineUser,
  ConnectionStatus,
  ChatError,
  ChatErrorType,
  ChatServiceConfig,
  MessageValidationResult,
  RateLimitConfig,
} from '../types/chat';

// Re-export validation utilities
export {
  validateChatMessage,
  validateMessageComprehensive,
  sanitizeMessage,
  sanitizeMessageAdvanced,
  checkRateLimit,
  clearRateLimit,
  getRateLimitStatus,
  hasExcessiveCaps,
  normalizeCaps,
  isApproachingLimit,
  getRemainingCharacters,
  formatCharacterCount,
  validateUsername,
  CHAT_CONSTRAINTS,
} from '../utils/chat-validation';