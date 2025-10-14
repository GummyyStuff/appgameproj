/**
 * Appwrite Realtime Service (Frontend)
 * Handles real-time subscriptions for balance, stats, and game updates
 * Uses Appwrite's built-in Realtime API with WebSocket connections
 * 
 * Uses Appwrite Client.subscribe() for Web/JavaScript
 * See: https://appwrite.io/docs/apis/realtime
 */

import { appwriteClient } from '../lib/appwrite';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'main_db';

export const COLLECTION_IDS = {
  USERS: 'users',
  GAME_HISTORY: 'game_history',
  CHAT_MESSAGES: 'chat_messages',
  CHAT_PRESENCE: 'chat_presence',
} as const;

export type CollectionId = typeof COLLECTION_IDS[keyof typeof COLLECTION_IDS];

/**
 * Subscribe to a collection for real-time updates using Appwrite Realtime
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

  const unsubscribe = appwriteClient.subscribe(
    channel,
    (response: any) => {
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
 * Subscribe to a specific document using Appwrite Realtime
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

  const unsubscribe = appwriteClient.subscribe(
    channel,
    (response: any) => {
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
 * Subscribe to user balance updates via Appwrite Realtime
 * Subscribes to the user document in the users collection
 */
export function subscribeToUserBalance(
  userId: string,
  onBalanceUpdate: (balance: number) => void
) {
  console.log(`🔔 Subscribing to balance updates for user ${userId}`)
  
  // Subscribe to the specific user document using Appwrite Realtime
  const unsubscribe = appwriteClient.subscribe(
    `databases.${DATABASE_ID}.collections.${COLLECTION_IDS.USERS}.documents.${userId}`,
    (response: any) => {
      const payload = response.payload;
      
      if (!payload) return;

      const events = response.events || [];
      
      // Check if this is an update event
      if (events.some(e => e.includes('.update'))) {
        console.log('💰 User document updated:', payload);
        
        // Extract balance from the updated user document
        if (payload.balance !== undefined) {
          console.log('💰 Balance updated via realtime:', payload.balance);
          onBalanceUpdate(payload.balance);
        }
      }
    }
  );

  return unsubscribe;
}

/**
 * Subscribe to game history updates via Appwrite Realtime
 */
export function subscribeToGameHistory(callbacks: {
  onNewGame?: (game: any) => void;
}) {
  console.log('🔔 Subscribing to game history updates')
  
  // Subscribe to the game_history collection
  const unsubscribe = appwriteClient.subscribe(
    `databases.${DATABASE_ID}.collections.${COLLECTION_IDS.GAME_HISTORY}.documents`,
    (response: any) => {
      const payload = response.payload;
      
      if (!payload) return;

      const events = response.events || [];
      
      // Check if this is a create event (new game)
      if (events.some(e => e.includes('.create'))) {
        console.log('🎮 New game created:', payload);
        callbacks.onNewGame?.(payload);
      }
    }
  );

  return unsubscribe;
}

