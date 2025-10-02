import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { FontAwesomeSVGIcons } from '../components/ui/FontAwesomeSVG'

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    }
  }, [user, navigate, location])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      setEmailError('Email is required')
      return false
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address')
      return false
    }
    setEmailError('')
    return true
  }

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('Password is required')
      return false
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return false
    }
    setPasswordError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate inputs
    const isEmailValid = validateEmail(email)
    const isPasswordValid = validatePassword(password)

    if (!isEmailValid || !isPasswordValid) {
      setLoading(false)
      return
    }

    const { error } = await signIn(email, password)
    
    if (error) {
      setError(error.message)
    } else {
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    }
    
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto mt-12 animate-fade-in">
      <div className="bg-tarkov-dark rounded-lg p-8 shadow-lg border border-tarkov-secondary hover:border-tarkov-accent transition-all duration-300">
        <div className="text-center mb-8">
          <FontAwesomeSVGIcons.Gamepad className="text-tarkov-accent mx-auto mb-4 animate-bounce" size={48} />
          <h1 className="text-3xl font-tarkov font-bold text-tarkov-accent">Login</h1>
          <p className="text-gray-400 mt-2">Welcome back, Operator</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (emailError) validateEmail(e.target.value)
              }}
              onBlur={() => validateEmail(email)}
              className={`w-full px-3 py-2 bg-tarkov-secondary border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-tarkov-accent focus:border-transparent transition-all duration-200 ${
                emailError ? 'border-tarkov-danger' : 'border-tarkov-primary'
              }`}
              placeholder="Enter your email address"
            />
            {emailError && (
              <p className="text-tarkov-danger text-sm mt-1 animate-pulse">{emailError}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (passwordError) validatePassword(e.target.value)
                }}
                onBlur={() => validatePassword(password)}
                className={`w-full px-3 py-2 pr-10 bg-tarkov-secondary border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-tarkov-accent focus:border-transparent transition-all duration-200 ${
                  passwordError ? 'border-tarkov-danger' : 'border-tarkov-primary'
                }`}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <FontAwesomeSVGIcons.Eye className="text-gray-400" size={16} />
                ) : (
                  <FontAwesomeSVGIcons.EyeSlash className="text-gray-400" size={16} />
                )}
              </button>
            </div>
            {passwordError && (
              <p className="text-tarkov-danger text-sm mt-1 animate-pulse">{passwordError}</p>
            )}
          </div>

          {error && (
            <div className="bg-tarkov-danger bg-opacity-20 border border-tarkov-danger rounded-md p-3 animate-shake">
              <div className="flex items-center space-x-2">
                <span className="text-white">⚠️</span>
                <p className="text-white text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-tarkov-accent hover:bg-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-tarkov-dark font-semibold rounded-md transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-tarkov-accent focus:ring-offset-2 focus:ring-offset-tarkov-dark"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-tarkov-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Authenticating...
              </span>
            ) : (
              'Enter Casino'
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-tarkov-accent hover:text-orange-400 transition-colors font-medium">
              Register here
            </Link>
          </p>
          <p className="text-gray-400">
            <Link to="/forgot-password" className="text-tarkov-accent hover:text-orange-400 transition-colors">
              Forgot your password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage