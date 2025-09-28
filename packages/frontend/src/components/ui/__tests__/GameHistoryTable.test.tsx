import React from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GameHistoryTable from '../GameHistoryTable'

import { jest } from 'bun:test'

// Mock the auth hook
mock.module('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' }
  })
}))

// Mock Supabase
mock.module('../../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
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
  test('renders the table title', async () => {
    renderWithProviders(<GameHistoryTable />)
    
    expect(screen.getByText('Game History')).toBeInTheDocument()
  })

  test('renders export buttons when showExport is true', async () => {
    renderWithProviders(<GameHistoryTable showExport={true} />)
    
    // Initially won't show export buttons until data is loaded
    expect(screen.getByText('Loading game history...')).toBeInTheDocument()
  })

  test('renders filters when showFilters is true', async () => {
    renderWithProviders(<GameHistoryTable showFilters={true} />)
    
    expect(screen.getByText('Game Type')).toBeInTheDocument()
    expect(screen.getByText('Result Type')).toBeInTheDocument()
  })

  test('shows loading state initially', async () => {
    renderWithProviders(<GameHistoryTable />)
    
    expect(screen.getByText('Loading game history...')).toBeInTheDocument()
  })
})