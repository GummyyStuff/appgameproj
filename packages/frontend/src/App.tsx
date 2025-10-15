import QueryProvider from './components/providers/QueryProvider'
import { AuthProvider } from './hooks/useAuth'
import ToastProvider from './components/providers/ToastProvider'
import { PerformanceProvider } from './components/providers/PerformanceProvider'
import AppRouter from './router/AppRouter'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { AuthErrorBoundary } from './components/auth/AuthErrorBoundary'
import { PerformanceToggle } from './components/ui/PerformanceMonitor'
import { ChatDock } from './components/chat/ChatDock'
import { WebVitalsMonitor } from './components/monitoring/WebVitalsMonitor'
import { useAuth } from './hooks/useAuth'
import './index.css'

function AppContent() {
  const { user } = useAuth()
  
  return (
    <PerformanceProvider userId={user?.id}>
      <WebVitalsMonitor />
      <AppRouter />
      <PerformanceToggle />
      <ChatDock />
    </PerformanceProvider>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthErrorBoundary>
          <AuthProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </AuthProvider>
        </AuthErrorBoundary>
      </QueryProvider>
    </ErrorBoundary>
  )
}

export default App