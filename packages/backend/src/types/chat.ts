/**
 * Shared Chat System Types
 * These types are shared between frontend and backend for consistency
 */

/**
 * Database schema for chat_messages table
 */
export interface ChatMessageRow {
  id: string;
  content: string;
  user_id: string;
  username: string;
  created_at: string;
  updated_at: string;
}

/**
 * Database schema for chat_presence table
 */
export interface ChatPresenceRow {
  user_id: string;
  username: string;
  last_seen: string;
  is_online: boolean;
}

/**
 * Input type for creating a new chat message
 */
export interface CreateChatMessageInput {
  content: string;
  user_id: string;
  username: string;
}

/**
 * Input type for updating user presence
 */
export interface UpdatePresenceInput {
  user_id: string;
  username: string;
  is_online: boolean;
}

/**
 * Chat message validation constraints
 */
export const CHAT_CONSTRAINTS = {
  MESSAGE_MIN_LENGTH: 1,
  MESSAGE_MAX_LENGTH: 500,
  USERNAME_MIN_LENGTH: 1,
  USERNAME_MAX_LENGTH: 50,
  RATE_LIMIT_MESSAGES: 5,
  RATE_LIMIT_WINDOW_SECONDS: 10,
  PRESENCE_TIMEOUT_SECONDS: 30,
  MAX_ONLINE_USERS_DISPLAY: 100,
} as const;

/**
 * Database table names for chat system
 */
export const CHAT_TABLES = {
  MESSAGES: 'chat_messages',
  PRESENCE: 'chat_presence',
} as const;

/**
 * Real-time channel names for chat system
 */
export const CHAT_CHANNELS = {
  MESSAGES: 'chat_messages',
  PRESENCE: 'chat_presence',
  GLOBAL_CHAT: 'global_chat',
} as const;

/**
 * Chat-related RPC function names
 */
export const CHAT_RPC_FUNCTIONS = {
  SEND_MESSAGE: 'send_chat_message',
  UPDATE_PRESENCE: 'update_chat_presence',
  GET_RECENT_MESSAGES: 'get_recent_chat_messages',
  GET_ONLINE_USERS: 'get_online_chat_users',
  CLEANUP_PRESENCE: 'cleanup_chat_presence',
} as const;

/**
 * Validation function for chat message content
 */
export function validateMessageContent(content: string): {
  isValid: boolean;
  error?: string;
} {
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: 'Message content is required' };
  }

  const trimmed = content.trim();
  
  if (trimmed.length < CHAT_CONSTRAINTS.MESSAGE_MIN_LENGTH) {
    return { isValid: false, error: 'Message cannot be empty' };
  }

  if (trimmed.length > CHAT_CONSTRAINTS.MESSAGE_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Message cannot exceed ${CHAT_CONSTRAINTS.MESSAGE_MAX_LENGTH} characters` 
    };
  }

  return { isValid: true };
}

/**
 * Validation function for username
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
 * Basic profanity filter (simple word list approach)
 * In production, this should be replaced with a more sophisticated solution
 */
export function containsProfanity(content: string): boolean {
  const profanityList = [
    // Add basic profanity words here
    // This is a minimal implementation for demonstration
    'spam', 'scam', 'hack', 'cheat'
  ];

  const lowerContent = content.toLowerCase();
  return profanityList.some(word => lowerContent.includes(word));
}

/**
 * Sanitize message content
 */
export function sanitizeMessageContent(content: string): string {
  return content
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, CHAT_CONSTRAINTS.MESSAGE_MAX_LENGTH);
}

/**
 * Rate limiting helper
 */
export interface RateLimitState {
  messageCount: number;
  windowStart: number;
}

/**
 * Check if user is rate limited
 */
export function isRateLimited(
  userId: string,
  rateLimitMap: Map<string, RateLimitState>
): boolean {
  const now = Date.now();
  const windowMs = CHAT_CONSTRAINTS.RATE_LIMIT_WINDOW_SECONDS * 1000;
  
  const userState = rateLimitMap.get(userId);
  
  if (!userState) {
    rateLimitMap.set(userId, { messageCount: 1, windowStart: now });
    return false;
  }

  // Check if we're in a new window
  if (now - userState.windowStart > windowMs) {
    rateLimitMap.set(userId, { messageCount: 1, windowStart: now });
    return false;
  }

  // Check if user has exceeded rate limit
  if (userState.messageCount >= CHAT_CONSTRAINTS.RATE_LIMIT_MESSAGES) {
    return true;
  }

  // Increment message count
  userState.messageCount++;
  return false;
}