import { test, expect, describe, beforeEach } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatRulesGate } from '../src/components/chat/ChatRulesGate';
import { MessageItem } from '../src/components/chat/MessageItem';
import { useAuth } from '../src/hooks/useAuth';
import { useChatRules } from '../src/hooks/useChatRules';

// Mock the hooks
jest.mock('../src/hooks/useAuth');
jest.mock('../src/hooks/useChatRules');
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }
}));

describe('Chat Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('ChatRulesGate renders rules and accept button', () => {
    const mockUseChatRules = useChatRules as jest.MockedFunction<typeof useChatRules>;
    mockUseChatRules.mockReturnValue({
      hasAcceptedRules: false,
      acceptRules: jest.fn(),
      isLoading: false,
      error: null,
      clearError: jest.fn()
    });

    const mockOnAccept = jest.fn();
    render(<ChatRulesGate onAccept={mockOnAccept} />);

    expect(screen.getByText('Chat Rules & Guidelines')).toBeInTheDocument();
    expect(screen.getByText('Be respectful and kind to other users')).toBeInTheDocument();
    expect(screen.getByText('I Accept the Chat Rules')).toBeInTheDocument();
  });

  test('ChatRulesGate calls onAccept when rules are accepted', async () => {
    const mockAcceptRules = jest.fn().mockResolvedValue(undefined);
    const mockUseChatRules = useChatRules as jest.MockedFunction<typeof useChatRules>;
    mockUseChatRules.mockReturnValue({
      hasAcceptedRules: false,
      acceptRules: mockAcceptRules,
      isLoading: false,
      error: null,
      clearError: jest.fn()
    });

    const mockOnAccept = jest.fn();
    render(<ChatRulesGate onAccept={mockOnAccept} />);

    const acceptButton = screen.getByText('I Accept the Chat Rules');
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(mockAcceptRules).toHaveBeenCalled();
      expect(mockOnAccept).toHaveBeenCalled();
    });
  });

  test('MessageItem renders message content and user info', () => {
    const mockMessage = {
      id: '1',
      user_id: 'user1',
      content: 'Hello world!',
      created_at: '2023-01-01T12:00:00Z',
      username: 'testuser',
      display_name: 'Test User',
      avatar_path: 'defaults/default-avatar.svg'
    };

    const mockOnDelete = jest.fn();
    const mockOnUserClick = jest.fn();

    render(
      <MessageItem 
        message={mockMessage}
        onDelete={mockOnDelete}
        onUserClick={mockOnUserClick}
      />
    );

    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('Hello world!')).toBeInTheDocument();
  });

  test('MessageItem calls onUserClick when username is clicked', () => {
    const mockMessage = {
      id: '1',
      user_id: 'user1',
      content: 'Hello world!',
      created_at: '2023-01-01T12:00:00Z',
      username: 'testuser',
      display_name: 'Test User',
      avatar_path: 'defaults/default-avatar.svg'
    };

    const mockOnUserClick = jest.fn();
    render(
      <MessageItem 
        message={mockMessage}
        onUserClick={mockOnUserClick}
      />
    );

    const usernameButton = screen.getByText('testuser');
    fireEvent.click(usernameButton);

    expect(mockOnUserClick).toHaveBeenCalledWith('user1');
  });
});
