/**
 * useChat Hook Authentication Integration Tests
 * Tests for authentication-related functionality in the chat hook
 * Requirements: 1.3, 6.1
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat, useChatState } from '../useChat';
import { useAuth } from '../useAuth';
import { connectionManager } from '../../services/connection-manager';

// Mock the auth hook
jest.mock('../useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock the connection manager
jest.mock('../../services/connection-manager');
const mockConnectionManager = connectionManager as jest.Mocked<typeof connectionManager>;

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
  },
}));

describe('useChat Authentication Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default connection manager mocks
    mockConnectionManager.initialize = jest.fn().mockResolvedValue(undefined);
    mockConnectionManager.disconnect = jest.fn();
    mockConnectionManager.getChatService = jest.fn().mockReturnValue({
      fetchMessages: jest.fn().mockResolvedValue([]),
      onMessage: jest.fn().mockReturnValue(() => {}),
      sendMessage: jest.fn().mockResolvedValue({
        id: '1',
        content: 'test',
        user_id: 'user1',
        username: 'testuser',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    mockConnectionManager.getPresenceService = jest.fn().mockReturnValue({
      onUsersChange: jest.fn().mockReturnValue(() => {}),
    });
    mockConnectionManager.onStatusChange = jest.fn().mockReturnValue(() => {});
    mockConnectionManager.onError = jest.fn().mockReturnValue(() => {});
    mockConnectionManager.getCurrentToken = jest.fn().mockReturnValue('token123');
    mockConnectionManager.updateToken = jest.fn();
  });

  describe('Authentication state handling', () => {
    it('initializes chat when user is authenticated', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        user_metadata: { username: 'testuser' },
      };
      const mockSession = {
        access_token: 'token123',
        user: mockUser,
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
        resetPassword: jest.fn(),
      });

      const { result } = renderHook(() => useChatState());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.currentUser).toEqual({
          id: 'user1',
          username: 'testuser',
        });
      });

      expect(mockConnectionManager.initialize).toHaveBeenCalledWith({
        userId: 'user1',
        username: 'testuser',
        accessToken: 'token123',
      });
    });

    it('does not initialize chat when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
        resetPassword: jest.fn(),
      });

      const { result } = renderHook(() => useChatState());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.currentUser).toBeNull();
      expect(mockConnectionManager.initialize).not.toHaveBeenCalled();
    });

    it('resets state when user logs out', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        user_metadata: { username: 'testuser' },
      };
      const mockSession = {
        access_token: 'token123',
        user: mockUser,
      };

      // Start with authenticated user
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
        resetPassword: jest.fn(),
      });

      const { result, rerender } = renderHook(() => useChatState());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Simulate logout
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
        resetPassword: jest.fn(),
      });

      rerender();

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.currentUser).toBeNull();
      });

      expect(mockConnectionManager.disconnect).toHaveBeenCalled();
    });
  });

  describe('Username extraction', () => {
    it('extracts username from user_metadata.username', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        user_metadata: { username: 'customuser' },
      };
      const mockSession = {
        access_token: 'token123',
        user: mockUser,
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
        resetPassword: jest.fn(),
      });

      const { result } = renderHook(() => useChatState());

      await waitFor(() => {
        expect(result.current.currentUser?.username).toBe('customuser');
      });
    });

    it('falls back to email prefix when no username in metadata', async () => {
      const mockUser = {
        id: 'user1',
        email: 'testuser@example.com',
        user_metadata: {},
      };
      const mockSession = {
        access_token: 'token123',
        user: mockUser,
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
        resetPassword: jest.fn(),
      });

      const { result } = renderHook(() => useChatState());

      await waitFor(() => {
        expect(result.current.currentUser?.username).toBe('testuser');
      });
    });

    it('uses display_name as fallback', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        user_metadata: { display_name: 'Display User' },
      };
      const mockSession = {
        access_token: 'token123',
        user: mockUser,
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
        resetPassword: jest.fn(),
      });

      const { result } = renderHook(() => useChatState());

      await waitFor(() => {
        expect(result.current.currentUser?.username).toBe('Display User');
      });
    });

    it('uses Anonymous as final fallback', async () => {
      const mockUser = {
        id: 'user1',
        user_metadata: {},
      };
      const mockSession = {
        access_token: 'token123',
        user: mockUser,
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
        resetPassword: jest.fn(),
      });

      const { result } = renderHook(() => useChatState());

      await waitFor(() => {
        expect(result.current.currentUser?.username).toBe('Anonymous');
      });
    });
  });

  describe('Token refresh handling', () => {
    it('updates token when session changes', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        user_metadata: { username: 'testuser' },
      };
      
      // Start with initial session
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { access_token: 'token123', user: mockUser },
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
        resetPassword: jest.fn(),
      });

      const { result, rerender } = renderHook(() => useChatState());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Simulate token refresh
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { access_token: 'newtoken456', user: mockUser },
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
        resetPassword: jest.fn(),
      });

      rerender();

      await waitFor(() => {
        expect(mockConnectionManager.updateToken).toHaveBeenCalledWith('newtoken456');
      });
    });
  });

  describe('Message sending with authentication', () => {
    it('prevents sending messages when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
        resetPassword: jest.fn(),
      });

      const { result } = renderHook(() => useChatState());

      await expect(
        act(async () => {
          await result.current.sendMessage('test message');
        })
      ).rejects.toThrow('Must be authenticated to send messages');
    });

    it('allows sending messages when authenticated', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        user_metadata: { username: 'testuser' },
      };
      const mockSession = {
        access_token: 'token123',
        user: mockUser,
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
        resetPassword: jest.fn(),
      });

      const { result } = renderHook(() => useChatState());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.sendMessage('test message');
      });

      expect(mockConnectionManager.getChatService().sendMessage).toHaveBeenCalledWith('test message');
    });
  });
});