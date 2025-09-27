/**
 * Chat Service - Handles real-time chat operations with Supabase
 * Requirements: 1.1, 1.4, 2.1, 2.3, 4.3, 6.2, 6.3
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type {
  ChatMessage,
  ChatRealtimePayload,
  ChatServiceConfig,
  ConnectionStatus,
  ChatError,
  MessageValidationResult,
} from '../types/chat';
import { ChatErrorType } from '../types/chat';
import { validateChatMessage, sanitizeMessage } from '../utils/chat-validation';
import { CHAT_CONFIG } from '../types/chat';
import { chatPerformanceMonitor } from '../utils/performance-monitor';
import { memoryMonitor } from '../utils/memory-monitor';

/**
 * Authentication context for chat service
 */
interface AuthContext {
  userId: string;
  username: string;
  accessToken: string;
}

/**
 * Chat service class for managing real-time chat operations
 */
export class ChatService {
  private channel: RealtimeChannel | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageListeners: Set<(message: ChatMessage) => void> = new Set();
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private errorListeners: Set<(error: ChatError) => void> = new Set();
  private config: Required<ChatServiceConfig>;
  private authContext: AuthContext | null = null;

  constructor(config: Partial<ChatServiceConfig> = {}) {
    this.config = {
      maxMessages: config.maxMessages ?? CHAT_CONFIG.INITIAL_MESSAGE_LIMIT,
      presenceHeartbeatInterval: config.presenceHeartbeatInterval ?? CHAT_CONFIG.HEARTBEAT_INTERVAL_MS,
      maxReconnectAttempts: config.maxReconnectAttempts ?? CHAT_CONFIG.MAX_RECONNECT_ATTEMPTS,
      reconnectDelay: config.reconnectDelay ?? CHAT_CONFIG.RECONNECT_DELAY_MS,
      debug: config.debug ?? false,
    };

    this.log('ChatService initialized with config:', this.config);
  }

  /**
   * Initialize the chat service and establish real-time connection
   */
  async initialize(authContext?: AuthContext): Promise<void> {
    try {
      this.log('Initializing chat service...');
      this.setConnectionStatus('connecting');

      // Store auth context if provided
      if (authContext) {
        this.authContext = authContext;
      }

      // Check authentication
      if (!this.authContext) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          chatPerformanceMonitor.recordError();
          throw this.createError(ChatErrorType.AUTHENTICATION_REQUIRED, 'User must be authenticated to use chat');
        }
        
        // Create auth context from current user
        this.authContext = {
          userId: user.id,
          username: user.user_metadata?.username || user.email?.split('@')[0] || 'Anonymous',
          accessToken: (await supabase.auth.getSession()).data.session?.access_token || '',
        };
      }

