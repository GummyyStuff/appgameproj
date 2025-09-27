/**
 * Global test setup for Bun tests
 * Sets up DOM environment for React testing
 */

// Setup DOM environment for React tests using happy-dom
import { Window } from 'happy-dom';

const window = new Window();

// Set up global DOM APIs
Object.defineProperty(globalThis, 'window', { value: window, writable: true });
Object.defineProperty(globalThis, 'document', { value: window.document, writable: true });
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, writable: true });
Object.defineProperty(globalThis, 'localStorage', { value: window.localStorage, writable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: window.sessionStorage, writable: true });
Object.defineProperty(globalThis, 'location', { value: window.location, writable: true });
Object.defineProperty(globalThis, 'history', { value: window.history, writable: true });

// Set up global test utilities
global.testUtils = {
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
