import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initSentry } from './lib/sentry'

// Initialize Sentry for error tracking
initSentry()

// Import auth test helpers in development
if (import.meta.env.DEV) {
  import('./test-utils/auth-test-helper');
}

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element not found')
}

const root = createRoot(container)
root.render(
  <StrictMode>
    <App />
  </StrictMode>
)