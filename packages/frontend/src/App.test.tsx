import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import App from './App'

// Mock Supabase
vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    })
  }
}))

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    // Just check that the app renders without throwing an error
    expect(document.body).toBeDefined()
  })
})