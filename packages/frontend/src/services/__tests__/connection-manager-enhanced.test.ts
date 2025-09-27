/**
 * Enhanced Connection Manager Unit Tests
 * Tests for error handling, offline queuing, and network monitoring
 * Requirements: 4.1, 4.2, 4.3, 6.2, 6.3
 */

import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { ConnectionManager } from '../connection-manager';
import { ChatService } from '../chat-service';
import { PresenceService } from '../presence-service';
import type { ConnectionStatus, ChatError, QueuedMessage } from '../../types/chat';

// Mock the service classes
mock.module('../chat-service', () => ({
  ChatService: mock(),
}));
mock.module('../presence-service', () => ({
  PresenceService: mock(),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: mock(),
  setItem: mock(),
  removeItem: mock(),
  clear: mock(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('ConnectionManager - Enhanced Error Handling', () => {
  let connectionManager: ConnectionManager;
  let mockChatService: any;
  let mockPresenceService: any;

  beforeEach(() => {
    mock.restore();
    mockLocalStorage.getItem.mockReturnValue(null);

    // Create mock service instances
    mockChatService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
      getConnectionStatus: vi.fn().mockReturnValue('disconnected'),
      onStatusChange: vi.fn().mockReturnValue(() => {}),
      onError: vi.fn().mockReturnValue(() => {}),
      sendMessage: vi.fn().mockResolvedValue({ id: 'msg-1', content: 'test' }),
      updateToken: vi.fn(),
    };

    mockPresenceService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
      getConnectionStatus: vi.fn().mockReturnValue('disconnected'),
      onStatusChange: vi.fn().mockReturnValue(() => {}),
      onError: vi.fn().mockReturnValue(() => {}),
      updateToken: vi.fn(),
    };

    // Mock the constructors
    (ChatService as any).mockImplementation(() => mockChatService);
    (PresenceService as any).mockImplementation(() => mockPresenceService);

    connectionManager = new ConnectionManager({ 
      debug: false,
      maxReconnectAttempts: 3,
      reconnectDelay: 100,
    });
  });

  afterEach(() => {
    connectionManager.disconnect();
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: true });
  });

  describe('connection health monitoring', () => {
    it('should provide connection health information', async () => {
      const health = connectionManager.getConnectionHealth();

      expect(health).toEqual({
        status: 'disconnected',
        lastConnected: null,
        reconnectAttempt: 0,
        maxReconnectAttempts: 3,
        nextReconnectDelay: 100,
        offlineQueueEnabled: true,
        queuedMessageCount: 0,
        lastError: null,
      });
    });

    it('should update health when connection status changes', async () => {
      const healthListener = vi.fn();
      connectionManager.onHealthChange(healthListener);

      mockChatService.isConnected.mockReturnValue(true);
      mockPresenceService.isConnected.mockReturnValue(true);

      await connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      });

      expect(healthListener).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'connected',
          reconnectAttempt: 0,
          lastConnected: expect.any(String),
        })
      );
    });

    it('should track last error in health status', async () => {
      const error = new Error('Connection failed');
      mockChatService.initialize.mockRejectedValue(error);

      try {
        await connectionManager.initialize({
          userId: 'user-1',
          username: 'testuser',
          accessToken: 'token',
        });
      } catch (e) {
        // Expected to fail
      }

      const health = connectionManager.getConnectionHealth();
      expect(health.lastError).toEqual({
        type: 'connection_failed',
        message: 'Connection failed',
        timestamp: expect.any(String),
      });
    });
  });

  describe('network status monitoring', () => {
    it('should track network status', () => {
      const networkStatus = connectionManager.getNetworkStatus();
      expect(networkStatus.isOnline).toBe(true);
    });

    it('should handle network offline events', async () => {
      const healthListener = vi.fn();
      connectionManager.onHealthChange(healthListener);

      // Simulate network going offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));

      const networkStatus = connectionManager.getNetworkStatus();
      expect(networkStatus.isOnline).toBe(false);
    });

    it('should attempt reconnection when network comes back online', async () => {
      const statusListener = vi.fn();
      connectionManager.onStatusChange(statusListener);

      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      // Initialize connection manager
      await connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      });

      // Simulate network coming back online
      Object.defineProperty(navigator, 'onLine', { value: true });
      mockChatService.isConnected.mockReturnValue(true);
      mockPresenceService.isConnected.mockReturnValue(true);
      
      window.dispatchEvent(new Event('online'));

      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockChatService.initialize).toHaveBeenCalledTimes(2); // Initial + reconnect
    });
  });

  describe('offline message queuing', () => {
    beforeEach(async () => {
      await connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      });
    });

    it('should queue messages when offline', () => {
      const tempId = connectionManager.queueMessage('Hello world');

      expect(tempId).toMatch(/^queued_\d+_/);
      expect(connectionManager.getQueuedMessageCount()).toBe(1);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'chat_message_queue',
        expect.stringContaining('Hello world')
      );
    });

    it('should load queued messages from localStorage on initialization', () => {
      const queuedMessages: QueuedMessage[] = [{
        tempId: 'queued_123',
        content: 'Saved message',
        userId: 'user-1',
        username: 'testuser',
        queuedAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
      }];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(queuedMessages));

      const newManager = new ConnectionManager({ debug: false });
      expect(newManager.getQueuedMessageCount()).toBe(1);
    });

    it('should process queued messages when connection is restored', async () => {
      // Queue a message while offline
      connectionManager.queueMessage('Queued message');

      // Mock connection restored
      mockChatService.isConnected.mockReturnValue(true);
      mockPresenceService.isConnected.mockReturnValue(true);

      await connectionManager.processMessageQueue();

      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Queued message');
      expect(connectionManager.getQueuedMessageCount()).toBe(0);
    });

    it('should retry failed messages with exponential backoff', async () => {
      // Queue a message
      connectionManager.queueMessage('Test message');

      // Mock connection but make sending fail
      mockChatService.isConnected.mockReturnValue(true);
      mockChatService.sendMessage.mockRejectedValueOnce(new Error('Send failed'));

      await connectionManager.processMessageQueue();

      // Message should still be in queue with retry count incremented
      expect(connectionManager.getQueuedMessageCount()).toBe(1);
    });

    it('should remove messages after max retries', async () => {
      // Manually add a message with max retries reached
      const queuedMessage: QueuedMessage = {
        tempId: 'queued_123',
        content: 'Failed message',
        userId: 'user-1',
        username: 'testuser',
        queuedAt: new Date().toISOString(),
        retryCount: 3,
        maxRetries: 3,
      };

      // Mock localStorage to return this message
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([queuedMessage]));
      
      const newManager = new ConnectionManager({ debug: false });
      await newManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      });

      mockChatService.isConnected.mockReturnValue(true);
      mockChatService.sendMessage.mockRejectedValue(new Error('Still failing'));

      await newManager.processMessageQueue();

      // Message should be removed after max retries
      expect(newManager.getQueuedMessageCount()).toBe(0);
    });

    it('should clear message queue manually', () => {
      connectionManager.queueMessage('Message 1');
      connectionManager.queueMessage('Message 2');

      expect(connectionManager.getQueuedMessageCount()).toBe(2);

      connectionManager.clearMessageQueue();

      expect(connectionManager.getQueuedMessageCount()).toBe(0);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('chat_message_queue', '[]');
    });

    it('should retry failed messages manually', async () => {
      connectionManager.queueMessage('Retry message');
      mockChatService.isConnected.mockReturnValue(true);

      await connectionManager.retryFailedMessages();

      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Retry message');
    });
  });

  describe('exponential backoff reconnection', () => {
    it('should implement exponential backoff for reconnection delays', async () => {
      const error = new Error('Connection failed');
      mockChatService.initialize
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue(undefined);

      const statusListener = vi.fn();
      connectionManager.onStatusChange(statusListener);

      // First connection attempt fails
      await expect(connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      })).rejects.toThrow();

      expect(statusListener).toHaveBeenCalledWith('reconnecting');

      // Wait for first reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should have attempted reconnection with exponential backoff
      expect(mockChatService.initialize).toHaveBeenCalledTimes(2);
    });

    it('should stop reconnecting after max attempts', async () => {
      const error = new Error('Persistent connection failure');
      mockChatService.initialize.mockRejectedValue(error);

      const statusListener = vi.fn();
      const errorListener = vi.fn();
      
      connectionManager.onStatusChange(statusListener);
      connectionManager.onError(errorListener);

      await expect(connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      })).rejects.toThrow();

      // Wait for all reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(statusListener).toHaveBeenCalledWith('disconnected');
      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connection_failed',
          message: 'Failed to reconnect after maximum attempts',
        })
      );
    });

    it('should not attempt reconnection when network is offline', async () => {
      // Set network offline
      Object.defineProperty(navigator, 'onLine', { value: false });

      const error = new Error('Network error');
      mockChatService.initialize.mockRejectedValue(error);

      const statusListener = vi.fn();
      connectionManager.onStatusChange(statusListener);

      await expect(connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      })).rejects.toThrow();

      // Should go directly to disconnected without reconnection attempts
      expect(statusListener).toHaveBeenCalledWith('disconnected');
      
      // Wait to ensure no reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Should only have been called once (initial attempt)
      expect(mockChatService.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling and recovery', () => {
    it('should handle service errors gracefully', async () => {
      const errorListener = vi.fn();
      connectionManager.onError(errorListener);

      let chatErrorCallback: (error: ChatError) => void;
      mockChatService.onError.mockImplementation((callback: any) => {
        chatErrorCallback = callback;
        return () => {};
      });

      await connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      });

      const testError: ChatError = {
        type: 'message_send_failed',
        message: 'Failed to send message',
        timestamp: new Date().toISOString(),
      };

      chatErrorCallback!(testError);

      expect(errorListener).toHaveBeenCalledWith(testError);
    });

    it('should handle connection errors with proper error types', async () => {
      const errorListener = vi.fn();
      connectionManager.onError(errorListener);

      let chatErrorCallback: (error: ChatError) => void;
      mockChatService.onError.mockImplementation((callback: any) => {
        chatErrorCallback = callback;
        return () => {};
      });

      await connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      });

      const connectionError: ChatError = {
        type: 'connection_failed',
        message: 'WebSocket connection lost',
        timestamp: new Date().toISOString(),
      };

      chatErrorCallback!(connectionError);

      // Should trigger reconnection logic
      expect(connectionManager.getConnectionStatus()).toBe('reconnecting');
    });

    it('should provide user-friendly error messages', async () => {
      const health = connectionManager.getConnectionHealth();
      expect(health.lastError).toBeNull();

      const error = new Error('ENOTFOUND api.example.com');
      mockChatService.initialize.mockRejectedValue(error);

      try {
        await connectionManager.initialize({
          userId: 'user-1',
          username: 'testuser',
          accessToken: 'token',
        });
      } catch (e) {
        // Expected to fail
      }

      const updatedHealth = connectionManager.getConnectionHealth();
      expect(updatedHealth.lastError?.message).toBe('ENOTFOUND api.example.com');
      expect(updatedHealth.lastError?.type).toBe('connection_failed');
    });
  });

  describe('token management', () => {
    beforeEach(async () => {
      mockChatService.isConnected.mockReturnValue(true);
      mockPresenceService.isConnected.mockReturnValue(true);
      
      await connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'initial-token',
      });
    });

    it('should update tokens in services when token is refreshed', () => {
      connectionManager.updateToken('new-token');

      expect(mockChatService.updateToken).toHaveBeenCalledWith('new-token');
      expect(mockPresenceService.updateToken).toHaveBeenCalledWith('new-token');
    });

    it('should provide current token', () => {
      expect(connectionManager.getCurrentToken()).toBe('initial-token');

      connectionManager.updateToken('updated-token');
      expect(connectionManager.getCurrentToken()).toBe('updated-token');
    });
  });

  describe('cleanup and resource management', () => {
    it('should cleanup network listeners on disconnect', async () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      await connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      });

      connectionManager.disconnect();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should clear timers on disconnect', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      // Force a reconnection scenario
      const error = new Error('Connection failed');
      mockChatService.initialize.mockRejectedValue(error);

      try {
        await connectionManager.initialize({
          userId: 'user-1',
          username: 'testuser',
          accessToken: 'token',
        });
      } catch (e) {
        // Expected to fail
      }

      connectionManager.disconnect();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});