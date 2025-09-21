import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mock } from 'bun:test'
import { describe, it, expect, beforeEach } from 'bun:test'
import PlinkoGame from '../PlinkoGame'
import { AuthContext } from '../../../hooks/useAuth'

// Mock the balance hook
const mockUseBalance = () => ({
  balance: 1000,
  refetch: mock()
})

const mockUseSoundEffects = () => ({
  playBetSound: mock(),
  playWinSound: mock(),
  playLoseSound: mock()
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

describe('PlinkoGame', () => {
  beforeEach(() => {
    // Mock successful API response
    global.fetch = mock(() => Promise.resolve({
      ok: true,
      json: async () => ({
        board_config: {
          rows: 4,
          slots: 9,
          startingPosition: 4,
          multipliers: {
            low: [1.5, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.5],
            medium: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
            high: [29, 4, 1.5, 1.1, 1.0, 1.1, 1.5, 4, 29]
          }
        },
        risk_levels: {
          low: {
            description: 'Lower risk with consistent smaller wins',
            maxMultiplier: 1.5,
            minMultiplier: 0.5,
            expectedReturn: 0.98
          },
          medium: {
            description: 'Balanced risk with moderate potential wins',
            maxMultiplier: 5.6,
            minMultiplier: 0.5,
            expectedReturn: 0.99
          },
          high: {
            description: 'High risk with potential for massive wins',
            maxMultiplier: 29,
            minMultiplier: 1.0,
            expectedReturn: 0.99
          }
        }
      })
    }))
  })

  it('renders the game title and description', async () => {
    renderWithProviders(<PlinkoGame />)
    
    await waitFor(() => {
      expect(screen.getByText('Plinko Drop')).toBeInTheDocument()
      expect(screen.getByText(/Drop the ball and watch it bounce/)).toBeInTheDocument()
    })
  })

  it('renders loading state initially', () => {
    renderWithProviders(<PlinkoGame />)
    
    expect(screen.getByText('Loading Plinko game...')).toBeInTheDocument()
  })

  it('renders betting controls after loading', async () => {
    renderWithProviders(<PlinkoGame />)
    
    await waitFor(() => {
      expect(screen.getByText('Place Your Bet')).toBeInTheDocument()
      expect(screen.getByText('Risk Level')).toBeInTheDocument()
      expect(screen.getByText('Bet Amount')).toBeInTheDocument()
    })
  })

  it('renders risk level options', async () => {
    renderWithProviders(<PlinkoGame />)
    
    await waitFor(() => {
      expect(screen.getByText('low')).toBeInTheDocument()
      expect(screen.getByText('medium')).toBeInTheDocument()
      expect(screen.getByText('high')).toBeInTheDocument()
    })
  })

  it('renders drop ball button', async () => {
    renderWithProviders(<PlinkoGame />)
    
    await waitFor(() => {
      expect(screen.getByText('Drop Ball')).toBeInTheDocument()
    })
  })

  it('displays current bet summary', async () => {
    renderWithProviders(<PlinkoGame />)
    
    await waitFor(() => {
      expect(screen.getByText('Current Bet')).toBeInTheDocument()
      expect(screen.getAllByText('Risk Level:')[0]).toBeInTheDocument()
      expect(screen.getByText('Amount:')).toBeInTheDocument()
      expect(screen.getByText('Max Win:')).toBeInTheDocument()
    })
  })
})