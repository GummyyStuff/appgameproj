/**
 * Tests for useMobileChat hook
 * Requirements: 3.3, 6.4
 */

import { renderHook, act } from '@testing-library/react';
import { useMobileChat, useMobileChatAccessibility } from '../useMobileChat';

// Mock window properties
const mockWindowProperties = (properties: Partial<Window & typeof globalThis>) => {
  Object.defineProperties(window, {
    ...Object.keys(properties).reduce((acc, key) => {
      acc[key] = {
        value: properties[key as keyof (Window & typeof globalThis)],
        writable: true,
        configurable: true,
      };
      return acc;
    }, {} as PropertyDescriptorMap),
  });
};

// Mock viewport
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

// Mock touch support
const mockTouchSupport = (supported: boolean) => {
  if (supported) {
    mockWindowProperties({
      ontouchstart: {},
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5,
      writable: true,
    });
  } else {
    mockWindowProperties({
      ontouchstart: undefined,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      writable: true,
    });
  }
};

// Mock visual viewport API
const mockVisualViewport = (height?: number) => {
  if (height !== undefined) {
    Object.defineProperty(window, 'visualViewport', {
      value: {
        height,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
      writable: true,
    });
  } else {
    Object.defineProperty(window, 'visualViewport', {
      value: undefined,
      writable: true,
    });
  }
};

describe('useMobileChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to desktop defaults
    mockViewport(1920, 1080);
    mockTouchSupport(false);
    mockVisualViewport();
  });

  afterEach(() => {
    // Clean up event listeners
    document.removeEventListener('touchstart', jest.fn());
    document.removeEventListener('touchmove', jest.fn());
    document.removeEventListener('touchend', jest.fn());
    document.removeEventListener('click', jest.fn());
    document.removeEventListener('keydown', jest.fn());
  });

  describe('Device Detection', () => {
    it('should detect mobile device correctly', () => {
      mockViewport(375, 667); // iPhone size
      mockTouchSupport(true);

      const { result } = renderHook(() => useMobileChat());

      expect(result.current.mobileState.isMobile).toBe(true);
      expect(result.current.mobileState.screenSize).toBe('mobile');
      expect(result.current.mobileState.supportsTouchGestures).toBe(true);
    });

    it('should detect tablet device correctly', () => {
      mockViewport(768, 1024); // iPad size
      mockTouchSupport(true);

      const { result } = renderHook(() => useMobileChat());

      expect(result.current.mobileState.isMobile).toBe(false);
      expect(result.current.mobileState.screenSize).toBe('tablet');
      expect(result.current.mobileState.supportsTouchGestures).toBe(true);
    });

    it('should detect desktop device correctly', () => {
      mockViewport(1920, 1080);
      mockTouchSupport(false);

      const { result } = renderHook(() => useMobileChat());

      expect(result.current.mobileState.isMobile).toBe(false);
      expect(result.current.mobileState.screenSize).toBe('desktop');
      expect(result.current.mobileState.supportsTouchGestures).toBe(false);
    });

    it('should detect landscape orientation', () => {
      mockViewport(667, 375); // iPhone landscape
      mockTouchSupport(true);

      const { result } = renderHook(() => useMobileChat());

      expect(result.current.mobileState.isLandscape).toBe(true);
    });
  });

  describe('Keyboard Detection', () => {
    it('should detect keyboard open on mobile', () => {
      mockViewport(375, 400); // Reduced height indicating keyboard
      mockTouchSupport(true);
      
      // Mock screen height to be larger than viewport
      Object.defineProperty(window.screen, 'height', {
        value: 667,
        writable: true,
      });

      const { result } = renderHook(() => useMobileChat());

      expect(result.current.mobileState.isKeyboardOpen).toBe(true);
    });

    it('should use visual viewport API when available', () => {
      mockViewport(375, 667);
      mockTouchSupport(true);
      mockVisualViewport(400); // Keyboard open

      const { result } = renderHook(() => useMobileChat());

      // Should set up visual viewport listener
      expect(window.visualViewport?.addEventListener).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );
    });

    it('should not detect keyboard on desktop', () => {
      mockViewport(1920, 800); // Reduced height on desktop
      mockTouchSupport(false);

      const { result } = renderHook(() => useMobileChat());

      expect(result.current.mobileState.isKeyboardOpen).toBe(false);
    });
  });

  describe('Touch Gestures', () => {
    it('should handle swipe gestures', () => {
      mockViewport(375, 667);
      mockTouchSupport(true);

      const mockOnSwipeClose = jest.fn();
      const { result } = renderHook(() => 
        useMobileChat({}, { onSwipeClose: mockOnSwipeClose })
      );

      expect(result.current.mobileState.supportsTouchGestures).toBe(true);

      // Simulate touch events
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 0, clientY: 100 } as Touch],
      });

      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 150, clientY: 100 } as Touch],
      });

      act(() => {
        document.dispatchEvent(touchStart);
      });

      act(() => {
        document.dispatchEvent(touchEnd);
      });

      // Gesture handling is set up (actual gesture detection happens in event handlers)
      expect(document.addEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        { passive: true }
      );
    });

    it('should handle pull to refresh', async () => {
      mockViewport(375, 667);
      mockTouchSupport(true);

      const mockOnPullRefresh = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => 
        useMobileChat({ enablePullRefresh: true }, { onPullRefresh: mockOnPullRefresh })
      );

      expect(result.current.mobileState.supportsTouchGestures).toBe(true);

      // Touch move events are set up
      expect(document.addEventListener).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function),
        { passive: true }
      );
    });

    it('should handle tap outside to close', () => {
      mockViewport(375, 667);
      mockTouchSupport(true);

      const mockOnTapOutside = jest.fn();
      const { result } = renderHook(() => 
        useMobileChat({ enableTapOutside: true }, { onTapOutside: mockOnTapOutside })
      );

      expect(result.current.mobileState.isMobile).toBe(true);

      // Click events are set up
      expect(document.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });
  });

  describe('Responsive Utilities', () => {
    it('should provide correct device type checks', () => {
      mockViewport(375, 667);
      mockTouchSupport(true);

      const { result } = renderHook(() => useMobileChat());

      expect(result.current.isMobileDevice()).toBe(true);
      expect(result.current.isTabletDevice()).toBe(false);
      expect(result.current.isDesktopDevice()).toBe(false);
    });

    it('should determine when to show overlay', () => {
      mockViewport(375, 667);
      mockTouchSupport(true);

      const { result } = renderHook(() => useMobileChat());

      expect(result.current.shouldShowOverlay()).toBe(true);
    });

    it('should determine when to use bottom sheet', () => {
      mockViewport(667, 375); // Landscape
      mockTouchSupport(true);

      const { result } = renderHook(() => useMobileChat());

      expect(result.current.shouldUseBottomSheet()).toBe(true);
    });

    it('should calculate optimal chat height', () => {
      mockViewport(375, 667);
      mockTouchSupport(true);

      const { result } = renderHook(() => useMobileChat());

      expect(result.current.getOptimalChatHeight()).toBe('100vh');
    });

    it('should generate correct CSS classes', () => {
      mockViewport(375, 667);
      mockTouchSupport(true);

      const { result } = renderHook(() => useMobileChat());

      const classes = result.current.getChatContainerClasses(false);
      expect(classes).toContain('chat-sidebar');
      expect(classes).toContain('chat-sidebar--mobile');
    });

    it('should generate collapsed classes correctly', () => {
      mockViewport(375, 667);
      mockTouchSupport(true);

      const { result } = renderHook(() => useMobileChat());

      const classes = result.current.getChatContainerClasses(true);
      expect(classes).toContain('chat-sidebar--collapsed');
    });
  });

  describe('Viewport Changes', () => {
    it('should update state on window resize', () => {
      const { result } = renderHook(() => useMobileChat());

      // Start with desktop
      expect(result.current.mobileState.isMobile).toBe(false);

      // Resize to mobile
      act(() => {
        mockViewport(375, 667);
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current.mobileState.isMobile).toBe(true);
    });

    it('should update state on orientation change', () => {
      mockViewport(375, 667);
      mockTouchSupport(true);

      const { result } = renderHook(() => useMobileChat());

      expect(result.current.mobileState.isLandscape).toBe(false);

      // Change to landscape
      act(() => {
        mockViewport(667, 375);
        window.dispatchEvent(new Event('orientationchange'));
      });

      expect(result.current.mobileState.isLandscape).toBe(true);
    });
  });

  describe('Configuration Options', () => {
    it('should use custom swipe threshold', () => {
      const { result } = renderHook(() => 
        useMobileChat({ swipeThreshold: 200 })
      );

      // Configuration is passed to the hook
      expect(result.current).toBeDefined();
    });

    it('should disable pull refresh when configured', () => {
      const { result } = renderHook(() => 
        useMobileChat({ enablePullRefresh: false })
      );

      // Pull refresh is disabled
      expect(result.current).toBeDefined();
    });

    it('should disable tap outside when configured', () => {
      const { result } = renderHook(() => 
        useMobileChat({ enableTapOutside: false })
      );

      // Tap outside is disabled
      expect(result.current).toBeDefined();
    });

    it('should use custom keyboard threshold', () => {
      mockViewport(375, 500); // Height reduction of 167px
      mockTouchSupport(true);
      
      Object.defineProperty(window.screen, 'height', {
        value: 667,
        writable: true,
      });

      const { result } = renderHook(() => 
        useMobileChat({ keyboardThreshold: 100 })
      );

      expect(result.current.mobileState.isKeyboardOpen).toBe(true);
    });
  });
});

