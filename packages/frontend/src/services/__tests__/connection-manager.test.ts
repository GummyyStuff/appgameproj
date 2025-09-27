/**
 * Connection Manager Unit Tests
 * Requirements: 6.2, 6.3, 4.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectionManager } from '../connection-manager';
import { ChatService } from '../chat-service';
import { PresenceService } from '../presence-service';
import type { ConnectionStatus } from '../../types/chat';

// Mock the service classes
vi.mock('../chat-service');
vi.mock('../presence-service');

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;
  let mockChatService: any;
  let mockPresenceService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock service instances
    mockChatService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
      getConnectionStatus: vi.fn().mockReturnValue('disconnected'),
      onStatusChange: vi.fn().mockReturnValue(() => {}),
      onError: vi.fn().mockReturnValue(() => {}),
    };

    mockPresenceService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
      getConnectionStatus: vi.fn().mockReturnValue('disconnected'),
      onStatusChange: vi.fn().mockReturnValue(() => {}),
      onError: vi.fn().mockReturnValue(() => {}),
    };

    // Mock the constructors
    (ChatService as any).mockImplementation(() => mockChatService);
    (PresenceService as any).mockImplementation(() => mockPresenceService);

    connectionManager = new ConnectionManager({ debug: false });
  });

  afterEach(() => {
    connectionManager.disconnect();
  });

  describe('initialization', () => {
    it('should initialize both services successfully', async () => {
      mockChatService.isConnected.mockReturnValue(true);
      mockPresenceService.isConnected.mockReturnValue(true);

      await connectionManager.initialize();

      expect(mockChatService.initialize).toHaveBeenCalled();
      expect(mockPresenceService.initialize).toHaveBeenCalled();
      expect(connectionManager.isConnected()).toBe(true);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      mockChatService.initialize.mockRejectedValue(error);

      await expect(connectionManager.initialize()).rejects.toThrow('Initialization failed');
      expect(connectionManager.isConnected()).toBe(false);
    });

    it('should not reinitialize if already initialized', async () => {
      mockChatService.isConnected.mockReturnValue(true);
      mockPresenceService.isConnected.mockReturnValue(true);

      await connectionManager.initialize();
      await connectionManager.initialize(); // Second call

      // Should only initialize once
      expect(mockChatService.initialize).toHaveBeenCalledTimes(1);
      expect(mockPresenceService.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('service access', () => {
    it('should provide access to chat service', () => {
      const chatService = connectionManager.getChatService();
      expect(chatService).toBe(mockChatService);
    });

    it('should provide access to presence service', () => {
      const presenceService = connectionManager.getPresenceService();
      expect(presenceService).toBe(mockPresenceService);
    });
  });

  describe('connection status management', () => {
    it('should update overall status based on service statuses', async () => {
      const statusListener = vi.fn();
      connectionManager.onStatusChange(statusListener);

      // Mock service status change callbacks
      let chatStatusCallback: (status: ConnectionStatus) => void;
      let presenceStatusCallback: (status: ConnectionStatus) => void;

      mockChatService.onStatusChange.mockImplementation((callback: any) => {
        chatStatusCallback = callback;
        return () => {};
      });

      mockPresenceService.onStatusChange.mockImplementation((callback: any) => {
        presenceStatusCallback = callback;
        return () => {};
      });

      await connectionManager.initialize();

      // Simulate both services connecting
      mockChatService.getConnectionStatus.mockReturnValue('connected');
      mockPresenceService.getConnectionStatus.mockReturnValue('connected');
      
      chatStatusCallback!('connected');
      presenceStatusCallback!('connected');

      expect(statusListener).toHaveBeenCalledWith('connected');
    });

    it('should show connecting when any service is connecting', async () => {
      const statusListener = vi.fn();
      connectionManager.onStatusChange(statusListener);

      let chatStatusCallback: (status: ConnectionStatus) => void;
      let presenceStatusCallback: (status: ConnectionStatus) => void;

      mockChatService.onStatusChange.mockImplementation((callback: any) => {
        chatStatusCallback = callback;
        return () => {};
      });

      mockPresenceService.onStatusChange.mockImplementation((callback: any) => {
        presenceStatusCallback = callback;
        return () => {};
      });

      await connectionManager.initialize();

      // Simulate one service connecting, other connected
      mockChatService.getConnectionStatus.mockReturnValue('connecting');
      mockPresenceService.getConnectionStatus.mockReturnValue('connected');
      
      chatStatusCallback!('connecting');

      expect(statusListener).toHaveBeenCalledWith('connecting');
    });

    it('should show reconnecting when any service is reconnecting', async () => {
      const statusListener = vi.fn();
      connectionManager.onStatusChange(statusListener);

      let chatStatusCallback: (status: ConnectionStatus) => void;

      mockChatService.onStatusChange.mockImplementation((callback: any) => {
        chatStatusCallback = callback;
        return () => {};
      });

      mockPresenceService.onStatusChange.mockImplementation(() => () => {});

      await connectionManager.initialize();

      // Simulate chat service reconnecting
      mockChatService.getConnectionStatus.mockReturnValue('reconnecting');
      mockPresenceService.getConnectionStatus.mockReturnValue('connected');
      
      chatStatusCallback!('reconnecting');

      expect(statusListener).toHaveBeenCalledWith('reconnecting');
    });
  });

  describe('error handling', () => {
    it('should forward service errors to listeners', async () => {
      const errorListener = vi.fn();
      connectionManager.onError(errorListener);

      let chatErrorCallback: (error: any) => void;

      mockChatService.onError.mockImplementation((callback: any) => {
        chatErrorCallback = callback;
        return () => {};
      });

      mockPresenceService.onError.mockImplementation(() => () => {});

      await connectionManager.initialize();

      const testError = {
        type: 'connection_failed',
        message: 'Test error',
        timestamp: '2023-01-01T00:00:00Z',
      };

      chatErrorCallback!(testError);

      expect(errorListener).toHaveBeenCalledWith(testError);
    });

    it('should handle connection errors with reconnection', async () => {
      const statusListener = vi.fn();
      connectionManager.onStatusChange(statusListener);

      let chatErrorCallback: (error: any) => void;

      mockChatService.onError.mockImplementation((callback: any) => {
        chatErrorCallback = callback;
        return () => {};
      });

      mockPresenceService.onError.mockImplementation(() => () => {});

      await connectionManager.initialize();

      const connectionError = {
        type: 'connection_failed',
        message: 'Connection lost',
        timestamp: '2023-01-01T00:00:00Z',
      };

      chatErrorCallback!(connectionError);

      expect(statusListener).toHaveBeenCalledWith('reconnecting');
    });
  });

  describe('reconnection logic', () => {
    it('should implement exponential backoff for reconnection', async () => {
      const connectionManagerWithFastRetry = new ConnectionManager({
        maxReconnectAttempts: 2,
        reconnectDelay: 10,
        debug: false,
      });

      const error = new Error('Connection failed');
      mockChatService.initialize
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue(undefined);

      const statusListener = vi.fn();
      connectionManagerWithFastRetry.onStatusChange(statusListener);

      await expect(connectionManagerWithFastRetry.initialize()).rejects.toThrow();

      // Wait for reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(statusListener).toHaveBeenCalledWith('reconnecting');
      
      connectionManagerWithFastRetry.disconnect();
    });

    it('should stop reconnecting after max attempts', async () => {
      const connectionManagerWithLowRetries = new ConnectionManager({
        maxReconnectAttempts: 1,
        reconnectDelay: 10,
        debug: false,
      });

      const error = new Error('Connection failed');
      mockChatService.initialize.mockRejectedValue(error);

      const statusListener = vi.fn();
      const errorListener = vi.fn();
      
      connectionManagerWithLowRetries.onStatusChange(statusListener);
      connectionManagerWithLowRetries.onError(errorListener);

      await expect(connectionManagerWithLowRetries.initialize()).rejects.toThrow();

      // Wait for reconnection attempts to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(statusListener).toHaveBeenCalledWith('disconnected');
      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connection_failed',
          message: 'Failed to reconnect after maximum attempts',
        })
      );

      connectionManagerWithLowRetries.disconnect();
    });

    it('should allow manual reconnection', async () => {
      mockChatService.isConnected.mockReturnValue(true);
      mockPresenceService.isConnected.mockReturnValue(true);

      await connectionManager.initialize();
      expect(connectionManager.isConnected()).toBe(true);

      connectionManager.disconnect();
      expect(mockChatService.disconnect).toHaveBeenCalled();
      expect(mockPresenceService.disconnect).toHaveBeenCalled();

      await connectionManager.reconnect();
      expect(mockChatService.initialize).toHaveBeenCalledTimes(2);
      expect(mockPresenceService.initialize).toHaveBeenCalledTimes(2);
    });
  });

  describe('health monitoring', () => {
    it('should report healthy when both services are connected', async () => {
      mockChatService.isConnected.mockReturnValue(true);
      mockPresenceService.isConnected.mockReturnValue(true);

      await connectionManager.initialize();

      expect(connectionManager.isHealthy()).toBe(true);
    });

    it('should report unhealthy when any service is disconnected', async () => {
      mockChatService.isConnected.mockReturnValue(true);
      mockPresenceService.isConnected.mockReturnValue(false);

      await connectionManager.initialize();

      expect(connectionManager.isHealthy()).toBe(false);
    });

    it('should provide connection statistics', async () => {
      mockChatService.isConnected.mockReturnValue(true);
      mockPresenceService.isConnected.mockReturnValue(false);

      await connectionManager.initialize();

      const stats = connectionManager.getConnectionStats();

      expect(stats).toEqual({
        chatConnected: true,
        presenceConnected: false,
        reconnectAttempts: 0,
        isHealthy: false,
      });
    });
  });

  describe('subscriptions', () => {
    it('should handle status change subscriptions', () => {
      const statusListener = vi.fn();
      const unsubscribe = connectionManager.onStatusChange(statusListener);

      // Should immediately call with current status
      expect(statusListener).toHaveBeenCalledWith('disconnected');

      unsubscribe();
      statusListener.mockClear();

      // Should not call after unsubscribe
      connectionManager.disconnect();
      expect(statusListener).not.toHaveBeenCalled();
    });

    it('should handle error subscriptions', () => {
      const errorListener = vi.fn();
      const unsubscribe = connectionManager.onError(errorListener);

      unsubscribe();

      // Should be able to unsubscribe without errors
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources on disconnect', async () => {
      await connectionManager.initialize();
      connectionManager.disconnect();

      expect(mockChatService.disconnect).toHaveBeenCalled();
      expect(mockPresenceService.disconnect).toHaveBeenCalled();
      expect(connectionManager.getConnectionStatus()).toBe('disconnected');
    });
  });
});