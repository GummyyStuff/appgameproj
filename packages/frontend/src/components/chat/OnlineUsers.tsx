import React, { useMemo } from 'react';
import { OnlineUsersProps, OnlineUser } from '../../types/chat';
import './OnlineUsers.css';

/**
 * OnlineUsers component displays a list of currently connected users
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export const OnlineUsers: React.FC<OnlineUsersProps> = ({
  users,
  currentUserId,
  maxVisible = 10,
  className = '',
}) => {
  // Filter out current user and sort by username
  const filteredUsers = useMemo(() => {
    return users
      .filter(user => user.user_id !== currentUserId && user.is_online)
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [users, currentUserId]);

  const userCount = filteredUsers.length;
  const showScrollableList = userCount > maxVisible;
  const displayedUsers = showScrollableList ? filteredUsers.slice(0, maxVisible) : filteredUsers;
  const hiddenUserCount = showScrollableList ? userCount - maxVisible : 0;

  return (
    <div className={`online-users ${className}`}>
      <div className="online-users__header">
        <div className="online-users__title">
          <span className="online-users__icon">👥</span>
          Online Users
        </div>
        <div className="online-users__count">
          <span className="online-users__count-number">{userCount}</span>
        </div>
      </div>

      <div className="online-users__content">
        {userCount === 0 ? (
          <div className="online-users__empty">
            <span className="online-users__empty-text">No other users online</span>
          </div>
        ) : (
          <>
            <div className={`online-users__list ${showScrollableList ? 'online-users__list--scrollable' : ''}`}>
              {displayedUsers.map((user) => (
                <OnlineUserItem
                  key={user.user_id}
                  user={user}
                />
              ))}
            </div>
            
            {hiddenUserCount > 0 && (
              <div className="online-users__more">
                <span className="online-users__more-text">
                  +{hiddenUserCount} more user{hiddenUserCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Individual user item component with online indicator
 */
interface OnlineUserItemProps {
  user: OnlineUser;
}

const OnlineUserItem: React.FC<OnlineUserItemProps> = ({ user }) => {
  return (
    <div className="online-user-item">
      <div className="online-user-item__indicator">
        <div className="online-user-item__dot" />
      </div>
      <div className="online-user-item__username">
        {user.username}
      </div>
    </div>
  );
};

export default OnlineUsers;