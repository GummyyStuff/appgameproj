/**
 * Error Handling Integration Tests
 * Tests end-to-end error handling and recovery scenarios
 * Requirements: 4.1, 4.2, 4.3, 6.2, 6.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectionManager } from '../connection-manager';
import { ChatService } from '../chat-service';
import { PresenceService } from '../presence-service';
import type { ChatError, ConnectionStatus } from '../../types/chat';

// Mock the service classes
vi.mock('../chat-service');
vi.mock('../presence-service');

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('Error Handling Integration Tests', () => {
  let connectionManager: ConnectionManager;
  let mockChatService: any;
  let mockPresenceService: any;

  beforeEach(() => {
    vi.clearAllMocks();
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
      reconnectDelay: 50, // Fast for testing
    });
  });

  afterEach(() => {
    connectionManager.disconnect();
    Object.defineProperty(navigator, 'onLine', { value: true });
  });

  describe('network failure scenarios', () => {
    it('should handle complete network failure gracefully', async () => {
      const statusListener = vi.fn();
      const errorListener = vi.fn();
      const healthListener = vi.fn();

      connectionManager.onStatusChange(statusListener);
      connectionManager.onError(errorListener);
      connectionManager.onHealthChange(healthListener);

      // Simulate network failure during initialization
      Object.defineProperty(navigator, 'onLine', { value: false });
      const networkError = new Error('Network unreachable');
      mockChatService.initialize.mockRejectedValue(networkError);

      await expect(connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      })).rejects.toThrow();

      // Should not attempt reconnection when offline
      expect(statusListener).toHaveBeenCalledWith('disconnected');
      expect(healthListener).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'disconnected',
          lastError: expect.objectContaining({
            type: 'connection_failed',
            message: 'Network unreachable',
          }),
        })
      );

      // Wait to ensure no reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockChatService.initialize).toHaveBeenCalledTimes(1);
    });

    it('should recover when network comes back online', async () => {
      const statusListener = vi.fn();
      
      connectionManager.onStatusChange(statusListener);

      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      await connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      });

      // Network comes back online
      Object.defineProperty(navigator, 'onLine', { value: true });
      mockChatService.isConnected.mockReturnValue(true);
      mockPresenceService.isConnected.mockReturnValue(true);
      mockChatService.getConnectionStatus.mockReturnValue('connected');
      mockPresenceService.getConnectionStatus.mockReturnValue('connected');

      // Simulate online event
      window.dispatchEvent(new Event('online'));

      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(statusListener).toHaveBeenCalledWith('connected');
      expect(mockChatService.initialize).toHaveBeenCalledTimes(2);
    });
  });

  describe('service failure scenarios', () => {
    it('should handle chat service failure with presence service working', async () => {
      const statusListener = vi.fn();
      const errorListener = vi.fn();

      connectionManager.onStatusChange(statusListener);
      connectionManager.onError(errorListener);

      // Chat service fails, presence service succeeds
      mockChatService.initialize.mockRejectedValue(new Error('Chat service unavailable'));
      mockPresenceService.initialize.mockResolvedValue(undefined);
      mockPresenceService.isConnected.mockReturnValue(true);

      await expect(connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      })).rejects.toThrow();

      expect(statusListener).toHaveBeenCalledWith('reconnecting');
    });

    it('should handle presence service failure with chat service working', async () => {
      const statusListener = vi.fn();

      connectionManager.onStatusChange(statusListener);

      // Presence service fails, chat service succeeds
      mockChatService.initialize.mockResolvedValue(undefined);
      mockChatService.isConnected.mockReturnValue(true);
      mockPresenceService.initialize.mockRejectedValue(new Error('Presence service unavailable'));

      await expect(connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      })).rejects.toThrow();

      expect(statusListener).toHaveBeenCalledWith('reconnecting');
    });
  });

  describe('message queuing during failures', () => {
    it('should queue messages during connection failure and send when recovered', async () => {
      // Initialize successfully first
      mockChatService.isConnected.mockReturnValue(true);
      mockPresenceService.isConnected.mockReturnValue(true);

      await connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      });

      // Simulate connection loss
      mockChatService.isConnected.mockReturnValue(false);
      mockPresenceService.isConnected.mockReturnValue(false);

      // Queue messages while offline
      const tempId1 = connectionManager.queueMessage('Message 1');
      const tempId2 = connectionManager.queueMessage('Message 2');

      expect(connectionManager.getQueuedMessageCount()).toBe(2);

      // Simulate connection recovery
      mockChatService.isConnected.mockReturnValue(true);
      mockPresenceService.isConnected.mockReturnValue(true);

      await connectionManager.processMessageQueue();

      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Message 1');
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Message 2');
      expect(connectionManager.getQueuedMessageCount()).toBe(0);
    });

    it('should handle partial message sending failures', async () => {
      await connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      });

      // Queue multiple messages
      connectionManager.queueMessage('Message 1');
      connectionManager.queueMessage('Message 2');
      connectionManager.queueMessage('Message 3');

      mockChatService.isConnected.mockReturnValue(true);
      
      // First message succeeds, second fails, third succeeds
      mockChatService.sendMessage
        .mockResolvedValueOnce({ id: 'msg-1', content: 'Message 1' })
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ id: 'msg-3', content: 'Message 3' });

      await connectionManager.processMessageQueue();

      // Should have 1 message remaining (the failed one)
      expect(connectionManager.getQueuedMessageCount()).toBe(1);
    });
  });

  describe('authentication failures', () => {
    it('should handle token expiration gracefully', async () => {
      const errorListener = vi.fn();
      connectionManager.onError(errorListener);

      // Initialize successfully
      await connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'expired-token',
      });

      // Simulate token expiration error from service
      let chatErrorCallback: (error: ChatError) => void;
      mockChatService.onError.mockImplementation((callback: any) => {
        chatErrorCallback = callback;
        return () => {};
      });

      const authError: ChatError = {
        type: 'authentication_required',
        message: 'Token expired',
        timestamp: new Date().toISOString(),
      };

      chatErrorCallback!(authError);

      expect(errorListener).toHaveBeenCalledWith(authError);
    });

    it('should update tokens across services when refreshed', async () => {
      await connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'old-token',
      });

      connectionManager.updateToken('new-token');

      expect(mockChatService.updateToken).toHaveBeenCalledWith('new-token');
      expect(mockPresenceService.updateToken).toHaveBeenCalledWith('new-token');
      expect(connectionManager.getCurrentToken()).toBe('new-token');
    });
  });

  describe('rate limiting scenarios', () => {
    it('should handle rate limiting errors appropriately', async () => {
      const errorListener = vi.fn();
      connectionManager.onError(errorListener);

      await connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      });

      // Simulate rate limiting error
      let chatErrorCallback: (error: ChatError) => void;
      mockChatService.onError.mockImplementation((callback: any) => {
        chatErrorCallback = callback;
        return () => {};
      });

      const rateLimitError: ChatError = {
        type: 'rate_limited',
        message: 'Too many messages sent',
        details: { retryAfter: 10 },
        timestamp: new Date().toISOString(),
      };

      chatErrorCallback!(rateLimitError);

      expect(errorListener).toHaveBeenCalledWith(rateLimitError);
    });
  });

  describe('connection recovery patterns', () => {
    it('should handle intermittent connection issues', async () => {
      const statusListener = vi.fn();
      connectionManager.onStatusChange(statusListener);

      // Simulate intermittent failures
      mockChatService.initialize
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Still failing'))
        .mockResolvedValue(undefined);

      mockChatService.isConnected.mockReturnValue(true);
      mockPresenceService.isConnected.mockReturnValue(true);

      await expect(connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      })).rejects.toThrow();

      // Wait for reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(statusListener).toHaveBeenCalledWith('reconnecting');
      expect(statusListener).toHaveBeenCalledWith('connected');
      expect(mockChatService.initialize).toHaveBeenCalledTimes(3);
    });

    it('should maintain queue persistence across reconnections', async () => {
      // Queue messages before initialization
      connectionManager.queueMessage('Persistent message');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'chat_message_queue',
        expect.stringContaining('Persistent message')
      );

      // Simulate successful reconnection
      mockChatService.isConnected.mockReturnValue(true);
      mockPresenceService.isConnected.mockReturnValue(true);

      await connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      });

      await connectionManager.processMessageQueue();

      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Persistent message');
    });
  });

  describe('error recovery edge cases', () => {
    it('should handle localStorage failures gracefully', async () => {
      // Mock localStorage to throw errors
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not crash when trying to save queue
      expect(() => {
        connectionManager.queueMessage('Test message');
      }).not.toThrow();
    });

    it('should handle malformed queue data in localStorage', async () => {
      // Mock corrupted data in localStorage
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      // Should not crash and should initialize with empty queue
      const newManager = new ConnectionManager({ debug: false });
      expect(newManager.getQueuedMessageCount()).toBe(0);
    });

    it('should handle service listener errors gracefully', async () => {
      const faultyListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });

      connectionManager.onStatusChange(faultyListener);
      connectionManager.onError(faultyListener);

      // Should not crash when notifying listeners
      await connectionManager.initialize({
        userId: 'user-1',
        username: 'testuser',
        accessToken: 'token',
      });

      expect(faultyListener).toHaveBeenCalled();
    });
  });
});