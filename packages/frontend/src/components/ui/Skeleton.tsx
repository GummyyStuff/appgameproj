import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded'
      case 'rectangular':
        return 'rounded-lg'
      case 'circular':
        return 'rounded-full'
      default:
        return 'rounded'
    }
  }

  const getAnimationClasses = () => {
    switch (animation) {
      case 'pulse':
        return 'animate-pulse'
      case 'wave':
        return 'animate-shimmer'
      case 'none':
        return ''
      default:
        return 'animate-pulse'
    }
  }

  const style = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? undefined : '100%')
  }

  return (
    <div
      className={`bg-tarkov-secondary/50 ${getVariantClasses()} ${getAnimationClasses()} ${className}`}
      style={style}
    />
  )
}

// Predefined skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 1, 
  className = '' 
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        variant="text"
        width={index === lines - 1 ? '75%' : '100%'}
      />
    ))}
  </div>
)

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-tarkov-dark rounded-lg p-6 space-y-4 ${className}`}>
    <Skeleton variant="rectangular" height="200px" />
    <div className="space-y-2">
      <Skeleton variant="text" width="60%" />
      <SkeletonText lines={2} />
    </div>
  </div>
)

export const SkeletonGameCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-tarkov-dark rounded-lg p-6 space-y-6 ${className}`}>
    {/* Game area skeleton */}
    <div className="flex justify-center">
      <Skeleton variant="circular" width="200px" height="200px" />
    </div>
    
    {/* Betting panel skeleton */}
    <div className="space-y-4">
      <SkeletonText lines={1} />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height="40px" />
        ))}
      </div>
      <Skeleton variant="rectangular" height="50px" />
    </div>
  </div>
)

export const SkeletonTable: React.FC<{ 
  rows?: number
  columns?: number
  className?: string 
}> = ({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}) => (
  <div className={`space-y-3 ${className}`}>
    {/* Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} variant="text" width="80%" />
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} variant="text" width="90%" />
        ))}
      </div>
    ))}
  </div>
)

export default Skeleton