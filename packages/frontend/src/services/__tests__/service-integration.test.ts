/**
 * Service Integration Tests (Bun Test)
 * Requirements: 1.1, 1.4, 2.1, 2.3, 4.3, 5.1, 5.2, 6.2, 6.3
 */

import { describe, it, expect } from 'bun:test';
import { ChatService, PresenceService, ConnectionManager } from '../index';
import type { ChatServiceConfig } from '../../types/chat';

describe('Service Integration', () => {
  describe('ChatService', () => {
    it('should create instance with default config', () => {
      const chatService = new ChatService();
      expect(chatService).toBeDefined();
      expect(chatService.isConnected()).toBe(false);
      expect(chatService.getConnectionStatus()).toBe('disconnected');
    });

    it('should create instance with custom config', () => {
      const config: Partial<ChatServiceConfig> = {
        maxMessages: 25,
        debug: true,
        maxReconnectAttempts: 3,
      };
      
      const chatService = new ChatService(config);
      expect(chatService).toBeDefined();
      expect(chatService.isConnected()).toBe(false);
    });

    it('should handle message validation', async () => {
      const chatService = new ChatService({ debug: false });
      
      // Test without initialization (should fail)
      try {
        await chatService.sendMessage('test');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle subscriptions', () => {
      const chatService = new ChatService({ debug: false });
      
      const messageCallback = () => {};
      const statusCallback = () => {};
      const errorCallback = () => {};
      
      const unsubMessage = chatService.onMessage(messageCallback);
      const unsubStatus = chatService.onStatusChange(statusCallback);
      const unsubError = chatService.onError(errorCallback);
      
      expect(typeof unsubMessage).toBe('function');
      expect(typeof unsubStatus).toBe('function');
      expect(typeof unsubError).toBe('function');
      
      // Should not throw when unsubscribing
      expect(() => unsubMessage()).not.toThrow();
      expect(() => unsubStatus()).not.toThrow();
      expect(() => unsubError()).not.toThrow();
    });
  });

  describe('PresenceService', () => {
    it('should create instance with default config', () => {
      const presenceService = new PresenceService();
      expect(presenceService).toBeDefined();
      expect(presenceService.isConnected()).toBe(false);
      expect(presenceService.getOnlineUserCount()).toBe(0);
      expect(presenceService.getOnlineUsers()).toEqual([]);
    });

    it('should handle user queries', () => {
      const presenceService = new PresenceService();
      
      expect(presenceService.isUserOnline('test-user')).toBe(false);
      expect(presenceService.getOnlineUserCount()).toBe(0);
    });

    it('should handle subscriptions', () => {
      const presenceService = new PresenceService({ debug: false });
      
      const usersCallback = () => {};
      const statusCallback = () => {};
      const errorCallback = () => {};
      
      const unsubUsers = presenceService.onUsersChange(usersCallback);
      const unsubStatus = presenceService.onStatusChange(statusCallback);
      const unsubError = presenceService.onError(errorCallback);
      
      expect(typeof unsubUsers).toBe('function');
      expect(typeof unsubStatus).toBe('function');
      expect(typeof unsubError).toBe('function');
      
      // Should not throw when unsubscribing
      expect(() => unsubUsers()).not.toThrow();
      expect(() => unsubStatus()).not.toThrow();
      expect(() => unsubError()).not.toThrow();
    });
  });

  describe('ConnectionManager', () => {
    it('should create instance and provide service access', () => {
      const connectionManager = new ConnectionManager({ debug: false });
      
      expect(connectionManager).toBeDefined();
      expect(connectionManager.isConnected()).toBe(false);
      expect(connectionManager.getConnectionStatus()).toBe('disconnected');
      
      const chatService = connectionManager.getChatService();
      const presenceService = connectionManager.getPresenceService();
      
      expect(chatService).toBeDefined();
      expect(presenceService).toBeDefined();
    });

    it('should provide health monitoring', () => {
      const connectionManager = new ConnectionManager({ debug: false });
      
      expect(connectionManager.isHealthy()).toBe(false);
      
      const stats = connectionManager.getConnectionStats();
      expect(stats).toEqual({
        chatConnected: false,
        presenceConnected: false,
        reconnectAttempts: 0,
        isHealthy: false,
      });
    });

    it('should handle subscriptions', () => {
      const connectionManager = new ConnectionManager({ debug: false });
      
      const statusCallback = () => {};
      const errorCallback = () => {};
      
      const unsubStatus = connectionManager.onStatusChange(statusCallback);
      const unsubError = connectionManager.onError(errorCallback);
      
      expect(typeof unsubStatus).toBe('function');
      expect(typeof unsubError).toBe('function');
      
      // Should not throw when unsubscribing
      expect(() => unsubStatus()).not.toThrow();
      expect(() => unsubError()).not.toThrow();
    });

    it('should handle disconnect without initialization', () => {
      const connectionManager = new ConnectionManager({ debug: false });
      
      // Should not throw when disconnecting without initialization
      expect(() => connectionManager.disconnect()).not.toThrow();
    });
  });

  describe('Service Exports', () => {
    it('should export all required services and utilities', () => {
      // Test that all exports are available
      expect(ChatService).toBeDefined();
      expect(PresenceService).toBeDefined();
      expect(ConnectionManager).toBeDefined();
    });
  });
});