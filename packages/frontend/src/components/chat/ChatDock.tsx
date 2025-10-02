import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ChatWindow } from './ChatWindow';

const CHAT_STATE_KEY = 'chat-dock-open';

export const ChatDock: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true); // Default to open

  // Load chat state from localStorage on mount
  useEffect(() => {
    if (user) {
      try {
        const savedState = localStorage.getItem(CHAT_STATE_KEY);
        if (savedState !== null) {
          setIsOpen(JSON.parse(savedState));
        }
      } catch (error) {
        // localStorage might not be available (SSR, private browsing)
        console.warn('Could not load chat state from localStorage:', error);
      }
    }
  }, [user]);

  // Save chat state to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(CHAT_STATE_KEY, JSON.stringify(isOpen));
      } catch (error) {
        // localStorage might not be available (SSR, private browsing)
        console.warn('Could not save chat state to localStorage:', error);
      }
    }
  }, [isOpen, user]);

  // Don't render if user is not authenticated
  if (!user) return null;

  return (
    <>
      {/* Single Chat Button - Top Right */}
      <div className="fixed top-4 right-4 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-3 rounded-full shadow-lg transition-all duration-200 ${
            isOpen 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
          title={isOpen ? 'Close chat' : 'Open chat'}
        >
          {isOpen ? '✕' : '💬'}
        </button>
      </div>

      {/* Chat Window */}
      <div className={`fixed right-0 top-0 h-full z-30 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="w-80 h-full bg-white shadow-xl">
          <ChatWindow isOpen={isOpen} />
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
