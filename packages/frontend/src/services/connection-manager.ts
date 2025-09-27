/**
 * Connection Manager - Coordinates chat and presence services with unified connection management
 * Requirements: 6.2, 6.3, 4.3
 */

import type {
  ConnectionStatus,
  ChatError,
  ChatErrorType,
  ChatServiceConfig,
  QueuedMessage,
  ConnectionHealth,
  NetworkStatus,
} from '../types/chat';
import { ChatService } from './chat-service';
import { PresenceService } from './presence-service';

/**
 * Authentication context for connection manager
 */
interface AuthContext {
  userId: string;
  username: string;
  accessToken: string;
}

/**
 * Connection manager that coordinates chat and presence services
 */
export class ConnectionManager {
  private chatService: ChatService;
  private presenceService: PresenceService;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private authContext: AuthContext | null = null;
  private lastConnectedAt: string | null = null;
  private lastError: ChatError | null = null;
  
  // Offline message queue
  private messageQueue: QueuedMessage[] = [];
  private isProcessingQueue = false;
  private queueProcessTimer: NodeJS.Timeout | null = null;
  
  // Network monitoring
  private networkStatus: NetworkStatus = {
    isOnline: navigator.onLine,
  };
  private networkListeners: Set<() => void> = new Set();
  
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private errorListeners: Set<(error: ChatError) => void> = new Set();
  private healthListeners: Set<(health: ConnectionHealth) => void> = new Set();
  
  private config: Required<Pick<ChatServiceConfig, 'maxReconnectAttempts' | 'reconnectDelay' | 'debug'>>;

  constructor(config: Partial<ChatServiceConfig> = {}) {
    this.config = {
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 1000,
      debug: config.debug ?? false,
    };

    // Create service instances
    this.chatService = new ChatService(config);
    this.presenceService = new PresenceService(config);

    // Set up service event listeners
    this.setupServiceListeners();

    // Set up network monitoring
    this.setupNetworkMonitoring();

    // Load queued messages from localStorage
    this.loadMessageQueue();

    this.log('ConnectionManager initialized');
  }

