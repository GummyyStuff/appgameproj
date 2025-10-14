/**
 * Realtime Connection Test Component
 * 
 * Simple test to verify Appwrite realtime is working
 */

import { useEffect, useState } from 'react';
import { appwriteClient } from './lib/appwrite';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID!;

export function RealtimeTest() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('Never');
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => {
    console.log('🔌 Testing Realtime Connection...');
    
    const channel = `databases.${DATABASE_ID}.collections.stock_market_state.documents.current`;
    
    const unsubscribe = appwriteClient.subscribe(
      channel,
      (response: any) => {
        console.log('✅ Realtime update received:', response);
        setIsConnected(true);
        setLastUpdate(new Date().toLocaleTimeString());
        setUpdateCount(prev => prev + 1);
      }
    );

    return () => {
      console.log('🔌 Unsubscribing from realtime...');
      unsubscribe();
    };
  }, []);

  return (
    <div className="p-4 bg-tarkov-dark rounded-lg border border-tarkov-border">
      <h3 className="text-lg font-semibold text-tarkov-text mb-4">
        Realtime Connection Test
      </h3>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-tarkov-text">
            Status: {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="text-tarkov-text-secondary">
          Last Update: {lastUpdate}
        </div>
        
        <div className="text-tarkov-text-secondary">
          Update Count: {updateCount}
        </div>
      </div>
    </div>
  );
}

