/**
 * Chat Realtime Hook (Appwrite version)
 * Handles real-time chat messages and presence using Appwrite Realtime
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { useMessageCooldown } from './useMessageCooldown';
import { subscribeToChatMessages } from '../services/appwrite-realtime';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
  display_name?: string;
  avatar_path?: string;
}

export interface ChatPresence {
  user_id: string;
  username: string;
  display_name?: string;
  avatar_path?: string;
  last_seen: string;
}

export const useChatRealtime = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);
  
  // Initialize cooldown system
  const { cooldownState, attemptSendMessage, formatRemainingTime, cleanup } = useMessageCooldown();

  // Fetch initial messages from backend API
  const fetchInitialMessages = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(`${API_URL}/chat/messages?limit=50`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-Appwrite-User-Id': user.id,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const result = await response.json();
      const messages: ChatMessage[] = (result.messages || []).reverse().map((msg: any) => ({
        id: msg.$id,
        user_id: msg.userId,
        content: msg.content,
        created_at: msg.createdAt,
        username: msg.username,
        display_name: msg.username, // Fallback to username
        avatar_path: 'defaults/default-avatar.svg', // Default avatar
      }));

      setMessages(messages);
      console.log('Loaded initial messages:', messages.length);
    } catch (err) {
      console.error('Error fetching initial messages:', err);
      setError('Failed to load messages');
    }
  }, [user]);

  // Load messages on mount
  useEffect(() => {
    if (user && !hasInitializedRef.current) {
      fetchInitialMessages();
      hasInitializedRef.current = true;
    }
  }, [user, fetchInitialMessages]);

  // Set up realtime subscription for new messages
  useEffect(() => {
    if (!user) return;

    console.log('Setting up Appwrite Realtime subscription for chat...');
    
    const unsubscribe = subscribeToChatMessages({
      onNewMessage: (message: any) => {
        console.log('New message received:', message);
        
        // Skip our own messages (optimistic update already added)
        if (message.userId === user.id) {
          console.log('Skipping own message (already added optimistically)');
          return;
        }

        const chatMessage: ChatMessage = {
          id: message.$id,
          user_id: message.userId,
          content: message.content,
          created_at: message.createdAt,
          username: message.username,
          display_name: message.username,
          avatar_path: 'defaults/default-avatar.svg',
        };

        setMessages(prev => {
          const newMessages = [...prev, chatMessage];
          return newMessages.slice(-50); // Keep last 50 messages
        });
      },
      onMessageUpdate: (message: any) => {
        console.log('Message updated:', message);
        
        // Handle message deletions (soft delete)
        if (message.isDeleted) {
          setMessages(prev => prev.filter(msg => msg.id !== message.$id));
        } else {
          setMessages(prev => prev.map(msg =>
            msg.id === message.$id
              ? { ...msg, content: message.content, created_at: message.updatedAt }
              : msg
          ));
        }
      },
      onMessageDelete: (message: any) => {
        console.log('Message deleted:', message);
        setMessages(prev => prev.filter(msg => msg.id !== message.$id));
      },
    });

    setIsConnected(true);

    return () => {
      console.log('Cleaning up chat realtime subscription');
      unsubscribe();
      setIsConnected(false);
    };
  }, [user]);

  // Send message function with optimistic updates
  const sendMessage = useCallback(async (content: string) => {
    if (!user || !profile) {
      setError('You must be logged in to send messages');
      return { success: false, error: 'Not authenticated' };
    }

    if (!content || content.trim().length === 0) {
      setError('Message cannot be empty');
      return { success: false, error: 'Message cannot be empty' };
    }

    if (content.length > 500) {
      setError('Message is too long (max 500 characters)');
      return { success: false, error: 'Message too long' };
    }

    // Check cooldown
    const canSend = attemptSendMessage();
    if (!canSend) {
      const remaining = formatRemainingTime();
      setError(`Please wait ${remaining} before sending another message`);
      return { success: false, error: `Cooldown active: ${remaining}` };
    }

    // Optimistic update
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: user.id,
      content: content.trim(),
      created_at: new Date().toISOString(),
      username: profile.username,
      display_name: profile.displayName,
      avatar_path: profile.avatar_path,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/chat/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();
      
      // Replace optimistic message with actual message
      setMessages(prev => prev.map(msg => 
        msg.id === optimisticMessage.id 
          ? { ...msg, id: result.chat_message.$id }
          : msg
      ));

      return { success: true };
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      
      return { success: false, error: 'Failed to send message' };
    }
  }, [user, profile, attemptSendMessage, formatRemainingTime]);

  // Delete message (for moderators)
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user || !profile) return { success: false, error: 'Not authenticated' };

    try {
      const response = await fetch(`${API_URL}/chat/messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      // Optimistically remove from UI
      setMessages(prev => prev.filter(msg => msg.id !== messageId));

      return { success: true };
    } catch (err) {
      console.error('Error deleting message:', err);
      return { success: false, error: 'Failed to delete message' };
    }
  }, [user, profile]);

  return {
    messages,
    isConnected,
    error,
    sendMessage,
    deleteMessage,
    cooldownState,
    formatRemainingTime,
  };
};

