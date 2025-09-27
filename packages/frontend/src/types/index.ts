/**
 * Type definitions index file
 * Exports all type definitions for the frontend application
 */

// Chat system types
export * from './chat';

// Re-export commonly used types for convenience
export type {
  ChatMessage,
  OnlineUser,
  ChatContextType,
  ConnectionStatus,
  ChatSidebarProps,
  MessageInputProps,
  MessageListProps,
  ChatMessageProps,
  OnlineUsersProps,
  ChatMessageWithStatus,
  ChatError,
  ChatNotification,
} from './chat';

// Re-export enums
export {
  MessageStatus,
  ChatErrorType,
  ChatNotificationType,
} from './chat';