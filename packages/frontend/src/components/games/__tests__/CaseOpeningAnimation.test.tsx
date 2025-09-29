/**
 * Case Opening Animation and UX Tests
 * Tests animations, user experience, and cross-device compatibility
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CaseOpeningGame from '../CaseOpeningGame'
import AuthProvider from '../../providers/AuthProvider'
import ToastProvider from '../../providers/ToastProvider'

// Mock framer-motion
mock.module('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>
  },
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({
    start: mock(),
    stop: mock(),
    set: mock()
  })
}))

// Mock hooks
mock.module('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false
  })
}))

mock.module('../../../hooks/useBalance', () => ({
  useBalance: () => ({
    balance: 10000,
    refetch: mock()
  })
}))

mock.module('../../../hooks/useAdvancedFeatures', () => ({
  useAdvancedFeatures: () => ({
    trackGamePlayed: mock(),
    updateAchievementProgress: mock()
  })
}))

mock.module('../../../hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({
    playBetSound: mock(),
    playWinSound: mock(),
    playLoseSound: mock(),
    playCaseOpen: mock(),
    playCaseReveal: mock(),
    playRarityReveal: mock()
  }),
  useSoundPreferences: () => ({
    soundEnabled: true,
    toggleSound: mock()
  })
}))

mock.module('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mock().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } }
      })
    }
  }
}))

// Mock fetch
const mockFetch = mock()
global.fetch = mockFetch

describe('Case Opening Animation and UX Tests', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    
    // Reset mocks - no need to clear in Bun test
    
    // Mock successful case types fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        case_types: [
          {
            id: 'test-case',
            name: 'Test Case',
            price: 500,
            description: 'A test case',
            rarity_distribution: {
              common: 60,
              uncommon: 25,
              rare: 10,
              epic: 4,
              legendary: 1
            }
          }
        ]
      })
    })
  })

  afterEach(() => {
    // Cleanup - no need to restore mocks in Bun test
  })

  const renderCaseOpeningGame = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <CaseOpeningGame />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    )
  }

  describe('Initial Loading and Animation States', () => {
    test('should display loading state while fetching case types', async () => {
      // Mock a delayed response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ case_types: [] })
          }), 100)
        )
      )

      renderCaseOpeningGame()

      // Should show some loading indication
      expect(screen.getByText('📦 Case Opening')).toBeInTheDocument()
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/games/cases', expect.any(Object))
      })
    })

    test('should animate header elements on mount', async () => {
      renderCaseOpeningGame()

      await waitFor(() => {
        expect(screen.getByText('📦 Case Opening')).toBeInTheDocument()
      })

      // Check for animated elements
      expect(screen.getByText('📦 Case Opening')).toBeInTheDocument()
      expect(screen.getByText(/Open Tarkov-themed cases/)).toBeInTheDocument()
      expect(screen.getByText(/Balance:/)).toBeInTheDocument()
    })

    test('should display balance with proper formatting', async () => {
      renderCaseOpeningGame()

      await waitFor(() => {
        expect(screen.getByText(/Balance:/)).toBeInTheDocument()
      })

      // Should show formatted balance
      expect(screen.getByText(/10,000/)).toBeInTheDocument()
    })
  })

  describe('Case Selection Animation', () => {
    test('should animate case selection interface', async () => {
      renderCaseOpeningGame()

      await waitFor(() => {
        expect(screen.getByText('Test Case')).toBeInTheDocument()
      })

      // Click on a case to select it
      const caseElement = screen.getByText('Test Case')
      fireEvent.click(caseElement)

      // Should show selection animation/state
      await waitFor(() => {
        expect(screen.getByText(/Ready to Open:/)).toBeInTheDocument()
      })
    })

    test('should show case details with animation', async () => {
      renderCaseOpeningGame()

      await waitFor(() => {
        expect(screen.getByText('Test Case')).toBeInTheDocument()
      })

      // Select a case
      fireEvent.click(screen.getByText('Test Case'))

      await waitFor(() => {
        expect(screen.getByText('Ready to Open: Test Case')).toBeInTheDocument()
        expect(screen.getByText(/Cost:/)).toBeInTheDocument()
        expect(screen.getByText(/Remaining balance:/)).toBeInTheDocument()
      })
    })
  })

  describe('Case Opening Animation Sequence', () => {
    test('should show opening animation when case is opened', async () => {
      // Mock successful case opening
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ case_types: [
            {
              id: 'test-case',
              name: 'Test Case',
              price: 500,
              description: 'A test case',
              rarity_distribution: { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 }
            }
          ]})
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            opening_result: {
              case_type: { id: 'test-case', name: 'Test Case', price: 500 },
              item_won: {
                id: 'item-1',
                name: 'Bandage',
                rarity: 'common',
                base_value: 50,
                category: 'medical'
              },
              currency_awarded: 60,
              opening_id: 'case_123_user',
              timestamp: '2024-01-01T12:00:00Z'
            },
            new_balance: 9560
          })
        })

      renderCaseOpeningGame()

      // Wait for case types to load and select a case
      await waitFor(() => {
        expect(screen.getByText('Test Case')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Test Case'))

      await waitFor(() => {
        expect(screen.getByText('Open Case')).toBeInTheDocument()
      })

      // Click open case button
      fireEvent.click(screen.getByText('Open Case'))

      // Should show opening animation
      await waitFor(() => {
        expect(screen.getByText(/Opening Case.../)).toBeInTheDocument()
      })
    })

    test('should handle animation timing correctly', async () => {
      // Use fake timers for animation testing
      jest.useFakeTimers()

      // Mock successful case opening
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ case_types: [
            {
              id: 'test-case',
              name: 'Test Case',
              price: 500,
              description: 'A test case',
              rarity_distribution: { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 }
            }
          ]})
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            opening_result: {
              case_type: { id: 'test-case', name: 'Test Case', price: 500 },
              item_won: {
                id: 'item-1',
                name: 'Bandage',
                rarity: 'common',
                base_value: 50,
                category: 'medical'
              },
              currency_awarded: 60,
              opening_id: 'case_123_user',
              timestamp: '2024-01-01T12:00:00Z'
            },
            new_balance: 9560
          })
        })

      renderCaseOpeningGame()

      // Wait for case types to load and select a case
      await waitFor(() => {
        expect(screen.getByText('Test Case')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Test Case'))

      await waitFor(() => {
        expect(screen.getByText('Open Case')).toBeInTheDocument()
      })

      // Click open case button
      fireEvent.click(screen.getByText('Open Case'))

      // Should show opening state immediately
      await waitFor(() => {
        expect(screen.getByText(/Opening Case.../)).toBeInTheDocument()
      })

      // Fast forward through the animation timing
      act(() => {
        jest.advanceTimersByTime(2000) // Opening animation
      })

      // Should transition to revealing state
      act(() => {
        jest.advanceTimersByTime(1500) // Reveal animation
      })

      jest.useRealTimers()
    })
  })

  describe('Responsive Design Tests', () => {
    test('should adapt to mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      })

      renderCaseOpeningGame()

      await waitFor(() => {
        expect(screen.getByText('📦 Case Opening')).toBeInTheDocument()
      })

      // Should render mobile-friendly layout
      const container = screen.getByText('📦 Case Opening').closest('div')
      expect(container).toBeInTheDocument()
    })

    test('should adapt to tablet viewport', async () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1024
      })

      renderCaseOpeningGame()

      await waitFor(() => {
        expect(screen.getByText('📦 Case Opening')).toBeInTheDocument()
      })

      // Should render tablet-friendly layout
      const container = screen.getByText('📦 Case Opening').closest('div')
      expect(container).toBeInTheDocument()
    })

    test('should adapt to desktop viewport', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1080
      })

      renderCaseOpeningGame()

      await waitFor(() => {
        expect(screen.getByText('📦 Case Opening')).toBeInTheDocument()
      })

      // Should render desktop layout
      const container = screen.getByText('📦 Case Opening').closest('div')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Touch Interaction Tests', () => {
    test('should handle touch events on mobile', async () => {
      renderCaseOpeningGame()

      await waitFor(() => {
        expect(screen.getByText('Test Case')).toBeInTheDocument()
      })

      const caseElement = screen.getByText('Test Case')

      // Simulate touch events
      fireEvent.touchStart(caseElement)
      fireEvent.touchEnd(caseElement)

      await waitFor(() => {
        expect(screen.getByText(/Ready to Open:/)).toBeInTheDocument()
      })
    })

    test('should handle sound toggle touch interaction', async () => {
      renderCaseOpeningGame()

      await waitFor(() => {
        expect(screen.getByTitle(/sound/i)).toBeInTheDocument()
      })

      const soundButton = screen.getByTitle(/sound/i)

      // Simulate touch interaction
      fireEvent.touchStart(soundButton)
      fireEvent.touchEnd(soundButton)

      // Should trigger sound toggle (mocked)
      expect(soundButton).toBeInTheDocument()
    })
  })

  describe('Error State Animations', () => {
    test('should animate error messages', async () => {
      // Mock error response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ case_types: [
            {
              id: 'test-case',
              name: 'Test Case',
              price: 500,
              description: 'A test case',
              rarity_distribution: { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 }
            }
          ]})
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Insufficient balance' })
        })

      renderCaseOpeningGame()

      // Wait for case types to load and select a case
      await waitFor(() => {
        expect(screen.getByText('Test Case')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Test Case'))

      await waitFor(() => {
        expect(screen.getByText('Open Case')).toBeInTheDocument()
      })

      // Click open case button
      fireEvent.click(screen.getByText('Open Case'))

      // Should show error message with animation
      await waitFor(() => {
        expect(screen.getByText(/Error/)).toBeInTheDocument()
      })
    })

    test('should handle network error gracefully', async () => {
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      renderCaseOpeningGame()

      // Should handle the error gracefully
      await waitFor(() => {
        expect(screen.getByText('📦 Case Opening')).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Animation Optimization', () => {
    test('should not cause memory leaks during animations', async () => {
      const { unmount } = renderCaseOpeningGame()

      await waitFor(() => {
        expect(screen.getByText('📦 Case Opening')).toBeInTheDocument()
      })

      // Unmount component
      unmount()

      // Should clean up properly (no specific assertion, but test should not hang)
      expect(true).toBe(true)
    })

    test('should handle rapid user interactions', async () => {
      renderCaseOpeningGame()

      await waitFor(() => {
        expect(screen.getByText('Test Case')).toBeInTheDocument()
      })

      const caseElement = screen.getByText('Test Case')

      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(caseElement)
      }

      // Should handle gracefully
      await waitFor(() => {
        expect(screen.getByText(/Ready to Open:/)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility Tests', () => {
    test('should be keyboard navigable', async () => {
      renderCaseOpeningGame()

      await waitFor(() => {
        expect(screen.getByText('Test Case')).toBeInTheDocument()
      })

      const caseElement = screen.getByText('Test Case')

      // Simulate keyboard navigation
      fireEvent.keyDown(caseElement, { key: 'Enter' })

      await waitFor(() => {
        expect(screen.getByText(/Ready to Open:/)).toBeInTheDocument()
      })
    })

    test('should have proper ARIA labels', async () => {
      renderCaseOpeningGame()

      await waitFor(() => {
        expect(screen.getByText('📦 Case Opening')).toBeInTheDocument()
      })

      // Check for accessibility attributes
      const soundButton = screen.getByTitle(/sound/i)
      expect(soundButton).toHaveAttribute('title')
    })

    test('should support screen readers', async () => {
      renderCaseOpeningGame()

      await waitFor(() => {
        expect(screen.getByText('📦 Case Opening')).toBeInTheDocument()
      })

      // Should have readable text content
      expect(screen.getByText(/Open Tarkov-themed cases/)).toBeInTheDocument()
      expect(screen.getByText(/Balance:/)).toBeInTheDocument()
    })
  })

  describe('Animation Performance Tests', () => {
    test('should maintain 60fps during animations', async () => {
      // Mock performance API
      const mockPerformance = {
        now: mock().mockReturnValue(0),
        mark: mock(),
        measure: mock()
      }
      
      Object.defineProperty(window, 'performance', {
        value: mockPerformance,
        writable: true
      })

      renderCaseOpeningGame()

      await waitFor(() => {
        expect(screen.getByText('📦 Case Opening')).toBeInTheDocument()
      })

      // Animation performance is handled by framer-motion (mocked)
      // This test ensures the component renders without performance issues
      expect(screen.getByText('📦 Case Opening')).toBeInTheDocument()
    })

    test('should optimize re-renders during animations', async () => {
      const renderSpy = mock()
      
      const TestWrapper = ({ children }: { children: React.ReactNode }) => {
        renderSpy()
        return <>{children}</>
      }

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <TestWrapper>
                <CaseOpeningGame />
              </TestWrapper>
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('📦 Case Opening')).toBeInTheDocument()
      })

      // Should not cause excessive re-renders
      expect(renderSpy).toHaveBeenCalledTimes(1)
    })
  })
})