/**
 * Realtime Diagnostic Component
 * 
 * Helps diagnose Appwrite realtime connection issues
 */

import { useEffect, useState } from 'react';
import { appwriteClient } from '../../lib/appwrite';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID!;
const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT!;
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID!;

interface DiagnosticLog {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

export function RealtimeDiagnostic() {
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string>('Never');
  const [wsConnected, setWsConnected] = useState(false);

  const addLog = (type: DiagnosticLog['type'], message: string) => {
    const log: DiagnosticLog = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    };
    setLogs(prev => [...prev, log]);
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  useEffect(() => {
    addLog('info', 'Starting realtime diagnostic...');
    addLog('info', `Endpoint: ${ENDPOINT}`);
    addLog('info', `Project ID: ${PROJECT_ID}`);
    addLog('info', `Database ID: ${DATABASE_ID}`);

    // Check if we can access the client
    try {
      const client = appwriteClient;
      addLog('success', 'Appwrite client initialized');
      
      // Try to subscribe to a test channel
      const channel = `databases.${DATABASE_ID}.collections.stock_market_state.documents.current`;
      addLog('info', `Subscribing to channel: ${channel}`);

      const unsubscribe = client.subscribe(
        channel,
        (response: any) => {
          addLog('success', `Received update #${updateCount + 1}`);
          console.log('Full response:', response);
          
          if (response.events) {
            addLog('info', `Events: ${response.events.join(', ')}`);
          }
          
          if (response.payload) {
            addLog('success', `Payload received: ${JSON.stringify(response.payload).substring(0, 100)}...`);
          }
          
          setUpdateCount(prev => prev + 1);
          setLastUpdate(new Date().toLocaleTimeString());
          setIsConnected(true);
        }
      );

      // Check WebSocket connection after a delay
      setTimeout(() => {
        if (updateCount === 0) {
          addLog('warning', 'No updates received yet. This could mean:');
          addLog('warning', '1. Backend service is not running');
          addLog('warning', '2. No price updates are being generated');
          addLog('warning', '3. WebSocket connection failed');
          addLog('warning', '4. Wrong channel or database ID');
        }
      }, 5000);

      return () => {
        addLog('info', 'Cleaning up subscription...');
        unsubscribe();
      };
    } catch (error) {
      addLog('error', `Failed to subscribe: ${error}`);
    }
  }, []);

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[600px] bg-tarkov-dark border-2 border-tarkov-accent rounded-lg shadow-2xl z-50 overflow-hidden">
      <div className="bg-tarkov-accent text-tarkov-dark p-3 font-bold flex items-center justify-between">
        <span>🔍 Realtime Diagnostic</span>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-tarkov-darker p-2 rounded">
            <div className="text-tarkov-text-secondary text-xs">Updates</div>
            <div className="text-tarkov-accent font-bold">{updateCount}</div>
          </div>
          <div className="bg-tarkov-darker p-2 rounded">
            <div className="text-tarkov-text-secondary text-xs">Last Update</div>
            <div className="text-tarkov-accent font-bold text-xs">{lastUpdate}</div>
          </div>
        </div>

        {/* Config */}
        <div className="bg-tarkov-darker p-2 rounded text-xs">
          <div className="text-tarkov-text-secondary mb-1">Configuration:</div>
          <div className="text-tarkov-text font-mono break-all">
            DB: {DATABASE_ID}
          </div>
          <div className="text-tarkov-text font-mono break-all">
            Channel: databases.{DATABASE_ID}.collections.stock_market_state.documents.current
          </div>
        </div>

        {/* Logs */}
        <div className="space-y-1">
          <div className="text-tarkov-text-secondary text-xs font-bold">Logs:</div>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`text-xs p-2 rounded font-mono ${
                  log.type === 'success' ? 'bg-green-900/30 text-green-400' :
                  log.type === 'error' ? 'bg-red-900/30 text-red-400' :
                  log.type === 'warning' ? 'bg-yellow-900/30 text-yellow-400' :
                  'bg-tarkov-darker text-tarkov-text'
                }`}
              >
                <span className="text-tarkov-text-secondary">[{log.timestamp}]</span> {log.message}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-tarkov-accent text-tarkov-dark px-3 py-2 rounded font-semibold hover:bg-tarkov-accent/90"
          >
            🔄 Reload Page
          </button>
          <button
            onClick={() => {
              setLogs([]);
              setUpdateCount(0);
              setIsConnected(false);
            }}
            className="w-full bg-tarkov-secondary text-tarkov-text px-3 py-2 rounded font-semibold hover:bg-tarkov-secondary/90"
          >
            🗑️ Clear Logs
          </button>
        </div>
      </div>
    </div>
  );
}

