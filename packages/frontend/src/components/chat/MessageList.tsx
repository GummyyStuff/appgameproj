/**
 * MessageList Component
 * Displays a scrollable list of chat messages with virtual scrolling for performance
 * Requirements: 2.2, 2.3, 3.1, 3.2
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MessageListProps, ChatMessage } from '../../types/chat';
import ChatMessageComponent from './ChatMessage';
import './MessageList.css';

// Virtual scrolling configuration
const ITEM_HEIGHT = 60; // Approximate height of each message
const BUFFER_SIZE = 5; // Number of items to render outside visible area
const SCROLL_THRESHOLD = 100; // Pixels from top to trigger load more

/**
 * MessageList component with virtual scrolling for performance optimization
 */
const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isLoading = false,
  onLoadMore,
  hasMore = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);
  const [scrollTop, setScrollTop] = useState(0);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const lastMessageCountRef = useRef(messages.length);

  // Calculate visible range for virtual scrolling
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
    const endIndex = Math.min(
      messages.length,
      Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_SIZE
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, messages.length]);

  // Get visible messages
  const visibleMessages = useMemo(() => {
    return messages.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [messages, visibleRange]);

  // Handle container resize
  useEffect(() => {
    const updateContainerHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateContainerHeight();
    window.addEventListener('resize', updateContainerHeight);
    return () => window.removeEventListener('resize', updateContainerHeight);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current && shouldAutoScroll) {
      scrollToBottom();
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, shouldAutoScroll]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const maxScrollTop = Math.max(0, messages.length * ITEM_HEIGHT - containerHeight);
      scrollRef.current.scrollTop = maxScrollTop;
      setScrollTop(maxScrollTop);
    }
  }, [messages.length, containerHeight]);

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const newScrollTop = target.scrollTop;
    setScrollTop(newScrollTop);

    // Check if user is near bottom for auto-scroll
    const maxScrollTop = Math.max(0, messages.length * ITEM_HEIGHT - containerHeight);
    const isNearBottom = newScrollTop >= maxScrollTop - 50;
    setShouldAutoScroll(isNearBottom);

    // Load more messages if scrolled to top
    if (newScrollTop <= SCROLL_THRESHOLD && hasMore && onLoadMore && !isLoading) {
      onLoadMore();
    }
  }, [messages.length, containerHeight, hasMore, onLoadMore, isLoading]);

  // Render empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="message-list" ref={containerRef}>
        <div className="message-list__empty">
          <div className="message-list__empty-icon">💬</div>
          <p className="message-list__empty-text">No messages yet</p>
          <p className="message-list__empty-subtext">Be the first to start the conversation!</p>
        </div>
      </div>
    );
  }

  // Calculate total height for virtual scrolling
  const totalHeight = messages.length * ITEM_HEIGHT;

  return (
    <div className="message-list" ref={containerRef}>
      {/* Loading indicator at top */}
      {isLoading && hasMore && (
        <div className="message-list__loading">
          <div className="message-list__loading-spinner"></div>
          <span>Loading messages...</span>
        </div>
      )}

      {/* Virtual scrolling container */}
      <div
        className="message-list__scroll-container"
        ref={scrollRef}
        onScroll={handleScroll}
        tabIndex={0}
        role="log"
        aria-label="Chat messages"
      >
        {/* Virtual spacer for total height */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Visible messages */}
          <div
            style={{
              transform: `translateY(${visibleRange.startIndex * ITEM_HEIGHT}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            {visibleMessages.map((message, index) => {
              const actualIndex = visibleRange.startIndex + index;
              return (
                <div
                  key={message.id}
                  className="message-list__item"
                  style={{ height: ITEM_HEIGHT }}
                >
                  <ChatMessageComponent
                    message={message}
                    isOwnMessage={message.user_id === currentUserId}
                    showTimestamp={true}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scroll to bottom button */}
      {!shouldAutoScroll && (
        <button
          className="message-list__scroll-to-bottom"
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
        >
          <span className="message-list__scroll-icon">↓</span>
          New messages
        </button>
      )}

      {/* Initial loading state */}
      {isLoading && messages.length === 0 && (
        <div className="message-list__initial-loading">
          <div className="message-list__loading-spinner"></div>
          <p>Loading chat history...</p>
        </div>
      )}
    </div>
  );
};

export default MessageList;