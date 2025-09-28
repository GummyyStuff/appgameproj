import { Component, ErrorInfo, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useErrorTracking } from '../../utils/error-tracking'
import { TarkovCard } from '../ui/TarkovCard'

interface Props {
  children: ReactNode
  gameType?: string
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorId?: string
  retryCount: number
}

class CaseOpeningErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null

  public state: State = {
    hasError: false,
    retryCount: 0
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      retryCount: 0
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { gameType, onError } = this.props

    // Use error tracking if available
    if (typeof window !== 'undefined' && (window as any).errorTracker) {
      ;(window as any).errorTracker.captureGameError(error, gameType || 'case_opening', {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        gameType: gameType || 'case_opening'
      })
    }

    // Log detailed error information
    console.error('Case Opening Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      gameType: gameType || 'case_opening',
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    })

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo)
    }
  }

  private handleRetry = () => {
    const { retryCount } = this.state

    if (retryCount < 3) {
      this.setState(prev => ({ retryCount: prev.retryCount + 1 }))

      // Exponential backoff for retries
      const delay = Math.pow(2, retryCount) * 1000

      this.retryTimeout = setTimeout(() => {
        this.setState({
          hasError: false,
          error: undefined,
          errorId: undefined,
          retryCount: 0
        })
      }, delay)
    }
  }

  private handleRefresh = () => {
    window.location.reload()
  }

  private handleReportError = () => {
    const { error, errorId } = this.state

    if (error && typeof window !== 'undefined' && (window as any).errorTracker) {
      ;(window as any).errorTracker.collectFeedback({
        type: 'bug',
        message: `Game Error: ${error.message}`,
        rating: 1
      })
    }

    // Show success message
    alert('Thank you for reporting this error. Our team has been notified.')
  }

  public componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }
  }

  public render() {
    if (this.state.hasError) {
      const { error, retryCount } = this.state
      const { fallback, gameType = 'case opening' } = this.props
      const canRetry = retryCount < 3

      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-tarkov-darker via-tarkov-dark to-tarkov-primary flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-2xl"
          >
            <TarkovCard className="p-6 md:p-8">
              <motion.div
                className="text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {/* Error Icon */}
                <motion.div
                  className="text-6xl md:text-7xl mb-6"
                  animate={{
                    rotate: [0, -5, 5, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  💥
                </motion.div>

                {/* Error Title */}
                <motion.h1
                  className="text-2xl md:text-3xl font-tarkov font-bold text-tarkov-danger mb-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Oops! Something went wrong with {gameType}
                </motion.h1>

                {/* Error Message */}
                <motion.div
                  className="text-gray-300 mb-6 text-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="mb-4">
                    We encountered an unexpected error while processing your {gameType} request.
                  </p>

                  {error && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4 text-left">
                      <p className="text-red-400 font-semibold mb-2">Error Details:</p>
                      <p className="text-gray-300 text-sm font-mono break-words">
                        {error.message}
                      </p>
                    </div>
                  )}

                  {retryCount > 0 && (
                    <p className="text-yellow-400 text-sm mb-4">
                      Retry attempt {retryCount} of 3...
                    </p>
                  )}
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  className="flex flex-col sm:flex-row gap-3 justify-center items-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {canRetry && (
                    <motion.button
                      onClick={this.handleRetry}
                      className="px-6 py-3 bg-tarkov-accent hover:bg-orange-500 text-tarkov-dark font-semibold rounded-lg transition-all duration-300 flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span>🔄</span>
                      Try Again {retryCount > 0 && `(${retryCount}/3)`}
                    </motion.button>
                  )}

                  <motion.button
                    onClick={this.handleRefresh}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-all duration-300 flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>🔄</span>
                    Refresh Page
                  </motion.button>

                  <motion.button
                    onClick={this.handleReportError}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all duration-300 flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>📋</span>
                    Report Error
                  </motion.button>
                </motion.div>

                {/* Additional Help */}
                <motion.div
                  className="mt-8 text-sm text-gray-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <p className="mb-2">
                    If this problem persists, please try:
                  </p>
                  <ul className="text-left list-disc list-inside space-y-1">
                    <li>Refreshing the page</li>
                    <li>Clearing your browser cache</li>
                    <li>Checking your internet connection</li>
                    <li>Contacting our support team</li>
                  </ul>

                  {!import.meta.env.PROD && (
                    <div className="mt-4 p-3 bg-gray-800 rounded text-xs">
                      <p className="text-yellow-400 font-semibold mb-1">Development Info:</p>
                      <p>Error ID: {this.state.errorId}</p>
                      <p>Game Type: {gameType}</p>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            </TarkovCard>
          </motion.div>
        </div>
      )
    }

    return this.props.children
  }
}

export default CaseOpeningErrorBoundary