      // Create real-time channel
      this.channel = supabase
        .channel('chat_messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
          },
          this.handleMessageInsert.bind(this)
        )
        .on('presence', { event: 'sync' }, () => {
          this.log('Presence sync event received');
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.log('User joined:', key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          this.log('User left:', key, leftPresences);
        });

      // Subscribe to the channel
      this.channel.subscribe((status) => {
        this.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          this.setConnectionStatus('connected');
          this.reconnectAttempts = 0;
          // Record successful connection
          chatPerformanceMonitor.recordConnectionEstablished();
        } else if (status === 'CHANNEL_ERROR') {
          this.handleConnectionError(new Error('Channel subscription failed'));
        } else if (status === 'TIMED_OUT') {
          this.handleConnectionError(new Error('Channel subscription timed out'));
        }
      });

      this.log('Chat service initialized successfully');
    } catch (error) {
      this.log('Failed to initialize chat service:', error);
      chatPerformanceMonitor.recordError();
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  /**
   * Send a chat message
   */
  async sendMessage(content: string): Promise<ChatMessage> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      this.log('Sending message:', content);

      // Record message send start
      chatPerformanceMonitor.recordMessageSent(messageId);

      // Validate message
      const validation = this.validateMessage(content);
      if (!validation.isValid) {
        chatPerformanceMonitor.recordError();
        throw this.createError(ChatErrorType.MESSAGE_TOO_LONG, validation.error || 'Invalid message');
      }

      // Check authentication
      if (!this.authContext) {
        chatPerformanceMonitor.recordError();
        throw this.createError(ChatErrorType.AUTHENTICATION_REQUIRED, 'Must be logged in to send messages');
      }

      // Insert message into database
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          content: validation.sanitizedContent!,
          user_id: this.authContext.userId,
          username: this.authContext.username,
        })
        .select()
        .single();

      if (error) {
        this.log('Failed to send message:', error);
        chatPerformanceMonitor.recordError();
        throw this.createError(ChatErrorType.MESSAGE_SEND_FAILED, 'Failed to send message');
      }

      // Record successful message delivery
      chatPerformanceMonitor.recordMessageReceived(messageId);

      this.log('Message sent successfully:', data);
      return data as ChatMessage;
    } catch (error) {
      this.log('Error sending message:', error);
      chatPerformanceMonitor.recordError();
      if (error instanceof Error && 'type' in error) {
        throw error; // Re-throw ChatError
      }
      throw this.createError(ChatErrorType.MESSAGE_SEND_FAILED, 'Failed to send message');
    }
  }

  /**
   * Fetch recent chat messages
   */
  async fetchMessages(limit: number = this.config.maxMessages): Promise<ChatMessage[]> {
    try {
      this.log('Fetching messages, limit:', limit);

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        this.log('Failed to fetch messages:', error);
        throw this.createError(ChatErrorType.UNKNOWN_ERROR, 'Failed to fetch messages');
      }

      // Reverse to show oldest first
      const messages = (data as ChatMessage[]).reverse();
      this.log('Fetched messages:', messages.length);
      return messages;
    } catch (error) {
      this.log('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Subscribe to new messages
   */
  onMessage(callback: (message: ChatMessage) => void): () => void {
    this.messageListeners.add(callback);
    return () => {
      this.messageListeners.delete(callback);
    };
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    // Immediately call with current status
    callback(this.connectionStatus);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Subscribe to errors
   */
  onError(callback: (error: ChatError) => void): () => void {
    this.errorListeners.add(callback);
    return () => {
      this.errorListeners.delete(callback);
    };
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connectionStatus === 'connected';
  }

  /**
   * Update access token (for token refresh)
   */
  updateToken(newToken: string): void {
    if (this.authContext) {
      this.log('Updating access token');
      this.authContext.accessToken = newToken;
    }
  }

  /**
   * Get current user context
   */
  getCurrentUser(): { userId: string; username: string } | null {
    if (!this.authContext) {
      return null;
    }
    
    return {
      userId: this.authContext.userId,
      username: this.authContext.username,
    };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authContext !== null;
  }

  /**
   * Manually reconnect
   */
  async reconnect(): Promise<void> {
    this.log('Manual reconnect requested');
    this.cleanup();
    await this.initialize();
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.log('Disconnecting chat service');
    this.cleanup();
    this.setConnectionStatus('disconnected');
  }

  /**
   * Validate a message before sending
   */
  private validateMessage(content: string): MessageValidationResult {
    return validateChatMessage(content);
  }

  /**
   * Handle new message from real-time subscription
   */
  private handleMessageInsert(payload: RealtimePostgresChangesPayload<ChatMessage>): void {
    this.log('Received new message:', payload);
    
    if (payload.eventType === 'INSERT' && payload.new) {
      const message = payload.new as ChatMessage;
      
      // Record message received for performance monitoring
      const messageId = `received_${message.id}_${Date.now()}`;
      chatPerformanceMonitor.recordMessageReceived(messageId);
      
      this.messageListeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          this.log('Error in message listener:', error);
          chatPerformanceMonitor.recordError();
        }
      });
    }
  }

  /**
   * Handle connection errors and implement reconnection logic
   */
  private handleConnectionError(error: Error): void {
    this.log('Connection error:', error);
    
    // Record error for performance monitoring
    chatPerformanceMonitor.recordError();
    
    const chatError = this.createError(ChatErrorType.CONNECTION_FAILED, error.message);
    this.errorListeners.forEach(listener => {
      try {
        listener(chatError);
      } catch (err) {
        this.log('Error in error listener:', err);
        chatPerformanceMonitor.recordError();
      }
    });

    // Implement exponential backoff for reconnection
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.setConnectionStatus('reconnecting');
      const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      
      this.log(`Attempting reconnection ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts} in ${delay}ms`);
      
      this.reconnectTimer = setTimeout(async () => {
        this.reconnectAttempts++;
        try {
          await this.initialize();
        } catch (reconnectError) {
          this.log('Reconnection failed:', reconnectError);
          this.handleConnectionError(reconnectError as Error);
        }
      }, delay);
    } else {
      this.log('Max reconnection attempts reached');
      this.setConnectionStatus('disconnected');
    }
  }

  /**
   * Set connection status and notify listeners
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.log('Connection status changed:', this.connectionStatus, '->', status);
      this.connectionStatus = status;
      this.statusListeners.forEach(listener => {
        try {
          listener(status);
        } catch (error) {
          this.log('Error in status listener:', error);
        }
      });
    }
  }

  /**
   * Create a structured chat error
   */
  private createError(type: ChatErrorType, message: string, details?: Record<string, any>): ChatError {
    return {
      type,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }

    this.reconnectAttempts = 0;
  }

  /**
   * Debug logging
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[ChatService]', ...args);
    }
  }
}

// Export singleton instance
export const chatService = new ChatService({
  debug: import.meta.env.DEV,
});

export default chatService;