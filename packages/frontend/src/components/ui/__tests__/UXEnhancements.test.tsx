import { describe, it, expect } from 'vitest'
import { useToast } from '../../hooks/useToast'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useTouchInteractions } from '../../hooks/useTouchInteractions'

describe('UX Enhancements', () => {
  it('should export useToast hook', () => {
    expect(useToast).toBeDefined()
    expect(typeof useToast).toBe('function')
  })

  it('should export useKeyboardShortcuts hook', () => {
    expect(useKeyboardShortcuts).toBeDefined()
    expect(typeof useKeyboardShortcuts).toBe('function')
  })

  it('should export useTouchInteractions hook', () => {
    expect(useTouchInteractions).toBeDefined()
    expect(typeof useTouchInteractions).toBe('function')
  })
})