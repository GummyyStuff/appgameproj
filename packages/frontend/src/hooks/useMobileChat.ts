/**
 * Mobile-specific chat hook for touch interactions and responsive behavior
 * Requirements: 3.3, 6.4
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface MobileChatState {
  /** Whether the device is mobile */
  isMobile: boolean;
  /** Whether the device is in landscape mode */
  isLandscape: boolean;
  /** Current screen size category */
  screenSize: 'mobile' | 'tablet' | 'desktop';
  /** Whether touch interactions are supported */
  supportsTouchGestures: boolean;
  /** Current viewport height (for mobile keyboard handling) */
  viewportHeight: number;
  /** Whether the mobile keyboard is likely open */
  isKeyboardOpen: boolean;
}

export interface TouchGestureHandlers {
  /** Handle swipe to close chat */
  onSwipeClose: () => void;
  /** Handle tap outside to close */
  onTapOutside: () => void;
  /** Handle pull to refresh messages */
  onPullRefresh: () => Promise<void>;
}

export interface MobileChatOptions {
  /** Threshold for swipe gesture (in pixels) */
  swipeThreshold?: number;
  /** Enable pull to refresh */
  enablePullRefresh?: boolean;
  /** Enable tap outside to close */
  enableTapOutside?: boolean;
  /** Keyboard detection threshold */
  keyboardThreshold?: number;
}

const DEFAULT_OPTIONS: Required<MobileChatOptions> = {
  swipeThreshold: 100,
  enablePullRefresh: true,
  enableTapOutside: true,
  keyboardThreshold: 150,
};

/**
 * Hook for managing mobile chat interactions and responsive behavior
 */
