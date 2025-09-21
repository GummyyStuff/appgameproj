import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'

// Simple debug component to test React loading
function DebugApp() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#1a1a1a', 
      color: 'white', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>🔍 Debug Mode - React is Working!</h1>
      <div style={{ marginTop: '20px' }}>
        <h2>Environment Variables:</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL || 'MISSING'}</li>
          <li>VITE_SUPABASE_ANON_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'}</li>
          <li>VITE_API_URL: {import.meta.env.VITE_API_URL || 'MISSING'}</li>
          <li>MODE: {import.meta.env.MODE}</li>
          <li>PROD: {import.meta.env.PROD ? 'true' : 'false'}</li>
        </ul>
      </div>
      <div style={{ marginTop: '20px' }}>
        <h2>React Features Test:</h2>
        <TestComponent />
      </div>
    </div>
  )
}

import { useState } from 'react'

function TestComponent() {
  const [count, setCount] = useState(0)
  
  return (
    <div>
      <p>useState test: {count}</p>
      <button 
        onClick={() => setCount(c => c + 1)}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: '#ff6b35', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Click me ({count})
      </button>
    </div>
  )
}

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element not found')
}

const root = createRoot(container)
root.render(
  <StrictMode>
    <DebugApp />
  </StrictMode>
)