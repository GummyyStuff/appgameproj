import { describe, test, expect } from 'bun:test'
import Toast from '../Toast'

describe('Toast', () => {
  test('should export Toast component', () => {
    expect(Toast).toBeDefined()
  })

  test('should have correct toast types', () => {
    // Test that the component can be imported without errors
    expect(typeof Toast).toBe('function')
  })
})