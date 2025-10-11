/**
 * Happy DOM Preload Script for Bun Tests
 * Registers browser-like DOM APIs globally for testing React components
 */

import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Register Happy DOM globals (document, window, etc.)
GlobalRegistrator.register();

// Ensure document.body exists
if (typeof document !== 'undefined' && !document.body) {
  document.body = document.createElement('body');
  document.documentElement.appendChild(document.body);
}

