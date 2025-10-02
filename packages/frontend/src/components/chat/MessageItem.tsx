import React from 'react';
import { ChatMessage } from '../../hooks/useChatRealtime';
import { useAvatarUrl } from '../../hooks/useAvatarUrl';
import { useProfile } from '../../hooks/useProfile';

interface MessageItemProps {
  message: ChatMessage;
  onDelete?: (messageId: string) => void;
  onUserClick?: (userId: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  onDelete, 
  onUserClick 
}) => {
  const { data: currentProfile } = useProfile();
  const { avatarUrl, isLoading: avatarLoading } = useAvatarUrl(message.avatar_path);
  const isModerator = currentProfile?.is_moderator || false;
  const isOwnMessage = currentProfile?.id === message.user_id;

  const handleDelete = () => {
    if (isModerator && onDelete) {
      onDelete(message.id);
    }
  };

  const handleUserClick = () => {
    if (onUserClick) {
      onUserClick(message.user_id);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex space-x-3 py-2 px-3 hover:bg-gray-50 transition-colors">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {avatarLoading ? (
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
        ) : (
          <img
            src={avatarUrl || '/default-avatar.svg'}
            alt={`${message.username}'s avatar`}
            className="w-8 h-8 rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/default-avatar.svg';
            }}
          />
        )}
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleUserClick}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
          >
            {message.username}
          </button>
          <span className="text-xs text-gray-500">
            {formatTime(message.created_at)}
          </span>
          {isModerator && (
            <button
              onClick={handleDelete}
              className="text-xs text-red-500 hover:text-red-700 ml-auto"
              title="Delete message"
            >
              🗑️
            </button>
          )}
        </div>
        <p className="text-sm text-gray-900 mt-1 break-words">
          {message.content}
        </p>
      </div>
    </div>
  );
};
