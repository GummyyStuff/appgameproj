import React from 'react'

interface TarkovCardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'accent' | 'danger' | 'success' | 'felt' | 'metal'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  hover?: boolean
  glow?: boolean
}

export const TarkovCard: React.FC<TarkovCardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  hover = false,
  glow = false
}) => {
  const baseClasses = `
    rounded-lg border transition-all duration-300
    ${hover ? 'hover:transform hover:scale-105 cursor-pointer' : ''}
    ${glow ? 'animate-glow' : ''}
  `

  const variants = {
    default: `
      panel-tarkov
      bg-gradient-to-br from-tarkov-primary to-tarkov-dark
      border-tarkov-secondary
    `,
    accent: `
      panel-tarkov-accent
      bg-gradient-to-br from-tarkov-primary to-tarkov-dark
      border-tarkov-accent
    `,
    danger: `
      bg-gradient-to-br from-red-900/50 to-tarkov-dark
      border-red-500/50
      shadow-lg shadow-red-500/10
    `,
    success: `
      bg-gradient-to-br from-green-900/50 to-tarkov-dark
      border-green-500/50
      shadow-lg shadow-green-500/10
    `,
    felt: `
      felt-texture
      border-green-700
      shadow-lg shadow-green-900/20
    `,
    metal: `
      metal-texture
      border-gray-400
      shadow-lg shadow-gray-500/20
    `
  }

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  }

  return (
    <div className={`
      ${baseClasses}
      ${variants[variant]}
      ${paddings[padding]}
      ${className}
    `}>
      {children}
    </div>
  )
}

// Specialized card for game tables
export const GameTableCard: React.FC<{
  children: React.ReactNode
  className?: string
  gameType?: 'roulette' | 'blackjack'
}> = ({ children, className = '', gameType = 'blackjack' }) => {
  const gameStyles = {
    roulette: 'felt-texture border-red-700 shadow-red-900/20',
    blackjack: 'felt-texture border-green-700 shadow-green-900/20',

  }

  return (
    <TarkovCard
      variant="felt"
      className={`
        ${gameStyles[gameType]}
        relative overflow-hidden
        ${className}
      `}
    >
      {/* Felt texture overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="w-full h-full bg-gradient-to-br from-transparent via-white/5 to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </TarkovCard>
  )
}

// Specialized card for stats and info
export const StatsCard: React.FC<{
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}> = ({ title, value, subtitle, icon, trend, className = '' }) => {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400'
  }

  const trendIcons = {
    up: '↗',
    down: '↘',
    neutral: '→'
  }

  return (
    <TarkovCard className={`${className}`} hover>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            {icon && <span className="text-tarkov-accent">{icon}</span>}
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
              {title}
            </h3>
          </div>
          
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white font-tarkov">
              {value}
            </span>
            {trend && (
              <span className={`text-sm ${trendColors[trend]}`}>
                {trendIcons[trend]}
              </span>
            )}
          </div>
          
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </TarkovCard>
  )
}

export default TarkovCard