export function useMobileChat(
  options: MobileChatOptions = {},
  handlers: Partial<TouchGestureHandlers> = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [mobileState, setMobileState] = useState<MobileChatState>({
    isMobile: false,
    isLandscape: false,
    screenSize: 'desktop',
    supportsTouchGestures: false,
    viewportHeight: window.innerHeight,
    isKeyboardOpen: false,
  });

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const pullRefreshRef = useRef<{ startY: number; isRefreshing: boolean }>({
    startY: 0,
    isRefreshing: false,
  });

  // Detect device capabilities and screen size
  const updateMobileState = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width <= 768;
    const isTablet = width > 768 && width <= 1024;
    const isLandscape = width > height;
    const supportsTouchGestures = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Detect keyboard open on mobile (viewport height reduction)
    const initialHeight = window.screen.height;
    const currentHeight = height;
    const heightDifference = initialHeight - currentHeight;
    const isKeyboardOpen = isMobile && heightDifference > opts.keyboardThreshold;

    setMobileState({
      isMobile,
      isLandscape,
      screenSize: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
      supportsTouchGestures,
      viewportHeight: height,
      isKeyboardOpen,
    });
  }, [opts.keyboardThreshold]);

  // Handle touch start for gesture detection
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!mobileState.supportsTouchGestures) return;

    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    // Initialize pull refresh if at top of scroll
    const target = event.target as HTMLElement;
    const scrollContainer = target.closest('.message-list__scroll-container');
    if (scrollContainer && scrollContainer.scrollTop === 0) {
      pullRefreshRef.current.startY = touch.clientY;
      pullRefreshRef.current.isRefreshing = false;
    }
  }, [mobileState.supportsTouchGestures]);

  // Handle touch move for pull refresh
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!opts.enablePullRefresh || !touchStartRef.current) return;

    const touch = event.touches[0];
    const deltaY = touch.clientY - pullRefreshRef.current.startY;

    // Trigger pull refresh if pulled down enough
    if (deltaY > 80 && !pullRefreshRef.current.isRefreshing) {
      pullRefreshRef.current.isRefreshing = true;
      if (handlers.onPullRefresh) {
        handlers.onPullRefresh().finally(() => {
          pullRefreshRef.current.isRefreshing = false;
        });
      }
    }
  }, [opts.enablePullRefresh, handlers.onPullRefresh]);

  // Handle touch end for swipe gestures
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!touchStartRef.current || !mobileState.supportsTouchGestures) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Detect swipe gestures (horizontal swipe to close)
    const isSwipe = Math.abs(deltaX) > opts.swipeThreshold && 
                   Math.abs(deltaX) > Math.abs(deltaY) && 
                   deltaTime < 500;

    if (isSwipe && deltaX > 0 && handlers.onSwipeClose) {
      // Swipe right to close
      handlers.onSwipeClose();
    }

    touchStartRef.current = null;
  }, [mobileState.supportsTouchGestures, opts.swipeThreshold, handlers.onSwipeClose]);

  // Handle tap outside to close
  const handleTapOutside = useCallback((event: MouseEvent | TouchEvent) => {
    if (!opts.enableTapOutside || !handlers.onTapOutside) return;

    const target = event.target as HTMLElement;
    const chatSidebar = target.closest('.chat-sidebar');
    
    if (!chatSidebar && mobileState.isMobile) {
      handlers.onTapOutside();
    }
  }, [opts.enableTapOutside, handlers.onTapOutside, mobileState.isMobile]);

  // Set up event listeners
  useEffect(() => {
    updateMobileState();
    
    window.addEventListener('resize', updateMobileState);
    window.addEventListener('orientationchange', updateMobileState);
    
    if (mobileState.supportsTouchGestures) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    if (opts.enableTapOutside) {
      document.addEventListener('click', handleTapOutside);
      document.addEventListener('touchend', handleTapOutside);
    }

    return () => {
      window.removeEventListener('resize', updateMobileState);
      window.removeEventListener('orientationchange', updateMobileState);
      
      if (mobileState.supportsTouchGestures) {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      }

      if (opts.enableTapOutside) {
        document.removeEventListener('click', handleTapOutside);
        document.removeEventListener('touchend', handleTapOutside);
      }
    };
  }, [
    updateMobileState,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTapOutside,
    mobileState.supportsTouchGestures,
    opts.enableTapOutside,
  ]);

  // Keyboard handling for mobile
  useEffect(() => {
    if (!mobileState.isMobile) return;

    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        const isKeyboardOpen = heightDiff > opts.keyboardThreshold;
        
        setMobileState(prev => ({
          ...prev,
          isKeyboardOpen,
          viewportHeight: window.visualViewport.height,
        }));
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleVisualViewportChange);
      };
    }
  }, [mobileState.isMobile, opts.keyboardThreshold]);

  return {
    mobileState,
    // Utility functions for responsive behavior
    isMobileDevice: () => mobileState.isMobile,
    isTabletDevice: () => mobileState.screenSize === 'tablet',
    isDesktopDevice: () => mobileState.screenSize === 'desktop',
    shouldShowOverlay: () => mobileState.isMobile,
    shouldUseBottomSheet: () => mobileState.isMobile && mobileState.isLandscape,
    getOptimalChatHeight: () => {
      if (mobileState.isKeyboardOpen) {
        return mobileState.viewportHeight;
      }
      return mobileState.isMobile ? '100vh' : 'auto';
    },
    // CSS classes for responsive styling
    getChatContainerClasses: (isCollapsed: boolean) => {
      const classes = ['chat-sidebar'];
      
      if (isCollapsed) {
        classes.push('chat-sidebar--collapsed');
      }
      
      if (mobileState.isMobile) {
        classes.push('chat-sidebar--mobile');
        if (mobileState.isLandscape) {
          classes.push('chat-sidebar--landscape');
        }
        if (mobileState.isKeyboardOpen) {
          classes.push('chat-sidebar--keyboard-open');
        }
      } else if (mobileState.screenSize === 'tablet') {
        classes.push('chat-sidebar--tablet');
      }
      
      return classes.join(' ');
    },
  };
}

/**
 * Hook for managing mobile chat accessibility features
 */
export function useMobileChatAccessibility() {
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const announcementTimeoutRef = useRef<NodeJS.Timeout>();

  // Announce messages for screen readers
  const announceMessage = useCallback((message: string) => {
    setAnnouncements(prev => [...prev, message]);
    
    // Clear announcement after 3 seconds
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
    }
    
    announcementTimeoutRef.current = setTimeout(() => {
      setAnnouncements(prev => prev.slice(1));
    }, 3000);
  }, []);

  // Focus management for mobile
  const focusMessageInput = useCallback(() => {
    const messageInput = document.querySelector('.message-input') as HTMLInputElement;
    if (messageInput) {
      messageInput.focus();
    }
  }, []);

  const focusFirstMessage = useCallback(() => {
    const firstMessage = document.querySelector('.chat-message') as HTMLElement;
    if (firstMessage) {
      firstMessage.focus();
    }
  }, []);

  // Keyboard navigation
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      // Close chat on escape
      const closeButton = document.querySelector('.chat-sidebar__toggle') as HTMLButtonElement;
      if (closeButton) {
        closeButton.click();
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardNavigation);
    return () => {
      document.removeEventListener('keydown', handleKeyboardNavigation);
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, [handleKeyboardNavigation]);

  return {
    announcements,
    announceMessage,
    focusMessageInput,
    focusFirstMessage,
  };
}