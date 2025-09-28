/**
 * React Testing Setup for Bun Test Runner
 * Provides proper React Testing Library setup for hook testing
 */

import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import React from 'react'

// Mock DOM environment
global.document = {
  body: {},
  createElement: () => ({}),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
} as any

global.window = {
  location: { href: 'http://localhost:3000' },
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  },
  sessionStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  },
} as any

// Mock fetch
global.fetch = () => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
} as Response)

// Mock performance API
global.performance = {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {},
  getEntriesByType: () => [],
  getEntriesByName: () => [],
} as any

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 16) as any
}

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id)
}

// Create a test wrapper with providers
export const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  })

  return ({ children }: { children: ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

// Export testing utilities
export { renderHook, act }
export * from '@testing-library/react'

// Mock function helper
export const mock = (implementation?: any) => {
  return (implementation || (() => {}))
}

// Mock module helper
export const mockModule = (moduleName: string, implementation: any) => {
  // Bun doesn't support jest.mock, so we'll use a different approach
  console.log(`Mocking module: ${moduleName}`)
}
