import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth, API_URL } from '../hooks/useAuth'
import { FontAwesomeSVGIcons } from '../components/ui/FontAwesomeSVG'

const LoginPage: React.FC = () => {
  const { user, loading, signInWithDiscord, refreshUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [testEmail, setTestEmail] = useState('')
  const [testPassword, setTestPassword] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testError, setTestError] = useState('')

  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    }
  }, [user, navigate, location])

  const handleDiscordLogin = async () => {
    try {
      await signInWithDiscord()
      // User will be redirected to Discord OAuth
    } catch (error) {
      console.error('Failed to initiate Discord login:', error)
    }
  }

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setTestError('')
    setTestLoading(true)

    try {
      // Call backend test-login endpoint which sets session cookie
      const response = await fetch(`${API_URL}/auth/test-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Login failed' }))
        throw new Error(errorData.message || 'Login failed')
      }

      console.log('✅ Test login successful')

      // Refresh user data
      await refreshUser()

      // Navigate to home
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (error: any) {
      console.error('❌ Test login failed:', error)
      
      // Parse error messages
      const errorMessage = error.message || 'Login failed. Please try again.'
      
      if (errorMessage.includes('Invalid email or password')) {
        setTestError('Invalid email or password')
      } else if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
        setTestError('Too many attempts. Please wait a minute.')
      } else {
        setTestError(errorMessage)
      }
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12 animate-fade-in">
      <div className="bg-tarkov-dark rounded-lg p-8 shadow-lg border border-tarkov-secondary hover:border-tarkov-accent transition-all duration-300">
        <div className="text-center mb-8">
          <FontAwesomeSVGIcons.Gamepad className="text-tarkov-accent mx-auto mb-4 animate-bounce" size={48} />
          <h1 className="text-3xl font-tarkov font-bold text-tarkov-accent">Login</h1>
          <p className="text-gray-400 mt-2">Welcome back, Operator</p>
        </div>

        <div className="space-y-4">
          {/* Discord Login */}
          <button
            onClick={handleDiscordLogin}
            disabled={loading}
            className="w-full py-3 px-4 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:ring-offset-2 focus:ring-offset-tarkov-dark flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </span>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/>
                </svg>
                <span>Login with Discord</span>
              </>
            )}
          </button>

          {/* Test Account Login (Development Only) */}
          {isDevelopment && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-tarkov-dark text-gray-400">Or test with</span>
                </div>
              </div>

              <form onSubmit={handleTestLogin} className="space-y-3">
                <div>
                  <label htmlFor="test-email" className="block text-sm font-medium text-gray-300 mb-1">
                    Test Email
                  </label>
                  <input
                    id="test-email"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    className="w-full px-3 py-2 bg-tarkov-secondary border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tarkov-accent focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="test-password" className="block text-sm font-medium text-gray-300 mb-1">
                    Test Password
                  </label>
                  <input
                    id="test-password"
                    type="password"
                    value={testPassword}
                    onChange={(e) => setTestPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-tarkov-secondary border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tarkov-accent focus:border-transparent"
                    required
                  />
                </div>

                {testError && (
                  <div className="text-red-500 text-sm text-center">
                    {testError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={testLoading}
                  className="w-full py-2 px-4 bg-tarkov-accent hover:bg-tarkov-accent/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-tarkov-accent focus:ring-offset-2 focus:ring-offset-tarkov-dark"
                >
                  {testLoading ? 'Logging in...' : 'Test Login'}
                </button>
              </form>

              <div className="text-xs text-gray-500 text-center">
                🔧 Development Mode: Test accounts only work locally
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            By logging in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
