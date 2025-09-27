import { useState, useEffect, useCallback } from 'react';

interface ChatLayoutState {
  isCollapsed: boolean;
  isVisible: boolean;
  position: 'right' | 'left';
}

const CHAT_LAYOUT_STORAGE_KEY = 'tarkov-casino-chat-layout';

/**
 * Hook for managing chat layout state with persistence
 * Requirements: 6.4 - Chat state persistence across page navigation
 */
export const useChatLayout = () => {
  const [chatState, setChatState] = useState<ChatLayoutState>(() => {
    // Load initial state from localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(CHAT_LAYOUT_STORAGE_KEY);
        if (saved) {
          return JSON.parse(saved);
        }
      }
    } catch (error) {
      console.warn('Failed to load chat layout state:', error);
    }
    
    // Default state
    return {
      isCollapsed: false,
      isVisible: true,
      position: 'right' as const,
    };
  });

  // Persist state changes to localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(CHAT_LAYOUT_STORAGE_KEY, JSON.stringify(chatState));
      }
    } catch (error) {
      console.warn('Failed to save chat layout state:', error);
    }
  }, [chatState.isCollapsed, chatState.isVisible, chatState.position]);

  const toggleChat = useCallback(() => {
    setChatState(prev => ({
      ...prev,
      isCollapsed: !prev.isCollapsed,
    }));
  }, []);

  const hideChat = useCallback(() => {
    setChatState(prev => ({
      ...prev,
      isVisible: false,
    }));
  }, []);

  const showChat = useCallback(() => {
    setChatState(prev => ({
      ...prev,
      isVisible: true,
    }));
  }, []);

  const setPosition = useCallback((position: 'right' | 'left') => {
    setChatState(prev => ({
      ...prev,
      position,
    }));
  }, []);

  return {
    chatState,
    toggleChat,
    hideChat,
    showChat,
    setPosition,
    isCollapsed: chatState.isCollapsed,
    isVisible: chatState.isVisible,
    position: chatState.position,
  };
};