  /**
   * Initialize both chat and presence services with authentication context
   */
  async initialize(authContext?: AuthContext): Promise<void> {
    if (this.isInitialized && !authContext) {
      this.log('Already initialized, skipping');
      return;
    }

    // Store auth context for reconnections
    if (authContext) {
      this.authContext = authContext;
    }

    if (!this.authContext) {
      throw new Error('Authentication context is required for initialization');
    }

    try {
      this.log('Initializing connection manager with user:', this.authContext.username);
      this.setConnectionStatus('connecting');

      // Initialize both services in parallel with auth context
      await Promise.all([
        this.chatService.initialize(this.authContext),
        this.presenceService.initialize(this.authContext),
      ]);

      this.isInitialized = true;
      this.reconnectAttempts = 0;
      this.setConnectionStatus('connected');
      
      this.log('Connection manager initialized successfully');
    } catch (error) {
      this.log('Failed to initialize connection manager:', error);
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  /**
   * Get chat service instance
   */
  getChatService(): ChatService {
    return this.chatService;
  }

  /**
   * Get presence service instance
   */
  getPresenceService(): PresenceService {
    return this.presenceService;
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
   * Manually reconnect both services
   */
  async reconnect(): Promise<void> {
    this.log('Manual reconnect requested');
    this.cleanup();
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * Disconnect and cleanup both services
   */
  disconnect(): void {
    this.log('Disconnecting connection manager');
    this.cleanup();
    this.authContext = null; // Clear auth context on disconnect
    this.setConnectionStatus('disconnected');
  }

  /**
   * Check if services are healthy
   */
  isHealthy(): boolean {
    return (
      this.isInitialized &&
      this.chatService.isConnected() &&
      this.presenceService.isConnected()
    );
  }

  /**
   * Get current access token
   */
  getCurrentToken(): string | null {
    return this.authContext?.accessToken || null;
  }

  /**
   * Update access token (for token refresh)
   */
  updateToken(newToken: string): void {
    if (this.authContext) {
      this.log('Updating access token');
      this.authContext.accessToken = newToken;
      
      // Update token in services
      this.chatService.updateToken(newToken);
      this.presenceService.updateToken(newToken);
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
   * Get connection statistics
   */
  getConnectionStats(): {
    chatConnected: boolean;
    presenceConnected: boolean;
    reconnectAttempts: number;
    isHealthy: boolean;
    isAuthenticated: boolean;
  } {
    return {
      chatConnected: this.chatService.isConnected(),
      presenceConnected: this.presenceService.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      isHealthy: this.isHealthy(),
      isAuthenticated: this.authContext !== null,
    };
  }

  /**
   * Get connection health information
   */
  getConnectionHealth(): ConnectionHealth {
    return {
      status: this.connectionStatus,
      lastConnected: this.lastConnectedAt,
      reconnectAttempt: this.reconnectAttempts,
      maxReconnectAttempts: this.config.maxReconnectAttempts,
      nextReconnectDelay: this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      offlineQueueEnabled: true,
      queuedMessageCount: this.messageQueue.length,
      lastError: this.lastError,
    };
  }

  /**
   * Get network status
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Subscribe to connection health changes
   */
  onHealthChange(callback: (health: ConnectionHealth) => void): () => void {
    this.healthListeners.add(callback);
    // Immediately call with current health
    callback(this.getConnectionHealth());
    return () => {
      this.healthListeners.delete(callback);
    };
  }

  /**
   * Queue a message for offline sending
   */
  queueMessage(content: string): string {
    if (!this.authContext) {
      throw new Error('Authentication required to queue messages');
    }

    const tempId = `queued_${Date.now()}_${Math.random()}`;
    const queuedMessage: QueuedMessage = {
      tempId,
      content: content.trim(),
      userId: this.authContext.userId,
      username: this.authContext.username,
      queuedAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
    };

    this.messageQueue.push(queuedMessage);
    this.saveMessageQueue();
    this.notifyHealthListeners();

    this.log('Message queued for offline sending:', tempId);
    return tempId;
  }

  /**
   * Process queued messages when connection is restored
   */
  async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0 || !this.isConnected()) {
      return;
    }

    this.isProcessingQueue = true;
    this.log('Processing message queue:', this.messageQueue.length, 'messages');

    const messagesToProcess = [...this.messageQueue];
    const failedMessages: QueuedMessage[] = [];

    for (const queuedMessage of messagesToProcess) {
      try {
        await this.chatService.sendMessage(queuedMessage.content);
        this.log('Queued message sent successfully:', queuedMessage.tempId);
        
        // Remove from queue
        this.messageQueue = this.messageQueue.filter(msg => msg.tempId !== queuedMessage.tempId);
      } catch (error) {
        this.log('Failed to send queued message:', queuedMessage.tempId, error);
        
        queuedMessage.retryCount++;
        if (queuedMessage.retryCount < queuedMessage.maxRetries) {
          failedMessages.push(queuedMessage);
        } else {
          this.log('Max retries reached for message:', queuedMessage.tempId);
          // Remove from queue after max retries
          this.messageQueue = this.messageQueue.filter(msg => msg.tempId !== queuedMessage.tempId);
        }
      }
    }

    // Update queue with failed messages that still have retries
    this.messageQueue = failedMessages;
    this.saveMessageQueue();
    this.isProcessingQueue = false;
    this.notifyHealthListeners();

    // Schedule retry for failed messages
    if (failedMessages.length > 0) {
      this.scheduleQueueRetry();
    }
  }

  /**
   * Retry failed messages manually
   */
  async retryFailedMessages(): Promise<void> {
    if (this.messageQueue.length === 0) {
      return;
    }

    this.log('Manually retrying failed messages');
    await this.processMessageQueue();
  }

  /**
   * Clear message queue
   */
  clearMessageQueue(): void {
    this.messageQueue = [];
    this.saveMessageQueue();
    this.notifyHealthListeners();
    this.log('Message queue cleared');
  }

  /**
   * Get queued messages count
   */
  getQueuedMessageCount(): number {
    return this.messageQueue.length;
  }

  /**
   * Set up listeners for individual service status changes
   */
  private setupServiceListeners(): void {
    // Chat service status listener
    this.chatService.onStatusChange((status) => {
      this.log('Chat service status changed:', status);
      this.updateOverallStatus();
    });

    // Presence service status listener
    this.presenceService.onStatusChange((status) => {
      this.log('Presence service status changed:', status);
      this.updateOverallStatus();
    });

    // Error listeners
    this.chatService.onError((error) => {
      this.log('Chat service error:', error);
      this.handleServiceError(error);
    });

    this.presenceService.onError((error) => {
      this.log('Presence service error:', error);
      this.handleServiceError(error);
    });
  }

  /**
   * Update overall connection status based on individual service statuses
   */
  private updateOverallStatus(): void {
    const chatStatus = this.chatService.getConnectionStatus();
    const presenceStatus = this.presenceService.getConnectionStatus();

    let newStatus: ConnectionStatus;

    // Determine overall status
    if (chatStatus === 'connected' && presenceStatus === 'connected') {
      newStatus = 'connected';
    } else if (chatStatus === 'connecting' || presenceStatus === 'connecting') {
      newStatus = 'connecting';
    } else if (chatStatus === 'reconnecting' || presenceStatus === 'reconnecting') {
      newStatus = 'reconnecting';
    } else {
      newStatus = 'disconnected';
    }

    this.setConnectionStatus(newStatus);
  }

  /**
   * Handle errors from individual services
   */
  private handleServiceError(error: ChatError): void {
    this.log('Service error received:', error);
    
    // Forward error to listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        this.log('Error in error listener:', err);
      }
    });

    // If it's a connection error, attempt to reconnect
    if (error.type === 'connection_failed') {
      this.handleConnectionError(new Error(error.message));
    }
  }

  /**
   * Handle connection errors and implement reconnection logic
   */
  private handleConnectionError(error: Error): void {
    this.log('Connection error:', error);

    // Store the error
    this.lastError = {
      type: ChatErrorType.CONNECTION_FAILED,
      message: error.message,
      timestamp: new Date().toISOString(),
    };

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Check if we should attempt reconnection based on network status
    if (!this.networkStatus.isOnline) {
      this.log('Network is offline, waiting for network restoration');
      this.setConnectionStatus('disconnected');
      this.notifyHealthListeners();
      return;
    }

    // Implement exponential backoff for reconnection
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.setConnectionStatus('reconnecting');
      const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      
      this.log(`Attempting reconnection ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts} in ${delay}ms`);
      
      this.reconnectTimer = setTimeout(async () => {
        this.reconnectAttempts++;
        try {
          this.cleanup();
          this.isInitialized = false;
          await this.initialize();
        } catch (reconnectError) {
          this.log('Reconnection failed:', reconnectError);
          this.handleConnectionError(reconnectError as Error);
        }
      }, delay);
    } else {
      this.log('Max reconnection attempts reached');
      this.setConnectionStatus('disconnected');
      
      // Emit final error
      const finalError: ChatError = {
        type: ChatErrorType.CONNECTION_FAILED,
        message: 'Failed to reconnect after maximum attempts',
        details: { maxAttempts: this.config.maxReconnectAttempts },
        timestamp: new Date().toISOString(),
      };
      
      this.lastError = finalError;
      this.notifyHealthListeners();
      
      this.errorListeners.forEach(listener => {
        try {
          listener(finalError);
        } catch (err) {
          this.log('Error in error listener:', err);
        }
      });
    }
  }

