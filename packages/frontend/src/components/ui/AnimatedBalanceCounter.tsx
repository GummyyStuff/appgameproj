import { useEffect, useRef, useState } from 'react'

interface AnimatedBalanceCounterProps {
  value: number
  duration?: number
  prefix?: string
  className?: string
  decimals?: number
}

const AnimatedBalanceCounter: React.FC<AnimatedBalanceCounterProps> = ({
  value,
  duration = 800,
  prefix = '₽',
  className = '',
  decimals = 0
}) => {
  const [displayValue, setDisplayValue] = useState(value)
  const prevValueRef = useRef(value)
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    const prevValue = prevValueRef.current
    const diff = value - prevValue

    if (diff === 0) {
      prevValueRef.current = value
      setDisplayValue(value)
      return
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    startTimeRef.current = null

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentValue = prevValue + diff * eased

      setDisplayValue(currentValue)

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
        prevValueRef.current = value
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [value, duration])

  const formattedValue = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Math.round(displayValue))

  return (
    <span className={className}>
      {prefix}{formattedValue}
    </span>
  )
}

export default AnimatedBalanceCounter
