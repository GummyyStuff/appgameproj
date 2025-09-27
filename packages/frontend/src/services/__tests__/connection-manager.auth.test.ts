/**
 * Connection Manager Authentication Integration Tests
 * Tests for authentication-related functionality in the connection manager
 * Requirements: 1.3, 6.1
 */

import { ConnectionManager } from '../connection-manager';
import { ChatService } from '../chat-service';
import { PresenceService } from '../presence-service';

// Mock the services
jest.mock('../chat-service');
jest.mock('../presence-service');

const MockChatService = ChatService as jest.MockedClass<typeof ChatService>;
const MockPresenceService = PresenceService as jest.MockedClass<typeof PresenceService>;

describe('ConnectionManager Authentication Integration', () => {
  let connectionManager: ConnectionManager;
  let mockChatService: jest.Mocked<ChatService>;
  let mockPresenceService: jest.Mocked<PresenceService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock service instances
    mockChatService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      updateToken: jest.fn(),
      getCurrentUser: jest.fn(),
      isAuthenticated: jest.fn().mockReturnValue(true),
      isConnected: jest.fn().mockReturnValue(true),
      getConnectionStatus: jest.fn().mockReturnValue('connected'),
      onStatusChange: jest.fn().mockReturnValue(() => {}),
      onError: jest.fn().mockReturnValue(() => {}),
    } as any;

    mockPresenceService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      updateToken: jest.fn(),
      getCurrentUser: jest.fn(),
      isAuthenticated: jest.fn().mockReturnValue(true),
      isConnected: jest.fn().mockReturnValue(true),
      getConnectionStatus: jest.fn().mockReturnValue('connected'),
      onStatusChange: jest.fn().mockReturnValue(() => {}),
      onError: jest.fn().mockReturnValue(() => {}),
    } as any;

    // Mock service constructors
    MockChatService.mockImplementation(() => mockChatService);
    MockPresenceService.mockImplementation(() => mockPresenceService);

    connectionManager = new ConnectionManager({ debug: false });
  });

  describe('Authentication context handling', () => {
    it('requires authentication context for initialization', async () => {
      await expect(connectionManager.initialize()).rejects.toThrow(
        'Authentication context is required for initialization'
      );
    });

    it('initializes services with authentication context', async () => {
      const authContext = {
        userId: 'user1',
        username: 'testuser',
        accessToken: 'token123',
      };

      await connectionManager.initialize(authContext);

      expect(mockChatService.initialize).toHaveBeenCalledWith(authContext);
      expect(mockPresenceService.initialize).toHaveBeenCalledWith(authContext);
    });

    it('stores authentication context for reconnections', async () => {
      const authContext = {
        userId: 'user1',
        username: 'testuser',
        accessToken: 'token123',
      };

      await connectionManager.initialize(authContext);

      // Simulate reconnection
      await connectionManager.reconnect();

      // Should use stored auth context
      expect(mockChatService.initialize).toHaveBeenCalledTimes(2);
      expect(mockChatService.initialize).toHaveBeenNthCalledWith(2, authContext);
    });

    it('returns current user context', async () => {
      const authContext = {
        userId: 'user1',
        username: 'testuser',
        accessToken: 'token123',
      };

      await connectionManager.initialize(authContext);

      const currentUser = connectionManager.getCurrentUser();
      expect(currentUser).toEqual({
        userId: 'user1',
        username: 'testuser',
      });
    });

    it('returns null when not authenticated', () => {
      const currentUser = connectionManager.getCurrentUser();
      expect(currentUser).toBeNull();
    });
  });

  describe('Token management', () => {
    it('returns current token', async () => {
      const authContext = {
        userId: 'user1',
        username: 'testuser',
        accessToken: 'token123',
      };

      await connectionManager.initialize(authContext);

      const token = connectionManager.getCurrentToken();
      expect(token).toBe('token123');
    });

    it('returns null when no auth context', () => {
      const token = connectionManager.getCurrentToken();
      expect(token).toBeNull();
    });

    it('updates token in services', async () => {
      const authContext = {
        userId: 'user1',
        username: 'testuser',
        accessToken: 'token123',
      };

      await connectionManager.initialize(authContext);

      connectionManager.updateToken('newtoken456');

      expect(mockChatService.updateToken).toHaveBeenCalledWith('newtoken456');
      expect(mockPresenceService.updateToken).toHaveBeenCalledWith('newtoken456');
      expect(connectionManager.getCurrentToken()).toBe('newtoken456');
    });

    it('does not update token when not authenticated', () => {
      connectionManager.updateToken('newtoken456');

      expect(mockChatService.updateToken).not.toHaveBeenCalled();
      expect(mockPresenceService.updateToken).not.toHaveBeenCalled();
    });
  });

  describe('Connection statistics with authentication', () => {
    it('includes authentication status in stats', async () => {
      const stats = connectionManager.getConnectionStats();
      expect(stats.isAuthenticated).toBe(false);

      const authContext = {
        userId: 'user1',
        username: 'testuser',
        accessToken: 'token123',
      };

      await connectionManager.initialize(authContext);

      const authenticatedStats = connectionManager.getConnectionStats();
      expect(authenticatedStats.isAuthenticated).toBe(true);
    });
  });

  describe('Disconnect and cleanup', () => {
    it('clears authentication context on disconnect', async () => {
      const authContext = {
        userId: 'user1',
        username: 'testuser',
        accessToken: 'token123',
      };

      await connectionManager.initialize(authContext);
      expect(connectionManager.getCurrentUser()).not.toBeNull();

      connectionManager.disconnect();

      expect(connectionManager.getCurrentUser()).toBeNull();
      expect(connectionManager.getCurrentToken()).toBeNull();
    });
  });

  describe('Error handling with authentication', () => {
    it('handles authentication errors during initialization', async () => {
      const authContext = {
        userId: 'user1',
        username: 'testuser',
        accessToken: 'token123',
      };

      mockChatService.initialize.mockRejectedValue(new Error('Authentication failed'));

      await expect(connectionManager.initialize(authContext)).rejects.toThrow('Authentication failed');
    });

    it('preserves auth context during reconnection attempts', async () => {
      const authContext = {
        userId: 'user1',
        username: 'testuser',
        accessToken: 'token123',
      };

      await connectionManager.initialize(authContext);

      // Simulate connection error that triggers reconnection
      mockChatService.initialize.mockRejectedValueOnce(new Error('Connection failed'));

      // The auth context should still be available for reconnection
      expect(connectionManager.getCurrentUser()).toEqual({
        userId: 'user1',
        username: 'testuser',
      });
    });
  });

  describe('Service integration with authentication', () => {
    it('passes authentication context to both services', async () => {
      const authContext = {
        userId: 'user1',
        username: 'testuser',
        accessToken: 'token123',
      };

      await connectionManager.initialize(authContext);

      expect(MockChatService).toHaveBeenCalledWith({ debug: false });
      expect(MockPresenceService).toHaveBeenCalledWith({ debug: false });
      expect(mockChatService.initialize).toHaveBeenCalledWith(authContext);
      expect(mockPresenceService.initialize).toHaveBeenCalledWith(authContext);
    });

    it('coordinates token updates across services', async () => {
      const authContext = {
        userId: 'user1',
        username: 'testuser',
        accessToken: 'token123',
      };

      await connectionManager.initialize(authContext);

      connectionManager.updateToken('refreshed-token');

      expect(mockChatService.updateToken).toHaveBeenCalledWith('refreshed-token');
      expect(mockPresenceService.updateToken).toHaveBeenCalledWith('refreshed-token');
    });
  });
});