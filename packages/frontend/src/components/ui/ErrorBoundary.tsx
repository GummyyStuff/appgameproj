import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    
    // Log additional context for debugging
    console.error('Environment:', {
      mode: import.meta.env.MODE,
      prod: import.meta.env.PROD,
      dev: import.meta.env.DEV,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING',
      apiUrl: import.meta.env.VITE_API_URL ? 'SET' : 'MISSING'
    })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-tarkov-darker flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">💥</div>
            <h1 className="text-2xl font-tarkov font-bold text-tarkov-danger mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-400 mb-6">
              We're sorry, but something unexpected happened. Please refresh the page and try again.
            </p>
            {!import.meta.env.PROD && this.state.error && (
              <div className="text-left bg-gray-800 p-4 rounded-lg mb-4 text-sm">
                <p className="text-red-400 font-semibold mb-2">Error Details:</p>
                <p className="text-gray-300">{this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="text-xs text-gray-400 mt-2 overflow-auto">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-tarkov-accent hover:bg-orange-500 text-tarkov-dark font-semibold rounded-lg transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary