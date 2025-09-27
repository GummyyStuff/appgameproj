/**
 * Chat System TypeScript Interfaces and Types
 * These types support the real-time chat functionality for the Tarkov casino website
 */

/**
 * Represents a chat message in the system
 * Requirements: 1.1, 1.2, 2.1, 2.2
 */
export interface ChatMessage {
  /** Unique identifier for the message */
  id: string;
  /** The message content (max 500 characters) */
  content: string;
  /** ID of the user who sent the message */
  user_id: string;
  /** Display name of the user who sent the message */
  username: string;
  /** ISO timestamp when the message was created */
  created_at: string;
  /** ISO timestamp when the message was last updated */
  updated_at: string;
}

/**
 * Represents an online user in the chat system
 * Requirements: 5.1, 5.2
 */
export interface OnlineUser {
  /** Unique identifier for the user */
  user_id: string;
  /** Display name of the user */
  username: string;
  /** ISO timestamp of when the user was last seen */
  last_seen: string;
  /** Whether the user is currently online */
  is_online: boolean;
}

/**
 * Connection status for the chat system
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

/**
 * Chat context type for React context management
 * Requirements: 1.1, 1.2, 2.1, 2.2, 5.1, 5.2
 */
export interface ChatContextType {
  /** Array of chat messages */
  messages: ChatMessageWithStatus[];
  /** Array of currently online users */
  onlineUsers: OnlineUser[];
  /** Function to send a new message */
  sendMessage: (content: string) => Promise<void>;
  /** Whether the chat is currently connected */
  isConnected: boolean;
  /** Current connection status */
  connectionStatus: ConnectionStatus;
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
  /** Current user information */
  currentUser: {
    id: string;
    username: string;
  } | null;
  /** Error message if any */
  error: string | null;
  /** Whether messages are currently loading */
  isLoading: boolean;
  /** Function to clear error state */
  clearError: () => void;
  /** Function to retry connection */
  reconnect: () => void;
  /** Number of online users */
  onlineUserCount: number;
  /** Connection health information */
  connectionHealth: ConnectionHealth;
  /** Network status information */
  networkStatus: NetworkStatus;
  /** Function to retry failed messages */
  retryFailedMessages: () => Promise<void>;
  /** Function to clear message queue */
  clearMessageQueue: () => void;
}

/**
 * Props for the main ChatSidebar component
 */
export interface ChatSidebarProps {
  /** Whether the sidebar is collapsed */
  isCollapsed?: boolean;
  /** Callback when sidebar toggle is requested */
  onToggle?: () => void;
  /** Additional CSS class names */
  className?: string;
  /** Whether to show online users list */
  showOnlineUsers?: boolean;
}

/**
 * Props for the MessageInput component
 */
export interface MessageInputProps {
  /** Callback when a message is sent */
  onSendMessage: (content: string) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Maximum message length */
  maxLength?: number;
  /** Whether the user is authenticated */
  isAuthenticated?: boolean;
}

/**
 * Props for the MessageList component
 */
export interface MessageListProps {
  /** Array of messages to display */
  messages: ChatMessage[];
  /** Current user ID for message styling */
  currentUserId?: string;
  /** Whether messages are loading */
  isLoading?: boolean;
  /** Callback when more messages should be loaded */
  onLoadMore?: () => void;
  /** Whether there are more messages to load */
  hasMore?: boolean;
}

/**
 * Props for individual ChatMessage component
 */
export interface ChatMessageProps {
  /** The message to display */
  message: ChatMessage;
  /** Whether this message is from the current user */
  isOwnMessage?: boolean;
  /** Whether to show the timestamp */
  showTimestamp?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Props for the OnlineUsers component
 */
export interface OnlineUsersProps {
  /** Array of online users */
  users: OnlineUser[];
  /** Current user ID to exclude from list */
  currentUserId?: string;
  /** Maximum number of users to show before scrolling */
  maxVisible?: number;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Chat service configuration options
 */
export interface ChatServiceConfig {
  /** Maximum number of messages to keep in memory */
  maxMessages?: number;
  /** Interval for presence heartbeat in milliseconds */
  presenceHeartbeatInterval?: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Base delay for reconnection attempts in milliseconds */
  reconnectDelay?: number;
  /** Whether to enable debug logging */
  debug?: boolean;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum messages per time window */
  maxMessages: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Message to show when rate limited */
  message?: string;
}

/**
 * Message validation result
 */
export interface MessageValidationResult {
  /** Whether the message is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Sanitized message content */
  sanitizedContent?: string;
}

/**
 * Chat event types for real-time subscriptions
 */
export type ChatEventType = 'message_sent' | 'user_joined' | 'user_left' | 'user_typing';

/**
 * Chat event payload structure
 */
export interface ChatEvent {
  /** Type of the event */
  type: ChatEventType;
  /** Event payload data */
  payload: ChatMessage | OnlineUser | { user_id: string; username: string };
  /** Timestamp of the event */
  timestamp: string;
}

/**
 * Supabase real-time payload structure for chat messages
 */
export interface ChatRealtimePayload {
  /** Type of database change */
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  /** New record data */
  new: ChatMessage;
  /** Old record data (for updates/deletes) */
  old: ChatMessage | null;
  /** Schema name */
  schema: string;
  /** Table name */
  table: string;
}

/**
 * Chat statistics for monitoring
 */
export interface ChatStats {
  /** Total messages sent */
  totalMessages: number;
  /** Number of active users */
  activeUsers: number;
  /** Messages per minute */
  messagesPerMinute: number;
  /** Average message length */
  averageMessageLength: number;
  /** Connection uptime in milliseconds */
  uptime: number;
}

// Constants for chat system configuration
export const CHAT_CONFIG = {
  /** Maximum message length */
  MAX_MESSAGE_LENGTH: 500,
  /** Maximum messages to load initially */
  INITIAL_MESSAGE_LIMIT: 50,
  /** Rate limit: max messages per window */
  RATE_LIMIT_MAX_MESSAGES: 5,
  /** Rate limit: time window in milliseconds */
  RATE_LIMIT_WINDOW_MS: 10000,
  /** Presence timeout in milliseconds */
  PRESENCE_TIMEOUT_MS: 30000,
  /** Heartbeat interval in milliseconds */
  HEARTBEAT_INTERVAL_MS: 15000,
  /** Reconnection delay in milliseconds */
  RECONNECT_DELAY_MS: 1000,
  /** Maximum reconnection attempts */
  MAX_RECONNECT_ATTEMPTS: 5,
} as const;

/**
 * Type guard to check if an object is a valid ChatMessage
 */
export function isChatMessage(obj: any): obj is ChatMessage {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.user_id === 'string' &&
    typeof obj.username === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string'
  );
}

/**
 * Type guard to check if an object is a valid OnlineUser
 */
export function isOnlineUser(obj: any): obj is OnlineUser {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj === 'object' &&
    typeof obj.user_id === 'string' &&
    typeof obj.username === 'string' &&
    typeof obj.last_seen === 'string' &&
    typeof obj.is_online === 'boolean'
  );
}

/**
 * Utility type for chat message creation (without generated fields)
 */
export type CreateChatMessage = Omit<ChatMessage, 'id' | 'created_at' | 'updated_at'>;

/**
 * Utility type for updating online user presence
 */
export type UpdateUserPresence = Omit<OnlineUser, 'last_seen'>;

/**
 * Message status for optimistic updates
 */
export const MessageStatus = {
  SENDING: 'sending',
  SENT: 'sent',
  FAILED: 'failed',
} as const;

export type MessageStatus = typeof MessageStatus[keyof typeof MessageStatus];

/**
 * Extended chat message with local state
 */
export interface ChatMessageWithStatus extends ChatMessage {
  /** Local message status for optimistic updates */
  status?: MessageStatus;
  /** Temporary ID for optimistic updates */
  tempId?: string;
}

/**
 * Chat error types
 */
export const ChatErrorType = {
  CONNECTION_FAILED: 'connection_failed',
  MESSAGE_SEND_FAILED: 'message_send_failed',
  AUTHENTICATION_REQUIRED: 'authentication_required',
  RATE_LIMITED: 'rate_limited',
  MESSAGE_TOO_LONG: 'message_too_long',
  PROFANITY_DETECTED: 'profanity_detected',
  NETWORK_ERROR: 'network_error',
  TIMEOUT_ERROR: 'timeout_error',
  UNKNOWN_ERROR: 'unknown_error',
} as const;

export type ChatErrorType = typeof ChatErrorType[keyof typeof ChatErrorType];

/**
 * Structured chat error
 */
export interface ChatError {
  /** Type of error */
  type: ChatErrorType;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, any>;
  /** Timestamp when error occurred */
  timestamp: string;
}

/**
 * Chat notification types
 */
export enum ChatNotificationType {
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  MESSAGE_RECEIVED = 'message_received',
  CONNECTION_RESTORED = 'connection_restored',
}

/**
 * Chat notification
 */
export interface ChatNotification {
  /** Type of notification */
  type: ChatNotificationType;
  /** Notification message */
  message: string;
  /** User involved in the notification */
  user?: Pick<OnlineUser, 'user_id' | 'username'>;
  /** Timestamp of notification */
  timestamp: string;
  /** Whether notification should be shown to user */
  showToUser?: boolean;
}

/**
 * Offline message queue item
 */
export interface QueuedMessage {
  /** Temporary ID for tracking */
  tempId: string;
  /** Message content */
  content: string;
  /** User ID who sent the message */
  userId: string;
  /** Username who sent the message */
  username: string;
  /** Timestamp when message was queued */
  queuedAt: string;
  /** Number of retry attempts */
  retryCount: number;
  /** Maximum retry attempts */
  maxRetries: number;
}

/**
 * Connection health status
 */
export interface ConnectionHealth {
  /** Overall connection status */
  status: ConnectionStatus;
  /** Last successful connection timestamp */
  lastConnected?: string;
  /** Current reconnection attempt number */
  reconnectAttempt: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts: number;
  /** Next reconnection delay in milliseconds */
  nextReconnectDelay: number;
  /** Whether offline message queue is enabled */
  offlineQueueEnabled: boolean;
  /** Number of queued messages */
  queuedMessageCount: number;
  /** Last error that occurred */
  lastError?: ChatError;
}

/**
 * Network status information
 */
export interface NetworkStatus {
  /** Whether the browser is online */
  isOnline: boolean;
  /** Estimated connection type */
  connectionType?: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  /** Estimated effective bandwidth */
  effectiveBandwidth?: number;
  /** Round trip time estimate */
  rtt?: number;
}