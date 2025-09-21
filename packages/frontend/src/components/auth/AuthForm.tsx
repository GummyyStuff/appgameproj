import React from 'react'
import { Link } from 'react-router-dom'

interface AuthFormProps {
  title: string
  subtitle: string
  icon: string
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
  error?: string
  children: React.ReactNode
  submitText: string
  loadingText: string
  footerLinks?: Array<{
    text: string
    linkText: string
    href: string
  }>
}

const AuthForm: React.FC<AuthFormProps> = ({
  title,
  subtitle,
  icon,
  onSubmit,
  loading,
  error,
  children,
  submitText,
  loadingText,
  footerLinks = [],
}) => {
  return (
    <div className="max-w-md mx-auto mt-12 animate-fade-in">
      <div className="bg-tarkov-dark rounded-lg p-8 shadow-lg border border-tarkov-secondary hover:border-tarkov-accent transition-all duration-300">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4 animate-bounce">{icon}</div>
          <h1 className="text-3xl font-tarkov font-bold text-tarkov-accent">{title}</h1>
          <p className="text-gray-400 mt-2">{subtitle}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {children}

          {error && (
            <div className="bg-tarkov-danger bg-opacity-20 border border-tarkov-danger rounded-md p-3 animate-shake">
              <div className="flex items-center space-x-2">
                <span className="text-tarkov-danger">⚠️</span>
                <p className="text-tarkov-danger text-sm">{error}</p>
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
                {loadingText}
              </span>
            ) : (
              submitText
            )}
          </button>
        </form>

        {footerLinks.length > 0 && (
          <div className="mt-6 text-center space-y-2">
            {footerLinks.map((link, index) => (
              <p key={index} className="text-gray-400">
                {link.text}{' '}
                <Link to={link.href} className="text-tarkov-accent hover:text-orange-400 transition-colors font-medium">
                  {link.linkText}
                </Link>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthForm