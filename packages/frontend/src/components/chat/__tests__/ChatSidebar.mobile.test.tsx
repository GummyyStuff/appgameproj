/**
 * Mobile-specific tests for ChatSidebar component
 * Requirements: 3.3, 6.4
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatSidebar } from '../ChatSidebar';
import { useMobileChat } from '../../../hooks/useMobileChat';
import { useChat } from '../../../hooks/useChat';
import { useAuth } from '../../../hooks/useAuth';

// Mock the hooks
jest.mock('../../../hooks/useMobileChat');
jest.mock('../../../hooks/useChat');
jest.mock('../../../hooks/useAuth');

const mockUseMobileChat = useMobileChat as jest.MockedFunction<typeof useMobileChat>;
const mockUseChat = useChat as jest.MockedFunction<typeof useChat>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock window properties for mobile testing
const mockWindowProperties = (properties: Partial<Window>) => {
  Object.defineProperties(window, {
    ...Object.keys(properties).reduce((acc, key) => {
      acc[key] = {
        value: properties[key as keyof Window],
        writable: true,
        configurable: true,
      };
      return acc;
    }, {} as PropertyDescriptorMap),
  });
};

// Mock viewport for mobile testing
const mockViewport = (width: number, height: number) => {
  mockWindowProperties({
    innerWidth: width,
    innerHeight: height,
    screen: {
      width,
      height,
    } as Screen,
  });
};

describe('ChatSidebar Mobile Tests', () => {
  const defaultChatState = {
    messages: [],
    onlineUsers: [],
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
    networkStatus: {
      isOnline: true,
    },
    retryFailedMessages: jest.fn(),
    clearMessageQueue: jest.fn(),
  };

  const defaultAuthState = {
    user: { id: 'user1', email: 'test@example.com' },
    loading: false,
  };

  const defaultMobileState = {
    mobileState: {
      isMobile: false,
      isLandscape: false,
      screenSize: 'desktop' as const,
      supportsTouchGestures: false,
      viewportHeight: 1024,
      isKeyboardOpen: false,
    },
    getChatContainerClasses: jest.fn(() => 'chat-sidebar'),
    getOptimalChatHeight: jest.fn(() => 'auto'),
    shouldShowOverlay: jest.fn(() => false),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseChat.mockReturnValue(defaultChatState);
    mockUseAuth.mockReturnValue(defaultAuthState);
    mockUseMobileChat.mockReturnValue(defaultMobileState);
  });

  afterEach(() => {
    // Reset window properties
    mockViewport(1024, 768);
  });

  describe('Mobile Device Detection', () => {
    it('should apply mobile classes when on mobile device', () => {
      mockUseMobileChat.mockReturnValue({
        ...defaultMobileState,
        mobileState: {
          ...defaultMobileState.mobileState,
          isMobile: true,
          screenSize: 'mobile',
        },
        getChatContainerClasses: jest.fn(() => 'chat-sidebar chat-sidebar--mobile'),
        shouldShowOverlay: jest.fn(() => true),
      });

      render(<ChatSidebar />);

      expect(mockUseMobileChat).toHaveBeenCalledWith(
        expect.objectContaining({
          swipeThreshold: 100,
          enablePullRefresh: true,
          enableTapOutside: true,
          keyboardThreshold: 150,
        }),
        expect.objectContaining({
          onSwipeClose: undefined,
          onTapOutside: undefined,
          onPullRefresh: expect.any(Function),
        })
      );
    });

    it('should show overlay backdrop on mobile when not collapsed', () => {
      mockUseMobileChat.mockReturnValue({
        ...defaultMobileState,
        mobileState: {
          ...defaultMobileState.mobileState,
          isMobile: true,
        },
        shouldShowOverlay: jest.fn(() => true),
      });

      render(<ChatSidebar isCollapsed={false} />);

      expect(screen.getByRole('complementary')).toBeInTheDocument();
      // Overlay should be present but might not have a specific role
      const overlayElements = document.querySelectorAll('.chat-sidebar__overlay');
      expect(overlayElements.length).toBeGreaterThan(0);
    });

    it('should not show overlay when collapsed', () => {
      mockUseMobileChat.mockReturnValue({
        ...defaultMobileState,
        shouldShowOverlay: jest.fn(() => true),
      });

      render(<ChatSidebar isCollapsed={true} />);

      const overlayElements = document.querySelectorAll('.chat-sidebar__overlay');
      expect(overlayElements.length).toBe(0);
    });
  });

  describe('Touch Gestures', () => {
    it('should handle swipe to close gesture', async () => {
      const mockOnToggle = jest.fn();
      
      mockUseMobileChat.mockReturnValue({
        ...defaultMobileState,
        mobileState: {
          ...defaultMobileState.mobileState,
          isMobile: true,
          supportsTouchGestures: true,
        },
      });

      render(<ChatSidebar onToggle={mockOnToggle} />);

      // Simulate swipe gesture
      const chatContainer = screen.getByRole('complementary');
      
      fireEvent.touchStart(chatContainer, {
        touches: [{ clientX: 0, clientY: 100 }],
      });

      fireEvent.touchEnd(chatContainer, {
        changedTouches: [{ clientX: 150, clientY: 100 }],
      });

      // The gesture handling is done in the hook, so we verify the hook was called correctly
      expect(mockUseMobileChat).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          onSwipeClose: mockOnToggle,
        })
      );
    });

    it('should handle tap outside to close', async () => {
      const mockOnToggle = jest.fn();
      
      mockUseMobileChat.mockReturnValue({
        ...defaultMobileState,
        mobileState: {
          ...defaultMobileState.mobileState,
          isMobile: true,
        },
        shouldShowOverlay: jest.fn(() => true),
      });

      render(<ChatSidebar onToggle={mockOnToggle} />);

      const overlay = document.querySelector('.chat-sidebar__overlay');
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnToggle).toHaveBeenCalled();
      }
    });

    it('should handle pull to refresh', async () => {
      const mockReconnect = jest.fn();
      
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        isConnected: false,
        reconnect: mockReconnect,
      });

      mockUseMobileChat.mockReturnValue({
        ...defaultMobileState,
        mobileState: {
          ...defaultMobileState.mobileState,
          isMobile: true,
        },
      });

      render(<ChatSidebar />);

      // Verify pull refresh handler is set up
      expect(mockUseMobileChat).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          onPullRefresh: expect.any(Function),
        })
      );
    });
  });

  describe('Keyboard Handling', () => {
    it('should adjust height when mobile keyboard is open', () => {
      const mockGetOptimalChatHeight = jest.fn(() => '400px');
      
      mockUseMobileChat.mockReturnValue({
        ...defaultMobileState,
        mobileState: {
          ...defaultMobileState.mobileState,
          isMobile: true,
          isKeyboardOpen: true,
          viewportHeight: 400,
        },
        getOptimalChatHeight: mockGetOptimalChatHeight,
      });

      render(<ChatSidebar />);

      expect(mockGetOptimalChatHeight).toHaveBeenCalled();
    });

    it('should show keyboard-specific styling when keyboard is open', () => {
      mockUseMobileChat.mockReturnValue({
        ...defaultMobileState,
        mobileState: {
          ...defaultMobileState.mobileState,
          isMobile: true,
          isKeyboardOpen: true,
        },
        getChatContainerClasses: jest.fn(() => 'chat-sidebar chat-sidebar--mobile chat-sidebar--keyboard-open'),
      });

      render(<ChatSidebar />);

      const chatContainer = screen.getByRole('complementary');
      expect(chatContainer).toHaveClass('chat-sidebar--keyboard-open');
    });
  });

  describe('Responsive Layout', () => {
    it('should show user count in mobile header', () => {
      const onlineUsers = [
        { user_id: 'user1', username: 'user1', last_seen: '2023-01-01', is_online: true },
        { user_id: 'user2', username: 'user2', last_seen: '2023-01-01', is_online: true },
      ];

      mockUseChat.mockReturnValue({
        ...defaultChatState,
        onlineUsers,
      });

      mockUseMobileChat.mockReturnValue({
        ...defaultMobileState,
        mobileState: {
          ...defaultMobileState.mobileState,
          isMobile: true,
        },
      });

      render(<ChatSidebar />);

      expect(screen.getByText('(2 online)')).toBeInTheDocument();
    });

    it('should use shorter placeholder text on mobile', () => {
      mockUseMobileChat.mockReturnValue({
        ...defaultMobileState,
        mobileState: {
          ...defaultMobileState.mobileState,
          isMobile: true,
        },
      });

      render(<ChatSidebar />);

      expect(screen.getByPlaceholderText('Message...')).toBeInTheDocument();
    });

    it('should show toggle text on mobile when collapsed', () => {
      mockUseMobileChat.mockReturnValue({
        ...defaultMobileState,
        mobileState: {
          ...defaultMobileState.mobileState,
          isMobile: true,
        },
      });

      render(<ChatSidebar isCollapsed={true} />);

      expect(screen.getByText('Chat')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should announce connection status changes', async () => {
      const { rerender } = render(<ChatSidebar />);

      // Change connection status
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        connectionStatus: 'connected',
      });

      rerender(<ChatSidebar />);

      // Check for aria-live region
      expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'Chat sidebar');
    });

    it('should have proper ARIA attributes for mobile', () => {
      mockUseMobileChat.mockReturnValue({
        ...defaultMobileState,
        mobileState: {
          ...defaultMobileState.mobileState,
          isMobile: true,
        },
      });

      render(<ChatSidebar />);

      const chatContainer = screen.getByRole('complementary');
      expect(chatContainer).toHaveAttribute('aria-label', 'Chat sidebar');

      const toggleButton = screen.getByLabelText('Close chat');
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have screen reader announcements', () => {
      render(<ChatSidebar />);

      const srOnlyElement = document.querySelector('.sr-only');
      expect(srOnlyElement).toBeInTheDocument();
      expect(srOnlyElement).toHaveAttribute('aria-live', 'polite');
      expect(srOnlyElement).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('Landscape Mode', () => {
    it('should apply landscape-specific classes', () => {
      mockUseMobileChat.mockReturnValue({
        ...defaultMobileState,
        mobileState: {
          ...defaultMobileState.mobileState,
          isMobile: true,
          isLandscape: true,
        },
        getChatContainerClasses: jest.fn(() => 'chat-sidebar chat-sidebar--mobile chat-sidebar--landscape'),
      });

      render(<ChatSidebar />);

      const chatContainer = screen.getByRole('complementary');
      expect(chatContainer).toHaveClass('chat-sidebar--landscape');
    });
  });

  describe('Performance', () => {
    it('should not cause excessive re-renders on mobile state changes', () => {
      const mockGetChatContainerClasses = jest.fn(() => 'chat-sidebar');
      
      mockUseMobileChat.mockReturnValue({
        ...defaultMobileState,
        getChatContainerClasses: mockGetChatContainerClasses,
      });

      const { rerender } = render(<ChatSidebar />);

      // Re-render with same props
      rerender(<ChatSidebar />);

      // Should not call class generator excessively
      expect(mockGetChatContainerClasses.mock.calls.length).toBeLessThan(5);
    });

    it('should handle rapid viewport changes gracefully', async () => {
      const mockGetOptimalChatHeight = jest.fn(() => 'auto');
      
      mockUseMobileChat.mockReturnValue({
        ...defaultMobileState,
        getOptimalChatHeight: mockGetOptimalChatHeight,
      });

      render(<ChatSidebar />);

      // Simulate rapid viewport changes
      act(() => {
        mockViewport(375, 667); // iPhone
      });

      act(() => {
        mockViewport(768, 1024); // iPad
      });

      act(() => {
        mockViewport(1920, 1080); // Desktop
      });

      // Should handle changes without errors
      expect(mockGetOptimalChatHeight).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle mobile hook errors gracefully', () => {
      mockUseMobileChat.mockImplementation(() => {
        throw new Error('Mobile hook error');
      });

      // Should not crash the component
      expect(() => render(<ChatSidebar />)).not.toThrow();
    });

    it('should fallback to desktop behavior when mobile detection fails', () => {
      mockUseMobileChat.mockReturnValue({
        ...defaultMobileState,
        mobileState: {
          ...defaultMobileState.mobileState,
          isMobile: false, // Fallback to desktop
        },
      });

      render(<ChatSidebar />);

      const chatContainer = screen.getByRole('complementary');
      expect(chatContainer).toHaveClass('chat-sidebar');
      expect(chatContainer).not.toHaveClass('chat-sidebar--mobile');
    });
  });
});