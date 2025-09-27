/**
 * Integration tests for responsive chat behavior across different screen sizes
 * Requirements: 3.3, 6.4
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatSidebar } from '../ChatSidebar';
import { MessageInput } from '../MessageInput';
import { MessageList } from '../MessageList';
import { OnlineUsers } from '../OnlineUsers';

// Mock the hooks
jest.mock('../../../hooks/useChat');
jest.mock('../../../hooks/useAuth');
jest.mock('../../../hooks/useMobileChat');

import { useChat } from '../../../hooks/useChat';
import { useAuth } from '../../../hooks/useAuth';
import { useMobileChat } from '../../../hooks/useMobileChat';

const mockUseChat = useChat as jest.MockedFunction<typeof useChat>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseMobileChat = useMobileChat as jest.MockedFunction<typeof useMobileChat>;

// Screen size configurations for testing
const SCREEN_SIZES = {
  mobile: { width: 375, height: 667 },
  mobileLandscape: { width: 667, height: 375 },
  tablet: { width: 768, height: 1024 },
  tabletLandscape: { width: 1024, height: 768 },
  desktop: { width: 1920, height: 1080 },
  smallMobile: { width: 320, height: 568 },
};

// Mock viewport
const mockViewport = (width: number, height: number) => {
  Object.defineProperties(window, {
    innerWidth: { value: width, writable: true },
    innerHeight: { value: height, writable: true },
    screen: {
      value: { width, height },
      writable: true,
    },
  });
};

// Mock CSS media queries
const mockMediaQuery = (query: string, matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((q) => ({
      matches: q === query ? matches : false,
      media: q,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe('Chat Responsive Integration Tests', () => {
  const defaultChatState = {
    messages: [
      {
        id: '1',
        content: 'Hello world!',
        user_id: 'user1',
        username: 'testuser',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ],
    onlineUsers: [
      { user_id: 'user1', username: 'testuser', last_seen: '2023-01-01', is_online: true },
      { user_id: 'user2', username: 'user2', last_seen: '2023-01-01', is_online: true },
    ],
    sendMessage: jest.fn(),
    isConnected: true,
    connectionStatus: 'connected' as const,
    isAuthenticated: true,
    currentUser: { id: 'user1', username: 'testuser' },
    error: null,
    isLoading: false,
    clearError: jest.fn(),
    reconnect: jest.fn(),
    connectionHealth: {
      status: 'connected' as const,
      reconnectAttempt: 0,
      maxReconnectAttempts: 5,
      nextReconnectDelay: 1000,
      offlineQueueEnabled: true,
      queuedMessageCount: 0,
    },
    networkStatus: { isOnline: true },
    retryFailedMessages: jest.fn(),
    clearMessageQueue: jest.fn(),
  };

  const defaultAuthState = {
    user: { id: 'user1', email: 'test@example.com' },
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseChat.mockReturnValue(defaultChatState);
    mockUseAuth.mockReturnValue(defaultAuthState);
    
    // Default to desktop
    mockViewport(SCREEN_SIZES.desktop.width, SCREEN_SIZES.desktop.height);
    mockUseMobileChat.mockReturnValue({
      mobileState: {
        isMobile: false,
        isLandscape: false,
        screenSize: 'desktop',
        supportsTouchGestures: false,
        viewportHeight: 1080,
        isKeyboardOpen: false,
      },
      getChatContainerClasses: jest.fn(() => 'chat-sidebar'),
      getOptimalChatHeight: jest.fn(() => 'auto'),
      shouldShowOverlay: jest.fn(() => false),
      isMobileDevice: jest.fn(() => false),
      isTabletDevice: jest.fn(() => false),
      isDesktopDevice: jest.fn(() => true),
      shouldUseBottomSheet: jest.fn(() => false),
    });
  });

  describe('Mobile Portrait (375x667)', () => {
    beforeEach(() => {
      mockViewport(SCREEN_SIZES.mobile.width, SCREEN_SIZES.mobile.height);
      mockUseMobileChat.mockReturnValue({
        mobileState: {
          isMobile: true,
          isLandscape: false,
          screenSize: 'mobile',
          supportsTouchGestures: true,
          viewportHeight: 667,
          isKeyboardOpen: false,
        },
        getChatContainerClasses: jest.fn(() => 'chat-sidebar chat-sidebar--mobile'),
        getOptimalChatHeight: jest.fn(() => '100vh'),
        shouldShowOverlay: jest.fn(() => true),
        isMobileDevice: jest.fn(() => true),
        isTabletDevice: jest.fn(() => false),
        isDesktopDevice: jest.fn(() => false),
        shouldUseBottomSheet: jest.fn(() => false),
      });
    });

    it('should render full-screen chat on mobile', () => {
      render(<ChatSidebar />);

      const chatContainer = screen.getByRole('complementary');
      expect(chatContainer).toHaveClass('chat-sidebar--mobile');
      expect(chatContainer).toHaveStyle({ height: '100vh' });
    });

    it('should show overlay backdrop', () => {
      render(<ChatSidebar />);

      const overlay = document.querySelector('.chat-sidebar__overlay');
      expect(overlay).toBeInTheDocument();
    });

    it('should show user count in header', () => {
      render(<ChatSidebar />);

      expect(screen.getByText('(2 online)')).toBeInTheDocument();
    });

    it('should use mobile-optimized input placeholder', () => {
      render(<ChatSidebar />);

      expect(screen.getByPlaceholderText('Message...')).toBeInTheDocument();
    });

    it('should render collapsed as floating button', () => {
      render(<ChatSidebar isCollapsed={true} />);

      const toggleButton = screen.getByLabelText('Open chat');
      expect(toggleButton.parentElement).toHaveClass('chat-sidebar--collapsed');
      expect(screen.getByText('Chat')).toBeInTheDocument();
    });

    it('should handle touch interactions', async () => {
      const mockOnToggle = jest.fn();
      render(<ChatSidebar onToggle={mockOnToggle} />);

      const overlay = document.querySelector('.chat-sidebar__overlay');
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnToggle).toHaveBeenCalled();
      }
    });
  });

  describe('Mobile Landscape (667x375)', () => {
    beforeEach(() => {
      mockViewport(SCREEN_SIZES.mobileLandscape.width, SCREEN_SIZES.mobileLandscape.height);
      mockUseMobileChat.mockReturnValue({
        mobileState: {
          isMobile: true,
          isLandscape: true,
          screenSize: 'mobile',
          supportsTouchGestures: true,
          viewportHeight: 375,
          isKeyboardOpen: false,
        },
        getChatContainerClasses: jest.fn(() => 'chat-sidebar chat-sidebar--mobile chat-sidebar--landscape'),
        getOptimalChatHeight: jest.fn(() => '100vh'),
        shouldShowOverlay: jest.fn(() => true),
        isMobileDevice: jest.fn(() => true),
        isTabletDevice: jest.fn(() => false),
        isDesktopDevice: jest.fn(() => false),
        shouldUseBottomSheet: jest.fn(() => true),
      });
    });

    it('should apply landscape-specific styling', () => {
      render(<ChatSidebar />);

      const chatContainer = screen.getByRole('complementary');
      expect(chatContainer).toHaveClass('chat-sidebar--landscape');
    });

    it('should optimize layout for landscape', () => {
      render(<ChatSidebar />);

      // Should still be full screen but optimized for landscape
      const chatContainer = screen.getByRole('complementary');
      expect(chatContainer).toHaveStyle({ height: '100vh' });
    });
  });

  describe('Tablet Portrait (768x1024)', () => {
    beforeEach(() => {
      mockViewport(SCREEN_SIZES.tablet.width, SCREEN_SIZES.tablet.height);
      mockUseMobileChat.mockReturnValue({
        mobileState: {
          isMobile: false,
          isLandscape: false,
          screenSize: 'tablet',
          supportsTouchGestures: true,
          viewportHeight: 1024,
          isKeyboardOpen: false,
        },
        getChatContainerClasses: jest.fn(() => 'chat-sidebar chat-sidebar--tablet'),
        getOptimalChatHeight: jest.fn(() => 'auto'),
        shouldShowOverlay: jest.fn(() => false),
        isMobileDevice: jest.fn(() => false),
        isTabletDevice: jest.fn(() => true),
        isDesktopDevice: jest.fn(() => false),
        shouldUseBottomSheet: jest.fn(() => false),
      });
    });

    it('should render as sidebar on tablet', () => {
      render(<ChatSidebar />);

      const chatContainer = screen.getByRole('complementary');
      expect(chatContainer).toHaveClass('chat-sidebar--tablet');
      expect(chatContainer).not.toHaveClass('chat-sidebar--mobile');
    });

    it('should not show overlay on tablet', () => {
      render(<ChatSidebar />);

      const overlay = document.querySelector('.chat-sidebar__overlay');
      expect(overlay).not.toBeInTheDocument();
    });

    it('should show full placeholder text on tablet', () => {
      render(<ChatSidebar />);

      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });
  });

  describe('Desktop (1920x1080)', () => {
    it('should render as standard sidebar on desktop', () => {
      render(<ChatSidebar />);

      const chatContainer = screen.getByRole('complementary');
      expect(chatContainer).toHaveClass('chat-sidebar');
      expect(chatContainer).not.toHaveClass('chat-sidebar--mobile');
      expect(chatContainer).not.toHaveClass('chat-sidebar--tablet');
    });

    it('should not show user count in header on desktop', () => {
      render(<ChatSidebar />);

      expect(screen.queryByText('(2 online)')).not.toBeInTheDocument();
    });

    it('should show full placeholder text on desktop', () => {
      render(<ChatSidebar />);

      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('should not show overlay on desktop', () => {
      render(<ChatSidebar />);

      const overlay = document.querySelector('.chat-sidebar__overlay');
      expect(overlay).not.toBeInTheDocument();
    });
  });

  describe('Small Mobile (320x568)', () => {
    beforeEach(() => {
      mockViewport(SCREEN_SIZES.smallMobile.width, SCREEN_SIZES.smallMobile.height);
      mockUseMobileChat.mockReturnValue({
        mobileState: {
          isMobile: true,
          isLandscape: false,
          screenSize: 'mobile',
          supportsTouchGestures: true,
          viewportHeight: 568,
          isKeyboardOpen: false,
        },
        getChatContainerClasses: jest.fn(() => 'chat-sidebar chat-sidebar--mobile'),
        getOptimalChatHeight: jest.fn(() => '100vh'),
        shouldShowOverlay: jest.fn(() => true),
        isMobileDevice: jest.fn(() => true),
        isTabletDevice: jest.fn(() => false),
        isDesktopDevice: jest.fn(() => false),
        shouldUseBottomSheet: jest.fn(() => false),
      });
    });

    it('should handle very small screens gracefully', () => {
      render(<ChatSidebar />);

      const chatContainer = screen.getByRole('complementary');
      expect(chatContainer).toHaveClass('chat-sidebar--mobile');
      expect(chatContainer).toBeInTheDocument();
    });

    it('should render compact collapsed button', () => {
      render(<ChatSidebar isCollapsed={true} />);

      const toggleButton = screen.getByLabelText('Open chat');
      expect(toggleButton).toBeInTheDocument();
      expect(screen.getByText('Chat')).toBeInTheDocument();
    });
  });

  describe('Keyboard Handling', () => {
    beforeEach(() => {
      mockViewport(SCREEN_SIZES.mobile.width, SCREEN_SIZES.mobile.height);
      mockUseMobileChat.mockReturnValue({
        mobileState: {
          isMobile: true,
          isLandscape: false,
          screenSize: 'mobile',
          supportsTouchGestures: true,
          viewportHeight: 400, // Reduced height
          isKeyboardOpen: true,
        },
        getChatContainerClasses: jest.fn(() => 'chat-sidebar chat-sidebar--mobile chat-sidebar--keyboard-open'),
        getOptimalChatHeight: jest.fn(() => '400px'),
        shouldShowOverlay: jest.fn(() => true),
        isMobileDevice: jest.fn(() => true),
        isTabletDevice: jest.fn(() => false),
        isDesktopDevice: jest.fn(() => false),
        shouldUseBottomSheet: jest.fn(() => false),
      });
    });

    it('should adjust layout when keyboard is open', () => {
      render(<ChatSidebar />);

      const chatContainer = screen.getByRole('complementary');
      expect(chatContainer).toHaveClass('chat-sidebar--keyboard-open');
      expect(chatContainer).toHaveStyle({ height: '400px' });
    });
  });

  describe('Component Integration', () => {
    it('should integrate MessageInput with mobile optimizations', () => {
      mockUseMobileChat.mockReturnValue({
        mobileState: {
          isMobile: true,
          isLandscape: false,
          screenSize: 'mobile',
          supportsTouchGestures: true,
          viewportHeight: 667,
          isKeyboardOpen: false,
        },
        getChatContainerClasses: jest.fn(() => 'chat-sidebar chat-sidebar--mobile'),
        getOptimalChatHeight: jest.fn(() => '100vh'),
        shouldShowOverlay: jest.fn(() => true),
        isMobileDevice: jest.fn(() => true),
        isTabletDevice: jest.fn(() => false),
        isDesktopDevice: jest.fn(() => false),
        shouldUseBottomSheet: jest.fn(() => false),
      });

      render(<MessageInput onSendMessage={jest.fn()} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      
      // Should have mobile-optimized styling
      expect(input).toHaveStyle({ fontSize: '16px' }); // Prevent zoom on iOS
    });

    it('should integrate MessageList with mobile scrolling', () => {
      render(
        <MessageList 
          messages={defaultChatState.messages} 
          currentUserId="user1" 
        />
      );

      const messageList = screen.getByRole('log');
      expect(messageList).toBeInTheDocument();
    });

    it('should integrate OnlineUsers with mobile layout', () => {
      render(
        <OnlineUsers 
          users={defaultChatState.onlineUsers} 
          currentUserId="user1" 
        />
      );

      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
    });
  });

  describe('Viewport Transitions', () => {
    it('should handle smooth transitions between screen sizes', async () => {
      const { rerender } = render(<ChatSidebar />);

      // Start with desktop
      expect(screen.getByRole('complementary')).toHaveClass('chat-sidebar');

      // Transition to mobile
      mockUseMobileChat.mockReturnValue({
        mobileState: {
          isMobile: true,
          isLandscape: false,
          screenSize: 'mobile',
          supportsTouchGestures: true,
          viewportHeight: 667,
          isKeyboardOpen: false,
        },
        getChatContainerClasses: jest.fn(() => 'chat-sidebar chat-sidebar--mobile'),
        getOptimalChatHeight: jest.fn(() => '100vh'),
        shouldShowOverlay: jest.fn(() => true),
        isMobileDevice: jest.fn(() => true),
        isTabletDevice: jest.fn(() => false),
        isDesktopDevice: jest.fn(() => false),
        shouldUseBottomSheet: jest.fn(() => false),
      });

      rerender(<ChatSidebar />);

      await waitFor(() => {
        expect(screen.getByRole('complementary')).toHaveClass('chat-sidebar--mobile');
      });
    });

    it('should handle orientation changes', async () => {
      // Start in portrait
      mockUseMobileChat.mockReturnValue({
        mobileState: {
          isMobile: true,
          isLandscape: false,
          screenSize: 'mobile',
          supportsTouchGestures: true,
          viewportHeight: 667,
          isKeyboardOpen: false,
        },
        getChatContainerClasses: jest.fn(() => 'chat-sidebar chat-sidebar--mobile'),
        getOptimalChatHeight: jest.fn(() => '100vh'),
        shouldShowOverlay: jest.fn(() => true),
        isMobileDevice: jest.fn(() => true),
        isTabletDevice: jest.fn(() => false),
        isDesktopDevice: jest.fn(() => false),
        shouldUseBottomSheet: jest.fn(() => false),
      });

      const { rerender } = render(<ChatSidebar />);

      // Change to landscape
      mockUseMobileChat.mockReturnValue({
        mobileState: {
          isMobile: true,
          isLandscape: true,
          screenSize: 'mobile',
          supportsTouchGestures: true,
          viewportHeight: 375,
          isKeyboardOpen: false,
        },
        getChatContainerClasses: jest.fn(() => 'chat-sidebar chat-sidebar--mobile chat-sidebar--landscape'),
        getOptimalChatHeight: jest.fn(() => '100vh'),
        shouldShowOverlay: jest.fn(() => true),
        isMobileDevice: jest.fn(() => true),
        isTabletDevice: jest.fn(() => false),
        isDesktopDevice: jest.fn(() => false),
        shouldUseBottomSheet: jest.fn(() => true),
      });

      rerender(<ChatSidebar />);

      await waitFor(() => {
        expect(screen.getByRole('complementary')).toHaveClass('chat-sidebar--landscape');
      });
    });
  });

  describe('Accessibility Across Screen Sizes', () => {
    it('should maintain accessibility on mobile', () => {
      mockUseMobileChat.mockReturnValue({
        mobileState: {
          isMobile: true,
          isLandscape: false,
          screenSize: 'mobile',
          supportsTouchGestures: true,
          viewportHeight: 667,
          isKeyboardOpen: false,
        },
        getChatContainerClasses: jest.fn(() => 'chat-sidebar chat-sidebar--mobile'),
        getOptimalChatHeight: jest.fn(() => '100vh'),
        shouldShowOverlay: jest.fn(() => true),
        isMobileDevice: jest.fn(() => true),
        isTabletDevice: jest.fn(() => false),
        isDesktopDevice: jest.fn(() => false),
        shouldUseBottomSheet: jest.fn(() => false),
      });

      render(<ChatSidebar />);

      const chatContainer = screen.getByRole('complementary');
      expect(chatContainer).toHaveAttribute('aria-label', 'Chat sidebar');

      const toggleButton = screen.getByLabelText('Close chat');
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should provide screen reader announcements', () => {
      render(<ChatSidebar />);

      const srOnlyElement = document.querySelector('.sr-only');
      expect(srOnlyElement).toBeInTheDocument();
      expect(srOnlyElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should handle keyboard navigation on all screen sizes', async () => {
      const user = userEvent.setup();
      render(<ChatSidebar />);

      const toggleButton = screen.getByLabelText('Close chat');
      
      await user.tab();
      expect(toggleButton).toHaveFocus();

      await user.keyboard('{Enter}');
      // Button should be activated
    });
  });

  describe('Performance Across Screen Sizes', () => {
    it('should not cause excessive re-renders during viewport changes', () => {
      const mockGetChatContainerClasses = jest.fn(() => 'chat-sidebar');
      
      mockUseMobileChat.mockReturnValue({
        mobileState: {
          isMobile: false,
          isLandscape: false,
          screenSize: 'desktop',
          supportsTouchGestures: false,
          viewportHeight: 1080,
          isKeyboardOpen: false,
        },
        getChatContainerClasses: mockGetChatContainerClasses,
        getOptimalChatHeight: jest.fn(() => 'auto'),
        shouldShowOverlay: jest.fn(() => false),
        isMobileDevice: jest.fn(() => false),
        isTabletDevice: jest.fn(() => false),
        isDesktopDevice: jest.fn(() => true),
        shouldUseBottomSheet: jest.fn(() => false),
      });

      const { rerender } = render(<ChatSidebar />);

      // Multiple re-renders
      rerender(<ChatSidebar />);
      rerender(<ChatSidebar />);

      // Should not call class generator excessively
      expect(mockGetChatContainerClasses.mock.calls.length).toBeLessThan(10);
    });
  });
});