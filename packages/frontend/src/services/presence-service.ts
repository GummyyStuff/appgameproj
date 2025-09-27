/**
 * Presence Service - Handles online user tracking with Supabase
 * Requirements: 5.1, 5.2, 5.3, 5.4, 6.2, 6.3
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type {
  OnlineUser,
  ConnectionStatus,
  ChatError,
  ChatErrorType,
  ChatServiceConfig,
} from '../types/chat';
import { CHAT_CONFIG } from '../types/chat';

/**
 * Authentication context for presence service
 */
interface AuthContext {
  userId: string;
  username: string;
  accessToken: string;
}

/**
 * Presence service class for managing online user tracking
 */
export class PresenceService {
  private channel: RealtimeChannel | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private authContext: AuthContext | null = null;
  private onlineUsers: Map<string, OnlineUser> = new Map();
  
  private userListeners: Set<(users: OnlineUser[]) => void> = new Set();
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private errorListeners: Set<(error: ChatError) => void> = new Set();
  
  private config: Required<Pick<ChatServiceConfig, 'presenceHeartbeatInterval' | 'debug'>>;

  constructor(config: Partial<ChatServiceConfig> = {}) {
    this.config = {
      presenceHeartbeatInterval: config.presenceHeartbeatInterval ?? CHAT_CONFIG.HEARTBEAT_INTERVAL_MS,
      debug: config.debug ?? false,
    };

    this.log('PresenceService initialized with config:', this.config);
  }

  /**
   * Initialize presence tracking
   */
  async initialize(authContext?: AuthContext): Promise<void> {
    try {
      this.log('Initializing presence service...');
      this.setConnectionStatus('connecting');

      // Store auth context if provided
      if (authContext) {
        this.authContext = authContext;
      }

      // Check authentication
      if (!this.authContext) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw this.createError(ChatErrorType.AUTHENTICATION_REQUIRED, 'User must be authenticated for presence tracking');
        }
        
        // Create auth context from current user
        this.authContext = {
          userId: user.id,
          username: user.user_metadata?.username || user.email?.split('@')[0] || 'Anonymous',
          accessToken: (await supabase.auth.getSession()).data.session?.access_token || '',
        };
      }

      // Create presence channel
      this.channel = supabase.channel('chat_presence', {
        config: {
          presence: {
            key: this.authContext.userId,
          },
        },
      });

