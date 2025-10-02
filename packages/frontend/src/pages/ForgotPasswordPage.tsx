import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { FontAwesomeSVGIcons } from '../components/ui/FontAwesomeSVG'

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await resetPassword(email)
    
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    
    setLoading(false)
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-tarkov-dark rounded-lg p-8 shadow-lg border border-tarkov-success">
          <div className="text-center">
            <FontAwesomeSVGIcons.Envelope className="text-tarkov-accent mx-auto mb-4" size={64} />
            <h1 className="text-2xl font-tarkov font-bold text-tarkov-success mb-4">
              Check Your Email
            </h1>
            <p className="text-gray-300 mb-6">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-gray-400 mb-6">
              If you don't see the email, check your spam folder or try again.
            </p>
            <Link
              to="/login"
              className="inline-block px-4 py-2 bg-tarkov-accent hover:bg-orange-500 text-tarkov-dark font-semibold rounded-md transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-tarkov-dark rounded-lg p-8 shadow-lg">
        <div className="text-center mb-8">
          <FontAwesomeSVGIcons.Lock className="text-tarkov-accent mx-auto mb-4" size={48} />
          <h1 className="text-3xl font-tarkov font-bold text-tarkov-accent">
            Reset Password
          </h1>
          <p className="text-gray-400 mt-2">
            Enter your email to receive a reset link
          </p>
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
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-tarkov-secondary border border-tarkov-primary rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-tarkov-accent focus:border-transparent transition-all duration-200"
              placeholder="Enter your email address"
            />
          </div>

          {error && (
            <div className="bg-tarkov-danger bg-opacity-20 border border-tarkov-danger rounded-md p-3 animate-pulse">
              <div className="flex items-center space-x-2">
                <span className="text-white">⚠️</span>
                <p className="text-white text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-tarkov-accent hover:bg-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-tarkov-dark font-semibold rounded-md transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-tarkov-accent focus:ring-offset-2 focus:ring-offset-tarkov-dark"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-tarkov-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending Reset Link...
              </span>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Remember your password?{' '}
            <Link to="/login" className="text-tarkov-accent hover:text-orange-400 transition-colors">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage