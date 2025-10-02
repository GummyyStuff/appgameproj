import React, { useState, useRef, useEffect } from 'react';
import { useChatRealtime, ChatMessage } from '../../hooks/useChatRealtime';
import { useChatRules } from '../../hooks/useChatRules';
import { useProfile } from '../../hooks/useProfile';
import { MessageItem } from './MessageItem';
import { UserQuickStatsPopover } from './UserQuickStatsPopover';
import { ChatRulesBox } from './ChatRulesBox';

interface ChatWindowProps {
  isOpen: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen }) => {
  const { messages, sendMessage, deleteMessage, error, clearError, cooldownState, formatRemainingTime } = useChatRealtime();
  const { hasAcceptedRules } = useChatRules();
  const { data: profile } = useProfile();
  const [messageInput, setMessageInput] = useState('');
  const [showRulesBox, setShowRulesBox] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    userId: string;
    username: string;
    avatarPath: string | null;
    position: { x: number; y: number };
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Auto-scroll to bottom when chat opens
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && hasAcceptedRules && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, hasAcceptedRules]);

  const handleInputFocus = () => {
    if (!hasAcceptedRules) {
      setShowRulesBox(true);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !hasAcceptedRules) return;

    try {
      await sendMessage(messageInput);
      setMessageInput('');
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleUserClick = (userId: string, event: React.MouseEvent) => {
    const message = messages.find(m => m.user_id === userId);
    if (!message) return;

    const rect = event.currentTarget.getBoundingClientRect();
    setSelectedUser({
      userId,
      username: message.username,
      avatarPath: message.avatar_path,
      position: {
        x: rect.left,
        y: rect.top - 10
      }
    });
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteMessage(messageId);
      } catch (err) {
        // Error is handled by the hook
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
        <div className="flex items-center space-x-2">
          {profile?.is_moderator && (
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
              Moderator
            </span>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              onDelete={profile?.is_moderator ? handleDeleteMessage : undefined}
              onUserClick={handleUserClick}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={handleInputFocus}
            onClick={handleInputFocus}
            placeholder={
              cooldownState.isOnCooldown 
                ? `Cooldown: ${formatRemainingTime(cooldownState.remainingTime)}`
                : hasAcceptedRules 
                  ? "Type a message..." 
                  : "Click to accept chat rules..."
            }
            maxLength={500}
            disabled={!hasAcceptedRules || cooldownState.isOnCooldown}
            className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 ${
              hasAcceptedRules && !cooldownState.isOnCooldown
                ? 'border-gray-300 bg-white' 
                : 'border-gray-300 bg-gray-100 cursor-not-allowed'
            }`}
          />
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || !hasAcceptedRules || cooldownState.isOnCooldown}
            className={`px-4 py-2 rounded-md transition-colors ${
              cooldownState.isOnCooldown
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {cooldownState.isOnCooldown ? formatRemainingTime(cooldownState.remainingTime) : 'Send'}
          </button>
        </div>
        
        {/* Rules box - Twitch style */}
        {showRulesBox && !hasAcceptedRules && (
          <div className="mt-3">
            <ChatRulesBox 
              onAccept={() => {
                setShowRulesBox(false);
              }}
              onDismiss={() => setShowRulesBox(false)}
            />
          </div>
        )}
        
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">
            {messageInput.length}/500 characters
          </span>
          <span className="text-xs text-gray-400">
            {cooldownState.isOnCooldown 
              ? `Cooldown: ${formatRemainingTime(cooldownState.remainingTime)}`
              : hasAcceptedRules 
                ? 'Press Enter to send' 
                : 'Accept rules to chat'
            }
          </span>
        </div>
      </div>

      {/* User stats popover */}
      {selectedUser && (
        <UserQuickStatsPopover
          userId={selectedUser.userId}
          username={selectedUser.username}
          avatarPath={selectedUser.avatarPath}
          isOpen={true}
          onClose={() => setSelectedUser(null)}
          position={selectedUser.position}
        />
      )}
    </div>
  );
};
