/**
 * Presence Service Unit Tests
 * Requirements: 5.1, 5.2, 5.3, 5.4, 6.2, 6.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PresenceService } from '../presence-service';
import type { OnlineUser, ConnectionStatus } from '../../types/chat';

// Mock Supabase
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  track: vi.fn(),
  untrack: vi.fn(),
  presenceState: vi.fn(),
};

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  channel: vi.fn().mockReturnValue(mockChannel),
};

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('PresenceService', () => {
  let presenceService: PresenceService;
  let mockUser: any;
  let mockOnlineUser: OnlineUser;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { username: 'testuser' },
    };

    mockOnlineUser = {
      user_id: 'user-123',
      username: 'testuser',
      last_seen: '2023-01-01T00:00:00Z',
      is_online: true,
    };

    presenceService = new PresenceService({ debug: false });
  });

  afterEach(() => {
    presenceService.disconnect();
  });

  describe('initialization', () => {
    it('should initialize successfully with authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      await presenceService.initialize();

      expect(mockSupabase.channel).toHaveBeenCalledWith('chat_presence', {
        config: {
          presence: {
            key: 'user-123',
          },
        },
      });
      expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'sync' }, expect.any(Function));
      expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'join' }, expect.any(Function));
      expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'leave' }, expect.any(Function));
      expect(presenceService.isConnected()).toBe(true);
    });

    it('should fail initialization without authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      await expect(presenceService.initialize()).rejects.toThrow();
      expect(presenceService.isConnected()).toBe(false);
    });

    it('should track user presence after successful subscription', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      await presenceService.initialize();

      expect(mockChannel.track).toHaveBeenCalledWith({
        user_id: 'user-123',
        username: 'testuser',
        last_seen: expect.any(String),
        is_online: true,
      });
    });
  });

  describe('presence tracking', () => {
    beforeEach(async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      await presenceService.initialize();
    });

    it('should handle presence sync events', () => {
      const usersListener = vi.fn();
      presenceService.onUsersChange(usersListener);

      mockChannel.presenceState.mockReturnValue({
        'user-123': [mockOnlineUser],
        'user-456': [{
          user_id: 'user-456',
          username: 'otheruser',
          last_seen: '2023-01-01T00:00:00Z',
          is_online: true,
        }],
      });

      // Simulate presence sync event
      const syncHandler = mockChannel.on.mock.calls.find(
        call => call[1]?.event === 'sync'
      )?.[2];

      expect(syncHandler).toBeDefined();
      syncHandler();

      expect(presenceService.getOnlineUserCount()).toBe(2);
      expect(usersListener).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ user_id: 'user-123' }),
          expect.objectContaining({ user_id: 'user-456' }),
        ])
      );
    });

    it('should handle user join events', () => {
      const usersListener = vi.fn();
      presenceService.onUsersChange(usersListener);

      // Simulate user join event
      const joinHandler = mockChannel.on.mock.calls.find(
        call => call[1]?.event === 'join'
      )?.[2];

      expect(joinHandler).toBeDefined();
      joinHandler({
        key: 'user-456',
        newPresences: [{
          user_id: 'user-456',
          username: 'newuser',
          last_seen: '2023-01-01T00:00:00Z',
          is_online: true,
        }],
      });

      expect(presenceService.isUserOnline('user-456')).toBe(true);
      expect(usersListener).toHaveBeenCalled();
    });

    it('should handle user leave events', () => {
      // First add a user
      const joinHandler = mockChannel.on.mock.calls.find(
        call => call[1]?.event === 'join'
      )?.[2];

      joinHandler({
        key: 'user-456',
        newPresences: [mockOnlineUser],
      });

      expect(presenceService.isUserOnline('user-456')).toBe(true);

      const usersListener = vi.fn();
      presenceService.onUsersChange(usersListener);

      // Simulate user leave event
      const leaveHandler = mockChannel.on.mock.calls.find(
        call => call[1]?.event === 'leave'
      )?.[2];

      expect(leaveHandler).toBeDefined();
      leaveHandler({
        key: 'user-456',
        leftPresences: [mockOnlineUser],
      });

      expect(presenceService.isUserOnline('user-456')).toBe(false);
      expect(usersListener).toHaveBeenCalled();
    });
  });

  describe('online users management', () => {
    beforeEach(async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      await presenceService.initialize();
    });

    it('should return empty list initially', () => {
      expect(presenceService.getOnlineUsers()).toEqual([]);
      expect(presenceService.getOnlineUserCount()).toBe(0);
    });

    it('should track online users correctly', () => {
      // Simulate presence sync with multiple users
      mockChannel.presenceState.mockReturnValue({
        'user-123': [mockOnlineUser],
        'user-456': [{
          user_id: 'user-456',
          username: 'otheruser',
          last_seen: '2023-01-01T00:00:00Z',
          is_online: true,
        }],
      });

      const syncHandler = mockChannel.on.mock.calls.find(
        call => call[1]?.event === 'sync'
      )?.[2];

      syncHandler();

      const onlineUsers = presenceService.getOnlineUsers();
      expect(onlineUsers).toHaveLength(2);
      expect(presenceService.getOnlineUserCount()).toBe(2);
      expect(presenceService.isUserOnline('user-123')).toBe(true);
      expect(presenceService.isUserOnline('user-456')).toBe(true);
      expect(presenceService.isUserOnline('user-789')).toBe(false);
    });
  });

  describe('subscriptions', () => {
    beforeEach(async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      await presenceService.initialize();
    });

    it('should handle users change subscriptions', () => {
      const usersListener = vi.fn();
      const unsubscribe = presenceService.onUsersChange(usersListener);

      // Should immediately call with current users
      expect(usersListener).toHaveBeenCalledWith([]);

      unsubscribe();
      usersListener.mockClear();

      // Simulate user join after unsubscribe
      const joinHandler = mockChannel.on.mock.calls.find(
        call => call[1]?.event === 'join'
      )?.[2];

      joinHandler({
        key: 'user-456',
        newPresences: [mockOnlineUser],
      });

      // Should not call after unsubscribe
      expect(usersListener).not.toHaveBeenCalled();
    });

    it('should handle status change subscriptions', () => {
      const statusListener = vi.fn();
      const unsubscribe = presenceService.onStatusChange(statusListener);

      // Should immediately call with current status
      expect(statusListener).toHaveBeenCalledWith('connected');

      unsubscribe();
      statusListener.mockClear();

      // Should not call after unsubscribe
      presenceService.disconnect();
      expect(statusListener).not.toHaveBeenCalled();
    });

    it('should handle error subscriptions', () => {
      const errorListener = vi.fn();
      presenceService.onError(errorListener);

      // Simulate connection error by making track fail
      mockChannel.track.mockRejectedValue(new Error('Track failed'));

      // This should trigger error listener when heartbeat runs
      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connection_failed',
        })
      );
    });
  });

  describe('heartbeat', () => {
    beforeEach(async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });
    });

    it('should start heartbeat after successful connection', async () => {
      const presenceServiceWithFastHeartbeat = new PresenceService({
        presenceHeartbeatInterval: 50,
        debug: false,
      });

      await presenceServiceWithFastHeartbeat.initialize();

      // Wait for heartbeat to run
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have called track multiple times (initial + heartbeat)
      expect(mockChannel.track).toHaveBeenCalledTimes(2);

      presenceServiceWithFastHeartbeat.disconnect();
    });

    it('should stop heartbeat on disconnect', async () => {
      const presenceServiceWithFastHeartbeat = new PresenceService({
        presenceHeartbeatInterval: 50,
        debug: false,
      });

      await presenceServiceWithFastHeartbeat.initialize();
      
      // Clear previous calls
      mockChannel.track.mockClear();
      
      presenceServiceWithFastHeartbeat.disconnect();

      // Wait to ensure heartbeat would have run
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not have called track after disconnect
      expect(mockChannel.track).not.toHaveBeenCalled();
    });
  });

  describe('connection management', () => {
    it('should allow manual reconnection', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      await presenceService.initialize();
      expect(presenceService.isConnected()).toBe(true);

      presenceService.disconnect();
      expect(presenceService.isConnected()).toBe(false);

      await presenceService.reconnect();
      expect(presenceService.isConnected()).toBe(true);
    });

    it('should handle subscription errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('CHANNEL_ERROR');
        return Promise.resolve();
      });

      const errorSpy = vi.fn();
      presenceService.onError(errorSpy);

      await presenceService.initialize();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connection_failed',
        })
      );
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources on disconnect', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      await presenceService.initialize();
      presenceService.disconnect();

      expect(mockChannel.untrack).toHaveBeenCalled();
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect(presenceService.isConnected()).toBe(false);
      expect(presenceService.getOnlineUserCount()).toBe(0);
    });
  });
});