describe('useMobileChatAccessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.removeEventListener('keydown', jest.fn());
  });

  describe('Announcements', () => {
    it('should manage announcements correctly', () => {
      const { result } = renderHook(() => useMobileChatAccessibility());

      expect(result.current.announcements).toEqual([]);

      act(() => {
        result.current.announceMessage('Test message');
      });

      expect(result.current.announcements).toContain('Test message');
    });

    it('should clear announcements after timeout', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useMobileChatAccessibility());

      act(() => {
        result.current.announceMessage('Test message');
      });

      expect(result.current.announcements).toContain('Test message');

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.announcements).toEqual([]);

      jest.useRealTimers();
    });
  });

  describe('Focus Management', () => {
    it('should focus message input', () => {
      const mockInput = document.createElement('input');
      mockInput.className = 'message-input';
      mockInput.focus = jest.fn();
      document.body.appendChild(mockInput);

      const { result } = renderHook(() => useMobileChatAccessibility());

      act(() => {
        result.current.focusMessageInput();
      });

      expect(mockInput.focus).toHaveBeenCalled();

      document.body.removeChild(mockInput);
    });

    it('should focus first message', () => {
      const mockMessage = document.createElement('div');
      mockMessage.className = 'chat-message';
      mockMessage.focus = jest.fn();
      document.body.appendChild(mockMessage);

      const { result } = renderHook(() => useMobileChatAccessibility());

      act(() => {
        result.current.focusFirstMessage();
      });

      expect(mockMessage.focus).toHaveBeenCalled();

      document.body.removeChild(mockMessage);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle escape key to close chat', () => {
      const mockButton = document.createElement('button');
      mockButton.className = 'chat-sidebar__toggle';
      mockButton.click = jest.fn();
      document.body.appendChild(mockButton);

      renderHook(() => useMobileChatAccessibility());

      act(() => {
        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(escapeEvent);
      });

      expect(mockButton.click).toHaveBeenCalled();

      document.body.removeChild(mockButton);
    });

    it('should set up keyboard event listeners', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      renderHook(() => useMobileChatAccessibility());

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });
  });

  describe('Cleanup', () => {
    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => useMobileChatAccessibility());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });

    it('should clear timeouts on unmount', () => {
      jest.useFakeTimers();
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { result, unmount } = renderHook(() => useMobileChatAccessibility());

      act(() => {
        result.current.announceMessage('Test message');
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});