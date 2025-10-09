/**
 * Chat Service
 * Handles chat message operations and presence tracking using Appwrite
 */

import { appwriteDb } from './appwrite-database';
import { COLLECTION_IDS, ChatMessage, ChatPresence } from '../config/collections';
import { ID, Permission, Role } from 'node-appwrite';

export class ChatService {
  /**
   * Send a chat message
   */
  static async sendMessage(
    userId: string,
    username: string,
    content: string
  ): Promise<{ success: boolean; message?: ChatMessage & { $id: string }; error?: string }> {
    // Validate content
    if (!content || content.trim().length === 0) {
      return { success: false, error: 'Message content cannot be empty' };
    }

    if (content.length > 500) {
      return { success: false, error: 'Message content exceeds 500 characters' };
    }

    const now = new Date().toISOString();
    const messageData: Omit<ChatMessage, '$id'> = {
      userId,
      username,
      content: content.trim(),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await appwriteDb.createDocument<ChatMessage>(
      COLLECTION_IDS.CHAT_MESSAGES,
      messageData,
      ID.unique(),
      [
        Permission.read(Role.users()), // All authenticated users can read
        Permission.update(Role.user(userId)), // Only sender can update
        Permission.delete(Role.user(userId)), // Only sender can delete (soft delete)
      ]
    );

    if (error) {
      return { success: false, error };
    }

    // Update presence on message send
    await this.updatePresence(userId, username, true);

    return { success: true, message: data! };
  }

  /**
   * Get recent messages
   */
  static async getMessages(limit: number = 50, before?: string) {
    const queries = [appwriteDb.equal('isDeleted', false), appwriteDb.orderDesc('createdAt')];

    if (before) {
      queries.push(appwriteDb.lessThan('createdAt', before));
    }

    queries.push(appwriteDb.limit(limit));

    const { data, total, error } = await appwriteDb.listDocuments<ChatMessage>(
      COLLECTION_IDS.CHAT_MESSAGES,
      queries
    );

    if (error) {
      return { success: false, messages: [], total: 0, error };
    }

    return { success: true, messages: data, total };
  }

  /**
   * Delete a message (soft delete for moderators)
   */
  static async deleteMessage(
    messageId: string,
    moderatorId: string,
    isModerator: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    // Get the message
    const { data: message, error: fetchError } = await appwriteDb.getDocument<ChatMessage>(
      COLLECTION_IDS.CHAT_MESSAGES,
      messageId
    );

    if (fetchError || !message) {
      return { success: false, error: 'Message not found' };
    }

    // Check if user is authorized (message owner or moderator)
    if (!isModerator && message.userId !== moderatorId) {
      return { success: false, error: 'Unauthorized to delete this message' };
    }

    // Soft delete
    const { error } = await appwriteDb.updateDocument<ChatMessage>(
      COLLECTION_IDS.CHAT_MESSAGES,
      messageId,
      {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: moderatorId,
        updatedAt: new Date().toISOString(),
      }
    );

    if (error) {
      return { success: false, error };
    }

    return { success: true };
  }

  /**
   * Update user presence
   */
  static async updatePresence(
    userId: string,
    username: string,
    isOnline: boolean = true
  ): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString();

    // Try to find existing presence
    const { data: existingPresence } = await appwriteDb.listDocuments<ChatPresence>(
      COLLECTION_IDS.CHAT_PRESENCE,
      [appwriteDb.equal('userId', userId)]
    );

    if (existingPresence && existingPresence.length > 0) {
      // Update existing
      const { error } = await appwriteDb.updateDocument<ChatPresence>(
        COLLECTION_IDS.CHAT_PRESENCE,
        existingPresence[0].$id!,
        {
          username,
          lastSeen: now,
          isOnline,
        }
      );

      return { success: !error, error: error || undefined };
    } else {
      // Create new
      const presenceData: Omit<ChatPresence, '$id'> = {
        userId,
        username,
        lastSeen: now,
        isOnline,
      };

      const { error } = await appwriteDb.createDocument<ChatPresence>(
        COLLECTION_IDS.CHAT_PRESENCE,
        presenceData,
        ID.unique(),
        [
          Permission.read(Role.users()),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]
      );

      return { success: !error, error: error || undefined };
    }
  }

  /**
   * Get online users
   */
  static async getOnlineUsers() {
    const { data, error } = await appwriteDb.listDocuments<ChatPresence>(
      COLLECTION_IDS.CHAT_PRESENCE,
      [appwriteDb.equal('isOnline', true), appwriteDb.orderDesc('lastSeen')]
    );

    if (error) {
      return { success: false, users: [], error };
    }

    return { success: true, users: data };
  }

  /**
   * Clean up stale presence records
   * Mark users offline if not seen in 5 minutes
   */
  static async cleanupStalePresence(): Promise<{ success: boolean; cleaned: number }> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Get stale online users
    const { data: staleUsers } = await appwriteDb.listDocuments<ChatPresence>(
      COLLECTION_IDS.CHAT_PRESENCE,
      [appwriteDb.equal('isOnline', true), appwriteDb.lessThan('lastSeen', fiveMinutesAgo)]
    );

    if (!staleUsers || staleUsers.length === 0) {
      return { success: true, cleaned: 0 };
    }

    // Mark them offline
    let cleaned = 0;
    for (const user of staleUsers) {
      const { error } = await appwriteDb.updateDocument<ChatPresence>(
        COLLECTION_IDS.CHAT_PRESENCE,
        user.$id!,
        { isOnline: false }
      );

      if (!error) cleaned++;
    }

    // Delete very old presence records (24+ hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: veryOld } = await appwriteDb.listDocuments<ChatPresence>(
      COLLECTION_IDS.CHAT_PRESENCE,
      [appwriteDb.lessThan('lastSeen', oneDayAgo)]
    );

    if (veryOld && veryOld.length > 0) {
      for (const old of veryOld) {
        await appwriteDb.deleteDocument(COLLECTION_IDS.CHAT_PRESENCE, old.$id!);
      }
    }

    return { success: true, cleaned };
  }
}

