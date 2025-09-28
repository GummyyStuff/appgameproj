/**
 * BlackjackGame Component Tests
 * Tests for blackjack game interface and interactions
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mock } from 'bun:test'
import { describe, test, expect } from 'bun:test'
import BlackjackGame from '../BlackjackGame'
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
  playCardSound: mock()
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

describe('BlackjackGame', () => {
  beforeEach(() => {
    // Mock successful game start response
    global.fetch = mock(() => Promise.resolve({
      ok: true,
      json: async () => ({
        success: true,
        gameId: 'test-game-123',
        gameState: {
          player_hand: [
            { suit: 'hearts', value: 'K' },
            { suit: 'spades', value: '7' }
          ],
          dealer_hand: [
            { suit: 'diamonds', value: 'A' },
            { suit: 'clubs', value: 'hidden' }
          ],
          player_value: 17,
          dealer_value: 11,
          status: 'playing',
          actions: ['hit', 'stand']
        },
        balance: 900,
        timestamp: '2024-01-15T10:00:00Z'
      })
    }))
  })

  describe('Rendering', () => {
    test('renders the blackjack game interface', () => {
      renderWithProviders(<BlackjackGame />)
      
      expect(screen.getByText('Blackjack')).toBeInTheDocument()
      expect(screen.getByText(/place your bet/i)).toBeInTheDocument()
    })

    test('renders betting controls', () => {
      renderWithProviders(<BlackjackGame />)
      
      expect(screen.getByText('Bet Amount')).toBeInTheDocument()
      expect(screen.getByDisplayValue('100')).toBeInTheDocument() // Default bet amount
      expect(screen.getByRole('button', { name: /deal cards/i })).toBeInTheDocument()
    })

    test('renders quick bet buttons', () => {
      renderWithProviders(<BlackjackGame />)
      
      const quickBetButtons = ['25', '50', '100', '250', '500']
      
      for (const amount of quickBetButtons) {
        expect(screen.getByRole('button', { name: amount })).toBeInTheDocument()
      }
    })
  })

  describe('Game Start', () => {
    test('starts a new game when deal cards is clicked', async () => {
      renderWithProviders(<BlackjackGame />)
      
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/games/blackjack/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          },
          body: JSON.stringify({ amount: 100 })
        })
      })
    })

    test('displays cards after dealing', async () => {
      renderWithProviders(<BlackjackGame />)
      
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        // Player cards
        expect(screen.getByText('K♥')).toBeInTheDocument()
        expect(screen.getByText('7♠')).toBeInTheDocument()
        
        // Dealer cards (one hidden)
        expect(screen.getByText('A♦')).toBeInTheDocument()
        expect(screen.getByText('??')).toBeInTheDocument() // Hidden card
      })
    })

    test('displays hand values', async () => {
      renderWithProviders(<BlackjackGame />)
      
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        expect(screen.getByText(/player: 17/i)).toBeInTheDocument()
        expect(screen.getByText(/dealer: 11/i)).toBeInTheDocument()
      })
    })

    test('shows available actions', async () => {
      renderWithProviders(<BlackjackGame />)
      
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /hit/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /stand/i })).toBeInTheDocument()
      })
    })
  })

  describe('Game Actions', () => {
    beforeEach(async () => {
      renderWithProviders(<BlackjackGame />)
      
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /hit/i })).toBeInTheDocument()
      })
    })

    test('allows hitting for another card', async () => {
      // Mock hit response
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          gameState: {
            player_hand: [
              { suit: 'hearts', value: 'K' },
              { suit: 'spades', value: '7' },
              { suit: 'clubs', value: '3' }
            ],
            dealer_hand: [
              { suit: 'diamonds', value: 'A' },
              { suit: 'clubs', value: 'hidden' }
            ],
            player_value: 20,
            dealer_value: 11,
            status: 'playing',
            actions: ['stand']
          }
        })
      }))

      const hitButton = screen.getByRole('button', { name: /hit/i })
      fireEvent.click(hitButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/games/blackjack/action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          },
          body: JSON.stringify({ 
            gameId: 'test-game-123', 
            action: 'hit' 
          })
        })
      })
    })

    test('allows standing to end turn', async () => {
      // Mock stand response (game complete)
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          gameState: {
            player_hand: [
              { suit: 'hearts', value: 'K' },
              { suit: 'spades', value: '7' }
            ],
            dealer_hand: [
              { suit: 'diamonds', value: 'A' },
              { suit: 'clubs', value: 'K' }
            ],
            player_value: 17,
            dealer_value: 21,
            status: 'dealer_win',
            actions: []
          },
          winAmount: 0,
          balance: 900
        })
      })

      const standButton = screen.getByRole('button', { name: /stand/i })
      fireEvent.click(standButton)
      
      await waitFor(() => {
        expect(screen.getByText(/dealer wins/i)).toBeInTheDocument()
      })
    })

    test('shows double down option when available', async () => {
      // Mock game state with double down available
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          gameId: 'test-game-123',
          gameState: {
            player_hand: [
              { suit: 'hearts', value: '5' },
              { suit: 'spades', value: '6' }
            ],
            dealer_hand: [
              { suit: 'diamonds', value: '10' },
              { suit: 'clubs', value: 'hidden' }
            ],
            player_value: 11,
            dealer_value: 10,
            status: 'playing',
            actions: ['hit', 'stand', 'double']
          },
          balance: 900
        })
      })

      renderWithProviders(<BlackjackGame />)
      
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /double down/i })).toBeInTheDocument()
      })
    })

    test('shows split option when available', async () => {
      // Mock game state with split available
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          gameId: 'test-game-123',
          gameState: {
            player_hand: [
              { suit: 'hearts', value: '8' },
              { suit: 'spades', value: '8' }
            ],
            dealer_hand: [
              { suit: 'diamonds', value: '6' },
              { suit: 'clubs', value: 'hidden' }
            ],
            player_value: 16,
            dealer_value: 6,
            status: 'playing',
            actions: ['hit', 'stand', 'split']
          },
          balance: 900
        })
      })

      renderWithProviders(<BlackjackGame />)
      
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /split/i })).toBeInTheDocument()
      })
    })
  })

  describe('Game Results', () => {
    test('displays player win result', async () => {
      renderWithProviders(<BlackjackGame />)
      
      // Mock game complete with player win
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          gameState: {
            player_hand: [
              { suit: 'hearts', value: 'A' },
              { suit: 'spades', value: 'K' }
            ],
            dealer_hand: [
              { suit: 'diamonds', value: '10' },
              { suit: 'clubs', value: '8' }
            ],
            player_value: 21,
            dealer_value: 18,
            status: 'player_win',
            actions: []
          },
          winAmount: 200,
          balance: 1100
        })
      })

      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        expect(screen.getByText(/you win/i)).toBeInTheDocument()
        expect(screen.getByText(/200/)).toBeInTheDocument() // Win amount
      })
    })

    test('displays blackjack result', async () => {
      renderWithProviders(<BlackjackGame />)
      
      // Mock blackjack result
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          gameState: {
            player_hand: [
              { suit: 'hearts', value: 'A' },
              { suit: 'spades', value: 'K' }
            ],
            dealer_hand: [
              { suit: 'diamonds', value: '10' },
              { suit: 'clubs', value: '7' }
            ],
            player_value: 21,
            dealer_value: 17,
            status: 'blackjack',
            actions: []
          },
          winAmount: 250, // 2.5x payout
          balance: 1150
        })
      })

      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        expect(screen.getByText(/blackjack/i)).toBeInTheDocument()
        expect(screen.getByText(/250/)).toBeInTheDocument() // Blackjack payout
      })
    })

    test('displays dealer win result', async () => {
      renderWithProviders(<BlackjackGame />)
      
      // Mock dealer win
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          gameState: {
            player_hand: [
              { suit: 'hearts', value: 'K' },
              { suit: 'spades', value: '6' }
            ],
            dealer_hand: [
              { suit: 'diamonds', value: 'A' },
              { suit: 'clubs', value: 'K' }
            ],
            player_value: 16,
            dealer_value: 21,
            status: 'dealer_win',
            actions: []
          },
          winAmount: 0,
          balance: 900
        })
      })

      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        expect(screen.getByText(/dealer wins/i)).toBeInTheDocument()
      })
    })

    test('displays push result', async () => {
      renderWithProviders(<BlackjackGame />)
      
      // Mock push result
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          gameState: {
            player_hand: [
              { suit: 'hearts', value: 'K' },
              { suit: 'spades', value: '10' }
            ],
            dealer_hand: [
              { suit: 'diamonds', value: 'Q' },
              { suit: 'clubs', value: 'J' }
            ],
            player_value: 20,
            dealer_value: 20,
            status: 'push',
            actions: []
          },
          winAmount: 100, // Bet returned
          balance: 1000
        })
      })

      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        expect(screen.getByText(/push/i)).toBeInTheDocument()
        expect(screen.getByText(/tie/i)).toBeInTheDocument()
      })
    })
  })

  describe('Validation', () => {
    test('validates minimum bet amount', () => {
      renderWithProviders(<BlackjackGame />)
      
      const betInput = screen.getByDisplayValue('100')
      fireEvent.change(betInput, { target: { value: '0' } })
      
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      expect(screen.getByText(/minimum bet is/i)).toBeInTheDocument()
    })

    test('validates maximum bet amount', () => {
      renderWithProviders(<BlackjackGame />)
      
      const betInput = screen.getByDisplayValue('100')
      fireEvent.change(betInput, { target: { value: '10001' } })
      
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      expect(screen.getByText(/maximum bet is/i)).toBeInTheDocument()
    })

    test('validates sufficient balance', () => {
      // Mock insufficient balance
      jest.mocked(require('../../../hooks/useBalance').useBalance).mockReturnValue({
        balance: 50,
        refetch: mock()
      })

      renderWithProviders(<BlackjackGame />)
      
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument()
    })
  })

  describe('Card Display', () => {
    test('displays cards with correct suits and values', async () => {
      renderWithProviders(<BlackjackGame />)
      
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        // Check card display format
        expect(screen.getByText('K♥')).toBeInTheDocument() // King of Hearts
        expect(screen.getByText('7♠')).toBeInTheDocument() // 7 of Spades
        expect(screen.getByText('A♦')).toBeInTheDocument() // Ace of Diamonds
      })
    })

    test('shows hidden dealer card', async () => {
      renderWithProviders(<BlackjackGame />)
      
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        expect(screen.getByText('??')).toBeInTheDocument() // Hidden card
      })
    })

    test('reveals dealer card when game ends', async () => {
      renderWithProviders(<BlackjackGame />)
      
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stand/i })).toBeInTheDocument()
      })

      // Mock stand response with revealed dealer card
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          gameState: {
            player_hand: [
              { suit: 'hearts', value: 'K' },
              { suit: 'spades', value: '7' }
            ],
            dealer_hand: [
              { suit: 'diamonds', value: 'A' },
              { suit: 'clubs', value: '6' } // Revealed
            ],
            player_value: 17,
            dealer_value: 17,
            status: 'push',
            actions: []
          }
        })
      })

      const standButton = screen.getByRole('button', { name: /stand/i })
      fireEvent.click(standButton)
      
      await waitFor(() => {
        expect(screen.getByText('6♣')).toBeInTheDocument() // Revealed dealer card
      })
    })
  })

  describe('Game Flow', () => {
    test('allows starting new game after completion', async () => {
      renderWithProviders(<BlackjackGame />)
      
      // Complete a game
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stand/i })).toBeInTheDocument()
      })

      // Mock game completion
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          gameState: {
            status: 'dealer_win',
            actions: []
          }
        })
      })

      const standButton = screen.getByRole('button', { name: /stand/i })
      fireEvent.click(standButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument()
      })
    })

    test('disables actions during API calls', async () => {
      renderWithProviders(<BlackjackGame />)
      
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      // Button should be disabled during API call
      expect(dealButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    test('has proper ARIA labels for cards', async () => {
      renderWithProviders(<BlackjackGame />)
      
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        const kingOfHearts = screen.getByText('K♥')
        expect(kingOfHearts).toHaveAttribute('aria-label', 'King of Hearts')
      })
    })

    test('announces game results to screen readers', async () => {
      renderWithProviders(<BlackjackGame />)
      
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        const gameStatus = screen.getByRole('status')
        expect(gameStatus).toBeInTheDocument()
      })
    })

    test('supports keyboard navigation', async () => {
      renderWithProviders(<BlackjackGame />)
      
      const dealButton = screen.getByRole('button', { name: /deal cards/i })
      fireEvent.click(dealButton)
      
      await waitFor(() => {
        const hitButton = screen.getByRole('button', { name: /hit/i })
        const standButton = screen.getByRole('button', { name: /stand/i })
        
        // Should be focusable
        hitButton.focus()
        expect(document.activeElement).toBe(hitButton)
        
        standButton.focus()
        expect(document.activeElement).toBe(standButton)
      })
    })
  })
})