import { describe, it, expect } from 'bun:test'
import { renderHook, act } from '@testing-library/react'
import { useCaseAnimation } from '../useCaseAnimation'
import { AnimationConfig } from '../../types/caseOpening'

describe('useCaseAnimation', () => {
  it('should initialize with no animation config', () => {
    const { result } = renderHook(() => useCaseAnimation())

    expect(result.current.animationConfig).toBeNull()
    expect(result.current.isAnimating).toBe(false)
  })

  it('should start animation', () => {
    const { result } = renderHook(() => useCaseAnimation())

    const config: AnimationConfig = {
      type: 'carousel',
      duration: 5000,
      easing: 'easeOutCubic',
      items: [],
      winningIndex: 5
    }

    act(() => {
      result.current.startAnimation(config)
    })

    expect(result.current.animationConfig).toEqual(config)
    expect(result.current.isAnimating).toBe(true)
  })

  it('should complete animation', () => {
    const { result } = renderHook(() => useCaseAnimation())

    const config: AnimationConfig = {
      type: 'carousel',
      duration: 5000,
      easing: 'easeOutCubic'
    }

    act(() => {
      result.current.startAnimation(config)
    })

    expect(result.current.isAnimating).toBe(true)

    act(() => {
      result.current.completeAnimation()
    })

    expect(result.current.isAnimating).toBe(false)
    expect(result.current.animationConfig).toEqual(config) // Config persists after completion
  })

  it('should reset animation', () => {
    const { result } = renderHook(() => useCaseAnimation())

    const config: AnimationConfig = {
      type: 'reveal',
      duration: 2000
    }

    act(() => {
      result.current.startAnimation(config)
    })

    expect(result.current.animationConfig).toEqual(config)
    expect(result.current.isAnimating).toBe(true)

    act(() => {
      result.current.resetAnimation()
    })

    expect(result.current.animationConfig).toBeNull()
    expect(result.current.isAnimating).toBe(false)
  })

  it('should handle multiple animation starts', () => {
    const { result } = renderHook(() => useCaseAnimation())

    const config1: AnimationConfig = {
      type: 'carousel',
      duration: 3000
    }

    const config2: AnimationConfig = {
      type: 'reveal',
      duration: 1000
    }

    act(() => {
      result.current.startAnimation(config1)
    })

    expect(result.current.animationConfig).toEqual(config1)

    act(() => {
      result.current.startAnimation(config2)
    })

    expect(result.current.animationConfig).toEqual(config2)
    expect(result.current.isAnimating).toBe(true)
  })

  it('should maintain animation state during completion', () => {
    const { result } = renderHook(() => useCaseAnimation())

    const config: AnimationConfig = {
      type: 'carousel',
      duration: 5000,
      items: [{ id: '1', name: 'Test Item' }],
      winningIndex: 0
    }

    act(() => {
      result.current.startAnimation(config)
      result.current.completeAnimation()
    })

    expect(result.current.animationConfig).toEqual(config)
    expect(result.current.isAnimating).toBe(false)
  })
})
