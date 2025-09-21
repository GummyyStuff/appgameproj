/**
 * RouletteWheel Component Tests
 * Tests for roulette game interface and interactions
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mock } from 'bun:test'
import { describe, it, expect, beforeEach } from 'bun:test'
import RouletteWheel from '../RouletteWheel'
import { AuthContext } from '../../../hooks/useAuth'

// Mock the balance hook
const mockUseBalance = () => ({
  balance: 1000,
  refetch: mock()
})

// Mock sound effects hook
const mockUseSoundEffects = () => ({
  playBetSound: mock(),
  playWinSound: mock(),
  playLoseSound: mock(),
  playSpinSound: mock()
})

// Mock fetch
global.fetch = mock()

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const mockAuthValue = {
  user: { id: 'test-user' } as any,
  session: { access_token: 'test-token' } as any,
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

describe('RouletteWheel', () => {
  beforeEach(() => {
    // Mock successful API response
    global.fetch = mock(() => Promise.resolve({
      ok: true,
      json: async () => ({
        success: true,
        gameId: 'test-game-123',
        result: {
          bet_type: 'red',
          bet_value: 'red',
          winning_number: 7,
          multiplier: 1,
          payout: 100
        },
        balance: 1100,
        timestamp: '2024-01-15T10:00:00Z'
      })
    }))
  })

  describe('Rendering', () => {
    it('renders the roulette wheel', () => {
      renderWithProviders(<RouletteWheel />)
      
      expect(screen.getByText('European Roulette')).toBeInTheDocument()
      expect(screen.getByText(/place your bets/i)).toBeInTheDocument()
    })

    it('renders betting options', () => {
      renderWithProviders(<RouletteWheel />)
      
      // Color bets
      expect(screen.getByText('Red')).toBeInTheDocument()
      expect(screen.getByText('Black')).toBeInTheDocument()
      
      // Even/Odd bets
      expect(screen.getByText('Even')).toBeInTheDocument()
      expect(screen.getByText('Odd')).toBeInTheDocument()
      
      // High/Low bets
      expect(screen.getByText('1-18')).toBeInTheDocument()
      expect(screen.getByText('19-36')).toBeInTheDocument()
      
      // Dozen bets
      expect(screen.getByText('1st 12')).toBeInTheDocument()
      expect(screen.getByText('2nd 12')).toBeInTheDocument()
      expect(screen.getByText('3rd 12')).toBeInTheDocument()
    })

    it('renders number grid', () => {
      renderWithProviders(<RouletteWheel />)
      
      // Check for some key numbers
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('36')).toBeInTheDocument()
    })

    it('renders bet amount controls', () => {
      renderWithProviders(<RouletteWheel />)
      
      expect(screen.getByText('Bet Amount')).toBeInTheDocument()
      expect(screen.getByDisplayValue('100')).toBeInTheDocument() // Default bet amount
    })

    it('renders spin button', () => {
      renderWithProviders(<RouletteWheel />)
      
      expect(screen.getByRole('button', { name: /spin/i })).toBeInTheDocument()
    })
  })

  describe('Betting Interface', () => {
    it('allows selecting bet amount', () => {
      renderWithProviders(<RouletteWheel />)
      
      const betInput = screen.getByDisplayValue('100')
      fireEvent.change(betInput, { target: { value: '250' } })
      
      expect(screen.getByDisplayValue('250')).toBeInTheDocument()
    })

    it('provides quick bet amount buttons', () => {
      renderWithProviders(<RouletteWheel />)
      
      const quickBetButtons = ['25', '50', '100', '250', '500']
      
      for (const amount of quickBetButtons) {
        expect(screen.getByRole('button', { name: amount })).toBeInTheDocument()
      }
    })

    it('updates bet amount when quick bet button is clicked', () => {
      renderWithProviders(<RouletteWheel />)
      
      const quickBet250 = screen.getByRole('button', { name: '250' })
      fireEvent.click(quickBet250)
      
      expect(screen.getByDisplayValue('250')).toBeInTheDocument()
    })

    it('allows placing bets on colors', () => {
      renderWithProviders(<RouletteWheel />)
      
      const redBetButton = screen.getByText('Red')
      fireEvent.click(redBetButton)
      
      // Should show active bet state
      expect(redBetButton).toHaveClass('active') // Assuming active class is applied
    })

    it('allows placing bets on numbers', () => {
      renderWithProviders(<RouletteWheel />)
      
      const number17 = screen.getByText('17')
      fireEvent.click(number17)
      
      // Should show bet placed on number 17
      expect(number17).toHaveClass('bet-placed') // Assuming bet-placed class is applied
    })

    it('shows current bet summary', () => {
      renderWithProviders(<RouletteWheel />)
      
      // Place a bet
      const redBetButton = screen.getByText('Red')
      fireEvent.click(redBetButton)
      
      // Should show bet summary
      expect(screen.getByText(/current bet/i)).toBeInTheDocument()
      expect(screen.getByText(/red/i)).toBeInTheDocument()
      expect(screen.getByText(/100/)).toBeInTheDocument() // Bet amount
    })
  })

  describe('Game Flow', () => {
    it('disables betting during spin', async () => {
      renderWithProviders(<RouletteWheel />)
      
      // Place a bet and spin
      const redBetButton = screen.getByText('Red')
      const spinButton = screen.getByRole('button', { name: /spin/i })
      
      fireEvent.click(redBetButton)
      fireEvent.click(spinButton)
      
      // Betting should be disabled during spin
      await waitFor(() => {
        expect(redBetButton).toBeDisabled()
        expect(spinButton).toBeDisabled()
      })
    })

    it('shows spinning animation', async () => {
      renderWithProviders(<RouletteWheel />)
      
      const redBetButton = screen.getByText('Red')
      const spinButton = screen.getByRole('button', { name: /spin/i })
      
      fireEvent.click(redBetButton)
      fireEvent.click(spinButton)
      
      await waitFor(() => {
        expect(screen.getByText(/spinning/i)).toBeInTheDocument()
      })
    })

    it('displays game result', async () => {
      renderWithProviders(<RouletteWheel />)
      
      const redBetButton = screen.getByText('Red')
      const spinButton = screen.getByRole('button', { name: /spin/i })
      
      fireEvent.click(redBetButton)
      fireEvent.click(spinButton)
      
      await waitFor(() => {
        expect(screen.getByText(/winning number: 7/i)).toBeInTheDocument()
        expect(screen.getByText(/you won/i)).toBeInTheDocument()
      })
    })

    it('updates balance after game', async () => {
      renderWithProviders(<RouletteWheel />)
      
      const redBetButton = screen.getByText('Red')
      const spinButton = screen.getByRole('button', { name: /spin/i })
      
      fireEvent.click(redBetButton)
      fireEvent.click(spinButton)
      
      await waitFor(() => {
        // Balance should be updated (mocked to return 1100)
        expect(screen.getByText(/1,100/)).toBeInTheDocument()
      })
    })

    it('clears bets after spin', async () => {
      renderWithProviders(<RouletteWheel />)
      
      const redBetButton = screen.getByText('Red')
      const spinButton = screen.getByRole('button', { name: /spin/i })
      
      fireEvent.click(redBetButton)
      fireEvent.click(spinButton)
      
      await waitFor(() => {
        // Bet should be cleared
        expect(redBetButton).not.toHaveClass('active')
      })
    })
  })

  describe('Validation', () => {
    it('prevents spinning without placing bets', () => {
      renderWithProviders(<RouletteWheel />)
      
      const spinButton = screen.getByRole('button', { name: /spin/i })
      fireEvent.click(spinButton)
      
      expect(screen.getByText(/please place a bet/i)).toBeInTheDocument()
    })

    it('validates minimum bet amount', () => {
      renderWithProviders(<RouletteWheel />)
      
      const betInput = screen.getByDisplayValue('100')
      fireEvent.change(betInput, { target: { value: '0' } })
      
      const redBetButton = screen.getByText('Red')
      fireEvent.click(redBetButton)
      
      expect(screen.getByText(/minimum bet is/i)).toBeInTheDocument()
    })

    it('validates maximum bet amount', () => {
      renderWithProviders(<RouletteWheel />)
      
      const betInput = screen.getByDisplayValue('100')
      fireEvent.change(betInput, { target: { value: '10001' } })
      
      const redBetButton = screen.getByText('Red')
      fireEvent.click(redBetButton)
      
      expect(screen.getByText(/maximum bet is/i)).toBeInTheDocument()
    })

    it('validates sufficient balance', () => {
      // Mock insufficient balance - this would need to be handled differently in actual implementation
      // For now, we'll skip this test as it requires module mocking which is different in Bun

      renderWithProviders(<RouletteWheel />)
      
      const betInput = screen.getByDisplayValue('100')
      fireEvent.change(betInput, { target: { value: '100' } })
      
      const redBetButton = screen.getByText('Red')
      fireEvent.click(redBetButton)
      
      expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      // Mock API error
      global.fetch = mock(() => Promise.resolve({
        ok: false,
        json: async () => ({
          success: false,
          error: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient balance for this bet'
        })
      }))

      renderWithProviders(<RouletteWheel />)
      
      const redBetButton = screen.getByText('Red')
      const spinButton = screen.getByRole('button', { name: /spin/i })
      
      fireEvent.click(redBetButton)
      fireEvent.click(spinButton)
      
      await waitFor(() => {
        expect(screen.getByText(/insufficient balance for this bet/i)).toBeInTheDocument()
      })
    })

    it('handles network errors', async () => {
      // Mock network error
      global.fetch = mock(() => Promise.reject(new Error('Network error')))

      renderWithProviders(<RouletteWheel />)
      
      const redBetButton = screen.getByText('Red')
      const spinButton = screen.getByRole('button', { name: /spin/i })
      
      fireEvent.click(redBetButton)
      fireEvent.click(spinButton)
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithProviders(<RouletteWheel />)
      
      const spinButton = screen.getByRole('button', { name: /spin/i })
      expect(spinButton).toHaveAttribute('aria-label')
      
      const betInput = screen.getByDisplayValue('100')
      expect(betInput).toHaveAttribute('aria-label')
    })

    it('announces game results to screen readers', async () => {
      renderWithProviders(<RouletteWheel />)
      
      const redBetButton = screen.getByText('Red')
      const spinButton = screen.getByRole('button', { name: /spin/i })
      
      fireEvent.click(redBetButton)
      fireEvent.click(spinButton)
      
      await waitFor(() => {
        const resultAnnouncement = screen.getByRole('status')
        expect(resultAnnouncement).toBeInTheDocument()
      })
    })

    it('supports keyboard navigation', () => {
      renderWithProviders(<RouletteWheel />)
      
      const redBetButton = screen.getByText('Red')
      const spinButton = screen.getByRole('button', { name: /spin/i })
      
      // Should be focusable
      redBetButton.focus()
      expect(document.activeElement).toBe(redBetButton)
      
      spinButton.focus()
      expect(document.activeElement).toBe(spinButton)
    })
  })

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      renderWithProviders(<RouletteWheel />)
      
      // Should show mobile-optimized layout
      expect(screen.getByTestId('mobile-roulette-layout')).toBeInTheDocument()
    })

    it('shows desktop layout on larger screens', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      renderWithProviders(<RouletteWheel />)
      
      // Should show desktop layout
      expect(screen.getByTestId('desktop-roulette-layout')).toBeInTheDocument()
    })
  })

  describe('Game Statistics', () => {
    it('displays recent winning numbers', () => {
      renderWithProviders(<RouletteWheel />)
      
      expect(screen.getByText(/recent numbers/i)).toBeInTheDocument()
    })

    it('shows hot and cold numbers', () => {
      renderWithProviders(<RouletteWheel />)
      
      expect(screen.getByText(/hot numbers/i)).toBeInTheDocument()
      expect(screen.getByText(/cold numbers/i)).toBeInTheDocument()
    })

    it('displays payout information', () => {
      renderWithProviders(<RouletteWheel />)
      
      expect(screen.getByText(/payouts/i)).toBeInTheDocument()
      expect(screen.getByText(/35:1/)).toBeInTheDocument() // Single number payout
      expect(screen.getByText(/1:1/)).toBeInTheDocument() // Even money payout
    })
  })
})