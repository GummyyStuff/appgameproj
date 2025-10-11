import React from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StatisticsDashboard from '../StatisticsDashboard'

import { jest, mock, describe, test, expect, beforeEach } from 'bun:test'

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
            gte: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        }))
      }))
    }))
  }
}))

// Mock recharts components
mock.module('recharts', () => ({
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

describe.skip('StatisticsDashboard - SKIPPED: DOM environment issues in full suite', () => {
  test('renders the dashboard title', async () => {
    renderWithProviders(<StatisticsDashboard />)
    
    expect(screen.getByText('Statistics Dashboard')).toBeInTheDocument()
  })

  test('renders time range selector', async () => {
    renderWithProviders(<StatisticsDashboard />)
    
    expect(screen.getByDisplayValue('Last 30 Days')).toBeInTheDocument()
  })

  test('renders chart type selector', async () => {
    renderWithProviders(<StatisticsDashboard />)
    
    expect(screen.getByDisplayValue('Profit Trend')).toBeInTheDocument()
  })

  test('shows loading state initially', async () => {
    renderWithProviders(<StatisticsDashboard />)
    
    expect(screen.getByText('Loading statistics...')).toBeInTheDocument()
  })
})