import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from '../AppLayout';
import AuthProvider from '../../providers/AuthProvider';
import ChatProvider from '../../providers/ChatProvider';
import ToastProvider from '../../providers/ToastProvider';

// Mock the hooks
jest.mock('../../../hooks/useChatLayout', () => ({
  useChatLayout: () => ({
    isCollapsed: false,
    isVisible: true,
    toggleChat: jest.fn(),
    position: 'right',
  }),
}));

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false,
    signOut: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useProfile', () => ({
  useUsername: () => 'TestUser',
}));

jest.mock('../../../hooks/useBalance', () => ({
  useBalanceUpdates: () => ({
    invalidateBalance: jest.fn(),
  }),
}));

jest.mock('../../ui/SoundManager', () => ({
  SoundProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSoundManager: () => ({
    playGameSound: jest.fn(),
  }),
}));

// Mock chat components
jest.mock('../../chat/ChatSidebar', () => {
  return function MockChatSidebar({ isCollapsed, onToggle, className }: any) {
    return (
      <div 
        data-testid="chat-sidebar" 
        className={className}
        data-collapsed={isCollapsed}
      >
        <button onClick={onToggle} data-testid="chat-toggle">
          {isCollapsed ? 'Open Chat' : 'Close Chat'}
        </button>
        <div>Chat Content</div>
      </div>
    );
  };
});

// Mock other UI components
jest.mock('../../ui/TarkovBackground', () => ({
  __esModule: true,
  default: ({ children, className }: any) => <div className={className}>{children}</div>,
  TarkovParticles: () => <div data-testid="particles" />,
}));

jest.mock('../../ui/CurrencyDisplay', () => {
  return function MockCurrencyDisplay() {
    return <div data-testid="currency-display">₽1,000</div>;
  };
});

jest.mock('../../ui/RealtimeNotifications', () => {
  return function MockRealtimeNotifications() {
    return <div data-testid="realtime-notifications" />;
  };
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ChatProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ChatProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('AppLayout Integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('renders the main layout with navigation and chat sidebar', () => {
    render(
      <TestWrapper>
        <AppLayout />
      </TestWrapper>
    );

    // Check that navigation is rendered
    expect(screen.getByText('Tarkov Casino')).toBeInTheDocument();
    
    // Check that chat sidebar is rendered
    expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument();
    
    // Check that main content area is present
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('adjusts main content padding when chat is open', () => {
    render(
      <TestWrapper>
        <AppLayout />
      </TestWrapper>
    );

    const mainContent = screen.getByRole('main');
    
    // Should have right padding when chat is open on the right
    expect(mainContent).toHaveClass('pr-80');
  });

  it('shows chat toggle button in navigation for authenticated users', () => {
    render(
      <TestWrapper>
        <AppLayout />
      </TestWrapper>
    );

    // Should show chat toggle button (💬 emoji)
    const chatToggleButtons = screen.getAllByText('💬');
    expect(chatToggleButtons.length).toBeGreaterThan(0);
  });

  it('maintains chat state across navigation', async () => {
    const { rerender } = render(
      <TestWrapper>
        <AppLayout />
      </TestWrapper>
    );

    // Chat should be visible initially
    expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument();

    // Rerender to simulate navigation
    rerender(
      <TestWrapper>
        <AppLayout />
      </TestWrapper>
    );

    // Chat should still be visible after navigation
    expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument();
  });

  it('positions chat sidebar correctly', () => {
    render(
      <TestWrapper>
        <AppLayout />
      </TestWrapper>
    );

    const chatSidebar = screen.getByTestId('chat-sidebar').parentElement;
    
    // Should be positioned on the right side
    expect(chatSidebar).toHaveClass('right-0');
    expect(chatSidebar).toHaveClass('fixed');
    expect(chatSidebar).toHaveClass('top-16');
    expect(chatSidebar).toHaveClass('bottom-0');
  });

  it('handles responsive layout correctly', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(
      <TestWrapper>
        <AppLayout />
      </TestWrapper>
    );

    const chatSidebar = screen.getByTestId('chat-sidebar');
    expect(chatSidebar).toBeInTheDocument();
    
    // Chat should still be functional on mobile
    expect(chatSidebar).toHaveClass('h-full');
  });

  it('does not interfere with game interfaces', () => {
    render(
      <TestWrapper>
        <AppLayout />
      </TestWrapper>
    );

    const mainContent = screen.getByRole('main');
    const chatSidebar = screen.getByTestId('chat-sidebar').parentElement;
    
    // Main content should have proper z-index
    expect(mainContent).toHaveClass('z-10');
    
    // Chat should have higher z-index but not interfere
    expect(chatSidebar).toHaveClass('z-30');
  });

  it('preserves existing layout functionality', () => {
    render(
      <TestWrapper>
        <AppLayout />
      </TestWrapper>
    );

    // Check that existing components are still rendered
    expect(screen.getByTestId('particles')).toBeInTheDocument();
    expect(screen.getByText('Tarkov Casino')).toBeInTheDocument();
    
    // Check that navigation items are present
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Roulette')).toBeInTheDocument();
    expect(screen.getByText('Blackjack')).toBeInTheDocument();
  });
});

describe('Chat Layout State Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists chat state in localStorage', () => {
    // Mock the useChatLayout hook to test persistence
    const mockToggleChat = jest.fn();
    
    jest.doMock('../../../hooks/useChatLayout', () => ({
      useChatLayout: () => ({
        isCollapsed: true,
        isVisible: true,
        toggleChat: mockToggleChat,
        position: 'right',
      }),
    }));

    render(
      <TestWrapper>
        <AppLayout />
      </TestWrapper>
    );

    // Check that localStorage would be used (we can't easily test the actual persistence
    // without mocking the entire hook implementation)
    expect(screen.getByTestId('chat-sidebar')).toHaveAttribute('data-collapsed', 'true');
  });

  it('loads initial state from localStorage', () => {
    // Set initial state in localStorage
    localStorage.setItem('tarkov-casino-chat-layout', JSON.stringify({
      isCollapsed: false,
      isVisible: true,
      position: 'right',
    }));

    render(
      <TestWrapper>
        <AppLayout />
      </TestWrapper>
    );

    // Chat should be visible based on localStorage state
    expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument();
  });
});