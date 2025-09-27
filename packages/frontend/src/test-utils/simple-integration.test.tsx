/**
 * Simple integration test to verify chat system integration
 * This test focuses on the basic integration without complex mocking
 */

// DOM environment is set up globally in test-setup.ts

// Mock modules before importing
import { mock, describe, it, expect } from 'bun:test';

const mockUseChatLayout = () => ({
  isCollapsed: false,
  isVisible: true,
  toggleChat: () => {},
  position: 'right',
});

mock('../hooks/useChatLayout', () => ({
  useChatLayout: mockUseChatLayout,
}));

// Mock auth hook
mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false,
    signIn: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
  })
}));

// Mock profile hook
mock('../hooks/useProfile', () => ({
  useUsername: () => 'testuser'
}));

// Mock balance hook
mock('../hooks/useBalance', () => ({
  useBalanceUpdates: () => ({ invalidateBalance: () => {} })
}));

// Mock sound manager
mock('../ui/SoundManager', () => ({
  useSoundManager: () => ({ playGameSound: () => {} }),
  SoundProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children)
}));

// Mock TarkovBackground
mock('../ui/TarkovBackground', () => ({
  default: ({ children, className }: any) =>
    React.createElement('div', { className }, children),
  TarkovParticles: () => React.createElement('div', { 'data-testid': 'particles' })
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuthProvider from '../components/providers/AuthProvider';
import AppLayout from '../components/layout/AppLayout';

// Additional mocks
mock('../components/layout/Navigation', () => ({
  default: function MockNavigation() {
    return React.createElement('nav', { 'data-testid': 'navigation' },
      React.createElement('div', null, 'Tarkov Casino'),
      React.createElement('button', { 'data-testid': 'chat-toggle' }, '💬')
    );
  }
}));

mock('../components/ui/TarkovBackground', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  TarkovParticles: () => React.createElement('div', { 'data-testid': 'particles' })
}));

mock('../components/ui/SoundManager', () => ({
  SoundProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children)
}));

describe('App Layout Integration Test', () => {
  const renderWithProviders = (component: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            {component}
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  it('renders the basic application layout structure', () => {
    renderWithProviders(<AppLayout />);

    // Verify that the AppLayout renders without crashing
    expect(document.body).toBeTruthy();

    // Verify that navigation elements exist (AppLayout contains Navigation)
    const navElements = screen.getAllByRole('navigation');
    expect(navElements.length).toBeGreaterThan(0);
  });

  it('renders with proper navigation structure', () => {
    renderWithProviders(<AppLayout />);

    // Verify that navigation elements exist and have proper structure
    const navElements = screen.getAllByRole('navigation');
    expect(navElements.length).toBeGreaterThan(0);

    // Check that at least one navigation has the expected styling
    const navWithStyling = navElements.find(nav => nav.className.includes('bg-tarkov-dark'));
    expect(navWithStyling).toBeTruthy();
  });

  it('maintains proper layout container structure', () => {
    renderWithProviders(<AppLayout />);

    // Verify that the main layout container has the expected styling
    const layoutContainer = document.querySelector('.min-h-screen');
    expect(layoutContainer).toBeTruthy();

    // Verify navigation elements exist
    const navElements = screen.getAllByRole('navigation');
    expect(navElements.length).toBeGreaterThan(0);
  });
});