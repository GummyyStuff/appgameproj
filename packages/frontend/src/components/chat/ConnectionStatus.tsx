/**
 * Connection Status Component - Shows connection health and error information
 * Requirements: 4.1, 4.2, 4.3, 6.2, 6.3
 */

import React from 'react';
import type { ConnectionStatus, ConnectionHealth, NetworkStatus } from '../../types/chat';
import './ConnectionStatus.css';

interface ConnectionStatusProps {
  /** Current connection status */
  connectionStatus: ConnectionStatus;
  /** Connection health information */
  connectionHealth: ConnectionHealth;
  /** Network status information */
  networkStatus: NetworkStatus;
  /** Function to retry connection */
  onRetry?: () => void;
  /** Function to retry failed messages */
  onRetryMessages?: () => void;
  /** Function to clear message queue */
  onClearQueue?: () => void;
  /** Whether to show detailed information */
  showDetails?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Connection status indicator component
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connectionStatus,
  connectionHealth,
  networkStatus,
  onRetry,
  onRetryMessages,
  onClearQueue,
  showDetails = false,
  className = '',
}) => {
  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return '🟢';
      case 'connecting':
        return '🟡';
      case 'reconnecting':
        return '🔄';
      case 'disconnected':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return `Reconnecting... (${connectionHealth.reconnectAttempt}/${connectionHealth.maxReconnectAttempts})`;
      case 'disconnected':
        return networkStatus.isOnline ? 'Disconnected' : 'Offline';
      default:
        return 'Unknown';
    }
  };

  const getStatusClass = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'connection-status--connected';
      case 'connecting':
        return 'connection-status--connecting';
      case 'reconnecting':
        return 'connection-status--reconnecting';
      case 'disconnected':
        return 'connection-status--disconnected';
      default:
        return 'connection-status--unknown';
    }
  };

  const showRetryButton = connectionStatus === 'disconnected' && networkStatus.isOnline;
  const showQueueInfo = connectionHealth.queuedMessageCount > 0;

  return (
    <div className={`connection-status ${getStatusClass()} ${className}`}>
      <div className="connection-status__main">
        <span className="connection-status__icon" role="img" aria-label="Connection status">
          {getStatusIcon()}
        </span>
        <span className="connection-status__text">{getStatusText()}</span>
        
        {showRetryButton && onRetry && (
          <button
            className="connection-status__retry-btn"
            onClick={onRetry}
            title="Retry connection"
          >
            Retry
          </button>
        )}
      </div>

      {showQueueInfo && (
        <div className="connection-status__queue">
          <span className="connection-status__queue-text">
            {connectionHealth.queuedMessageCount} message{connectionHealth.queuedMessageCount !== 1 ? 's' : ''} queued
          </span>
          
          {connectionStatus === 'connected' && onRetryMessages && (
            <button
              className="connection-status__queue-btn"
              onClick={onRetryMessages}
              title="Retry sending queued messages"
            >
              Send Now
            </button>
          )}
          
          {onClearQueue && (
            <button
              className="connection-status__queue-btn connection-status__queue-btn--clear"
              onClick={onClearQueue}
              title="Clear message queue"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {showDetails && (
        <div className="connection-status__details">
          <div className="connection-status__detail">
            <span className="connection-status__detail-label">Network:</span>
            <span className="connection-status__detail-value">
              {networkStatus.isOnline ? 'Online' : 'Offline'}
              {networkStatus.connectionType && ` (${networkStatus.connectionType})`}
            </span>
          </div>
          
          {connectionHealth.lastConnected && (
            <div className="connection-status__detail">
              <span className="connection-status__detail-label">Last connected:</span>
              <span className="connection-status__detail-value">
                {new Date(connectionHealth.lastConnected).toLocaleTimeString()}
              </span>
            </div>
          )}
          
          {connectionHealth.lastError && (
            <div className="connection-status__detail connection-status__detail--error">
              <span className="connection-status__detail-label">Last error:</span>
              <span className="connection-status__detail-value">
                {connectionHealth.lastError.message}
              </span>
            </div>
          )}
          
          {connectionStatus === 'reconnecting' && (
            <div className="connection-status__detail">
              <span className="connection-status__detail-label">Next attempt in:</span>
              <span className="connection-status__detail-value">
                {Math.round(connectionHealth.nextReconnectDelay / 1000)}s
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;