import { useCallback, useRef, useState } from 'react'

interface TouchInteractionOptions {
  onTap?: () => void
  onDoubleTap?: () => void
  onLongPress?: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  longPressDelay?: number
  swipeThreshold?: number
  doubleTapDelay?: number
}

export const useTouchInteractions = (options: TouchInteractionOptions) => {
  const {
    onTap,
    onDoubleTap,
    onLongPress,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    longPressDelay = 500,
    swipeThreshold = 50,
    doubleTapDelay = 300
  } = options

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastTapRef = useRef<number>(0)
  const [isLongPressing, setIsLongPressing] = useState(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }

    // Start long press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        setIsLongPressing(true)
        onLongPress()
      }, longPressDelay)
    }
  }, [onLongPress, longPressDelay])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel long press if finger moves too much
    if (longPressTimerRef.current && touchStartRef.current) {
      const touch = e.touches[0]
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x)
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)
      
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
        setIsLongPressing(false)
      }
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    const deltaTime = Date.now() - touchStartRef.current.time

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    // Don't process other gestures if long press was triggered
    if (isLongPressing) {
      setIsLongPressing(false)
      return
    }

    // Check for swipe gestures
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    if (absX > swipeThreshold || absY > swipeThreshold) {
      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight()
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft()
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown()
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp()
        }
      }
      return
    }

    // Check for tap gestures (only if no significant movement)
    if (absX < 10 && absY < 10 && deltaTime < 500) {
      const now = Date.now()
      const timeSinceLastTap = now - lastTapRef.current

      if (timeSinceLastTap < doubleTapDelay && onDoubleTap) {
        // Double tap
        onDoubleTap()
        lastTapRef.current = 0 // Reset to prevent triple tap
      } else {
        // Single tap (with delay to check for double tap)
        lastTapRef.current = now
        if (onTap) {
          setTimeout(() => {
            if (lastTapRef.current === now) {
              onTap()
            }
          }, doubleTapDelay)
        }
      }
    }

    touchStartRef.current = null
    setIsLongPressing(false)
  }, [onTap, onDoubleTap, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, swipeThreshold, doubleTapDelay, isLongPressing])

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    isLongPressing
  }
}

// Hook for enhanced button interactions
export const useEnhancedButton = (options: {
  onClick?: () => void
  onDoubleClick?: () => void
  onLongPress?: () => void
  disabled?: boolean
}) => {
  const { onClick, onDoubleClick, onLongPress, disabled } = options

  const touchProps = useTouchInteractions({
    onTap: disabled ? undefined : onClick,
    onDoubleTap: disabled ? undefined : onDoubleClick,
    onLongPress: disabled ? undefined : onLongPress
  })

  return {
    ...touchProps,
    onClick: disabled ? undefined : onClick,
    onDoubleClick: disabled ? undefined : onDoubleClick,
    className: disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
  }
}