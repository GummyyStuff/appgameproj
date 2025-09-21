import React, { useState, useEffect } from 'react'
import { formatCurrency } from '../../utils/currency'

interface BalanceAnimationProps {
  currentBalance: number
  previousBalance?: number
  duration?: number
  className?: string
  showSymbol?: boolean
  size?: 'small' | 'medium' | 'large'
}

const BalanceAnimation: React.FC<BalanceAnimationProps> = ({
  currentBalance,
  previousBalance,
  duration = 1000,
  className = '',
  showSymbol = true,
  size = 'medium'
}) => {
  const [displayBalance, setDisplayBalance] = useState(currentBalance)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (previousBalance !== undefined && previousBalance !== currentBalance) {
      setIsAnimating(true)
      
      const difference = currentBalance - previousBalance
      const steps = 30 // Number of animation steps
      const stepDuration = duration / steps
      const stepAmount = difference / steps
      
      let currentStep = 0
      
      const animationInterval = setInterval(() => {
        currentStep++
        const newBalance = previousBalance + (stepAmount * currentStep)
        
        if (currentStep >= steps) {
          setDisplayBalance(currentBalance)
          setIsAnimating(false)
          clearInterval(animationInterval)
        } else {
          setDisplayBalance(newBalance)
        }
      }, stepDuration)
      
      return () => clearInterval(animationInterval)
    } else {
      setDisplayBalance(currentBalance)
    }
  }, [currentBalance, previousBalance, duration])

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'text-sm'
      case 'large':
        return 'text-2xl'
      default:
        return 'text-lg'
    }
  }

  const balanceChanged = previousBalance !== undefined && previousBalance !== currentBalance
  const balanceIncreased = balanceChanged && currentBalance > previousBalance!

  return (
    <div className={`
      flex items-center space-x-1 font-tarkov font-bold
      ${getSizeClasses()}
      ${isAnimating ? (balanceIncreased ? 'text-tarkov-success' : 'text-tarkov-danger') : 'text-white'}
      ${isAnimating ? 'animate-pulse' : ''}
      ${className}
    `}>
      {showSymbol && (
        <span className={`
          text-tarkov-accent
          ${isAnimating ? 'animate-bounce' : ''}
        `}>
          ₽
        </span>
      )}
      <span>
        {formatCurrency(Math.round(displayBalance), 'roubles', { showSymbol: false })}
      </span>
      {isAnimating && balanceChanged && (
        <span className={`
          text-xs font-medium animate-fade-in ml-2
          ${balanceIncreased ? 'text-tarkov-success' : 'text-tarkov-danger'}
        `}>
          ({balanceIncreased ? '+' : ''}{formatCurrency(currentBalance - previousBalance!, 'roubles', { showSymbol: false })})
        </span>
      )}
    </div>
  )
}

export default BalanceAnimation