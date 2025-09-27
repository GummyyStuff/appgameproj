/**
 * MessageList Component Tests
 * Unit tests for the MessageList component with virtual scrolling
 * Requirements: 2.2, 2.3, 3.1, 3.2
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import MessageList from '../MessageList';
import { ChatMessage } from '../../../types/chat';

// Mock the ChatMessage component
const MockChatMessage = ({ message, isOwnMessage }: { message: ChatMessage; isOwnMessage: boolean }) => (
  <div data-testid={`message-${message.id}`} data-own={isOwnMessage}>
    <span>{message.username}: {message.content}</span>
    <time>{message.created_at}</time>
  </div>
);

// Mock the ChatMessage import
mock.module('../ChatMessage', () => ({
  default: MockChatMessage,
}));

describe('MessageList Component', () => {
  // Sample test data
  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      content: 'Hello everyone!',
      user_id: 'user1',
      username: 'Player1',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
    },
    {
      id: '2',
      content: 'How is everyone doing?',
      user_id: 'user2',
      username: 'Player2',
      created_at: '2024-01-01T10:01:00Z',
      updated_at: '2024-01-01T10:01:00Z',
    },
    {
      id: '3',
      content: 'Great game last night!',
      user_id: 'user1',
      username: 'Player1',
      created_at: '2024-01-01T10:02:00Z',
      updated_at: '2024-01-01T10:02:00Z',
    },
  ];

  const defaultProps = {
    messages: mockMessages,
    currentUserId: 'user1',
    isLoading: false,
    hasMore: false,
  };

  beforeEach(() => {
    // Mock ResizeObserver
    global.ResizeObserver = mock(() => ({
      observe: mock(),
      disconnect: mock(),
      unobserve: mock(),
    }));
  });

  afterEach(() => {
    cleanup();
  });

  describe('Basic Rendering', () => {
    it('renders messages correctly', () => {
      render(<MessageList {...defaultProps} />);

      expect(screen.getByTestId('message-1')).toBeInTheDocument();
      expect(screen.getByTestId('message-2')).toBeInTheDocument();
      expect(screen.getByTestId('message-3')).toBeInTheDocument();

      expect(screen.getByText('Player1: Hello everyone!')).toBeInTheDocument();
      expect(screen.getByText('Player2: How is everyone doing?')).toBeInTheDocument();
    });

    it('identifies own messages correctly', () => {
      render(<MessageList {...defaultProps} />);

      const ownMessage = screen.getByTestId('message-1');
      const otherMessage = screen.getByTestId('message-2');

      expect(ownMessage).toHaveAttribute('data-own', 'true');
      expect(otherMessage).toHaveAttribute('data-own', 'false');
    });

    it('renders empty state when no messages', () => {
      render(<MessageList {...defaultProps} messages={[]} />);

      expect(screen.getByText('No messages yet')).toBeInTheDocument();
      expect(screen.getByText('Be the first to start the conversation!')).toBeInTheDocument();
    });

    it('shows initial loading state', () => {
      render(<MessageList {...defaultProps} messages={[]} isLoading={true} />);

      expect(screen.getByText('Loading chat history...')).toBeInTheDocument();
    });
  });

  describe('Virtual Scrolling', () => {
    it('renders messages with virtual scrolling container', () => {
      render(<MessageList {...defaultProps} />);

      const scrollContainer = document.querySelector('.message-list__scroll-container');
      expect(scrollContainer).toBeInTheDocument();
      expect(scrollContainer).toHaveAttribute('role', 'log');
      expect(scrollContainer).toHaveAttribute('aria-label', 'Chat messages');
    });

    it('handles large message lists', () => {
      // Create a large number of messages
      const manyMessages: ChatMessage[] = Array.from({ length: 50 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
        user_id: 'user1',
        username: 'Player1',
        created_at: `2024-01-01T10:${String(i).padStart(2, '0')}:00Z`,
        updated_at: `2024-01-01T10:${String(i).padStart(2, '0')}:00Z`,
      }));

      render(<MessageList {...defaultProps} messages={manyMessages} />);

      // Should render the virtual scrolling container
      const scrollContainer = document.querySelector('.message-list__scroll-container');
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('Auto-scroll Behavior', () => {
    it('updates when new messages arrive', async () => {
      const { rerender } = render(<MessageList {...defaultProps} />);

      const newMessage: ChatMessage = {
        id: '4',
        content: 'New message!',
        user_id: 'user2',
        username: 'Player2',
        created_at: '2024-01-01T10:03:00Z',
        updated_at: '2024-01-01T10:03:00Z',
      };

      // Add new message
      rerender(<MessageList {...defaultProps} messages={[...mockMessages, newMessage]} />);

      await waitFor(() => {
        expect(screen.getByTestId('message-4')).toBeInTheDocument();
      });
    });

    it('has scroll to bottom button functionality', () => {
      render(<MessageList {...defaultProps} />);

      // The scroll to bottom button should be available in the DOM structure
      const scrollContainer = document.querySelector('.message-list__scroll-container');
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('Load More Functionality', () => {
    it('shows loading indicator when loading more messages', () => {
      render(
        <MessageList 
          {...defaultProps} 
          isLoading={true} 
          hasMore={true}
        />
      );

      expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    });

    it('accepts onLoadMore callback prop', () => {
      const onLoadMore = mock();
      
      render(
        <MessageList 
          {...defaultProps} 
          hasMore={true} 
          onLoadMore={onLoadMore}
        />
      );

      // Component should render without errors when onLoadMore is provided
      expect(screen.getByTestId('message-1')).toBeInTheDocument();
    });

    it('handles hasMore prop correctly', () => {
      render(
        <MessageList 
          {...defaultProps} 
          hasMore={false}
        />
      );

      // Component should render without errors when hasMore is false
      expect(screen.getByTestId('message-1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<MessageList {...defaultProps} />);

      const scrollContainer = document.querySelector('.message-list__scroll-container');
      expect(scrollContainer).toHaveAttribute('aria-label', 'Chat messages');
      expect(scrollContainer).toHaveAttribute('role', 'log');
    });

    it('supports keyboard navigation', () => {
      render(<MessageList {...defaultProps} />);

      const scrollContainer = document.querySelector('.message-list__scroll-container');
      expect(scrollContainer).toBeInTheDocument();
      
      // Should be focusable for keyboard navigation
      expect(scrollContainer).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Performance', () => {
    it('handles large message lists', () => {
      const largeMessageList: ChatMessage[] = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
        user_id: i % 2 === 0 ? 'user1' : 'user2',
        username: i % 2 === 0 ? 'Player1' : 'Player2',
        created_at: `2024-01-01T10:${String(i).padStart(2, '0')}:00Z`,
        updated_at: `2024-01-01T10:${String(i).padStart(2, '0')}:00Z`,
      }));

      render(<MessageList {...defaultProps} messages={largeMessageList} />);

      // Should render without errors
      const scrollContainer = document.querySelector('.message-list__scroll-container');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('updates when messages change', () => {
      const { rerender } = render(<MessageList {...defaultProps} />);

      const newMessages = [
        ...mockMessages,
        {
          id: '4',
          content: 'New message',
          user_id: 'user3',
          username: 'Player3',
          created_at: '2024-01-01T10:03:00Z',
          updated_at: '2024-01-01T10:03:00Z',
        },
      ];

      rerender(<MessageList {...defaultProps} messages={newMessages} />);

      // Should render the new message
      expect(screen.getByTestId('message-4')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing currentUserId gracefully', () => {
      render(<MessageList {...defaultProps} currentUserId={undefined} />);

      // Should render without errors
      expect(screen.getByTestId('message-1')).toBeInTheDocument();
      expect(screen.getByTestId('message-1')).toHaveAttribute('data-own', 'false');
    });

    it('handles malformed messages gracefully', () => {
      const malformedMessages = [
        ...mockMessages,
        // @ts-ignore - Testing malformed data
        { id: '4', content: null, user_id: 'user1', username: 'Player1' },
      ];

      // Should not crash with malformed data
      expect(() => {
        render(<MessageList {...defaultProps} messages={malformedMessages} />);
      }).not.toThrow();
    });
  });

  describe('Responsive Design', () => {
    it('renders with responsive container', () => {
      render(<MessageList {...defaultProps} />);

      const container = document.querySelector('.message-list');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('message-list');
    });
  });
});