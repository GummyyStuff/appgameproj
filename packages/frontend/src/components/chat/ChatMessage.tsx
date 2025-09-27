/**
 * ChatMessage Component
 * Displays individual chat messages with Tarkov-themed styling
 * Requirements: 1.2, 2.2, 3.1, 3.2, 4.1
 */

import React from 'react';
import type { ChatMessageProps } from '../../types/chat';
import { sanitizeMessage } from '../../utils/chat-validation';
import './ChatMessage.css';

/**
 * Format timestamp to relative time display
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffMs = now.getTime() - messageTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return messageTime.toLocaleDateString();
  }
}

/**
 * Format timestamp for tooltip (full date/time)
 */
function formatFullTimestamp(timestamp: string): string {
  const messageTime = new Date(timestamp);
  return messageTime.toLocaleString();
}

/**
 * Sanitize and prepare message content for display
 */
function prepareMessageContent(content: string): string {
  // More aggressive sanitization approach
  let sanitized = content.trim();
  
  // Remove HTML tags and their content completely
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove javascript: protocols and event handlers
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Remove common XSS patterns
  sanitized = sanitized.replace(/alert\s*\(/gi, '');
  sanitized = sanitized.replace(/eval\s*\(/gi, '');
  sanitized = sanitized.replace(/document\./gi, '');
  sanitized = sanitized.replace(/window\./gi, '');
  
  // Clean up multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  // Apply the basic sanitization from the utility
  sanitized = sanitizeMessage(sanitized);
  
  return sanitized;
}

/**
 * ChatMessage component for displaying individual messages
 */
export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isOwnMessage = false,
  showTimestamp = true,
  className = '',
}) => {
  // Sanitize message content for safe display
  const safeContent = prepareMessageContent(message.content);
  const relativeTime = formatRelativeTime(message.created_at);
  const fullTimestamp = formatFullTimestamp(message.created_at);

  return (
    <div
      className={`chat-message ${isOwnMessage ? 'own-message' : 'other-message'} ${className}`}
      data-testid="chat-message"
      data-message-id={message.id}
      data-user-id={message.user_id}
    >
      <div className="message-header">
        <span 
          className="message-username"
          data-testid="message-username"
        >
          {message.username}
        </span>
        {showTimestamp && (
          <span 
            className="message-timestamp"
            title={fullTimestamp}
            data-testid="message-timestamp"
          >
            {relativeTime}
          </span>
        )}
      </div>
      <div 
        className="message-content"
        data-testid="message-content"
      >
        {safeContent}
      </div>
    </div>
  );
};

export default ChatMessage;