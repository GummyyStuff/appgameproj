import React from 'react';
import { useChatRules } from '../../hooks/useChatRules';

interface ChatRulesBoxProps {
  onAccept: () => void;
  onDismiss: () => void;
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

export const ChatRulesBox: React.FC<ChatRulesBoxProps> = ({ onAccept, onDismiss }) => {
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
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-blue-900">
          Chat Rules & Guidelines
        </h4>
        <button
          onClick={onDismiss}
          className="text-blue-400 hover:text-blue-600 text-sm"
        >
          ✕
        </button>
      </div>

      {/* Rules list - compact */}
      <div className="space-y-1 mb-3">
        {CHAT_RULES.slice(0, 4).map((rule, index) => (
          <div key={index} className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5 text-xs">•</span>
            <span className="text-xs text-blue-800">{rule}</span>
          </div>
        ))}
        {CHAT_RULES.length > 4 && (
          <div className="text-xs text-blue-600 italic">
            + {CHAT_RULES.length - 4} more rules...
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex space-x-2">
        <button
          onClick={handleAccept}
          disabled={isLoading}
          className="flex-1 bg-blue-600 text-white text-xs py-2 px-3 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Accepting...' : 'I Accept'}
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
        >
          Maybe Later
        </button>
      </div>
      
      <p className="text-xs text-blue-600 mt-2 text-center">
        You must accept these rules before participating in chat
      </p>
    </div>
  );
};
