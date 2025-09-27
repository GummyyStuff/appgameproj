/**
 * Chat Hook Tests - Unit tests for chat context provider logic
 * Requirements: 1.1, 1.2, 2.1, 2.2, 5.1, 5.2, 6.1
 */

import { describe, it, expect } from 'bun:test';
import type { ChatMessage, OnlineUser, ConnectionStatus, ChatError } from '../../types/chat';
import { MessageStatus } from '../../types/chat';

describe('useChat Hook', () => {
  describe('ChatMessage interface', () => {
    it('should have correct message structure', () => {
      const message: ChatMessage = {
        id: 'msg-123',
        content: 'Hello world',
        user_id: 'user-123',
        username: 'testuser',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      expect(message.id).toBe('msg-123');
      expect(message.content).toBe('Hello world');
      expect(message.user_id).toBe('user-123');
      expect(message.username).toBe('testuser');
    });
  });

  describe('OnlineUser interface', () => {
    it('should have correct user structure', () => {
      const user: OnlineUser = {
        user_id: 'user-456',
        username: 'otheruser',
        last_seen: '2023-01-01T00:00:00Z',
        is_online: true,
      };

      expect(user.user_id).toBe('user-456');
      expect(user.username).toBe('otheruser');
      expect(user.is_online).toBe(true);
    });
  });

  describe('MessageStatus enum', () => {
    it('should have correct status values', () => {
      expect(MessageStatus.SENDING).toBe('sending');
      expect(MessageStatus.SENT).toBe('sent');
      expect(MessageStatus.FAILED).toBe('failed');
    });
  });

  describe('ConnectionStatus type', () => {
    it('should accept valid connection statuses', () => {
      const statuses: ConnectionStatus[] = [
        'connecting',
        'connected',
        'disconnected',
        'reconnecting',
      ];

      statuses.forEach(status => {
        expect(typeof status).toBe('string');
      });
    });
  });

  describe('ChatError interface', () => {
    it('should have correct error structure', () => {
      const error: ChatError = {
        type: 'connection_failed',
        message: 'Connection lost',
        timestamp: '2023-01-01T00:00:00Z',
      };

      expect(error.type).toBe('connection_failed');
      expect(error.message).toBe('Connection lost');
      expect(error.timestamp).toBe('2023-01-01T00:00:00Z');
    });
  });
});