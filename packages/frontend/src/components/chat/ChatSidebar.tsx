import React, { useCallback, useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { useMobileChat, useMobileChatAccessibility } from '../../hooks/useMobileChat';
import MessageList from './MessageList';
import { MessageInput } from './MessageInput';
import { OnlineUsers } from './OnlineUsers';
import { ChatLoginPrompt } from './ChatLoginPrompt';
import { ConnectionStatus } from './ConnectionStatus';
import { ChatSidebarProps } from '../../types/chat';
import './ChatSidebar.css';

/**
 * ChatSidebar - Main container component for the chat system
 * Requirements: 3.1, 3.2, 3.3, 6.4
 */
export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isCollapsed = false,
  onToggle,
  className = '',
  showOnlineUsers = true,
}) => {
  const {
    messages,
    onlineUsers,
    sendMessage,
    isConnected,
    connectionStatus,
    isAuthenticated,
    currentUser,
    error,
    isLoading,
    clearError,
    reconnect,
    connectionHealth,
    networkStatus,
    retryFailedMessages,
    clearMessageQueue,
  } = useChat();
  
  const { user, loading: authLoading } = useAuth();
  const chatRef = useRef<HTMLDivElement>(null);

  // Mobile chat functionality
  const { mobileState, getChatContainerClasses, getOptimalChatHeight, shouldShowOverlay } = useMobileChat(
    {
      swipeThreshold: 100,
      enablePullRefresh: true,
      enableTapOutside: true,
      keyboardThreshold: 150,
    },
    {
      onSwipeClose: onToggle,
      onTapOutside: onToggle,
      onPullRefresh: async () => {
        // Refresh messages or reconnect
        if (!isConnected) {
          reconnect();
        }
      },
    }
  );

  const { announcements, announceMessage, focusMessageInput } = useMobileChatAccessibility();

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content);
      // Announce message sent for accessibility
      announceMessage('Message sent');
    } catch (err) {
      console.error('Failed to send message:', err);
      announceMessage('Failed to send message');
    }
  };

  // Handle mobile keyboard visibility
  useEffect(() => {
    if (mobileState.isKeyboardOpen && chatRef.current) {
      // Adjust chat height when keyboard is open
      chatRef.current.style.height = `${mobileState.viewportHeight}px`;
    } else if (chatRef.current) {
      chatRef.current.style.height = getOptimalChatHeight();
    }
  }, [mobileState.isKeyboardOpen, mobileState.viewportHeight, getOptimalChatHeight]);

  // Announce connection status changes
  useEffect(() => {
    if (connectionStatus === 'connected') {
      announceMessage('Chat connected');
    } else if (connectionStatus === 'disconnected') {
      announceMessage('Chat disconnected');
    }
  }, [connectionStatus, announceMessage]);

  if (isCollapsed) {
    return (
      <div className={`${getChatContainerClasses(true)} ${className}`}>
        <button 
          className="chat-sidebar__toggle"
          onClick={onToggle}
          aria-label="Open chat"
          aria-expanded="false"
        >
          💬
          {mobileState.isMobile && (
            <span className="chat-sidebar__toggle-text">Chat</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {shouldShowOverlay() && !isCollapsed && (
        <div 
          className="chat-sidebar__overlay"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
      
      <div 
        ref={chatRef}
        className={`${getChatContainerClasses(false)} ${className}`}
        role="complementary"
        aria-label="Chat sidebar"
        style={{
          height: getOptimalChatHeight(),
        }}
      >
        {/* Accessibility announcements */}
        <div 
          className="sr-only" 
          aria-live="polite" 
          aria-atomic="true"
        >
          {announcements.map((announcement, index) => (
            <div key={index}>{announcement}</div>
          ))}
        </div>

        <div className="chat-sidebar__header">
          <div className="chat-sidebar__title">
            <span className="chat-sidebar__icon">💬</span>
            Chat
            {mobileState.isMobile && onlineUsers.length > 0 && (
              <span className="chat-sidebar__user-count">
                ({onlineUsers.length} online)
              </span>
            )}
          </div>
          <div className="chat-sidebar__controls">
            {onToggle && (
              <button 
                className="chat-sidebar__toggle"
                onClick={onToggle}
                aria-label="Close chat"
                aria-expanded="true"
              >
                {mobileState.isMobile ? '✕' : '✕'}
              </button>
            )}
          </div>
        </div>

      {/* Enhanced connection status indicator */}
      <div className="chat-sidebar__connection-status">
        <ConnectionStatus
          connectionStatus={connectionStatus}
          connectionHealth={connectionHealth}
          networkStatus={networkStatus}
          onRetry={reconnect}
          onRetryMessages={retryFailedMessages}
          onClearQueue={clearMessageQueue}
          showDetails={connectionStatus !== 'connected'}
        />
      </div>

      {error && (
        <div className="chat-sidebar__error">
          <span className="chat-sidebar__error-text">{error}</span>
          <button 
            className="chat-sidebar__error-close"
            onClick={clearError}
            aria-label="Close error"
          >
            ✕
          </button>
        </div>
      )}

      <div className="chat-sidebar__content">
        {/* Show loading state during authentication */}
        {authLoading && (
          <div className="chat-sidebar__loading">
            <div className="chat-sidebar__loading-spinner"></div>
            <p>Authenticating...</p>
          </div>
        )}

        {/* Show login prompt for unauthenticated users */}
        {!authLoading && !isAuthenticated && (
          <div className="chat-sidebar__auth-section">
            <ChatLoginPrompt compact />
          </div>
        )}

        {/* Show chat interface for authenticated users */}
        {!authLoading && isAuthenticated && (
          <>
            <div className="chat-sidebar__messages">
              <MessageList
                messages={messages}
                currentUserId={currentUser?.id}
                isLoading={isLoading}
              />
            </div>

            {showOnlineUsers && (
              <div className="chat-sidebar__online-users">
                <OnlineUsers
                  users={onlineUsers}
                  currentUserId={currentUser?.id}
                  maxVisible={8}
                />
              </div>
            )}

            <div className="chat-sidebar__input">
              <MessageInput
                onSendMessage={handleSendMessage}
                disabled={!isConnected || !isAuthenticated}
                isAuthenticated={isAuthenticated}
                placeholder={
                  !isConnected 
                    ? "Connecting..." 
                    : mobileState.isMobile
                    ? "Message..."
                    : "Type a message..."
                }
              />
            </div>

            {/* Mobile pull-to-refresh indicator */}
            {mobileState.isMobile && (
              <div className="chat-sidebar__pull-indicator">
                <span>Pull down to refresh</span>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </>
  );
};

export default ChatSidebar;