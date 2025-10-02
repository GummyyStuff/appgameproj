import React from 'react';
import { ChatRulesBox } from './ChatRulesBox';

// Test component to verify ChatRulesBox works
export const ChatRulesTest: React.FC = () => {
  const [showBox, setShowBox] = React.useState(false);

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Chat Rules Test</h2>
      
      <button
        onClick={() => setShowBox(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Show Rules Box
      </button>

      {showBox && (
        <div className="mt-4 max-w-md">
          <ChatRulesBox
            onAccept={() => {
              console.log('Rules accepted!');
              setShowBox(false);
            }}
            onDismiss={() => {
              console.log('Rules dismissed');
              setShowBox(false);
            }}
          />
        </div>
      )}
    </div>
  );
};
