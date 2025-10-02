import React from 'react'
import { useBalance } from '../../hooks/useBalance'
import BalanceAnimation from './BalanceAnimation'
import { TarkovIcons, TarkovSpinner } from './TarkovIcons'
import { FontAwesomeSVGIcons } from './FontAwesomeSVG'

interface CurrencyDisplayProps {
  size?: 'small' | 'medium' | 'large'
  showLabel?: boolean
  showIcon?: boolean
  animated?: boolean
  className?: string
}

const getSizeClasses = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return {
        container: 'px-2 py-1 text-sm',
        icon: 'text-sm',
        amount: 'text-sm font-medium',
        label: 'text-xs'
      }
    case 'large':
      return {
        container: 'px-4 py-3 text-lg',
        icon: 'text-xl',
        amount: 'text-xl font-bold',
        label: 'text-sm'
      }
    default: // medium
      return {
        container: 'px-3 py-2',
        icon: 'text-base',
        amount: 'font-semibold',
        label: 'text-xs'
      }
  }
}

const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  size = 'medium',
  showLabel = true,
  showIcon = true,
  animated = true,
  className = ''
}) => {
  const { balance, previousBalance, isLoading } = useBalance()

  if (isLoading && balance === 0) {
    return (
      <div className={`
        flex items-center space-x-2 bg-gradient-to-r from-tarkov-secondary to-tarkov-primary rounded-md font-tarkov border border-tarkov-accent/30
        ${getSizeClasses(size).container}
        ${className}
      `}>
        {showIcon && <TarkovSpinner size={16} className="text-tarkov-accent" />}
        <span className="text-white">Loading...</span>
        {showLabel && <span className="text-gray-400 text-xs uppercase tracking-wide">Balance</span>}
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const sizeClasses = getSizeClasses(size)

  if (animated) {
    return (
      <div className={`
        flex items-center space-x-2 bg-gradient-to-r from-tarkov-secondary to-tarkov-primary rounded-md font-tarkov
        border border-tarkov-accent/30 shadow-lg shadow-tarkov-accent/10 hover:shadow-tarkov-accent/20 transition-all duration-300
        ${sizeClasses.container}
        ${className}
      `}>
        <FontAwesomeSVGIcons.RubleSign className="text-roubles flex-shrink-0 flex items-center justify-center" size={size === 'small' ? 16 : size === 'large' ? 24 : 20} />
        <BalanceAnimation
          currentBalance={balance}
          previousBalance={previousBalance}
          showSymbol={false}
          size={size}
        />
        {showLabel && (
          <span className={`text-gray-400 ${sizeClasses.label} uppercase tracking-wide`}>
            Roubles
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`
      flex items-center space-x-2 bg-gradient-to-r from-tarkov-secondary to-tarkov-primary rounded-md font-tarkov
      border border-tarkov-accent/30 shadow-lg shadow-tarkov-accent/10 hover:shadow-tarkov-accent/20 transition-all duration-300
      ${sizeClasses.container}
      ${className}
    `}>
      {showIcon && (
        <FontAwesomeSVGIcons.RubleSign 
          className="text-roubles flex-shrink-0 flex items-center justify-center" 
          size={size === 'small' ? 16 : size === 'large' ? 24 : 20} 
        />
      )}
      <span className={`text-white ${sizeClasses.amount}`}>
        {formatCurrency(balance)}
      </span>
      {showLabel && (
        <span className={`text-gray-400 ${sizeClasses.label} uppercase tracking-wide`}>
          Roubles
        </span>
      )}
    </div>
  )
}

export default CurrencyDisplay