import React from 'react'
import { TarkovSpinner } from './TarkovIcons'

interface TarkovButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

export const TarkovButton: React.FC<TarkovButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = `
    relative inline-flex items-center justify-center
    font-tarkov font-bold uppercase tracking-wide
    border-2 rounded-md transition-all duration-300
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-tarkov-darker
    disabled:opacity-50 disabled:cursor-not-allowed
    transform hover:scale-105 active:scale-95
  `

  const variants = {
    primary: `
      bg-gradient-to-r from-tarkov-accent to-orange-500
      border-tarkov-accent text-tarkov-dark
      hover:from-orange-500 hover:to-tarkov-accent
      hover:shadow-lg hover:shadow-tarkov-accent/25
      focus:ring-tarkov-accent
    `,
    secondary: `
      bg-gradient-to-r from-tarkov-secondary to-tarkov-primary
      border-tarkov-secondary text-white
      hover:from-tarkov-primary hover:to-tarkov-secondary
      hover:shadow-lg hover:shadow-tarkov-secondary/25
      focus:ring-tarkov-secondary
    `,
    danger: `
      bg-gradient-to-r from-tarkov-danger to-red-600
      border-tarkov-danger text-white
      hover:from-red-600 hover:to-tarkov-danger
      hover:shadow-lg hover:shadow-red-500/25
      focus:ring-red-500
    `,
    success: `
      bg-gradient-to-r from-tarkov-success to-green-600
      border-tarkov-success text-white
      hover:from-green-600 hover:to-tarkov-success
      hover:shadow-lg hover:shadow-green-500/25
      focus:ring-green-500
    `,
    warning: `
      bg-gradient-to-r from-tarkov-warning to-yellow-600
      border-tarkov-warning text-tarkov-dark
      hover:from-yellow-600 hover:to-tarkov-warning
      hover:shadow-lg hover:shadow-yellow-500/25
      focus:ring-yellow-500
    `,
    ghost: `
      bg-transparent border-tarkov-accent text-tarkov-accent
      hover:bg-tarkov-accent hover:text-tarkov-dark
      hover:shadow-lg hover:shadow-tarkov-accent/25
      focus:ring-tarkov-accent
    `
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  }

  const widthClass = fullWidth ? 'w-full' : ''

  return (
    <button
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${widthClass}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <TarkovSpinner size={16} className="mr-2" />
      )}
      
      {!loading && icon && iconPosition === 'left' && (
        <span className="mr-2">{icon}</span>
      )}
      
      <span className={loading ? 'opacity-0' : ''}>{children}</span>
      
      {!loading && icon && iconPosition === 'right' && (
        <span className="ml-2">{icon}</span>
      )}
      
      {/* Shine effect on hover */}
      <div className="absolute inset-0 rounded-md opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full hover:translate-x-full transition-transform duration-700" />
      </div>
    </button>
  )
}

export default TarkovButton