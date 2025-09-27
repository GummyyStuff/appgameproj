/**
 * Chat Service Unit Tests
 * Requirements: 1.1, 1.4, 2.1, 2.3, 4.3, 6.2, 6.3
 */

import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { ChatService } from '../chat-service';
import type { ChatMessage, ConnectionStatus, ChatError } from '../../types/chat';

// Mock Supabase
const mockChannel = {
  on: mock().mockReturnThis(),
  subscribe: mock(),
  unsubscribe: mock(),
};

const mockSupabase = {
  auth: {
    getUser: mock(),
  },
  from: mock(),
  channel: mock().mockReturnValue(mockChannel),
};

// Mock the supabase module
const originalSupabase = await import('../../lib/supabase');
Object.defineProperty(originalSupabase, 'supabase', {
  value: mockSupabase,
  writable: true,
});

describe('ChatService', () => {
  let chatService: ChatService;
  let mockUser: any;
  let mockMessage: ChatMessage;

  beforeEach(() => {
    // Reset all mocks
    mockChannel.on.mockClear();
    mockChannel.subscribe.mockClear();
    mockChannel.unsubscribe.mockClear();
    mockSupabase.auth.getUser.mockClear();
    mockSupabase.from.mockClear();
    mockSupabase.channel.mockClear();
    
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { username: 'testuser' },
    };

    mockMessage = {
      id: 'msg-123',
      content: 'Hello world',
      user_id: 'user-123',
      username: 'testuser',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    chatService = new ChatService({ debug: false });
  });

  afterEach(() => {
    chatService.disconnect();
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

      await chatService.initialize();

      expect(mockSupabase.channel).toHaveBeenCalledWith('chat_messages');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        }),
        expect.any(Function)
      );
      expect(chatService.isConnected()).toBe(true);
    });

    it('should fail initialization without authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      await expect(chatService.initialize()).rejects.toThrow();
      expect(chatService.isConnected()).toBe(false);
    });

    it('should handle channel subscription errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('CHANNEL_ERROR');
        return Promise.resolve();
      });

      const errorSpy = vi.fn();
      chatService.onError(errorSpy);

      await chatService.initialize();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connection_failed',
        })
      );
    });
  });

  describe('message sending', () => {
    beforeEach(async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      await chatService.initialize();
    });

    it('should send message successfully', async () => {
      const mockInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockMessage,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockInsert);

      const result = await chatService.sendMessage('Hello world');

      expect(mockSupabase.from).toHaveBeenCalledWith('chat_messages');
      expect(mockInsert.insert).toHaveBeenCalledWith({
        content: 'Hello world',
        user_id: 'user-123',
        username: 'testuser',
      });
      expect(result).toEqual(mockMessage);
    });

    it('should validate message before sending', async () => {
      await expect(chatService.sendMessage('')).rejects.toThrow();
      await expect(chatService.sendMessage('a'.repeat(501))).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      const mockInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      };

      mockSupabase.from.mockReturnValue(mockInsert);

      await expect(chatService.sendMessage('Hello')).rejects.toThrow();
    });

    it('should require authentication for sending messages', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      await expect(chatService.sendMessage('Hello')).rejects.toThrow();
    });
  });

  describe('message fetching', () => {
    beforeEach(async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      await chatService.initialize();
    });

    it('should fetch messages successfully', async () => {
      const messages = [mockMessage];
      const mockSelect = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: messages,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockSelect);

      const result = await chatService.fetchMessages();

      expect(mockSupabase.from).toHaveBeenCalledWith('chat_messages');
      expect(mockSelect.select).toHaveBeenCalledWith('*');
      expect(mockSelect.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual(messages);
    });

    it('should handle fetch errors', async () => {
      const mockSelect = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Fetch error'),
        }),
      };

      mockSupabase.from.mockReturnValue(mockSelect);

      await expect(chatService.fetchMessages()).rejects.toThrow();
    });

    it('should respect message limit', async () => {
      const mockSelect = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockSelect);

      await chatService.fetchMessages(25);

      expect(mockSelect.limit).toHaveBeenCalledWith(25);
    });
  });

  describe('real-time subscriptions', () => {
    beforeEach(async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      await chatService.initialize();
    });

    it('should handle new message events', () => {
      const messageListener = vi.fn();
      chatService.onMessage(messageListener);

      // Simulate message insert event
      const insertHandler = mockChannel.on.mock.calls.find(
        call => call[1]?.event === 'INSERT'
      )?.[2];

      expect(insertHandler).toBeDefined();

      insertHandler({
        eventType: 'INSERT',
        new: mockMessage,
        old: null,
        schema: 'public',
        table: 'chat_messages',
      });

      expect(messageListener).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle status change subscriptions', () => {
      const statusListener = vi.fn();
      const unsubscribe = chatService.onStatusChange(statusListener);

      // Should immediately call with current status
      expect(statusListener).toHaveBeenCalledWith('connected');

      unsubscribe();
      statusListener.mockClear();

      // Should not call after unsubscribe
      chatService.disconnect();
      expect(statusListener).not.toHaveBeenCalled();
    });

    it('should handle error subscriptions', () => {
      const errorListener = vi.fn();
      chatService.onError(errorListener);

      // Simulate connection error
      mockChannel.subscribe.mockImplementation((callback) => {
        callback('CHANNEL_ERROR');
        return Promise.resolve();
      });

      // This should trigger error listener
      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connection_failed',
        })
      );
    });
  });

  describe('connection management', () => {
    it('should handle reconnection attempts', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      let subscribeCallCount = 0;
      mockChannel.subscribe.mockImplementation((callback) => {
        subscribeCallCount++;
        if (subscribeCallCount === 1) {
          callback('CHANNEL_ERROR');
        } else {
          callback('SUBSCRIBED');
        }
        return Promise.resolve();
      });

      const statusListener = vi.fn();
      chatService.onStatusChange(statusListener);

      await chatService.initialize();

      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(statusListener).toHaveBeenCalledWith('reconnecting');
    });

    it('should stop reconnecting after max attempts', async () => {
      const chatServiceWithLowRetries = new ChatService({
        maxReconnectAttempts: 1,
        reconnectDelay: 10,
        debug: false,
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('CHANNEL_ERROR');
        return Promise.resolve();
      });

      const statusListener = vi.fn();
      chatServiceWithLowRetries.onStatusChange(statusListener);

      await chatServiceWithLowRetries.initialize();

      // Wait for reconnection attempts to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(statusListener).toHaveBeenCalledWith('disconnected');
      
      chatServiceWithLowRetries.disconnect();
    });

    it('should allow manual reconnection', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      await chatService.initialize();
      expect(chatService.isConnected()).toBe(true);

      chatService.disconnect();
      expect(chatService.isConnected()).toBe(false);

      await chatService.reconnect();
      expect(chatService.isConnected()).toBe(true);
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

      await chatService.initialize();
      chatService.disconnect();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect(chatService.isConnected()).toBe(false);
    });
  });
});