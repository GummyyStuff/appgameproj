/**
 * ChatSidebar Component Tests
 * Tests for layout, responsive behavior, and integration
 * Requirements: 3.1, 3.2, 3.3, 6.4
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { ChatSidebar } from '../ChatSidebar';
import * as useChatHook from '../../../hooks/useChat';

// Mock the child components
mock.module('../MessageList', () => ({
  default: ({ messages, currentUserId, isLoading }: any) => (
    <div data-testid="message-list">
      <div data-testid="message-count">{messages.length}</div>
      <div data-testid="message-list-current-user-id">{currentUserId}</div>
      <div data-testid="loading-state">{isLoading ? 'loading' : 'loaded'}</div>
    </div>
  ),
}));

mock.module('../MessageInput', () => ({
  MessageInput: ({ onSendMessage, disabled, isAuthenticated, placeholder }: any) => (
    <div data-testid="message-input">
      <input
        data-testid="message-input-field"
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {}}
      />
      <button
        data-testid="send-button"
        onClick={() => onSendMessage('test message')}
        disabled={disabled}
      >
        Send
      </button>
      <div data-testid="auth-state">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
    </div>
  ),
}));

mock.module('../OnlineUsers', () => ({
  OnlineUsers: ({ users, currentUserId, maxVisible }: any) => (
    <div data-testid="online-users">
      <div data-testid="online-user-count">{users.length}</div>
      <div data-testid="max-visible">{maxVisible}</div>
      <div data-testid="online-users-current-user-id">{currentUserId}</div>
    </div>
  ),
}));

// Mock the useChat hook
const mockUseChat = mock();
mock.module('../../../hooks/useChat', () => ({
  useChat: mockUseChat,
}));

describe('ChatSidebar', () => {
  const defaultChatState = {
    messages: [
      {
        id: '1',
        content: 'Hello world',
        user_id: 'user1',
        username: 'TestUser',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ],
    onlineUsers: [
      {
        user_id: 'user1',
        username: 'TestUser',
        last_seen: '2023-01-01T00:00:00Z',
        is_online: true,
      },
      {
        user_id: 'user2',
        username: 'OtherUser',
        last_seen: '2023-01-01T00:00:00Z',
        is_online: true,
      },
    ],
    sendMessage: mock(),
    isConnected: true,
    connectionStatus: 'connected' as const,
    isAuthenticated: true,
    currentUser: { id: 'user1', username: 'TestUser' },
    error: null,
    isLoading: false,
    clearError: mock(),
    reconnect: mock(),
    onlineUserCount: 2,
  };

  beforeEach(() => {
    mockUseChat.mockReturnValue(defaultChatState);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Layout and Structure', () => {
    it('renders the main sidebar container with correct classes', () => {
      render(<ChatSidebar />);
      
      const sidebar = document.querySelector('.chat-sidebar');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveClass('chat-sidebar');
    });

    it('renders header with title and status indicator', () => {
      render(<ChatSidebar />);
      
      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByText('🟢')).toBeInTheDocument(); // Connected status
    });

    it('integrates all child components correctly', () => {
      render(<ChatSidebar />);
      
      expect(screen.getByTestId('message-list')).toBeInTheDocument();
      expect(screen.getByTestId('message-input')).toBeInTheDocument();
      expect(screen.getByTestId('online-users')).toBeInTheDocument();
    });

    it('passes correct props to child components', () => {
      render(<ChatSidebar />);
      
      // Check MessageList props
      expect(screen.getByTestId('message-count')).toHaveTextContent('1');
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded');
      
      // Check MessageInput props
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('message-input-field')).not.toBeDisabled();
      
      // Check OnlineUsers props
      expect(screen.getByTestId('online-user-count')).toHaveTextContent('2');
      expect(screen.getByTestId('max-visible')).toHaveTextContent('8');
    });
  });

  describe('Collapsible Functionality', () => {
    it('renders collapsed state correctly', () => {
      render(<ChatSidebar isCollapsed={true} />);
      
      const sidebar = document.querySelector('.chat-sidebar--collapsed');
      expect(sidebar).toBeInTheDocument();
      expect(screen.getByLabelText('Open chat')).toBeInTheDocument();
      expect(screen.getByText('💬')).toBeInTheDocument();
    });

    it('does not render main content when collapsed', () => {
      render(<ChatSidebar isCollapsed={true} />);
      
      expect(screen.queryByTestId('message-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('message-input')).not.toBeInTheDocument();
      expect(screen.queryByTestId('online-users')).not.toBeInTheDocument();
    });

    it('calls onToggle when toggle button is clicked in collapsed state', () => {
      const onToggle = mock();
      render(<ChatSidebar isCollapsed={true} onToggle={onToggle} />);
      
      const toggleButton = screen.getByLabelText('Open chat');
      fireEvent.click(toggleButton);
      
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('calls onToggle when close button is clicked in expanded state', () => {
      const onToggle = mock();
      render(<ChatSidebar onToggle={onToggle} />);
      
      const closeButton = screen.getByLabelText('Close chat');
      fireEvent.click(closeButton);
      
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('does not render toggle button when onToggle is not provided', () => {
      render(<ChatSidebar />);
      
      expect(screen.queryByLabelText('Close chat')).not.toBeInTheDocument();
    });
  });

  describe('Connection Status Display', () => {
    it('displays connected status correctly', () => {
      render(<ChatSidebar />);
      
      expect(screen.getByText('🟢')).toBeInTheDocument();
      const statusElement = document.querySelector('.chat-sidebar__status--connected');
      expect(statusElement).toBeInTheDocument();
    });

    it('displays connecting status correctly', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        connectionStatus: 'connecting',
        isConnected: false,
      });
      
      render(<ChatSidebar />);
      
      expect(screen.getByText('🟡')).toBeInTheDocument();
      const statusElement = document.querySelector('.chat-sidebar__status--connecting');
      expect(statusElement).toBeInTheDocument();
    });

    it('displays disconnected status correctly', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        connectionStatus: 'disconnected',
        isConnected: false,
      });
      
      render(<ChatSidebar />);
      
      expect(screen.getByText('🔴')).toBeInTheDocument();
      const statusElement = document.querySelector('.chat-sidebar__status--disconnected');
      expect(statusElement).toBeInTheDocument();
    });

    it('displays reconnecting status correctly', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        connectionStatus: 'reconnecting',
        isConnected: false,
      });
      
      render(<ChatSidebar />);
      
      expect(screen.getByText('🟡')).toBeInTheDocument();
      const statusElement = document.querySelector('.chat-sidebar__status--reconnecting');
      expect(statusElement).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when present', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        error: 'Connection failed',
      });
      
      render(<ChatSidebar />);
      
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
      expect(screen.getByLabelText('Close error')).toBeInTheDocument();
    });

    it('calls clearError when error close button is clicked', () => {
      const clearError = mock();
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        error: 'Connection failed',
        clearError,
      });
      
      render(<ChatSidebar />);
      
      const closeButton = screen.getByLabelText('Close error');
      fireEvent.click(closeButton);
      
      expect(clearError).toHaveBeenCalledTimes(1);
    });

    it('does not display error section when no error', () => {
      render(<ChatSidebar />);
      
      expect(screen.queryByText('Connection failed')).not.toBeInTheDocument();
      expect(document.querySelector('.chat-sidebar__error')).not.toBeInTheDocument();
    });
  });

  describe('Authentication States', () => {
    it('displays auth prompt when not authenticated', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        isAuthenticated: false,
        currentUser: null,
      });
      
      render(<ChatSidebar />);
      
      expect(screen.getByText('Please log in to participate in chat')).toBeInTheDocument();
    });

    it('does not display auth prompt when authenticated', () => {
      render(<ChatSidebar />);
      
      expect(screen.queryByText('Please log in to participate in chat')).not.toBeInTheDocument();
    });

    it('disables message input when not authenticated', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        isAuthenticated: false,
        currentUser: null,
      });
      
      render(<ChatSidebar />);
      
      expect(screen.getByTestId('message-input-field')).toBeDisabled();
    });

    it('disables message input when not connected', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        isConnected: false,
        connectionStatus: 'disconnected',
      });
      
      render(<ChatSidebar />);
      
      expect(screen.getByTestId('message-input-field')).toBeDisabled();
    });
  });

  describe('Reconnection Functionality', () => {
    it('displays reconnect button when disconnected', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        connectionStatus: 'disconnected',
        isConnected: false,
      });
      
      render(<ChatSidebar />);
      
      expect(screen.getByText('Reconnect')).toBeInTheDocument();
    });

    it('calls reconnect function when reconnect button is clicked', () => {
      const reconnect = mock();
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        connectionStatus: 'disconnected',
        isConnected: false,
        reconnect,
      });
      
      render(<ChatSidebar />);
      
      const reconnectButton = screen.getByText('Reconnect');
      fireEvent.click(reconnectButton);
      
      expect(reconnect).toHaveBeenCalledTimes(1);
    });

    it('does not display reconnect button when connected', () => {
      render(<ChatSidebar />);
      
      expect(screen.queryByText('Reconnect')).not.toBeInTheDocument();
    });
  });

  describe('Message Sending', () => {
    it('handles message sending correctly', async () => {
      const sendMessage = mock().mockResolvedValue(undefined);
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        sendMessage,
      });
      
      render(<ChatSidebar />);
      
      const sendButton = screen.getByTestId('send-button');
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(sendMessage).toHaveBeenCalledWith('test message');
      });
    });

    it('handles message sending errors gracefully', async () => {
      const sendMessage = mock().mockRejectedValue(new Error('Send failed'));
      const consoleSpy = mock().mockImplementation(() => {});
      const originalConsoleError = console.error;
      console.error = consoleSpy;
      
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        sendMessage,
      });
      
      render(<ChatSidebar />);
      
      const sendButton = screen.getByTestId('send-button');
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to send message:', expect.any(Error));
      });
      
      console.error = originalConsoleError;
    });
  });

  describe('Optional Features', () => {
    it('hides online users when showOnlineUsers is false', () => {
      render(<ChatSidebar showOnlineUsers={false} />);
      
      expect(screen.queryByTestId('online-users')).not.toBeInTheDocument();
    });

    it('shows online users by default', () => {
      render(<ChatSidebar />);
      
      expect(screen.getByTestId('online-users')).toBeInTheDocument();
    });

    it('applies custom className correctly', () => {
      render(<ChatSidebar className="custom-class" />);
      
      const sidebar = document.querySelector('.chat-sidebar.custom-class');
      expect(sidebar).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for interactive elements', () => {
      const onToggle = mock();
      render(<ChatSidebar onToggle={onToggle} />);
      
      expect(screen.getByLabelText('Close chat')).toBeInTheDocument();
    });

    it('has proper ARIA labels in collapsed state', () => {
      const onToggle = mock();
      render(<ChatSidebar isCollapsed={true} onToggle={onToggle} />);
      
      expect(screen.getByLabelText('Open chat')).toBeInTheDocument();
    });

    it('has proper ARIA labels for error close button', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        error: 'Test error',
      });
      
      render(<ChatSidebar />);
      
      expect(screen.getByLabelText('Close error')).toBeInTheDocument();
    });

    it('maintains focus management for keyboard navigation', () => {
      const onToggle = mock();
      render(<ChatSidebar onToggle={onToggle} />);
      
      const toggleButton = screen.getByLabelText('Close chat');
      toggleButton.focus();
      
      expect(document.activeElement).toBe(toggleButton);
    });
  });

  describe('Responsive Behavior', () => {
    // Note: These tests verify the component structure that supports responsive behavior
    // The actual responsive behavior is tested through CSS and would require integration tests
    
    it('renders with responsive structure for mobile adaptation', () => {
      render(<ChatSidebar />);
      
      const sidebar = document.querySelector('.chat-sidebar');
      expect(sidebar).toBeInTheDocument();
      
      // Verify the structure supports responsive layout
      const header = document.querySelector('.chat-sidebar__header');
      const content = document.querySelector('.chat-sidebar__content');
      const input = document.querySelector('.chat-sidebar__input');
      
      expect(header).toBeInTheDocument();
      expect(content).toBeInTheDocument();
      expect(input).toBeInTheDocument();
    });

    it('maintains proper component hierarchy for responsive design', () => {
      render(<ChatSidebar />);
      
      // Verify the component structure that enables responsive behavior
      const content = document.querySelector('.chat-sidebar__content');
      const messages = document.querySelector('.chat-sidebar__messages');
      const onlineUsers = document.querySelector('.chat-sidebar__online-users');
      const input = document.querySelector('.chat-sidebar__input');
      
      expect(content).toContainElement(messages);
      expect(content).toContainElement(onlineUsers);
      expect(content).toContainElement(input);
    });

    it('supports collapsible behavior required for mobile', () => {
      const onToggle = mock();
      const { rerender } = render(<ChatSidebar onToggle={onToggle} />);
      
      // Test expanded state
      expect(screen.getByTestId('message-list')).toBeInTheDocument();
      
      // Test collapsed state
      rerender(<ChatSidebar isCollapsed={true} onToggle={onToggle} />);
      expect(screen.queryByTestId('message-list')).not.toBeInTheDocument();
      expect(document.querySelector('.chat-sidebar--collapsed')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('passes loading state to MessageList correctly', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        isLoading: true,
      });
      
      render(<ChatSidebar />);
      
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');
    });

    it('handles loading state in message input', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        isLoading: true,
        isConnected: false,
      });
      
      render(<ChatSidebar />);
      
      expect(screen.getByTestId('message-input-field')).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty messages array', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: [],
      });
      
      render(<ChatSidebar />);
      
      expect(screen.getByTestId('message-count')).toHaveTextContent('0');
    });

    it('handles empty online users array', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        onlineUsers: [],
      });
      
      render(<ChatSidebar />);
      
      expect(screen.getByTestId('online-user-count')).toHaveTextContent('0');
    });

    it('handles null current user', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        currentUser: null,
      });
      
      render(<ChatSidebar />);
      
      expect(screen.getByTestId('message-list-current-user-id')).toHaveTextContent('');
    });

    it('handles undefined props gracefully', () => {
      expect(() => {
        render(<ChatSidebar />);
      }).not.toThrow();
    });
  });
});