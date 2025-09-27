/**
 * ChatMessage Component Tests
 * Comprehensive tests for message rendering, formatting, and XSS prevention
 * Requirements: 1.2, 2.2, 3.1, 3.2, 4.1
 */

import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, afterEach, beforeEach } from 'bun:test';
import ChatMessage from '../ChatMessage';
import type { ChatMessage as ChatMessageType } from '../../../types/chat';

describe('ChatMessage Component', () => {
  let mockMessage: ChatMessageType;

  beforeEach(() => {
    mockMessage = {
      id: 'test-message-1',
      content: 'Hello, this is a test message!',
      user_id: 'user-123',
      username: 'TestUser',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('renders message content correctly', () => {
    render(<ChatMessage message={mockMessage} />);
    
    expect(screen.getByTestId('message-content')).toHaveTextContent(
      'Hello, this is a test message!'
    );
  });

  it('renders username correctly', () => {
    render(<ChatMessage message={mockMessage} />);
    
    expect(screen.getByTestId('message-username')).toHaveTextContent('TestUser');
  });

  it('applies own-message class when isOwnMessage is true', () => {
    render(<ChatMessage message={mockMessage} isOwnMessage={true} />);
    
    const messageElement = screen.getByTestId('chat-message');
    expect(messageElement).toHaveClass('own-message');
  });

  it('applies other-message class when isOwnMessage is false', () => {
    render(<ChatMessage message={mockMessage} isOwnMessage={false} />);
    
    const messageElement = screen.getByTestId('chat-message');
    expect(messageElement).toHaveClass('other-message');
  });

  it('sanitizes HTML tags in message content', () => {
    const maliciousMessage = {
      ...mockMessage,
      content: '<script>alert("xss")</script>Hello world',
    };
    
    render(<ChatMessage message={maliciousMessage} />);
    
    const contentElement = screen.getByTestId('message-content');
    expect(contentElement.textContent).not.toContain('<script>');
    expect(contentElement.textContent).toContain('Hello world');
  });

  it('escapes HTML entities in message content', () => {
    const messageWithEntities = {
      ...mockMessage,
      content: 'Test & "quotes" <brackets>',
    };
    
    render(<ChatMessage message={messageWithEntities} />);
    
    const contentElement = screen.getByTestId('message-content');
    expect(contentElement.textContent).toContain('&');
    expect(contentElement.textContent).toContain('"quotes"');
    // HTML tags are completely removed by sanitization for security
    expect(contentElement.textContent).not.toContain('<');
    expect(contentElement.textContent).not.toContain('>');
  });

  it('handles empty message content safely', () => {
    const emptyMessage = {
      ...mockMessage,
      content: '',
    };
    
    render(<ChatMessage message={emptyMessage} />);
    
    const contentElement = screen.getByTestId('message-content');
    expect(contentElement).toHaveTextContent('');
  });

  it('handles emoji correctly', () => {
    const emojiMessage = {
      ...mockMessage,
      content: 'Hello 👋 World 🌍',
    };
    
    render(<ChatMessage message={emojiMessage} />);
    
    const contentElement = screen.getByTestId('message-content');
    expect(contentElement).toHaveTextContent('Hello 👋 World 🌍');
  });

  it('sets correct data attributes', () => {
    render(<ChatMessage message={mockMessage} />);
    
    const messageElement = screen.getByTestId('chat-message');
    expect(messageElement).toHaveAttribute('data-message-id', 'test-message-1');
    expect(messageElement).toHaveAttribute('data-user-id', 'user-123');
  });

  it('applies custom className', () => {
    render(<ChatMessage message={mockMessage} className="custom-class" />);
    
    const messageElement = screen.getByTestId('chat-message');
    expect(messageElement).toHaveClass('custom-class');
  });

  it('renders timestamp when showTimestamp is true', () => {
    render(<ChatMessage message={mockMessage} showTimestamp={true} />);
    
    expect(screen.getByTestId('message-timestamp')).toBeInTheDocument();
  });

  it('does not render timestamp when showTimestamp is false', () => {
    render(<ChatMessage message={mockMessage} showTimestamp={false} />);
    
    expect(screen.queryByTestId('message-timestamp')).not.toBeInTheDocument();
  });

  describe('Timestamp Formatting', () => {
    it('formats recent messages as "just now"', () => {
      const recentMessage = {
        ...mockMessage,
        created_at: new Date().toISOString(),
      };
      
      render(<ChatMessage message={recentMessage} />);
      
      const timestamp = screen.getByTestId('message-timestamp');
      expect(timestamp).toHaveTextContent('just now');
    });

    it('formats messages from minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const messageFromMinutesAgo = {
        ...mockMessage,
        created_at: fiveMinutesAgo,
      };
      
      render(<ChatMessage message={messageFromMinutesAgo} />);
      
      const timestamp = screen.getByTestId('message-timestamp');
      expect(timestamp).toHaveTextContent('5m ago');
    });

    it('formats messages from hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const messageFromHoursAgo = {
        ...mockMessage,
        created_at: twoHoursAgo,
      };
      
      render(<ChatMessage message={messageFromHoursAgo} />);
      
      const timestamp = screen.getByTestId('message-timestamp');
      expect(timestamp).toHaveTextContent('2h ago');
    });

    it('formats messages from days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const messageFromDaysAgo = {
        ...mockMessage,
        created_at: threeDaysAgo,
      };
      
      render(<ChatMessage message={messageFromDaysAgo} />);
      
      const timestamp = screen.getByTestId('message-timestamp');
      expect(timestamp).toHaveTextContent('3d ago');
    });

    it('formats old messages with full date', () => {
      const oldMessage = {
        ...mockMessage,
        created_at: '2023-01-15T10:30:00Z',
      };
      
      render(<ChatMessage message={oldMessage} />);
      
      const timestamp = screen.getByTestId('message-timestamp');
      // Should show a formatted date instead of relative time
      expect(timestamp.textContent).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('includes full timestamp in title attribute', () => {
      render(<ChatMessage message={mockMessage} />);
      
      const timestamp = screen.getByTestId('message-timestamp');
      expect(timestamp).toHaveAttribute('title');
      expect(timestamp.getAttribute('title')).toContain('2024');
    });
  });

  describe('Security and Sanitization', () => {
    it('prevents XSS attacks with script tags', () => {
      const maliciousMessage = {
        ...mockMessage,
        content: '<script>alert("XSS")</script>Safe content',
      };
      
      render(<ChatMessage message={maliciousMessage} />);
      
      const contentElement = screen.getByTestId('message-content');
      expect(contentElement.textContent).not.toContain('<script>');
      expect(contentElement.textContent).not.toContain('alert');
      expect(contentElement.textContent).toContain('Safe content');
    });

    it('prevents XSS with img tags and onerror', () => {
      const maliciousMessage = {
        ...mockMessage,
        content: '<img src="x" onerror="alert(1)">Test',
      };
      
      render(<ChatMessage message={maliciousMessage} />);
      
      const contentElement = screen.getByTestId('message-content');
      expect(contentElement.textContent).not.toContain('<img');
      expect(contentElement.textContent).not.toContain('onerror');
      expect(contentElement.textContent).toContain('Test');
    });

    it('prevents XSS with iframe tags', () => {
      const maliciousMessage = {
        ...mockMessage,
        content: '<iframe src="javascript:alert(1)"></iframe>Content',
      };
      
      render(<ChatMessage message={maliciousMessage} />);
      
      const contentElement = screen.getByTestId('message-content');
      expect(contentElement.textContent).not.toContain('<iframe');
      expect(contentElement.textContent).not.toContain('javascript:');
      expect(contentElement.textContent).toContain('Content');
    });

    it('handles multiple HTML entities correctly', () => {
      const messageWithEntities = {
        ...mockMessage,
        content: 'Test &amp; &lt;script&gt; &quot;quotes&quot; &#x27;apostrophe&#x27;',
      };
      
      render(<ChatMessage message={messageWithEntities} />);
      
      const contentElement = screen.getByTestId('message-content');
      // Since we're using textContent, HTML entities will be displayed as text
      expect(contentElement.textContent).toContain('Test');
      expect(contentElement.textContent).toContain('&amp;');
      expect(contentElement.textContent).toContain('quotes');
    });

    it('preserves safe content while removing dangerous elements', () => {
      const mixedMessage = {
        ...mockMessage,
        content: 'Hello <script>alert("bad")</script> world! This is <b>safe</b> content.',
      };
      
      render(<ChatMessage message={mixedMessage} />);
      
      const contentElement = screen.getByTestId('message-content');
      expect(contentElement.textContent).toContain('Hello');
      expect(contentElement.textContent).toContain('world!');
      expect(contentElement.textContent).toContain('This is');
      expect(contentElement.textContent).toContain('safe');
      expect(contentElement.textContent).toContain('content.');
      expect(contentElement.textContent).not.toContain('<script>');
      expect(contentElement.textContent).not.toContain('alert');
    });
  });

  describe('Edge Cases', () => {
    it('handles very long usernames gracefully', () => {
      const longUsernameMessage = {
        ...mockMessage,
        username: 'VeryLongUsernameThatsReallyReallyLongAndShouldBeHandledProperly',
      };
      
      render(<ChatMessage message={longUsernameMessage} />);
      
      const usernameElement = screen.getByTestId('message-username');
      expect(usernameElement).toHaveTextContent(longUsernameMessage.username);
    });

    it('handles messages with only whitespace', () => {
      const whitespaceMessage = {
        ...mockMessage,
        content: '   \n\t   ',
      };
      
      render(<ChatMessage message={whitespaceMessage} />);
      
      const contentElement = screen.getByTestId('message-content');
      // Should be sanitized to empty or minimal content
      expect(contentElement.innerHTML.trim()).toBe('');
    });

    it('handles messages with special characters', () => {
      const specialCharsMessage = {
        ...mockMessage,
        content: '!@#$%^&*()_+-=[]{}|;:,.<>?`~',
      };
      
      render(<ChatMessage message={specialCharsMessage} />);
      
      const contentElement = screen.getByTestId('message-content');
      expect(contentElement).toHaveTextContent('!@#$%^&*()_+-=[]{}|;:,.');
    });

    it('handles unicode and emoji characters', () => {
      const unicodeMessage = {
        ...mockMessage,
        content: '🎮 Gaming time! 🔥 Let\'s play some Tarkov! 🎯',
      };
      
      render(<ChatMessage message={unicodeMessage} />);
      
      const contentElement = screen.getByTestId('message-content');
      expect(contentElement).toHaveTextContent('🎮 Gaming time! 🔥 Let\'s play some Tarkov! 🎯');
    });

    it('handles invalid timestamp gracefully', () => {
      const invalidTimestampMessage = {
        ...mockMessage,
        created_at: 'invalid-date',
      };
      
      render(<ChatMessage message={invalidTimestampMessage} />);
      
      // Should not crash and should render some timestamp
      const timestamp = screen.getByTestId('message-timestamp');
      expect(timestamp).toBeInTheDocument();
    });

    it('handles missing message properties gracefully', () => {
      const incompleteMessage = {
        ...mockMessage,
        username: '',
        content: '',
      };
      
      render(<ChatMessage message={incompleteMessage} />);
      
      // Should render without crashing
      expect(screen.getByTestId('chat-message')).toBeInTheDocument();
      expect(screen.getByTestId('message-username')).toHaveTextContent('');
      expect(screen.getByTestId('message-content')).toHaveTextContent('');
    });
  });

  describe('Styling and CSS Classes', () => {
    it('applies correct base classes', () => {
      render(<ChatMessage message={mockMessage} />);
      
      const messageElement = screen.getByTestId('chat-message');
      expect(messageElement).toHaveClass('chat-message');
      expect(messageElement).toHaveClass('other-message');
    });

    it('combines custom className with base classes', () => {
      render(<ChatMessage message={mockMessage} className="custom-class another-class" />);
      
      const messageElement = screen.getByTestId('chat-message');
      expect(messageElement).toHaveClass('chat-message');
      expect(messageElement).toHaveClass('other-message');
      expect(messageElement).toHaveClass('custom-class');
      expect(messageElement).toHaveClass('another-class');
    });

    it('applies own-message class correctly', () => {
      render(<ChatMessage message={mockMessage} isOwnMessage={true} />);
      
      const messageElement = screen.getByTestId('chat-message');
      expect(messageElement).toHaveClass('chat-message');
      expect(messageElement).toHaveClass('own-message');
      expect(messageElement).not.toHaveClass('other-message');
    });
  });

  describe('Accessibility', () => {
    it('provides proper data attributes for testing and accessibility', () => {
      render(<ChatMessage message={mockMessage} />);
      
      const messageElement = screen.getByTestId('chat-message');
      expect(messageElement).toHaveAttribute('data-message-id', mockMessage.id);
      expect(messageElement).toHaveAttribute('data-user-id', mockMessage.user_id);
    });

    it('provides accessible timestamp with title attribute', () => {
      render(<ChatMessage message={mockMessage} />);
      
      const timestamp = screen.getByTestId('message-timestamp');
      expect(timestamp).toHaveAttribute('title');
      const titleValue = timestamp.getAttribute('title');
      expect(titleValue).toBeTruthy();
      expect(titleValue).toContain('2024');
    });

    it('maintains semantic structure with proper elements', () => {
      render(<ChatMessage message={mockMessage} />);
      
      // Check that we have proper semantic structure
      expect(screen.getByTestId('message-username')).toBeInTheDocument();
      expect(screen.getByTestId('message-content')).toBeInTheDocument();
      expect(screen.getByTestId('message-timestamp')).toBeInTheDocument();
    });
  });
});