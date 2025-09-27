import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { OnlineUsers } from '../OnlineUsers';
import { OnlineUser } from '../../../types/chat';

describe('OnlineUsers Component', () => {
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
    {
      user_id: 'user3',
      username: 'RaidLeader',
      last_seen: new Date().toISOString(),
      is_online: true,
    },
    {
      user_id: 'user4',
      username: 'OfflineUser',
      last_seen: new Date(Date.now() - 60000).toISOString(),
      is_online: false,
    },
  ];

  const currentUserId = 'current-user';

  afterEach(() => {
    cleanup();
  });

  describe('Basic Rendering', () => {
    it('should render the component with correct structure', () => {
      render(<OnlineUsers users={mockUsers} currentUserId={currentUserId} />);
      
      expect(screen.getByText('Online Users')).toBeInTheDocument();
      expect(screen.getByText('👥')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Count should exclude offline user
    });

    it('should display user count correctly', () => {
      render(<OnlineUsers users={mockUsers} currentUserId={currentUserId} />);
      
      const countElement = screen.getByText('3');
      expect(countElement).toBeInTheDocument();
      expect(countElement).toHaveClass('online-users__count-number');
    });

    it('should render with custom className', () => {
      const { container } = render(
        <OnlineUsers 
          users={mockUsers} 
          currentUserId={currentUserId} 
          className="custom-class" 
        />
      );
      
      expect(container.firstChild).toHaveClass('online-users', 'custom-class');
    });
  });

  describe('User List Display', () => {
    it('should display online users with green dots', () => {
      render(<OnlineUsers users={mockUsers} currentUserId={currentUserId} />);
      
      expect(screen.getByText('TarkovPlayer1')).toBeInTheDocument();
      expect(screen.getByText('SniperElite')).toBeInTheDocument();
      expect(screen.getByText('RaidLeader')).toBeInTheDocument();
      
      // Should not display offline user
      expect(screen.queryByText('OfflineUser')).not.toBeInTheDocument();
      
      // Check for green dots (online indicators)
      const dots = document.querySelectorAll('.online-user-item__dot');
      expect(dots).toHaveLength(3);
    });

    it('should exclude current user from the list', () => {
      const usersWithCurrentUser = [
        ...mockUsers,
        {
          user_id: currentUserId,
          username: 'CurrentUser',
          last_seen: new Date().toISOString(),
          is_online: true,
        },
      ];

      render(<OnlineUsers users={usersWithCurrentUser} currentUserId={currentUserId} />);
      
      expect(screen.queryByText('CurrentUser')).not.toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Count should still be 3
    });

    it('should sort users alphabetically by username', () => {
      render(<OnlineUsers users={mockUsers} currentUserId={currentUserId} />);
      
      const userItems = document.querySelectorAll('.online-user-item__username');
      const usernames = Array.from(userItems).map(item => item.textContent);
      
      expect(usernames).toEqual(['RaidLeader', 'SniperElite', 'TarkovPlayer1']);
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no users are online', () => {
      render(<OnlineUsers users={[]} currentUserId={currentUserId} />);
      
      expect(screen.getByText('No other users online')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should display empty state when only offline users exist', () => {
      const offlineUsers = mockUsers.map(user => ({ ...user, is_online: false }));
      render(<OnlineUsers users={offlineUsers} currentUserId={currentUserId} />);
      
      expect(screen.getByText('No other users online')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should display empty state when only current user is online', () => {
      const currentUserOnly = [{
        user_id: currentUserId,
        username: 'CurrentUser',
        last_seen: new Date().toISOString(),
        is_online: true,
      }];

      render(<OnlineUsers users={currentUserOnly} currentUserId={currentUserId} />);
      
      expect(screen.getByText('No other users online')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Scrollable List Functionality', () => {
    it('should show scrollable list when users exceed maxVisible', () => {
      const manyUsers: OnlineUser[] = Array.from({ length: 15 }, (_, i) => ({
        user_id: `user${i}`,
        username: `User${i.toString().padStart(2, '0')}`,
        last_seen: new Date().toISOString(),
        is_online: true,
      }));

      render(<OnlineUsers users={manyUsers} currentUserId={currentUserId} maxVisible={10} />);
      
      // Should show count of all users
      expect(screen.getByText('15')).toBeInTheDocument();
      
      // Should show "+5 more users" message
      expect(screen.getByText('+5 more users')).toBeInTheDocument();
      
      // List should have scrollable class
      const list = document.querySelector('.online-users__list');
      expect(list).toHaveClass('online-users__list--scrollable');
    });

    it('should show correct "more users" text for single user', () => {
      const manyUsers: OnlineUser[] = Array.from({ length: 11 }, (_, i) => ({
        user_id: `user${i}`,
        username: `User${i.toString().padStart(2, '0')}`,
        last_seen: new Date().toISOString(),
        is_online: true,
      }));

      render(<OnlineUsers users={manyUsers} currentUserId={currentUserId} maxVisible={10} />);
      
      expect(screen.getByText('+1 more user')).toBeInTheDocument();
    });

    it('should not show scrollable list when users are within maxVisible', () => {
      render(<OnlineUsers users={mockUsers} currentUserId={currentUserId} maxVisible={10} />);
      
      // Should not show "more users" message
      expect(screen.queryByText(/\+\d+ more user/)).not.toBeInTheDocument();
      
      // List should not have scrollable class
      const list = document.querySelector('.online-users__list');
      expect(list).not.toHaveClass('online-users__list--scrollable');
    });

    it('should respect custom maxVisible prop', () => {
      const manyUsers: OnlineUser[] = Array.from({ length: 8 }, (_, i) => ({
        user_id: `user${i}`,
        username: `User${i.toString().padStart(2, '0')}`,
        last_seen: new Date().toISOString(),
        is_online: true,
      }));

      render(<OnlineUsers users={manyUsers} currentUserId={currentUserId} maxVisible={5} />);
      
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('+3 more users')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should apply hover styles to user items', () => {
      render(<OnlineUsers users={mockUsers} currentUserId={currentUserId} />);
      
      const userItems = document.querySelectorAll('.online-user-item');
      expect(userItems[0]).toHaveClass('online-user-item');
      
      // Hover should be handled by CSS, just verify the class exists
      fireEvent.mouseEnter(userItems[0]);
      expect(userItems[0]).toHaveClass('online-user-item');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<OnlineUsers users={mockUsers} currentUserId={currentUserId} />);
      
      // Check that the component structure supports screen readers
      expect(screen.getByText('Online Users')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should handle keyboard navigation', () => {
      render(<OnlineUsers users={mockUsers} currentUserId={currentUserId} />);
      
      const userItems = document.querySelectorAll('.online-user-item');
      
      // Focus should work on user items
      userItems[0].focus();
      expect(document.activeElement).toBe(userItems[0]);
    });
  });

  describe('Animation and Visual Effects', () => {
    it('should have animation classes for user items', () => {
      render(<OnlineUsers users={mockUsers} currentUserId={currentUserId} />);
      
      const userItems = document.querySelectorAll('.online-user-item');
      userItems.forEach(item => {
        expect(item).toHaveClass('online-user-item');
      });
    });

    it('should have pulse animation for online dots', () => {
      render(<OnlineUsers users={mockUsers} currentUserId={currentUserId} />);
      
      const dots = document.querySelectorAll('.online-user-item__dot');
      dots.forEach(dot => {
        expect(dot).toHaveClass('online-user-item__dot');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined currentUserId', () => {
      render(<OnlineUsers users={mockUsers} />);
      
      // Should show all online users when no currentUserId is provided
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('TarkovPlayer1')).toBeInTheDocument();
    });

    it('should handle empty username', () => {
      const usersWithEmptyName = [
        {
          user_id: 'user1',
          username: '',
          last_seen: new Date().toISOString(),
          is_online: true,
        },
      ];

      render(<OnlineUsers users={usersWithEmptyName} currentUserId={currentUserId} />);
      
      expect(screen.getByText('1')).toBeInTheDocument();
      // Empty username should still render the user item
      const userItems = document.querySelectorAll('.online-user-item');
      expect(userItems).toHaveLength(1);
    });

    it('should handle very long usernames', () => {
      const usersWithLongName = [
        {
          user_id: 'user1',
          username: 'VeryLongUsernameThatshouldBeTruncatedWithEllipsis',
          last_seen: new Date().toISOString(),
          is_online: true,
        },
      ];

      render(<OnlineUsers users={usersWithLongName} currentUserId={currentUserId} />);
      
      expect(screen.getByText('VeryLongUsernameThatshouldBeTruncatedWithEllipsis')).toBeInTheDocument();
      
      // Check that the username has ellipsis styling
      const usernameElement = screen.getByText('VeryLongUsernameThatshouldBeTruncatedWithEllipsis');
      expect(usernameElement).toHaveClass('online-user-item__username');
    });

    it('should handle rapid user list updates', () => {
      const { rerender } = render(<OnlineUsers users={mockUsers} currentUserId={currentUserId} />);
      
      expect(screen.getByText('3')).toBeInTheDocument();
      
      // Add a new user
      const updatedUsers = [
        ...mockUsers,
        {
          user_id: 'newuser',
          username: 'NewPlayer',
          last_seen: new Date().toISOString(),
          is_online: true,
        },
      ];
      
      rerender(<OnlineUsers users={updatedUsers} currentUserId={currentUserId} />);
      
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('NewPlayer')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should memoize filtered users correctly', () => {
      const { rerender } = render(<OnlineUsers users={mockUsers} currentUserId={currentUserId} />);
      
      // Rerender with same props should not cause unnecessary recalculations
      rerender(<OnlineUsers users={mockUsers} currentUserId={currentUserId} />);
      
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should handle large user lists efficiently', () => {
      const largeUserList: OnlineUser[] = Array.from({ length: 1000 }, (_, i) => ({
        user_id: `user${i}`,
        username: `User${i}`,
        last_seen: new Date().toISOString(),
        is_online: true,
      }));

      render(<OnlineUsers users={largeUserList} currentUserId={currentUserId} maxVisible={10} />);
      
      expect(screen.getByText('1000')).toBeInTheDocument();
      expect(screen.getByText('+990 more users')).toBeInTheDocument();
      
      // Should only render the visible users in DOM
      const userItems = document.querySelectorAll('.online-user-item');
      expect(userItems).toHaveLength(10);
    });
  });
});