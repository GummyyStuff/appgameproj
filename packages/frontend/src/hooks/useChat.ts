/**
 * Chat Hook - Manages chat state with useReducer and real-time subscriptions
 * Requirements: 1.1, 1.2, 2.1, 2.2, 5.1, 5.2, 6.1
 */

import { useReducer, useEffect, useCallback, createContext, useContext } from 'react';
import type {
  ChatContextType,
  ChatMessage,
  OnlineUser,
  ConnectionStatus,
  ChatError,
  ChatMessageWithStatus,
  ConnectionHealth,
  NetworkStatus,
} from '../types/chat';
import { MessageStatus } from '../types/chat';
import { connectionManager } from '../services/connection-manager';
import { useAuth } from './useAuth';

// Chat state interface
interface ChatState {
  messages: ChatMessageWithStatus[];
  onlineUsers: OnlineUser[];
  connectionStatus: ConnectionStatus;
  isAuthenticated: boolean;
  currentUser: { id: string; username: string } | null;
  error: string | null;
  isLoading: boolean;
  onlineUserCount: number;
  isInitialized: boolean;
  connectionHealth: ConnectionHealth;
  networkStatus: NetworkStatus;
}

// Chat action types
type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'SET_AUTHENTICATED'; payload: { isAuthenticated: boolean; currentUser: { id: string; username: string } | null } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'ADD_OPTIMISTIC_MESSAGE'; payload: ChatMessageWithStatus }
  | { type: 'UPDATE_MESSAGE_STATUS'; payload: { tempId: string; status: MessageStatus; message?: ChatMessage } }
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'SET_ONLINE_USERS'; payload: OnlineUser[] }
  | { type: 'SET_CONNECTION_HEALTH'; payload: ConnectionHealth }
  | { type: 'SET_NETWORK_STATUS'; payload: NetworkStatus }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: ChatState = {
  messages: [],
  onlineUsers: [],
  connectionStatus: 'disconnected',
  isAuthenticated: false,
  currentUser: null,
  error: null,
  isLoading: false,
  onlineUserCount: 0,
  isInitialized: false,
  connectionHealth: {
    status: 'disconnected',
    reconnectAttempt: 0,
    maxReconnectAttempts: 5,
    nextReconnectDelay: 1000,
    offlineQueueEnabled: true,
    queuedMessageCount: 0,
  },
  networkStatus: {
    isOnline: navigator.onLine,
  },
};

// Chat reducer
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };

    case 'SET_AUTHENTICATED':
      return {
        ...state,
        isAuthenticated: action.payload.isAuthenticated,
        currentUser: action.payload.currentUser,
      };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'ADD_MESSAGE':
      // Remove any optimistic message with the same content and add the real message
      const filteredMessages = state.messages.filter(
        msg => !(msg.tempId && msg.content === action.payload.content && msg.user_id === action.payload.user_id)
      );
      return {
        ...state,
        messages: [...filteredMessages, { ...action.payload, status: MessageStatus.SENT }],
      };

    case 'ADD_OPTIMISTIC_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case 'UPDATE_MESSAGE_STATUS':
      return {
        ...state,
        messages: state.messages.map(msg => {
          if (msg.tempId === action.payload.tempId) {
            if (action.payload.message) {
              // Replace with real message
              return { ...action.payload.message, status: MessageStatus.SENT };
            } else {
              // Update status only
              return { ...msg, status: action.payload.status };
            }
          }
          return msg;
        }),
      };

    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload.map(msg => ({ ...msg, status: MessageStatus.SENT })),
      };

    case 'SET_ONLINE_USERS':
      return {
        ...state,
        onlineUsers: action.payload,
        onlineUserCount: action.payload.length,
      };

    case 'SET_CONNECTION_HEALTH':
      return {
        ...state,
        connectionHealth: action.payload,
      };

    case 'SET_NETWORK_STATUS':
      return {
        ...state,
        networkStatus: action.payload,
      };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };

    case 'RESET_STATE':
      return { ...initialState };

    default:
      return state;
  }
}

