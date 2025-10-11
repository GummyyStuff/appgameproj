/**
 * Global test setup for Bun tests
 * Additional test utilities and configurations
 * Note: DOM setup is handled by happydom.ts using GlobalRegistrator
 */

import { afterEach } from 'bun:test';
import { cleanup } from '@testing-library/react';

// Global cleanup after each test to prevent interference
afterEach(() => {
  // Clean up React Testing Library (this also clears the DOM)
  cleanup();
  
  // Note: Don't manually clear document.body as it can break Happy DOM
  // cleanup() from @testing-library/react handles this for us
});

// Set up global test utilities
(global as any).testUtils = {
  // Add any global test utilities here
  createMockQueryClient: () => {
    const { QueryClient } = require('@tanstack/react-query');
    return new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  },
};
