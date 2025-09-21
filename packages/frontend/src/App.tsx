import QueryProvider from './components/providers/QueryProvider'
import AuthProvider from './components/providers/AuthProvider'
import AppRouter from './router/AppRouter'
import ErrorBoundary from './components/ui/ErrorBoundary'
import './index.css'

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}

export default App