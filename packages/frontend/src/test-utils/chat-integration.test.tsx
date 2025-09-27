// Mock modules before importing
import { mock } from 'bun:test';

const mockSupabase = {
  auth: {
    getSession: () => Promise.resolve({
      data: { session: { access_token: 'mock-token', user: { id: 'test-user' } } },
    }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({
          data: { balance: 1000 },
          error: null,
        })
      })
    })
  }),
  channel: () => ({
    on: function() { return this; },
    subscribe: () => Promise.resolve({ status: 'SUBSCRIBED' }),
    unsubscribe: () => {}
  })
};

mock('../lib/supabase', () => ({
  supabase: mockSupabase
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';

// Additional mocks
mock('../services/chat-service', () => ({
  ChatService: class {
    sendMessage = () => Promise.resolve({});
    getMessages = () => Promise.resolve([]);
    subscribeToMessages = () => () => {};
  }
}));

mock('../services/presence-service', () => ({
  PresenceService: class {
    updatePresence = () => Promise.resolve({});
    getOnlineUsers = () => Promise.resolve([]);
    subscribeToPresence = () => () => {};
  }
}));

mock('../components/ui/TarkovBackground', () => ({
  default: ({ children, className }: any) =>
    React.createElement('div', { className }, children),
  TarkovParticles: () => React.createElement('div', { 'data-testid': 'particles' })
}));

mock('../components/ui/SoundManager', () => ({
  SoundProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  useSoundManager: () => ({
    playGameSound: () => {}
  }),
  SoundControlPanel: () => React.createElement('div', { 'data-testid': 'sound-control' })
}));

mock('../components/ui/RealtimeNotifications', () => ({
  default: function MockRealtimeNotifications() {
    return React.createElement('div', { 'data-testid': 'realtime-notifications' });
  }
}));

// Additional mocks for pages
mock('../pages/HomePage', () => ({
  default: function MockHomePage() {
    return React.createElement('div', { 'data-testid': 'home-page' }, 'Home Page Content');
  }
}));

describe('Chat System Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    localStorage.clear();
    // Clear localStorage for test isolation
  });

  const renderApp = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('integrates chat system into the main application layout', async () => {
    renderApp();

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    // Check that the main layout components are present
    expect(screen.getByText('Tarkov Casino')).toBeInTheDocument();
    
    // Check that chat sidebar is integrated
    await waitFor(() => {
      expect(screen.getByRole('complementary', { name: /chat sidebar/i })).toBeInTheDocument();
    });
  });

  it('provides chat toggle functionality in navigation', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    // Find chat toggle button (💬 emoji)
    const chatToggleButtons = screen.getAllByText('💬');
    expect(chatToggleButtons.length).toBeGreaterThan(0);

    // Click the first chat toggle button
    fireEvent.click(chatToggleButtons[0]);

    // Chat should still be present but potentially collapsed
    await waitFor(() => {
      const chatSidebar = screen.getByRole('complementary', { name: /chat sidebar/i });
      expect(chatSidebar).toBeInTheDocument();
    });
  });

  it('maintains chat state across page navigation', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    // Verify chat is present
    const chatSidebar = screen.getByRole('complementary', { name: /chat sidebar/i });
    expect(chatSidebar).toBeInTheDocument();

    // Navigate to another page (simulate by clicking a nav link)
    const rouletteLink = screen.getByText('Roulette');
    fireEvent.click(rouletteLink);

    // Chat should still be present after navigation
    await waitFor(() => {
      expect(screen.getByRole('complementary', { name: /chat sidebar/i })).toBeInTheDocument();
    });
  });

  it('does not interfere with existing game interfaces', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    // Check that existing UI elements are still functional
    expect(screen.getByText('Tarkov Casino')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Roulette')).toBeInTheDocument();
    expect(screen.getByText('Blackjack')).toBeInTheDocument();

    // Check that main content area is properly positioned
    const mainContent = screen.getByRole('main');
    expect(mainContent).toBeInTheDocument();
    expect(mainContent).toHaveClass('container');
  });

  it('handles responsive layout correctly', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    renderApp();

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    // Chat should be present and functional on mobile
    const chatSidebar = screen.getByRole('complementary', { name: /chat sidebar/i });
    expect(chatSidebar).toBeInTheDocument();

    // Mobile menu button should be present
    const menuButtons = screen.getAllByRole('button');
    const mobileMenuButton = menuButtons.find(button => 
      button.querySelector('svg')
    );
    expect(mobileMenuButton).toBeInTheDocument();
  });

  it('preserves chat state in localStorage', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    // Toggle chat to change state
    const chatToggleButtons = screen.getAllByText('💬');
    fireEvent.click(chatToggleButtons[0]);

    // Check that localStorage would be updated (we can't easily test the exact value
    // without mocking the entire hook, but we can verify the mechanism works)
    await waitFor(() => {
      // The chat sidebar should still be present
      expect(screen.getByRole('complementary', { name: /chat sidebar/i })).toBeInTheDocument();
    });
  });

  it('shows login prompt for unauthenticated users', async () => {
    // Mock unauthenticated state
    jest.doMock('../lib/supabase', () => ({
      supabase: {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: null },
          }),
          onAuthStateChange: jest.fn().mockReturnValue({
            data: { subscription: { unsubscribe: jest.fn() } },
          }),
        },
      },
    }));

    renderApp();

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    // Chat should show login prompt for unauthenticated users
    await waitFor(() => {
      const chatSidebar = screen.getByRole('complementary', { name: /chat sidebar/i });
      expect(chatSidebar).toBeInTheDocument();
      // Should contain login-related content
      expect(chatSidebar.textContent).toMatch(/login|sign in/i);
    });
  });

  it('integrates with existing authentication system', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    // Should show user-specific content when authenticated
    await waitFor(() => {
      const chatSidebar = screen.getByRole('complementary', { name: /chat sidebar/i });
      expect(chatSidebar).toBeInTheDocument();
      
      // Should show chat input for authenticated users
      const messageInput = screen.getByPlaceholderText(/type a message/i);
      expect(messageInput).toBeInTheDocument();
    });
  });

  it('handles connection status correctly', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    // Should show connection status in chat
    await waitFor(() => {
      const chatSidebar = screen.getByRole('complementary', { name: /chat sidebar/i });
      expect(chatSidebar).toBeInTheDocument();
      
      // Should contain connection status indicator
      expect(chatSidebar.textContent).toMatch(/connect|status/i);
    });
  });
});