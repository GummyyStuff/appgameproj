/**
 * Presence Hook
 * Tracks online users using Appwrite Realtime
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { subscribeToChatPresence } from '../services/appwrite-realtime';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface OnlineUser {
  user_id: string;
  username: string;
  last_seen: string;
  is_online: boolean;
}

export const usePresence = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isTracking, setIsTracking] = useState(false);

  // Fetch initial online users
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/chat/online`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch online users');
      }

      const result = await response.json();
      const users: OnlineUser[] = (result.online_users || []).map((u: any) => ({
        user_id: u.userId || u.user_id,
        username: u.username,
        last_seen: u.lastSeen || u.last_seen,
        is_online: u.isOnline !== undefined ? u.isOnline : true,
      }));

      setOnlineUsers(users);
    } catch (err) {
      console.error('Error fetching online users:', err);
    }
  }, []);

  // Update presence (ping server)
  const updatePresence = useCallback(async () => {
    if (!user || !profile) return;

    try {
      await fetch(`${API_URL}/chat/presence`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
    } catch (err) {
      console.error('Error updating presence:', err);
    }
  }, [user, profile]);

  // Load initial online users
  useEffect(() => {
    if (user) {
      fetchOnlineUsers();
    }
  }, [user, fetchOnlineUsers]);

  // Set up realtime subscription for presence updates
  useEffect(() => {
    if (!user) return;

    console.log('Setting up presence tracking...');

    const unsubscribe = subscribeToChatPresence({
      onUserOnline: (presence: any) => {
        console.log('User came online:', presence);
        
        const onlineUser: OnlineUser = {
          user_id: presence.userId || presence.user_id,
          username: presence.username,
          last_seen: presence.lastSeen || presence.last_seen,
          is_online: true,
        };

        setOnlineUsers(prev => {
          const filtered = prev.filter(u => u.user_id !== onlineUser.user_id);
          return [...filtered, onlineUser];
        });
      },
      onPresenceUpdate: (presence: any) => {
        console.log('Presence updated:', presence);
        
        setOnlineUsers(prev => prev.map(u =>
          u.user_id === (presence.userId || presence.user_id)
            ? {
                ...u,
                last_seen: presence.lastSeen || presence.last_seen,
                is_online: presence.isOnline !== undefined ? presence.isOnline : u.is_online,
              }
            : u
        ));
      },
      onUserOffline: (presence: any) => {
        console.log('User went offline:', presence);
        
        setOnlineUsers(prev => prev.filter(u => u.user_id !== (presence.userId || presence.user_id)));
      },
    });

    setIsTracking(true);

    return () => {
      console.log('Cleaning up presence tracking');
      unsubscribe();
      setIsTracking(false);
    };
  }, [user]);

  // Update presence every 60 seconds to stay online
  useEffect(() => {
    if (!user) return;

    // Initial presence update
    updatePresence();

    // Update presence every minute
    const interval = setInterval(updatePresence, 60 * 1000);

    return () => clearInterval(interval);
  }, [user, updatePresence]);

  return {
    onlineUsers,
    onlineCount: onlineUsers.filter(u => u.is_online).length,
    isTracking,
    updatePresence,
    refreshOnlineUsers: fetchOnlineUsers,
  };
};

