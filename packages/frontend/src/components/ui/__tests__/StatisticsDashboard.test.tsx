import React from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StatisticsDashboard from '../StatisticsDashboard'

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
            gte: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        }))
      }))
    }))
  }
}))

// Mock recharts components
vi.mock('recharts', () => ({
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>
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

describe('StatisticsDashboard', () => {
  it('renders the dashboard title', async () => {
    renderWithProviders(<StatisticsDashboard />)
    
    expect(screen.getByText('Statistics Dashboard')).toBeInTheDocument()
  })

  it('renders time range selector', async () => {
    renderWithProviders(<StatisticsDashboard />)
    
    expect(screen.getByDisplayValue('Last 30 Days')).toBeInTheDocument()
  })

  it('renders chart type selector', async () => {
    renderWithProviders(<StatisticsDashboard />)
    
    expect(screen.getByDisplayValue('Profit Trend')).toBeInTheDocument()
  })

  it('shows loading state initially', async () => {
    renderWithProviders(<StatisticsDashboard />)
    
    expect(screen.getByText('Loading statistics...')).toBeInTheDocument()
  })
})