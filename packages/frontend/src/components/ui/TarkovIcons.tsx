import React from 'react'

interface IconProps {
  className?: string
  size?: number
}

// Tarkov-themed SVG icons
export const TarkovIcons = {
  // Currency icons
  Roubles: ({ className = '', size = 24 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v-.07zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  ),

  Dollars: ({ className = '', size = 24 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
    </svg>
  ),

  Euros: ({ className = '', size = 24 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M15 18.5c-2.51 0-4.68-1.42-5.76-3.5H15v-2H8.58c-.05-.33-.08-.66-.08-1s.03-.67.08-1H15V9H9.24C10.32 6.92 12.49 5.5 15 5.5c1.61 0 3.09.59 4.23 1.57L21 5.3C19.41 3.87 17.3 3 15 3c-3.92 0-7.24 2.51-8.48 6H3v2h3.06c-.04.33-.06.66-.06 1 0 .34.02.67.06 1H3v2h3.52c1.24 3.49 4.56 6 8.48 6 2.31 0 4.41-.87 6-2.3l-1.77-1.77C17.09 17.91 15.61 18.5 15 18.5z"/>
    </svg>
  ),

  // Game icons
  Roulette: ({ className = '', size = 24 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1" fill="none"/>
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1" fill="none"/>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1" fill="none"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
      <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="2"/>
      <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="2"/>
      <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="2"/>
      <line x1="18" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),

  Blackjack: ({ className = '', size = 24 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <rect x="3" y="4" width="6" height="9" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="15" y="4" width="6" height="9" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <text x="6" y="9" textAnchor="middle" fontSize="8" fill="currentColor">A</text>
      <text x="18" y="9" textAnchor="middle" fontSize="8" fill="currentColor">K</text>
      <rect x="9" y="11" width="6" height="9" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <text x="12" y="16" textAnchor="middle" fontSize="8" fill="currentColor">?</text>
    </svg>
  ),



  // UI icons
  Skull: ({ className = '', size = 24 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h2v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zM9 11c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
    </svg>
  ),

  Weapon: ({ className = '', size = 24 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M2 12h2v2H2zm18-6h-2V4h-2v2h-2V4h-2v2H8V4H6v2H4v2h2v8H4v2h2v2h2v-2h4v2h2v-2h4v2h2v-2h2v-2h-2V8h2V6zm-4 10H8V8h8v8z"/>
      <rect x="10" y="10" width="4" height="4" fill="currentColor"/>
    </svg>
  ),

  Helmet: ({ className = '', size = 24 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9v4c0 1.1.9 2 2 2h1v5h8v-5h1c1.1 0 2-.9 2-2V9c0-3.87-3.13-7-7-7zm3 11h-1v5h-4v-5H9V9c0-1.66 1.34-3 3-3s3 1.34 3 3v4z"/>
    </svg>
  ),

  Ammo: ({ className = '', size = 24 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <rect x="10" y="2" width="4" height="20" rx="2" fill="currentColor"/>
      <ellipse cx="12" cy="4" rx="2" ry="1" fill="#D4AF37"/>
      <rect x="11" y="6" width="2" height="12" fill="#8B7355"/>
    </svg>
  ),

  // Status icons
  Health: ({ className = '', size = 24 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  ),

  Energy: ({ className = '', size = 24 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 18h-4v-1h4v1zm0-3h-4v-1h4v1zm0-3h-4v-1h4v1zm0-3h-4V8h4v3zm0-5h-4V4h4v2z"/>
    </svg>
  ),

  Hydration: ({ className = '', size = 24 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2s-2-.9-2-2V4c0-1.1.9-2 2-2zm4.24 7.76l1.41 1.41C18.78 10.04 19 9.05 19 8c0-2.21-1.79-4-4-4V2c3.31 0 6 2.69 6 6 0 1.66-.67 3.16-1.76 4.24zM6.76 9.76C5.67 8.84 5 7.34 5 6c0-3.31 2.69-6 6-6v2C8.79 2 7 3.79 7 6c0 1.05.22 2.04 1.35 3.17l1.41-1.41z"/>
    </svg>
  ),

  // Navigation icons
  Close: ({ className = '', size = 24 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  ),

  ArrowLeft: ({ className = '', size = 24 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
    </svg>
  ),

  ArrowRight: ({ className = '', size = 24 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
    </svg>
  )
}

// Tarkov-themed loading spinner
export const TarkovSpinner: React.FC<{ className?: string; size?: number }> = ({ 
  className = '', 
  size = 40 
}) => (
  <div className={`inline-block ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="animate-spin"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="60 20"
        className="opacity-75"
      />
      <circle
        cx="12"
        cy="12"
        r="6"
        stroke="#F6AD55"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="30 10"
        className="animate-spin"
        style={{ animationDirection: 'reverse', animationDuration: '1s' }}
      />
    </svg>
  </div>
)

// Tarkov-themed badge component
export const TarkovBadge: React.FC<{
  children: React.ReactNode
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'accent'
  className?: string
}> = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-tarkov-secondary text-white border-tarkov-steel',
    success: 'bg-tarkov-success text-white border-green-400',
    danger: 'bg-tarkov-danger text-white border-red-400',
    warning: 'bg-tarkov-warning text-tarkov-dark border-yellow-400',
    accent: 'bg-tarkov-accent text-tarkov-dark border-orange-400'
  }

  return (
    <span className={`
      inline-flex items-center px-2 py-1 text-xs font-bold uppercase tracking-wide
      border rounded-md font-tarkov ${variants[variant]} ${className}
    `}>
      {children}
    </span>
  )
}

// Tarkov-themed progress bar
export const TarkovProgressBar: React.FC<{
  value: number
  max: number
  className?: string
  showText?: boolean
  color?: 'default' | 'health' | 'energy' | 'hydration'
}> = ({ value, max, className = '', showText = true, color = 'default' }) => {
  const percentage = Math.min((value / max) * 100, 100)
  
  const colors = {
    default: 'bg-tarkov-accent',
    health: 'bg-red-500',
    energy: 'bg-yellow-500',
    hydration: 'bg-blue-500'
  }

  return (
    <div className={`relative ${className}`}>
      <div className="w-full bg-tarkov-dark rounded-full h-3 border border-tarkov-secondary overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${colors[color]} animate-pulse-slow`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showText && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white drop-shadow-lg">
            {Math.round(value)}/{max}
          </span>
        </div>
      )}
    </div>
  )
}