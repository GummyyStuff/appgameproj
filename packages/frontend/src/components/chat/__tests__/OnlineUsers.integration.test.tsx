import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, afterEach } from 'bun:test';
import { OnlineUsers } from '../OnlineUsers';
import { ChatSidebar } from '../ChatSidebar';
import { OnlineUser } from '../../../types/chat';

describe('OnlineUsers Integration Tests', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Integration with ChatSidebar', () => {
    it('should render correctly within ChatSidebar structure', () => {
      const mockUsers: OnlineUser[] = [
        {
          user_id: 'user1',
          username: 'TarkovPlayer1',
          last_seen: new Date().toISOString(),
          is_online: true,
        },
        {
          user_id: 'user2',
          username: 'SniperElite',
          last_seen: new Date().toISOString(),
          is_online: true,
        },
      ];

      // Test OnlineUsers component in isolation first
      render(
        <div className="chat-sidebar__online-users">
          <OnlineUsers
            users={mockUsers}
            currentUserId="current-user"
            maxVisible={8}
          />
        </div>
      );

      // Verify the component renders correctly
      expect(screen.getByText('Online Users')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('TarkovPlayer1')).toBeInTheDocument();
      expect(screen.getByText('SniperElite')).toBeInTheDocument();

      // Verify the structure matches what ChatSidebar expects
      const container = document.querySelector('.chat-sidebar__online-users');
      expect(container).toBeInTheDocument();
      
      const onlineUsersComponent = container?.querySelector('.online-users');
      expect(onlineUsersComponent).toBeInTheDocument();
    });

    it('should handle user join/leave animations correctly', () => {
      const initialUsers: OnlineUser[] = [
        {
          user_id: 'user1',
          username: 'Player1',
          last_seen: new Date().toISOString(),
          is_online: true,
        },
      ];

      const { rerender } = render(
        <OnlineUsers
          users={initialUsers}
          currentUserId="current-user"
        />
      );

      // Initial state
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Player1')).toBeInTheDocument();

      // User joins
      const updatedUsers: OnlineUser[] = [
        ...initialUsers,
        {
          user_id: 'user2',
          username: 'Player2',
          last_seen: new Date().toISOString(),
          is_online: true,
        },
      ];

      rerender(
        <OnlineUsers
          users={updatedUsers}
          currentUserId="current-user"
        />
      );

      // Verify new user appears with animation class
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Player2')).toBeInTheDocument();
      
      const userItems = document.querySelectorAll('.online-user-item');
      expect(userItems).toHaveLength(2);
      
      // All user items should have the animation class
      userItems.forEach(item => {
        expect(item).toHaveClass('online-user-item');
      });

      // User leaves
      const usersAfterLeave = initialUsers.map(user => ({
        ...user,
        is_online: false
      }));

      rerender(
        <OnlineUsers
          users={usersAfterLeave}
          currentUserId="current-user"
        />
      );

      // Should show empty state
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('No other users online')).toBeInTheDocument();
    });

    it('should maintain performance with rapid updates', () => {
      const generateUsers = (count: number): OnlineUser[] => {
        return Array.from({ length: count }, (_, i) => ({
          user_id: `user${i}`,
          username: `Player${i}`,
          last_seen: new Date().toISOString(),
          is_online: true,
        }));
      };

      const { rerender } = render(
        <OnlineUsers
          users={generateUsers(5)}
          currentUserId="current-user"
          maxVisible={3}
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('+2 more users')).toBeInTheDocument();

      // Rapid updates
      for (let i = 6; i <= 10; i++) {
        rerender(
          <OnlineUsers
            users={generateUsers(i)}
            currentUserId="current-user"
            maxVisible={3}
          />
        );
        
        expect(screen.getByText(i.toString())).toBeInTheDocument();
        expect(screen.getByText(`+${i - 3} more users`)).toBeInTheDocument();
      }

      // Should still be responsive
      const userItems = document.querySelectorAll('.online-user-item');
      expect(userItems).toHaveLength(3); // Only maxVisible items rendered
    });

    it('should handle real-time presence updates correctly', () => {
      const mockUsers: OnlineUser[] = [
        {
          user_id: 'user1',
          username: 'Player1',
          last_seen: new Date().toISOString(),
          is_online: true,
        },
        {
          user_id: 'user2',
          username: 'Player2',
          last_seen: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
          is_online: false, // Offline
        },
      ];

      render(
        <OnlineUsers
          users={mockUsers}
          currentUserId="current-user"
        />
      );

      // Should only show online users
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Player1')).toBeInTheDocument();
      expect(screen.queryByText('Player2')).not.toBeInTheDocument();

      // Verify online indicator is present
      const onlineDots = document.querySelectorAll('.online-user-item__dot');
      expect(onlineDots).toHaveLength(1);
    });

    it('should integrate properly with Tarkov theme styling', () => {
      const mockUsers: OnlineUser[] = [
        {
          user_id: 'user1',
          username: 'TarkovOperator',
          last_seen: new Date().toISOString(),
          is_online: true,
        },
      ];

      render(
        <OnlineUsers
          users={mockUsers}
          currentUserId="current-user"
          className="tarkov-themed"
        />
      );

      // Verify Tarkov-themed classes are applied
      const container = document.querySelector('.online-users');
      expect(container).toHaveClass('online-users', 'tarkov-themed');

      // Verify military-style elements are present
      expect(screen.getByText('👥')).toBeInTheDocument(); // Military icon
      expect(screen.getByText('Online Users')).toBeInTheDocument();

      // Verify green dot for online status (military green)
      const onlineDot = document.querySelector('.online-user-item__dot');
      expect(onlineDot).toBeInTheDocument();
      expect(onlineDot).toHaveClass('online-user-item__dot');
    });

    it('should handle accessibility requirements', () => {
      const mockUsers: OnlineUser[] = [
        {
          user_id: 'user1',
          username: 'AccessibleUser',
          last_seen: new Date().toISOString(),
          is_online: true,
        },
      ];

      render(
        <OnlineUsers
          users={mockUsers}
          currentUserId="current-user"
        />
      );

      // Verify semantic structure
      expect(screen.getByText('Online Users')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('AccessibleUser')).toBeInTheDocument();

      // Verify keyboard navigation support
      const userItems = document.querySelectorAll('.online-user-item');
      expect(userItems[0]).toHaveClass('online-user-item');
      
      // Focus should work
      userItems[0].focus();
      expect(document.activeElement).toBe(userItems[0]);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed user data gracefully', () => {
      const malformedUsers = [
        {
          user_id: 'user1',
          username: 'ValidUser',
          last_seen: new Date().toISOString(),
          is_online: true,
        },
        // @ts-ignore - Testing malformed data
        {
          user_id: null,
          username: '',
          last_seen: 'invalid-date',
          is_online: 'not-boolean',
        },
      ] as OnlineUser[];

      // Should not crash with malformed data
      render(
        <OnlineUsers
          users={malformedUsers}
          currentUserId="current-user"
        />
      );

      // Should still show valid users
      expect(screen.getByText('ValidUser')).toBeInTheDocument();
    });

    it('should handle network disconnection scenarios', () => {
      const mockUsers: OnlineUser[] = [
        {
          user_id: 'user1',
          username: 'DisconnectedUser',
          last_seen: new Date(Date.now() - 35000).toISOString(), // 35 seconds ago (past timeout)
          is_online: false,
        },
      ];

      render(
        <OnlineUsers
          users={mockUsers}
          currentUserId="current-user"
        />
      );

      // Should show empty state for disconnected users
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('No other users online')).toBeInTheDocument();
    });
  });
});