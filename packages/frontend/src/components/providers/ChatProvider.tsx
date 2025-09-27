/**
 * Chat Provider - React context provider for chat state management
 * Requirements: 1.1, 1.2, 2.1, 2.2, 5.1, 5.2, 6.1
 */

import React from 'react';
import { ChatContext, useChatState } from '../../hooks/useChat';

interface ChatProviderProps {
  children: React.ReactNode;
}

/**
 * ChatProvider component that provides chat context to child components
 * Uses useReducer for state management and handles real-time subscriptions
 */
const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const chatState = useChatState();

  return (
    <ChatContext.Provider value={chatState}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatProvider;