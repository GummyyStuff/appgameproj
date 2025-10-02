import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { useMessageCooldown } from './useMessageCooldown';
import { supabase } from '../lib/supabase';

export interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar_path: string;
}

export interface ChatPresence {
  user_id: string;
  username: string;
  display_name: string;
  avatar_path: string;
  last_seen: string;
}

export const useChatRealtime = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const hasInitializedRef = useRef(false);
  
  // Initialize cooldown system
  const { cooldownState, attemptSendMessage, formatRemainingTime, cleanup } = useMessageCooldown();

  // Fetch initial messages
  const fetchInitialMessages = useCallback(async () => {
    if (!user) return;

    // Fetching initial messages
    
    try {
      // First, let's test if we can access the user_profiles table
      const { data: profileTest, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, username, display_name')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Cannot access user_profiles:', profileError);
        setError('Authentication error: Cannot access profile');
        return;
      }

      // Use a simpler approach - fetch messages first, then get user profiles separately
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('id, user_id, content, created_at, username')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        throw messagesError;
      }

      // Get unique user IDs from messages
      const userIds = [...new Set(messagesData?.map(msg => msg.user_id) || [])];
      
      // Fetch user profiles for all users in messages
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_path')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Create a map for quick profile lookup
      const profileMap = new Map(profilesData?.map(profile => [profile.id, profile]) || []);

      // Combine messages with profile data
      const data = messagesData?.map(msg => ({
        ...msg,
        user_profiles: profileMap.get(msg.user_id) || { display_name: msg.username, avatar_path: 'defaults/default-avatar.svg' }
      })) || [];

      console.log('Combined data:', data);
      
      // Transform the data to match our interface
      const messages: ChatMessage[] = (data || []).map(msg => ({
        id: msg.id,
        user_id: msg.user_id,
        content: msg.content,
        created_at: msg.created_at,
        username: msg.username,
        display_name: msg.user_profiles.display_name,
        avatar_path: msg.user_profiles.avatar_path
      }));

      // Reverse to show oldest first (newest at bottom)
      setMessages(messages.reverse());
    } catch (err) {
      console.error('Failed to fetch initial messages:', err);
      setError('Failed to load chat messages');
    }
  }, [user]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!user || !profile || !content.trim()) return;

    // Check cooldown before sending
    const cooldownResult = attemptSendMessage();
    if (!cooldownResult.canSend) {
      setError(cooldownResult.reason || 'Please wait before sending another message');
      throw new Error(cooldownResult.reason || 'Cooldown active');
    }

    // Optimistic UI update - add message immediately
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`, // Temporary ID
      user_id: user.id,
      username: profile.username,
      content: content.trim(),
      created_at: new Date().toISOString(),
      display_name: profile.display_name || profile.username,
      avatar_path: profile.avatar_path || 'defaults/default-avatar.svg'
    };

        // Add optimistic message immediately
        setMessages(prev => {
          const newMessages = [...prev, optimisticMessage];
          // Keep only the last 20 messages
          return newMessages.slice(-20);
        });

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          username: profile.username,
          content: content.trim()
        });

      if (error) throw error;

      // Don't remove optimistic message - let it stay since we skip our own messages in realtime
      console.log('Message sent successfully, keeping optimistic version');
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      throw err;
    }
  }, [user, profile, attemptSendMessage]);

  // Delete a message (moderators only)
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to delete message:', err);
      setError('Failed to delete message');
      throw err;
    }
  }, [user]);

  // Set up realtime subscription - only run once per user
  useEffect(() => {
    if (!user || hasInitializedRef.current) {
      console.log('No user or already initialized, skipping chat setup');
      return;
    }

    console.log('Setting up chat realtime subscription for user:', user.id);
    hasInitializedRef.current = true;
    
    const channel = supabase
      .channel('public:chat_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          console.log('Chat change received:', payload);

          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as any;
            
            // Skip if this is our own message (we already have the optimistic version)
            if (newMessage.user_id === user?.id) {
              console.log('Skipping own message from realtime (already have optimistic version)');
              return;
            }
            
            // Fetch the full message data with user profile info
            supabase
              .from('chat_messages')
              .select(`
                id,
                user_id,
                content,
                created_at,
                username,
                user_profiles!inner(display_name, avatar_path)
              `)
              .eq('id', newMessage.id)
              .single()
              .then(({ data, error }) => {
                if (error) {
                  console.error('Failed to fetch full message data:', error);
                  return;
                }
                
                const fullMessage: ChatMessage = {
                  id: data.id,
                  user_id: data.user_id,
                  content: data.content,
                  created_at: data.created_at,
                  username: data.username,
                  display_name: data.user_profiles.display_name,
                  avatar_path: data.user_profiles.avatar_path
                };
                
                console.log('Adding message from other user:', fullMessage);
                setMessages(prev => {
                  const newMessages = [...prev, fullMessage];
                  // Keep only the last 20 messages to prevent memory issues
                  return newMessages.slice(-20);
                });
              });
          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage = payload.new as any;
            if (updatedMessage.is_deleted) {
              // Remove deleted message from UI
              setMessages(prev => prev.filter(msg => msg.id !== updatedMessage.id));
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Chat subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Store channel reference
    channelRef.current = channel;

    // Fetch initial messages
    console.log('Fetching initial messages...');
    fetchInitialMessages();

    return () => {
      console.log('Cleaning up chat subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      hasInitializedRef.current = false;
    };
  }, [user?.id]); // Only depend on user ID, not the whole user object

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        console.log('Final cleanup of chat subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      // Cleanup cooldown system
      cleanup();
    };
  }, [cleanup]);

  return {
    messages,
    isConnected,
    error,
    sendMessage,
    deleteMessage,
    clearError: () => setError(null),
    cooldownState,
    formatRemainingTime
  };
};
