import QueryProvider from './components/providers/QueryProvider'
import { AuthProvider } from './hooks/useAuth'
import ToastProvider from './components/providers/ToastProvider'
import { PerformanceProvider } from './components/providers/PerformanceProvider'
import AppRouter from './router/AppRouter'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { PerformanceToggle } from './components/ui/PerformanceMonitor'
import { ChatDock } from './components/chat/ChatDock'
import { useAuth } from './hooks/useAuth'
import './index.css'

function AppContent() {
  const { user } = useAuth()
  
  return (
    <PerformanceProvider userId={user?.id}>
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
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}

export default App