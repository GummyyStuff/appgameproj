/**
 * Global test setup for Bun tests
 * Additional test utilities and configurations
 * Note: DOM setup is handled by happydom.ts using GlobalRegistrator
 */

import { afterEach } from 'bun:test';

// Global cleanup after each test to prevent interference
afterEach(() => {
  // Try to cleanup React Testing Library if available (frontend tests)
  try {
    const { cleanup } = require('@testing-library/react');
    cleanup();
  } catch {
    // Not available in backend tests, that's fine
  }
  
  // Note: Don't manually clear document.body as it can break Happy DOM
  // cleanup() from @testing-library/react handles this for us
});

// Set up global test utilities
(global as any).testUtils = {
  // Add any global test utilities here
  createMockQueryClient: () => {
    try {
      const { QueryClient } = require('@tanstack/react-query');
      return new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
    } catch {
      // Not available in backend tests
      return null;
    }
  },
};
