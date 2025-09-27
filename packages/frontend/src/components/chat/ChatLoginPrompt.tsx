/**
 * ChatLoginPrompt Component
 * Login prompt specifically for the chat system when users are not authenticated
 * Requirements: 1.3, 6.1
 */

import React from 'react';
import { Link } from 'react-router';
import './ChatLoginPrompt.css';

interface ChatLoginPromptProps {
  /** Additional CSS class names */
  className?: string;
  /** Whether to show as a compact version */
  compact?: boolean;
}

/**
 * ChatLoginPrompt component for unauthenticated users
 */
export const ChatLoginPrompt: React.FC<ChatLoginPromptProps> = ({
  className = '',
  compact = false,
}) => {
  return (
    <div 
      className={`chat-login-prompt ${compact ? 'chat-login-prompt--compact' : ''} ${className}`}
      data-testid="chat-login-prompt"
    >
      <div className="chat-login-prompt__content">
        {!compact && (
          <div className="chat-login-prompt__icon">
            💬
          </div>
        )}
        
        <div className="chat-login-prompt__text">
          <h3 className="chat-login-prompt__title">
            {compact ? 'Login to Chat' : 'Join the Conversation'}
          </h3>
          <p className="chat-login-prompt__description">
            {compact 
              ? 'Sign in to participate in chat'
              : 'Connect with other operators and share your gaming experience'
            }
          </p>
        </div>

        <div className="chat-login-prompt__actions">
          <Link 
            to="/login" 
            className="chat-login-prompt__button chat-login-prompt__button--primary"
            data-testid="login-button"
          >
            Login
          </Link>
          
          {!compact && (
            <Link 
              to="/register" 
              className="chat-login-prompt__button chat-login-prompt__button--secondary"
              data-testid="register-button"
            >
              Register
            </Link>
          )}
        </div>
      </div>

      {!compact && (
        <div className="chat-login-prompt__features">
          <ul className="chat-login-prompt__feature-list">
            <li className="chat-login-prompt__feature">
              <span className="chat-login-prompt__feature-icon">🎯</span>
              Real-time messaging
            </li>
            <li className="chat-login-prompt__feature">
              <span className="chat-login-prompt__feature-icon">👥</span>
              See who's online
            </li>
            <li className="chat-login-prompt__feature">
              <span className="chat-login-prompt__feature-icon">🛡️</span>
              Secure & moderated
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ChatLoginPrompt;