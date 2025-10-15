/**
 * Happy DOM Preload Script for Bun Tests
 * Registers browser-like DOM APIs globally for testing React components
 */

import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Register Happy DOM globals (document, window, etc.)
GlobalRegistrator.register();

// Ensure document structure exists and is properly set up
if (typeof document !== 'undefined') {
  // Create body if it doesn't exist
  if (!document.body) {
    const body = document.createElement('body');
    document.documentElement.appendChild(body);
  }
  
  // Create head if it doesn't exist
  if (!document.head) {
    const head = document.createElement('head');
    document.documentElement.appendChild(head);
  }
}

