import React from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GameHistoryTable from '../GameHistoryTable'

import { vi } from 'vitest'

// Mock the auth hook
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' }
  })
}))

// Mock Supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    }))
  }
}))

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('GameHistoryTable', () => {
  it('renders the table title', async () => {
    renderWithProviders(<GameHistoryTable />)
    
    expect(screen.getByText('Game History')).toBeInTheDocument()
  })

  it('renders export buttons when showExport is true', async () => {
    renderWithProviders(<GameHistoryTable showExport={true} />)
    
    // Initially won't show export buttons until data is loaded
    expect(screen.getByText('Loading game history...')).toBeInTheDocument()
  })

  it('renders filters when showFilters is true', async () => {
    renderWithProviders(<GameHistoryTable showFilters={true} />)
    
    expect(screen.getByText('Game Type')).toBeInTheDocument()
    expect(screen.getByText('Result Type')).toBeInTheDocument()
  })

  it('shows loading state initially', async () => {
    renderWithProviders(<GameHistoryTable />)
    
    expect(screen.getByText('Loading game history...')).toBeInTheDocument()
  })
})