      // Set up presence event handlers
      this.channel
        .on('presence', { event: 'sync' }, () => {
          this.log('Presence sync event');
          this.handlePresenceSync();
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.log('User joined presence:', key, newPresences);
          this.handlePresenceJoin(key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          this.log('User left presence:', key, leftPresences);
          this.handlePresenceLeave(key, leftPresences);
        });

      // Subscribe to the channel
      await this.channel.subscribe(async (status) => {
        this.log('Presence subscription status:', status);
        if (status === 'SUBSCRIBED') {
          // Track current user's presence
          await this.trackPresence();
          this.setConnectionStatus('connected');
          this.startHeartbeat();
        } else if (status === 'CHANNEL_ERROR') {
          this.handleConnectionError(new Error('Presence channel subscription failed'));
        } else if (status === 'TIMED_OUT') {
          this.handleConnectionError(new Error('Presence channel subscription timed out'));
        }
      });

      this.log('Presence service initialized successfully');
    } catch (error) {
      this.log('Failed to initialize presence service:', error);
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  /**
   * Get list of online users
   */
  getOnlineUsers(): OnlineUser[] {
    return Array.from(this.onlineUsers.values());
  }

  /**
   * Get count of online users
   */
  getOnlineUserCount(): number {
    return this.onlineUsers.size;
  }

  /**
   * Check if a specific user is online
   */
  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  /**
   * Subscribe to online users changes
   */
  onUsersChange(callback: (users: OnlineUser[]) => void): () => void {
    this.userListeners.add(callback);
    // Immediately call with current users
    callback(this.getOnlineUsers());
    return () => {
      this.userListeners.delete(callback);
    };
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    // Immediately call with current status
    callback(this.connectionStatus);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Subscribe to errors
   */
  onError(callback: (error: ChatError) => void): () => void {
    this.errorListeners.add(callback);
    return () => {
      this.errorListeners.delete(callback);
    };
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connectionStatus === 'connected';
  }

  /**
   * Update access token (for token refresh)
   */
  updateToken(newToken: string): void {
    if (this.authContext) {
      this.log('Updating access token');
      this.authContext.accessToken = newToken;
    }
  }

  /**
   * Get current user context
   */
  getCurrentUser(): { userId: string; username: string } | null {
    if (!this.authContext) {
      return null;
    }
    
    return {
      userId: this.authContext.userId,
      username: this.authContext.username,
    };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authContext !== null;
  }

  /**
   * Manually reconnect
   */
  async reconnect(): Promise<void> {
    this.log('Manual reconnect requested');
    this.cleanup();
    await this.initialize();
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.log('Disconnecting presence service');
    this.cleanup();
    this.setConnectionStatus('disconnected');
  }

  /**
   * Track current user's presence
   */
  private async trackPresence(): Promise<void> {
    if (!this.channel || !this.authContext) {
      return;
    }

    try {
      const presenceData = {
        user_id: this.authContext.userId,
        username: this.authContext.username,
        last_seen: new Date().toISOString(),
        is_online: true,
      };

      await this.channel.track(presenceData);
      this.log('Tracking presence for user:', this.authContext.username);
    } catch (error) {
      this.log('Failed to track presence:', error);
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Handle presence sync event
   */
  private handlePresenceSync(): void {
    if (!this.channel) return;

    const presenceState = this.channel.presenceState();
    this.log('Presence state sync:', presenceState);

    // Update online users map
    this.onlineUsers.clear();
    
    Object.entries(presenceState).forEach(([userId, presences]) => {
      if (presences && presences.length > 0) {
        const presence = presences[0] as OnlineUser;
        this.onlineUsers.set(userId, {
          ...presence,
          is_online: true,
          last_seen: new Date().toISOString(),
        });
      }
    });

    this.notifyUsersChange();
  }

  /**
   * Handle user joining presence
   */
  private handlePresenceJoin(key: string, newPresences: any[]): void {
    if (newPresences && newPresences.length > 0) {
      const presence = newPresences[0] as OnlineUser;
      this.onlineUsers.set(key, {
        ...presence,
        is_online: true,
        last_seen: new Date().toISOString(),
      });
      this.notifyUsersChange();
    }
  }

  /**
   * Handle user leaving presence
   */
  private handlePresenceLeave(key: string, leftPresences: any[]): void {
    this.onlineUsers.delete(key);
    this.notifyUsersChange();
  }

  /**
   * Start heartbeat to maintain presence
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat

    this.heartbeatTimer = setInterval(async () => {
      if (this.isConnected() && this.authContext) {
        try {
          await this.trackPresence();
        } catch (error) {
          this.log('Heartbeat failed:', error);
          this.handleConnectionError(error as Error);
        }
      }
    }, this.config.presenceHeartbeatInterval);

    this.log('Heartbeat started with interval:', this.config.presenceHeartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      this.log('Heartbeat stopped');
    }
  }

  /**
   * Notify listeners of users change
   */
  private notifyUsersChange(): void {
    const users = this.getOnlineUsers();
    this.log('Online users updated:', users.length, 'users');
    
    this.userListeners.forEach(listener => {
      try {
        listener(users);
      } catch (error) {
        this.log('Error in user listener:', error);
      }
    });
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    this.log('Presence connection error:', error);
    
    const chatError = this.createError(ChatErrorType.CONNECTION_FAILED, error.message);
    this.errorListeners.forEach(listener => {
      try {
        listener(chatError);
      } catch (err) {
        this.log('Error in error listener:', err);
      }
    });

    this.setConnectionStatus('disconnected');
  }

  /**
   * Set connection status and notify listeners
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.log('Presence connection status changed:', this.connectionStatus, '->', status);
      this.connectionStatus = status;
      this.statusListeners.forEach(listener => {
        try {
          listener(status);
        } catch (error) {
          this.log('Error in status listener:', error);
        }
      });
    }
  }

  /**
   * Create a structured chat error
   */
  private createError(type: ChatErrorType, message: string, details?: Record<string, any>): ChatError {
    return {
      type,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.stopHeartbeat();

    if (this.channel) {
      this.channel.untrack();
      this.channel.unsubscribe();
      this.channel = null;
    }

    this.onlineUsers.clear();
    this.authContext = null;
  }

  /**
   * Debug logging
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[PresenceService]', ...args);
    }
  }
}

// Export singleton instance
export const presenceService = new PresenceService({
  debug: import.meta.env.DEV,
});

export default presenceService;