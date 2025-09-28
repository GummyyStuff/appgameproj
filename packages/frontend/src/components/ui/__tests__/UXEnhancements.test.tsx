import { describe, test, expect } from 'bun:test'
import { useToast } from '../../../hooks/useToast'
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts'
import { useTouchInteractions } from '../../../hooks/useTouchInteractions'

describe('UX Enhancements', () => {
  test('should export useToast hook', () => {
    expect(useToast).toBeDefined()
    expect(typeof useToast).toBe('function')
  })

  test('should export useKeyboardShortcuts hook', () => {
    expect(useKeyboardShortcuts).toBeDefined()
    expect(typeof useKeyboardShortcuts).toBe('function')
  })

  test('should export useTouchInteractions hook', () => {
    expect(useTouchInteractions).toBeDefined()
    expect(typeof useTouchInteractions).toBe('function')
  })
})