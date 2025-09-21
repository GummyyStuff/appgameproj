/**
 * AuthForm Component Tests
 * Tests for login and registration forms
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mock } from 'bun:test'
import { describe, it, expect, beforeEach } from 'bun:test'
import AuthForm from '../AuthForm'
import { AuthContext } from '../../../hooks/useAuth'

// Mock the supabase client
const mockSupabase = {
  supabase: {
    auth: {
      signUp: mock(),
      signInWithPassword: mock(),
      resetPasswordForEmail: mock(),
    }
  }
}

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const mockAuthValue = {
  user: null,
  session: null,
  loading: false,
  signUp: mock(),
  signIn: mock(),
  signOut: mock(),
  resetPassword: mock()
}

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthValue}>
        {component}
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

describe('AuthForm', () => {
  beforeEach(() => {
    // Bun test automatically clears mocks
  })

  describe('Login Form', () => {
    it('renders login form by default', () => {
      renderWithProviders(<AuthForm />)
      
      expect(screen.getByText('Sign In')).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('validates email format', async () => {
      renderWithProviders(<AuthForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
      })
    })

    it('validates required fields', async () => {
      renderWithProviders(<AuthForm />)
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('calls signIn with correct parameters', async () => {
      const mockSignIn = mock(() => Promise.resolve({ success: true }))
      mockAuthValue.signIn = mockSignIn

      renderWithProviders(<AuthForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })

    it('displays error message on login failure', async () => {
      const mockSignIn = mock(() => Promise.reject(new Error('Invalid credentials')))
      mockAuthValue.signIn = mockSignIn

      renderWithProviders(<AuthForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })
    })

    it('shows loading state during login', async () => {
      const mockSignIn = mock(() => new Promise(resolve => setTimeout(resolve, 100)))
      mockAuthValue.signIn = mockSignIn

      renderWithProviders(<AuthForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Registration Form', () => {
    it('switches to registration form', () => {
      renderWithProviders(<AuthForm />)
      
      const switchButton = screen.getByText(/don't have an account/i)
      fireEvent.click(switchButton)

      expect(screen.getByText('Sign Up')).toBeInTheDocument()
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    })

    it('validates username requirements', async () => {
      renderWithProviders(<AuthForm />)
      
      // Switch to registration
      fireEvent.click(screen.getByText(/don't have an account/i))
      
      const usernameInput = screen.getByLabelText(/username/i)
      const submitButton = screen.getByRole('button', { name: /sign up/i })

      // Test too short username
      fireEvent.change(usernameInput, { target: { value: 'ab' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument()
      })

      // Test too long username
      fireEvent.change(usernameInput, { target: { value: 'a'.repeat(25) } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/username must be less than 20 characters/i)).toBeInTheDocument()
      })

      // Test invalid characters
      fireEvent.change(usernameInput, { target: { value: 'user@name' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/username can only contain letters, numbers, and underscores/i)).toBeInTheDocument()
      })
    })

    it('validates password strength', async () => {
      renderWithProviders(<AuthForm />)
      
      // Switch to registration
      fireEvent.click(screen.getByText(/don't have an account/i))
      
      const passwordInput = screen.getByLabelText(/^password/i)
      const submitButton = screen.getByRole('button', { name: /sign up/i })

      // Test weak password
      fireEvent.change(passwordInput, { target: { value: 'weak' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
      })
    })

    it('validates password confirmation', async () => {
      renderWithProviders(<AuthForm />)
      
      // Switch to registration
      fireEvent.click(screen.getByText(/don't have an account/i))
      
      const passwordInput = screen.getByLabelText(/^password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /sign up/i })

      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('calls signUp with correct parameters', async () => {
      const mockSignUp = mock(() => Promise.resolve({ success: true }))
      mockAuthValue.signUp = mockSignUp

      renderWithProviders(<AuthForm />)
      
      // Switch to registration
      fireEvent.click(screen.getByText(/don't have an account/i))
      
      const usernameInput = screen.getByLabelText(/username/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /sign up/i })

      fireEvent.change(usernameInput, { target: { value: 'testuser' } })
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123', 'testuser')
      })
    })
  })

  describe('Password Reset', () => {
    it('shows forgot password form', () => {
      renderWithProviders(<AuthForm />)
      
      const forgotPasswordLink = screen.getByText(/forgot password/i)
      fireEvent.click(forgotPasswordLink)

      expect(screen.getByText('Reset Password')).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send reset email/i })).toBeInTheDocument()
    })

    it('validates email for password reset', async () => {
      renderWithProviders(<AuthForm />)
      
      // Go to forgot password form
      fireEvent.click(screen.getByText(/forgot password/i))
      
      const submitButton = screen.getByRole('button', { name: /send reset email/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })

    it('calls resetPassword with correct email', async () => {
      const mockResetPassword = mock(() => Promise.resolve({ success: true }))
      mockAuthValue.resetPassword = mockResetPassword

      renderWithProviders(<AuthForm />)
      
      // Go to forgot password form
      fireEvent.click(screen.getByText(/forgot password/i))
      
      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset email/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('test@example.com')
      })
    })
  })

  describe('Form Navigation', () => {
    it('switches between login and registration forms', () => {
      renderWithProviders(<AuthForm />)
      
      // Start with login form
      expect(screen.getByText('Sign In')).toBeInTheDocument()
      
      // Switch to registration
      fireEvent.click(screen.getByText(/don't have an account/i))
      expect(screen.getByText('Sign Up')).toBeInTheDocument()
      
      // Switch back to login
      fireEvent.click(screen.getByText(/already have an account/i))
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    it('returns to login from password reset', () => {
      renderWithProviders(<AuthForm />)
      
      // Go to forgot password
      fireEvent.click(screen.getByText(/forgot password/i))
      expect(screen.getByText('Reset Password')).toBeInTheDocument()
      
      // Return to login
      fireEvent.click(screen.getByText(/back to login/i))
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      renderWithProviders(<AuthForm />)
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    it('has proper ARIA attributes', () => {
      renderWithProviders(<AuthForm />)
      
      const form = screen.getByRole('form')
      expect(form).toBeInTheDocument()
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('shows error messages with proper ARIA attributes', async () => {
      renderWithProviders(<AuthForm />)
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        const errorMessage = screen.getByText(/email is required/i)
        expect(errorMessage).toHaveAttribute('role', 'alert')
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('supports tab navigation', () => {
      renderWithProviders(<AuthForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      emailInput.focus()
      expect(document.activeElement).toBe(emailInput)

      // Tab to password field
      fireEvent.keyDown(emailInput, { key: 'Tab' })
      expect(document.activeElement).toBe(passwordInput)

      // Tab to submit button
      fireEvent.keyDown(passwordInput, { key: 'Tab' })
      expect(document.activeElement).toBe(submitButton)
    })

    it('submits form on Enter key', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({ success: true })
      mockAuthValue.signIn = mockSignIn

      renderWithProviders(<AuthForm />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.keyDown(passwordInput, { key: 'Enter' })

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })
  })
})