// Create context
export const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Custom hook to use chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

// Main chat state hook
export const useChatState = () => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user, session } = useAuth();

  // Extract username from user data with fallback logic
  const extractUsername = (user: any): string => {
    // Priority order for username extraction:
    // 1. user_metadata.username (set during registration)
    // 2. user_metadata.display_name (alternative field)
    // 3. user_metadata.full_name (fallback)
    // 4. email prefix (before @)
    // 5. 'Anonymous' as final fallback
    
    if (user.user_metadata?.username) {
      return user.user_metadata.username;
    }
    
    if (user.user_metadata?.display_name) {
      return user.user_metadata.display_name;
    }
    
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    
    if (user.email) {
      const emailPrefix = user.email.split('@')[0];
      // Clean up email prefix (remove dots, numbers at end, etc.)
      return emailPrefix.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20) || 'Anonymous';
    }
    
    return 'Anonymous';
  };

  // Initialize chat services
  useEffect(() => {
    if (user && session && !state.isInitialized) {
      const initializeChat = async () => {
        try {
          dispatch({ type: 'SET_LOADING', payload: true });
          
          const username = extractUsername(user);
          
          dispatch({
            type: 'SET_AUTHENTICATED',
            payload: {
              isAuthenticated: true,
              currentUser: {
                id: user.id,
                username,
              },
            },
          });

          // Initialize connection manager with user context
          await connectionManager.initialize({
            userId: user.id,
            username,
            accessToken: session.access_token,
          });

          // Set up event listeners
          setupEventListeners();

          // Load initial messages
          const messages = await connectionManager.getChatService().fetchMessages();
          dispatch({ type: 'SET_MESSAGES', payload: messages });

          dispatch({ type: 'SET_INITIALIZED', payload: true });
        } catch (error) {
          console.error('Failed to initialize chat:', error);
          dispatch({
            type: 'SET_ERROR',
            payload: error instanceof Error ? error.message : 'Failed to initialize chat',
          });
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      };

      initializeChat();
    } else if (!user || !session) {
      // User logged out, reset state
      if (state.isInitialized) {
        dispatch({ type: 'RESET_STATE' });
        connectionManager.disconnect();
      }
    }
  }, [user, session, state.isInitialized]);

  // Handle authentication state changes (token refresh, etc.)
  useEffect(() => {
    if (user && session && state.isInitialized) {
      // Update connection manager with new token if it changed
      const currentToken = connectionManager.getCurrentToken();
      if (currentToken !== session.access_token) {
        connectionManager.updateToken(session.access_token);
      }
      
      // Update username if it changed
      const currentUsername = state.currentUser?.username;
      const newUsername = extractUsername(user);
      if (currentUsername !== newUsername) {
        dispatch({
          type: 'SET_AUTHENTICATED',
          payload: {
            isAuthenticated: true,
            currentUser: {
              id: user.id,
              username: newUsername,
            },
          },
        });
      }
    }
  }, [user, session, state.isInitialized, state.currentUser?.username]);

  // Set up event listeners
  const setupEventListeners = useCallback(() => {
    // Connection status listener
    const unsubscribeStatus = connectionManager.onStatusChange((status) => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
    });

    // Error listener
    const unsubscribeError = connectionManager.onError((error) => {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    });

    // Connection health listener
    const unsubscribeHealth = connectionManager.onHealthChange((health) => {
      dispatch({ type: 'SET_CONNECTION_HEALTH', payload: health });
    });

    // Message listener
    const unsubscribeMessages = connectionManager.getChatService().onMessage((message) => {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    });

    // Online users listener
    const unsubscribeUsers = connectionManager.getPresenceService().onUsersChange((users) => {
      dispatch({ type: 'SET_ONLINE_USERS', payload: users });
    });

    // Network status monitoring - use passive event listeners to avoid interfering with React Router
    const updateNetworkStatus = () => {
      const networkStatus = connectionManager.getNetworkStatus();
      dispatch({ type: 'SET_NETWORK_STATUS', payload: networkStatus });
    };

    // Use passive event listeners and wrap in requestAnimationFrame to avoid blocking React Router
    const handleOnline = () => {
      requestAnimationFrame(updateNetworkStatus);
    };

    const handleOffline = () => {
      requestAnimationFrame(updateNetworkStatus);
    };

    window.addEventListener('online', handleOnline, { passive: true });
    window.addEventListener('offline', handleOffline, { passive: true });

    // Return cleanup function
    return () => {
      unsubscribeStatus();
      unsubscribeError();
      unsubscribeHealth();
      unsubscribeMessages();
      unsubscribeUsers();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Send message with optimistic updates and offline queuing
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!state.isAuthenticated || !state.currentUser) {
      throw new Error('Must be authenticated to send messages');
    }

    if (!content.trim()) {
      throw new Error('Message cannot be empty');
    }

    // Generate temporary ID for optimistic update
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    
    // Create optimistic message
    const optimisticMessage: ChatMessageWithStatus = {
      id: tempId,
      content: content.trim(),
      user_id: state.currentUser.id,
      username: state.currentUser.username,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: MessageStatus.SENDING,
      tempId,
    };

    // Add optimistic message to UI
    dispatch({ type: 'ADD_OPTIMISTIC_MESSAGE', payload: optimisticMessage });

    try {
      if (connectionManager.isConnected()) {
        // Send message through service if connected
        const sentMessage = await connectionManager.getChatService().sendMessage(content);
        
        // Update optimistic message with real message
        dispatch({
          type: 'UPDATE_MESSAGE_STATUS',
          payload: {
            tempId,
            status: MessageStatus.SENT,
            message: sentMessage,
          },
        });
      } else {
        // Queue message for offline sending
        connectionManager.queueMessage(content);
        
        // Update optimistic message status to indicate queued
        dispatch({
          type: 'UPDATE_MESSAGE_STATUS',
          payload: {
            tempId,
            status: MessageStatus.SENDING, // Keep as sending until connection restored
          },
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // If connected but failed, try to queue the message
      if (connectionManager.isConnected()) {
        try {
          connectionManager.queueMessage(content);
          dispatch({
            type: 'UPDATE_MESSAGE_STATUS',
            payload: {
              tempId,
              status: MessageStatus.SENDING,
            },
          });
        } catch (queueError) {
          // Mark message as failed if can't queue
          dispatch({
            type: 'UPDATE_MESSAGE_STATUS',
            payload: {
              tempId,
              status: MessageStatus.FAILED,
            },
          });
        }
      } else {
        // Mark message as failed
        dispatch({
          type: 'UPDATE_MESSAGE_STATUS',
          payload: {
            tempId,
            status: MessageStatus.FAILED,
          },
        });
      }

      // Set error state
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to send message',
      });

      throw error;
    }
  }, [state.isAuthenticated, state.currentUser]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Reconnect
  const reconnect = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      await connectionManager.reconnect();
    } catch (error) {
      console.error('Failed to reconnect:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to reconnect',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Retry failed messages
  const retryFailedMessages = useCallback(async () => {
    try {
      await connectionManager.retryFailedMessages();
    } catch (error) {
      console.error('Failed to retry messages:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to retry messages',
      });
    }
  }, []);

  // Clear message queue
  const clearMessageQueue = useCallback(() => {
    connectionManager.clearMessageQueue();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isInitialized) {
        connectionManager.disconnect();
      }
    };
  }, [state.isInitialized]);

  // Return context value
  const contextValue: ChatContextType = {
    messages: state.messages,
    onlineUsers: state.onlineUsers,
    sendMessage,
    isConnected: state.connectionStatus === 'connected',
    connectionStatus: state.connectionStatus,
    isAuthenticated: state.isAuthenticated,
    currentUser: state.currentUser,
    error: state.error,
    isLoading: state.isLoading,
    clearError,
    reconnect,
    onlineUserCount: state.onlineUserCount,
    connectionHealth: state.connectionHealth,
    networkStatus: state.networkStatus,
    retryFailedMessages,
    clearMessageQueue,
  };

  return contextValue;
};