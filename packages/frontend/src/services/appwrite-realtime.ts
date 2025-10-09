/**
 * Appwrite Realtime Service (Frontend)
 * Handles real-time subscriptions for chat, game updates, and presence
 */

import { appwriteClient } from '../lib/appwrite';
import { RealtimeResponseEvent } from 'appwrite';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'main_db';

export const COLLECTION_IDS = {
  USERS: 'users',
  GAME_HISTORY: 'game_history',
  CHAT_MESSAGES: 'chat_messages',
  CHAT_PRESENCE: 'chat_presence',
} as const;

export type CollectionId = typeof COLLECTION_IDS[keyof typeof COLLECTION_IDS];

/**
 * Subscribe to a collection for real-time updates
 */
export function subscribeToCollection<T>(
  collectionId: CollectionId,
  callbacks: {
    onCreate?: (document: T) => void;
    onUpdate?: (document: T) => void;
    onDelete?: (document: T) => void;
  }
) {
  const channel = `databases.${DATABASE_ID}.collections.${collectionId}.documents`;

  const unsubscribe = appwriteClient.subscribe<RealtimeResponseEvent<T>>(
    channel,
    (response) => {
      const payload = response.payload;
      
      if (!payload) return;

      // Handle different event types
      const events = response.events || [];
      
      if (events.some(e => e.includes('.create'))) {
        callbacks.onCreate?.(payload as T);
      } else if (events.some(e => e.includes('.update'))) {
        callbacks.onUpdate?.(payload as T);
      } else if (events.some(e => e.includes('.delete'))) {
        callbacks.onDelete?.(payload as T);
      }
    }
  );

  return unsubscribe;
}

/**
 * Subscribe to a specific document
 */
export function subscribeToDocument<T>(
  collectionId: CollectionId,
  documentId: string,
  callbacks: {
    onUpdate?: (document: T) => void;
    onDelete?: (document: T) => void;
  }
) {
  const channel = `databases.${DATABASE_ID}.collections.${collectionId}.documents.${documentId}`;

  const unsubscribe = appwriteClient.subscribe<RealtimeResponseEvent<T>>(
    channel,
    (response) => {
      const payload = response.payload;
      
      if (!payload) return;

      const events = response.events || [];
      
      if (events.some(e => e.includes('.update'))) {
        callbacks.onUpdate?.(payload as T);
      } else if (events.some(e => e.includes('.delete'))) {
        callbacks.onDelete?.(payload as T);
      }
    }
  );

  return unsubscribe;
}

/**
 * Subscribe to chat messages
 */
export function subscribeToChatMessages(callbacks: {
  onNewMessage?: (message: any) => void;
  onMessageUpdate?: (message: any) => void;
  onMessageDelete?: (message: any) => void;
}) {
  return subscribeToCollection(COLLECTION_IDS.CHAT_MESSAGES, {
    onCreate: callbacks.onNewMessage,
    onUpdate: callbacks.onMessageUpdate,
    onDelete: callbacks.onMessageDelete,
  });
}

/**
 * Subscribe to chat presence
 */
export function subscribeToChatPresence(callbacks: {
  onUserOnline?: (presence: any) => void;
  onUserOffline?: (presence: any) => void;
  onPresenceUpdate?: (presence: any) => void;
}) {
  return subscribeToCollection(COLLECTION_IDS.CHAT_PRESENCE, {
    onCreate: callbacks.onUserOnline,
    onUpdate: callbacks.onPresenceUpdate,
    onDelete: callbacks.onUserOffline,
  });
}

/**
 * Subscribe to user balance updates
 */
export function subscribeToUserBalance(
  userId: string,
  onBalanceUpdate: (balance: number) => void
) {
  return subscribeToDocument(COLLECTION_IDS.USERS, userId, {
    onUpdate: (user: any) => {
      if (user.balance !== undefined) {
        onBalanceUpdate(user.balance);
      }
    },
  });
}

/**
 * Subscribe to game history (for activity feed)
 */
export function subscribeToGameHistory(callbacks: {
  onNewGame?: (game: any) => void;
}) {
  return subscribeToCollection(COLLECTION_IDS.GAME_HISTORY, {
    onCreate: callbacks.onNewGame,
  });
}

