/**
 * Auth Error Boundary Component
 * Catches authentication errors and redirects users to login
 */

import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log authentication errors
    console.error('🚨 Auth Error Boundary caught error:', error);
    console.error('Error info:', errorInfo);

    // Check if it's an authentication error
    const isAuthError =
      error.message?.includes('401') ||
      error.message?.includes('403') ||
      error.message?.includes('authentication') ||
      error.message?.includes('session') ||
      error.message?.includes('unauthorized') ||
      error.message?.toLowerCase().includes('not authenticated');

    if (isAuthError) {
      console.log('🔄 Redirecting to login due to auth error...');
      
      // Clear any stored auth data
      try {
        localStorage.removeItem('user');
        sessionStorage.clear();
      } catch (e) {
        console.error('Failed to clear storage:', e);
      }

      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/login?error=session_expired';
      }, 1500);
    }
  }

  render() {
    if (this.state.hasError) {
      const isAuthError =
        this.state.error?.message?.includes('401') ||
        this.state.error?.message?.includes('403') ||
        this.state.error?.message?.includes('authentication') ||
        this.state.error?.message?.includes('session') ||
        this.state.error?.message?.includes('unauthorized');

      if (isAuthError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <div className="text-center p-8 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 max-w-md">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 mx-auto text-yellow-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Session Expired
              </h2>
              <p className="text-gray-300 mb-4">
                Your session has expired or is invalid. Redirecting to login...
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            </div>
          </div>
        );
      }

      // Non-auth error
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="text-center p-8 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 max-w-md">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-300 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;

