import React from 'react'

interface TarkovBackgroundProps {
  variant?: 'default' | 'raid' | 'hideout' | 'menu' | 'game'
  overlay?: boolean
  className?: string
  children?: React.ReactNode
}

export const TarkovBackground: React.FC<TarkovBackgroundProps> = ({
  variant = 'default',
  overlay = true,
  className = '',
  children
}) => {
  const backgrounds = {
    default: `
      bg-gradient-to-br from-tarkov-darkest via-tarkov-darker to-tarkov-dark
    `,
    raid: `
      bg-gradient-to-b from-gray-900 via-tarkov-darker to-tarkov-darkest
      relative
    `,
    hideout: `
      bg-gradient-to-br from-tarkov-olive/20 via-tarkov-darker to-tarkov-darkest
    `,
    menu: `
      bg-gradient-to-r from-tarkov-darkest via-tarkov-darker to-tarkov-dark
    `,
    game: `
      bg-gradient-to-b from-tarkov-dark via-tarkov-darker to-tarkov-darkest
    `
  }

  return (
    <div className={`
      min-h-screen relative
      ${backgrounds[variant]}
      ${className}
    `}>
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundSize: '256px 256px'
          }}
        />
      </div>

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(246, 173, 85, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(246, 173, 85, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Vignette effect */}
      {overlay && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full bg-gradient-radial from-transparent via-transparent to-black/30" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

// Animated background particles for special effects
export const TarkovParticles: React.FC<{
  count?: number
  className?: string
}> = ({ count = 20, className = '' }) => {
  const particles = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className="absolute w-1 h-1 bg-tarkov-accent rounded-full opacity-20 animate-pulse"
      style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${2 + Math.random() * 3}s`
      }}
    />
  ))

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles}
    </div>
  )
}

// Tarkov-themed decorative elements
export const TarkovDecorations = {
  CornerBrackets: ({ className = '' }: { className?: string }) => (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Top-left */}
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-tarkov-accent" />
      {/* Top-right */}
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-tarkov-accent" />
      {/* Bottom-left */}
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-tarkov-accent" />
      {/* Bottom-right */}
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-tarkov-accent" />
    </div>
  ),

  ScanLines: ({ className = '' }: { className?: string }) => (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      <div 
        className="w-full h-full opacity-5"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(246, 173, 85, 0.1) 2px, rgba(246, 173, 85, 0.1) 4px)',
          animation: 'scan 2s linear infinite'
        }}
      />
    </div>
  ),

  GlitchEffect: ({ className = '' }: { className?: string }) => (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/5 to-transparent animate-pulse" />
      <div className="absolute inset-0 bg-gradient-to-l from-transparent via-blue-500/5 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }} />
    </div>
  )
}

// CSS for scan animation
const scanKeyframes = `
  @keyframes scan {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
`

// Inject the keyframes
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = scanKeyframes
  document.head.appendChild(style)
}

export default TarkovBackground