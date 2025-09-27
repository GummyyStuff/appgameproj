/**
 * ChatLoginPrompt Component Tests
 * Tests for the chat login prompt component
 * Requirements: 1.3, 6.1
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ChatLoginPrompt } from '../ChatLoginPrompt';

// Wrapper component for router context
const RouterWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('ChatLoginPrompt', () => {
  describe('Default (full) mode', () => {
    it('renders the login prompt with all elements', () => {
      render(
        <RouterWrapper>
          <ChatLoginPrompt />
        </RouterWrapper>
      );

      expect(screen.getByTestId('chat-login-prompt')).toBeInTheDocument();
      expect(screen.getByText('Join the Conversation')).toBeInTheDocument();
      expect(screen.getByText('Connect with other operators and share your gaming experience')).toBeInTheDocument();
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
      expect(screen.getByTestId('register-button')).toBeInTheDocument();
    });

    it('displays feature list in full mode', () => {
      render(
        <RouterWrapper>
          <ChatLoginPrompt />
        </RouterWrapper>
      );

      expect(screen.getByText('Real-time messaging')).toBeInTheDocument();
      expect(screen.getByText('See who\'s online')).toBeInTheDocument();
      expect(screen.getByText('Secure & moderated')).toBeInTheDocument();
    });

    it('has correct links for login and register buttons', () => {
      render(
        <RouterWrapper>
          <ChatLoginPrompt />
        </RouterWrapper>
      );

      const loginButton = screen.getByTestId('login-button');
      const registerButton = screen.getByTestId('register-button');

      expect(loginButton).toHaveAttribute('href', '/login');
      expect(registerButton).toHaveAttribute('href', '/register');
    });
  });

  describe('Compact mode', () => {
    it('renders compact version with minimal content', () => {
      render(
        <RouterWrapper>
          <ChatLoginPrompt compact />
        </RouterWrapper>
      );

      expect(screen.getByTestId('chat-login-prompt')).toHaveClass('chat-login-prompt--compact');
      expect(screen.getByText('Login to Chat')).toBeInTheDocument();
      expect(screen.getByText('Sign in to participate in chat')).toBeInTheDocument();
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
    });

    it('does not show register button in compact mode', () => {
      render(
        <RouterWrapper>
          <ChatLoginPrompt compact />
        </RouterWrapper>
      );

      expect(screen.queryByTestId('register-button')).not.toBeInTheDocument();
    });

    it('does not show feature list in compact mode', () => {
      render(
        <RouterWrapper>
          <ChatLoginPrompt compact />
        </RouterWrapper>
      );

      expect(screen.queryByText('Real-time messaging')).not.toBeInTheDocument();
      expect(screen.queryByText('See who\'s online')).not.toBeInTheDocument();
      expect(screen.queryByText('Secure & moderated')).not.toBeInTheDocument();
    });
  });

  describe('Styling and accessibility', () => {
    it('applies custom className', () => {
      render(
        <RouterWrapper>
          <ChatLoginPrompt className="custom-class" />
        </RouterWrapper>
      );

      expect(screen.getByTestId('chat-login-prompt')).toHaveClass('custom-class');
    });

    it('has proper button roles and accessibility', () => {
      render(
        <RouterWrapper>
          <ChatLoginPrompt />
        </RouterWrapper>
      );

      const loginButton = screen.getByTestId('login-button');
      const registerButton = screen.getByTestId('register-button');

      expect(loginButton).toHaveTextContent('Login');
      expect(registerButton).toHaveTextContent('Register');
      
      // Links should be focusable
      expect(loginButton).toHaveAttribute('href');
      expect(registerButton).toHaveAttribute('href');
    });

    it('renders with proper semantic structure', () => {
      render(
        <RouterWrapper>
          <ChatLoginPrompt />
        </RouterWrapper>
      );

      // Should have proper heading structure
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveTextContent('Join the Conversation');

      // Should have proper list structure for features
      const featureList = screen.getByRole('list');
      expect(featureList).toBeInTheDocument();
      
      const featureItems = screen.getAllByRole('listitem');
      expect(featureItems).toHaveLength(3);
    });
  });

  describe('Component behavior', () => {
    it('renders without crashing with no props', () => {
      expect(() => {
        render(
          <RouterWrapper>
            <ChatLoginPrompt />
          </RouterWrapper>
        );
      }).not.toThrow();
    });

    it('renders without crashing with all props', () => {
      expect(() => {
        render(
          <RouterWrapper>
            <ChatLoginPrompt 
              compact={true} 
              className="test-class" 
            />
          </RouterWrapper>
        );
      }).not.toThrow();
    });
  });
});