  /**
   * Set connection status and notify listeners
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.log('Connection status changed:', this.connectionStatus, '->', status);
      this.connectionStatus = status;
      
      // Reset reconnect attempts and clear error on successful connection
      if (status === 'connected') {
        this.reconnectAttempts = 0;
        this.lastConnectedAt = new Date().toISOString();
        this.lastError = null;
        
        // Process queued messages when connection is restored
        this.processMessageQueue().catch(error => {
          this.log('Error processing message queue:', error);
        });
      }
      
      this.statusListeners.forEach(listener => {
        try {
          listener(status);
        } catch (error) {
          this.log('Error in status listener:', error);
        }
      });

      this.notifyHealthListeners();
    }
  }

  /**
   * Set up network monitoring - use passive event listeners to avoid interfering with React Router
   */
  private setupNetworkMonitoring(): void {
    const updateNetworkStatus = () => {
      const wasOnline = this.networkStatus.isOnline;
      this.networkStatus.isOnline = navigator.onLine;

      // Get connection info if available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        this.networkStatus.connectionType = connection?.effectiveType;
        this.networkStatus.effectiveBandwidth = connection?.downlink;
        this.networkStatus.rtt = connection?.rtt;
      }

      this.log('Network status changed:', this.networkStatus);

      // If network came back online, attempt reconnection
      if (!wasOnline && this.networkStatus.isOnline && this.connectionStatus === 'disconnected') {
        this.log('Network restored, attempting reconnection');
        this.reconnectAttempts = 0; // Reset attempts on network restoration
        this.reconnect().catch(error => {
          this.log('Auto-reconnection failed:', error);
        });
      }

      this.notifyHealthListeners();
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

    // Store cleanup function
    this.networkListeners.add(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    });
  }

  /**
   * Load message queue from localStorage
   */
  private loadMessageQueue(): void {
    try {
      const stored = localStorage.getItem('chat_message_queue');
      if (stored) {
        this.messageQueue = JSON.parse(stored);
        this.log('Loaded message queue from storage:', this.messageQueue.length, 'messages');
      }
    } catch (error) {
      this.log('Failed to load message queue from storage:', error);
      this.messageQueue = [];
    }
  }

  /**
   * Save message queue to localStorage
   */
  private saveMessageQueue(): void {
    try {
      localStorage.setItem('chat_message_queue', JSON.stringify(this.messageQueue));
    } catch (error) {
      this.log('Failed to save message queue to storage:', error);
    }
  }

  /**
   * Schedule retry for failed messages
   */
  private scheduleQueueRetry(): void {
    if (this.queueProcessTimer) {
      clearTimeout(this.queueProcessTimer);
    }

    // Retry after 30 seconds
    this.queueProcessTimer = setTimeout(() => {
      if (this.isConnected()) {
        this.processMessageQueue().catch(error => {
          this.log('Scheduled queue retry failed:', error);
        });
      }
    }, 30000);
  }

  /**
   * Notify health listeners
   */
  private notifyHealthListeners(): void {
    const health = this.getConnectionHealth();
    this.healthListeners.forEach(listener => {
      try {
        listener(health);
      } catch (error) {
        this.log('Error in health listener:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.queueProcessTimer) {
      clearTimeout(this.queueProcessTimer);
      this.queueProcessTimer = null;
    }

    // Cleanup network listeners
    this.networkListeners.forEach(cleanup => cleanup());
    this.networkListeners.clear();

    // Disconnect services
    this.chatService.disconnect();
    this.presenceService.disconnect();
  }

  /**
   * Debug logging
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[ConnectionManager]', ...args);
    }
  }
}

// Export singleton instance
export const connectionManager = new ConnectionManager({
  debug: import.meta.env.DEV,
});

export default connectionManager;