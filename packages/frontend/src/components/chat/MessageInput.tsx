/**
 * MessageInput Component
 * Input field for sending chat messages with validation and rate limiting
 * Requirements: 1.1, 1.3, 1.4, 4.1, 4.2, 4.3
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { MessageInputProps } from '../../types/chat';
import { 
  validateMessageComprehensive,
  getRemainingCharacters,
  formatCharacterCount,
  isApproachingLimit,
  checkRateLimit,
  getRateLimitStatus,
  CHAT_CONSTRAINTS
} from '../../utils/chat-validation';
import './MessageInput.css';

/**
 * MessageInput component for sending chat messages
 */
export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message...',
  maxLength = CHAT_CONSTRAINTS.MESSAGE_MAX_LENGTH,
  isAuthenticated = false,
}) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remaining: number;
    resetTime: number;
  } | null>(null);
  const [showCharacterCount, setShowCharacterCount] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mock user ID for rate limiting (in real app, this would come from auth context)
  const userId = 'current-user-id';

  /**
   * Update rate limit status
   */
  const updateRateLimitStatus = useCallback(() => {
    if (!isAuthenticated) return;
    
    const status = getRateLimitStatus(userId);
    if (status) {
      setRateLimitInfo({
        remaining: status.remaining,
        resetTime: status.resetTime,
      });
    }
  }, [userId, isAuthenticated]);

  /**
   * Handle input change with validation
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Enforce max length
    if (value.length > maxLength) {
      return;
    }
    
    setMessage(value);
    setValidationError(null);
    
    // Show character count when approaching limit
    setShowCharacterCount(isApproachingLimit(value, 0.8));
    
    // Update rate limit status
    updateRateLimitStatus();
  }, [maxLength, updateRateLimitStatus]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setValidationError('You must be logged in to send messages');
      return;
    }
    
    if (isSubmitting || disabled) {
      return;
    }

    // Comprehensive validation including rate limiting
    const validation = validateMessageComprehensive(message.trim(), userId);
    
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid message');
      
      // If rate limited, show countdown
      if (validation.rateLimitInfo) {
        const resetTime = validation.rateLimitInfo.resetTime;
        const now = Date.now();
        const waitTime = Math.ceil((resetTime - now) / 1000);
        setValidationError(`Rate limited. Please wait ${waitTime} seconds.`);
        
        // Clear error after wait time
        if (submitTimeoutRef.current) {
          clearTimeout(submitTimeoutRef.current);
        }
        submitTimeoutRef.current = setTimeout(() => {
          setValidationError(null);
          updateRateLimitStatus();
        }, waitTime * 1000);
      }
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      await onSendMessage(validation.sanitizedContent!);
      setMessage('');
      setShowCharacterCount(false);
      updateRateLimitStatus();
      
      // Focus back to input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setValidationError('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [message, isAuthenticated, isSubmitting, disabled, userId, onSendMessage, updateRateLimitStatus]);

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter to send (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
    
    // Escape to clear
    if (e.key === 'Escape') {
      setMessage('');
      setValidationError(null);
      setShowCharacterCount(false);
    }
  }, [handleSubmit]);

  /**
   * Handle input focus
   */
  const handleFocus = useCallback(() => {
    if (!isAuthenticated) {
      setValidationError('You must be logged in to send messages');
    } else {
      updateRateLimitStatus();
    }
  }, [isAuthenticated, updateRateLimitStatus]);

  /**
   * Clear timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Update rate limit status periodically
   */
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(updateRateLimitStatus, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, updateRateLimitStatus]);

  const remainingChars = getRemainingCharacters(message);
  const characterCountText = formatCharacterCount(message);
  const isNearLimit = isApproachingLimit(message);
  const canSubmit = message.trim().length > 0 && !isSubmitting && !disabled && isAuthenticated;

  return (
    <div className="message-input-container" data-testid="message-input-container">
      <form onSubmit={handleSubmit} className="message-input-form">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={isAuthenticated ? placeholder : 'Login to chat...'}
            disabled={disabled || !isAuthenticated}
            maxLength={maxLength}
            className={`message-input ${validationError ? 'error' : ''} ${isNearLimit ? 'near-limit' : ''}`}
            data-testid="message-input"
            autoComplete="off"
            spellCheck="true"
          />
          
          <button
            type="submit"
            disabled={!canSubmit}
            className={`send-button ${canSubmit ? 'active' : 'inactive'}`}
            data-testid="send-button"
            title={canSubmit ? 'Send message (Enter)' : 'Type a message to send'}
          >
            {isSubmitting ? (
              <span className="loading-spinner" data-testid="loading-spinner" />
            ) : (
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                className="send-icon"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9"></polygon>
              </svg>
            )}
          </button>
        </div>

        {/* Character count and rate limit info */}
        <div className="input-info">
          {showCharacterCount && (
            <span 
              className={`character-count ${isNearLimit ? 'warning' : ''}`}
              data-testid="character-count"
            >
              {remainingChars} characters remaining
            </span>
          )}
          
          {rateLimitInfo && rateLimitInfo.remaining < 3 && (
            <span 
              className="rate-limit-warning"
              data-testid="rate-limit-warning"
            >
              {rateLimitInfo.remaining} messages remaining
            </span>
          )}
        </div>

        {/* Error message */}
        {validationError && (
          <div 
            className="validation-error"
            data-testid="validation-error"
            role="alert"
          >
            {validationError}
          </div>
        )}

        {/* Login prompt for unauthenticated users */}
        {!isAuthenticated && (
          <div 
            className="login-prompt"
            data-testid="login-prompt"
          >
            <span>Please log in to participate in chat</span>
          </div>
        )}
      </form>

      {/* Keyboard shortcuts help */}
      <div className="keyboard-shortcuts" data-testid="keyboard-shortcuts">
        <small>
          <kbd>Enter</kbd> to send • <kbd>Esc</kbd> to clear
        </small>
      </div>
    </div>
  );
};

export default MessageInput;