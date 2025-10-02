import React from 'react';
import { useChatRules } from '../../hooks/useChatRules';

interface ChatRulesGateProps {
  onAccept: () => void;
}

const CHAT_RULES = [
  "Be respectful and kind to other users",
  "No spam, excessive caps, or repetitive messages",
  "No offensive language, harassment, or personal attacks",
  "No sharing of personal information or inappropriate content",
  "No advertising or promotion of external services",
  "Follow moderator instructions and warnings",
  "Violations may result in temporary or permanent chat restrictions"
];

export const ChatRulesGate: React.FC<ChatRulesGateProps> = ({ onAccept }) => {
  const { acceptRules, isLoading, error } = useChatRules();

  const handleAccept = async () => {
    try {
      await acceptRules();
      onAccept();
    } catch (err) {
      // Error is handled by the hook
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Chat Rules & Guidelines
      </h3>
      
      <div className="space-y-2 mb-4">
        {CHAT_RULES.map((rule, index) => (
          <div key={index} className="flex items-start space-x-2">
            <span className="text-gray-500 mt-1">•</span>
            <span className="text-sm text-gray-700">{rule}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button
        onClick={handleAccept}
        disabled={isLoading}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Accepting...' : 'I Accept the Chat Rules'}
      </button>
      
      <p className="text-xs text-gray-500 mt-2 text-center">
        You must accept these rules before participating in chat
      </p>
    </div>
  );
};
