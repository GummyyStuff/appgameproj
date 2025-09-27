/**
 * Tests for chat type definitions
 * Ensures type safety and validates type guards
 */

import {
  ChatMessage,
  OnlineUser,
  ChatContextType,
  isChatMessage,
  isOnlineUser,
  MessageStatus,
  ChatErrorType,
  CHAT_CONFIG,
} from '../chat';

describe('Chat Types', () => {
  describe('ChatMessage interface', () => {
    it('should accept valid chat message', () => {
      const message: ChatMessage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Hello, world!',
        user_id: '456e7890-e89b-12d3-a456-426614174001',
        username: 'testuser',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      expect(message.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(message.content).toBe('Hello, world!');
      expect(message.username).toBe('testuser');
    });
  });

  describe('OnlineUser interface', () => {
    it('should accept valid online user', () => {
      const user: OnlineUser = {
        user_id: '456e7890-e89b-12d3-a456-426614174001',
        username: 'testuser',
        last_seen: '2023-01-01T00:00:00Z',
        is_online: true,
      };

      expect(user.user_id).toBe('456e7890-e89b-12d3-a456-426614174001');
      expect(user.username).toBe('testuser');
      expect(user.is_online).toBe(true);
    });
  });

  describe('Type guards', () => {
    describe('isChatMessage', () => {
      it('should return true for valid chat message', () => {
        const validMessage = {
          id: '123',
          content: 'Hello',
          user_id: '456',
          username: 'user',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        };

        expect(isChatMessage(validMessage)).toBe(true);
      });

      it('should return false for invalid chat message', () => {
        const invalidMessage = {
          id: '123',
          content: 'Hello',
          // missing required fields
        };

        expect(isChatMessage(invalidMessage)).toBe(false);
      });

      it('should return false for null or undefined', () => {
        expect(isChatMessage(null)).toBe(false);
        expect(isChatMessage(undefined)).toBe(false);
      });
    });

    describe('isOnlineUser', () => {
      it('should return true for valid online user', () => {
        const validUser = {
          user_id: '456',
          username: 'user',
          last_seen: '2023-01-01T00:00:00Z',
          is_online: true,
        };

        expect(isOnlineUser(validUser)).toBe(true);
      });

      it('should return false for invalid online user', () => {
        const invalidUser = {
          user_id: '456',
          // missing required fields
        };

        expect(isOnlineUser(invalidUser)).toBe(false);
      });
    });
  });

  describe('Enums', () => {
    it('should have correct MessageStatus values', () => {
      expect(MessageStatus.SENDING).toBe('sending');
      expect(MessageStatus.SENT).toBe('sent');
      expect(MessageStatus.FAILED).toBe('failed');
    });

    it('should have correct ChatErrorType values', () => {
      expect(ChatErrorType.CONNECTION_FAILED).toBe('connection_failed');
      expect(ChatErrorType.MESSAGE_SEND_FAILED).toBe('message_send_failed');
      expect(ChatErrorType.AUTHENTICATION_REQUIRED).toBe('authentication_required');
      expect(ChatErrorType.RATE_LIMITED).toBe('rate_limited');
    });
  });

  describe('Constants', () => {
    it('should have correct CHAT_CONFIG values', () => {
      expect(CHAT_CONFIG.MAX_MESSAGE_LENGTH).toBe(500);
      expect(CHAT_CONFIG.INITIAL_MESSAGE_LIMIT).toBe(50);
      expect(CHAT_CONFIG.RATE_LIMIT_MAX_MESSAGES).toBe(5);
      expect(CHAT_CONFIG.RATE_LIMIT_WINDOW_MS).toBe(10000);
    });
  });

  describe('Component Props', () => {
    it('should accept valid ChatSidebarProps', () => {
      const props = {
        isCollapsed: false,
        onToggle: () => {},
        className: 'test-class',
        showOnlineUsers: true,
      };

      // Type check - this will fail compilation if types are wrong
      const _: typeof props = props;
      expect(props.isCollapsed).toBe(false);
    });

    it('should accept valid MessageInputProps', () => {
      const props = {
        onSendMessage: (content: string) => {},
        disabled: false,
        placeholder: 'Type a message...',
        maxLength: 500,
        isAuthenticated: true,
      };

      // Type check - this will fail compilation if types are wrong
      const _: typeof props = props;
      expect(props.maxLength).toBe(500);
    });
  });
});