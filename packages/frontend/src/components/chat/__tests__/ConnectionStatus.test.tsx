/**
 * Connection Status Component Tests
 * Requirements: 4.1, 4.2, 4.3, 6.2, 6.3
 */

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ConnectionStatus } from '../ConnectionStatus';
import type { ConnectionHealth, NetworkStatus } from '../../../types/chat';

describe('ConnectionStatus', () => {
  afterEach(() => {
    cleanup();
  });

  const mockConnectionHealth: ConnectionHealth = {
    status: 'connected',
    lastConnected: '2023-01-01T12:00:00Z',
    reconnectAttempt: 0,
    maxReconnectAttempts: 5,
    nextReconnectDelay: 1000,
    offlineQueueEnabled: true,
    queuedMessageCount: 0,
  };

  const mockNetworkStatus: NetworkStatus = {
    isOnline: true,
    connectionType: '4g',
    effectiveBandwidth: 10,
    rtt: 50,
  };

  describe('connection status display', () => {
    it('should display connected status correctly', () => {
      render(
        <ConnectionStatus
          connectionStatus="connected"
          connectionHealth={mockConnectionHealth}
          networkStatus={mockNetworkStatus}
        />
      );

      expect(screen.getByText('Connected')).toBeDefined();
      expect(screen.getByLabelText('Connection status')).toHaveTextContent('🟢');
    });

    it('should display connecting status correctly', () => {
      render(
        <ConnectionStatus
          connectionStatus="connecting"
          connectionHealth={{ ...mockConnectionHealth, status: 'connecting' }}
          networkStatus={mockNetworkStatus}
        />
      );

      expect(screen.getByText('Connecting...')).toBeDefined();
      expect(screen.getByLabelText('Connection status')).toHaveTextContent('🟡');
    });

    it('should display reconnecting status with attempt count', () => {
      const reconnectingHealth = {
        ...mockConnectionHealth,
        status: 'reconnecting' as const,
        reconnectAttempt: 2,
        maxReconnectAttempts: 5,
      };

      render(
        <ConnectionStatus
          connectionStatus="reconnecting"
          connectionHealth={reconnectingHealth}
          networkStatus={mockNetworkStatus}
        />
      );

      expect(screen.getByText('Reconnecting... (2/5)')).toBeDefined();
      expect(screen.getByLabelText('Connection status')).toHaveTextContent('🔄');
    });

    it('should display disconnected status correctly', () => {
      render(
        <ConnectionStatus
          connectionStatus="disconnected"
          connectionHealth={{ ...mockConnectionHealth, status: 'disconnected' }}
          networkStatus={mockNetworkStatus}
        />
      );

      expect(screen.getByText('Disconnected')).toBeDefined();
      expect(screen.getByLabelText('Connection status')).toHaveTextContent('🔴');
    });

    it('should display offline status when network is offline', () => {
      render(
        <ConnectionStatus
          connectionStatus="disconnected"
          connectionHealth={{ ...mockConnectionHealth, status: 'disconnected' }}
          networkStatus={{ ...mockNetworkStatus, isOnline: false }}
        />
      );

      expect(screen.getByText('Offline')).toBeDefined();
    });
  });

  describe('retry functionality', () => {
    it('should show retry button when disconnected and online', () => {
      const onRetry = vi.fn();

      render(
        <ConnectionStatus
          connectionStatus="disconnected"
          connectionHealth={{ ...mockConnectionHealth, status: 'disconnected' }}
          networkStatus={mockNetworkStatus}
          onRetry={onRetry}
        />
      );

      const retryButton = screen.getByTitle('Retry connection');
      expect(retryButton).toBeDefined();

      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should not show retry button when offline', () => {
      const onRetry = vi.fn();

      render(
        <ConnectionStatus
          connectionStatus="disconnected"
          connectionHealth={{ ...mockConnectionHealth, status: 'disconnected' }}
          networkStatus={{ ...mockNetworkStatus, isOnline: false }}
          onRetry={onRetry}
        />
      );

      expect(screen.queryByTitle('Retry connection')).toBeNull();
    });

    it('should not show retry button when connected', () => {
      const onRetry = vi.fn();

      render(
        <ConnectionStatus
          connectionStatus="connected"
          connectionHealth={mockConnectionHealth}
          networkStatus={mockNetworkStatus}
          onRetry={onRetry}
        />
      );

      expect(screen.queryByTitle('Retry connection')).toBeNull();
    });
  });

  describe('message queue display', () => {
    it('should show queued message count', () => {
      const healthWithQueue = {
        ...mockConnectionHealth,
        queuedMessageCount: 3,
      };

      render(
        <ConnectionStatus
          connectionStatus="disconnected"
          connectionHealth={healthWithQueue}
          networkStatus={mockNetworkStatus}
        />
      );

      expect(screen.getByText('3 messages queued')).toBeDefined();
    });

    it('should show singular message text for one message', () => {
      const healthWithQueue = {
        ...mockConnectionHealth,
        queuedMessageCount: 1,
      };

      render(
        <ConnectionStatus
          connectionStatus="disconnected"
          connectionHealth={healthWithQueue}
          networkStatus={mockNetworkStatus}
        />
      );

      expect(screen.getByText('1 message queued')).toBeDefined();
    });

    it('should show retry messages button when connected and has queued messages', () => {
      const onRetryMessages = vi.fn();
      const healthWithQueue = {
        ...mockConnectionHealth,
        queuedMessageCount: 2,
      };

      render(
        <ConnectionStatus
          connectionStatus="connected"
          connectionHealth={healthWithQueue}
          networkStatus={mockNetworkStatus}
          onRetryMessages={onRetryMessages}
        />
      );

      const retryButton = screen.getByTitle('Retry sending queued messages');
      expect(retryButton).toBeDefined();

      fireEvent.click(retryButton);
      expect(onRetryMessages).toHaveBeenCalledTimes(1);
    });

    it('should show clear queue button', () => {
      const onClearQueue = vi.fn();
      const healthWithQueue = {
        ...mockConnectionHealth,
        queuedMessageCount: 2,
      };

      render(
        <ConnectionStatus
          connectionStatus="disconnected"
          connectionHealth={healthWithQueue}
          networkStatus={mockNetworkStatus}
          onClearQueue={onClearQueue}
        />
      );

      const clearButton = screen.getByTitle('Clear message queue');
      expect(clearButton).toBeDefined();

      fireEvent.click(clearButton);
      expect(onClearQueue).toHaveBeenCalledTimes(1);
    });

    it('should not show queue info when no messages are queued', () => {
      render(
        <ConnectionStatus
          connectionStatus="connected"
          connectionHealth={mockConnectionHealth}
          networkStatus={mockNetworkStatus}
        />
      );

      expect(screen.queryByText(/messages? queued/)).toBeNull();
    });
  });

  describe('detailed information', () => {
    it('should show detailed information when showDetails is true', () => {
      const healthWithError = {
        ...mockConnectionHealth,
        status: 'disconnected' as const,
        lastError: {
          type: 'connection_failed' as const,
          message: 'Network timeout',
          timestamp: '2023-01-01T12:05:00Z',
        },
      };

      render(
        <ConnectionStatus
          connectionStatus="disconnected"
          connectionHealth={healthWithError}
          networkStatus={mockNetworkStatus}
          showDetails={true}
        />
      );

      expect(screen.getByText('Network:')).toBeDefined();
      expect(screen.getByText('Online (4g)')).toBeDefined();
      expect(screen.getByText('Last connected:')).toBeDefined();
      expect(screen.getByText('Last error:')).toBeDefined();
      expect(screen.getByText('Network timeout')).toBeDefined();
    });

    it('should show next reconnection delay when reconnecting', () => {
      const reconnectingHealth = {
        ...mockConnectionHealth,
        status: 'reconnecting' as const,
        nextReconnectDelay: 5000,
      };

      render(
        <ConnectionStatus
          connectionStatus="reconnecting"
          connectionHealth={reconnectingHealth}
          networkStatus={mockNetworkStatus}
          showDetails={true}
        />
      );

      expect(screen.getByText('Next attempt in:')).toBeDefined();
      expect(screen.getByText('5s')).toBeDefined();
    });

    it('should not show detailed information when showDetails is false', () => {
      render(
        <ConnectionStatus
          connectionStatus="disconnected"
          connectionHealth={mockConnectionHealth}
          networkStatus={mockNetworkStatus}
          showDetails={false}
        />
      );

      expect(screen.queryByText('Network:')).toBeNull();
    });

    it('should handle missing optional network information', () => {
      const basicNetworkStatus: NetworkStatus = {
        isOnline: true,
      };

      render(
        <ConnectionStatus
          connectionStatus="connected"
          connectionHealth={mockConnectionHealth}
          networkStatus={basicNetworkStatus}
          showDetails={true}
        />
      );

      expect(screen.getByText('Online')).toBeDefined();
      expect(screen.queryByText('(4g)')).toBeNull();
    });
  });

  describe('CSS classes', () => {
    it('should apply correct status classes', () => {
      const { container } = render(
        <ConnectionStatus
          connectionStatus="connected"
          connectionHealth={mockConnectionHealth}
          networkStatus={mockNetworkStatus}
        />
      );

      expect(container.firstChild?.className).toContain('connection-status--connected');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ConnectionStatus
          connectionStatus="connected"
          connectionHealth={mockConnectionHealth}
          networkStatus={mockNetworkStatus}
          className="custom-class"
        />
      );

      expect(container.firstChild?.className).toContain('custom-class');
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      const { container } = render(
        <ConnectionStatus
          connectionStatus="connected"
          connectionHealth={mockConnectionHealth}
          networkStatus={mockNetworkStatus}
        />
      );

      const statusIcon = container.querySelector('[aria-label="Connection status"]');
      expect(statusIcon).toBeDefined();
      expect(statusIcon?.textContent).toBe('🟢');
    });

    it('should have proper button titles for screen readers', () => {
      const onRetry = vi.fn();
      const onClearQueue = vi.fn();
      
      const healthWithQueue = {
        ...mockConnectionHealth,
        status: 'disconnected' as const,
        queuedMessageCount: 2,
      };

      const { container } = render(
        <ConnectionStatus
          connectionStatus="disconnected"
          connectionHealth={healthWithQueue}
          networkStatus={mockNetworkStatus}
          onRetry={onRetry}
          onClearQueue={onClearQueue}
        />
      );

      const retryButton = container.querySelector('[title="Retry connection"]');
      const clearButton = container.querySelector('[title="Clear message queue"]');
      
      expect(retryButton).toBeDefined();
      expect(clearButton).toBeDefined();
    });
  });
});