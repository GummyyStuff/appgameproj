import { render, screen, cleanup } from '@testing-library/react'
import { describe, test, expect, afterEach, beforeEach } from 'bun:test'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend expect with Testing Library matchers
expect.extend(matchers)
import BlackjackCard, { Card } from '../BlackjackCard'

// Ensure DOM is properly set up before each test
beforeEach(() => {
  // Ensure document.body exists and is a proper DOM element
  if (!document.body || typeof document.body.appendChild !== 'function') {
    // Reinitialize document.body if it's not properly set up
    document.body = document.createElement('body')
    document.documentElement.appendChild(document.body)
  }
  // Clear any existing content
  document.body.innerHTML = ''
})

// Clean up after each test
afterEach(() => {
  cleanup()
  // Additional cleanup to ensure clean slate
  document.body.innerHTML = ''
})

describe('BlackjackCard', () => {
  const mockCard: Card = {
    suit: 'hearts',
    value: 'A'
  }

  test('renders a card with correct suit and value', () => {
    const { container } = render(<BlackjackCard card={mockCard} />)

    // Check for suit symbols - there should be 3 heart symbols (top-left, center, bottom-right)
    const heartSymbols = container.querySelectorAll('.text-lg.leading-none, .text-3xl')
    expect(heartSymbols).toHaveLength(3)
    heartSymbols.forEach(symbol => {
      expect(symbol.textContent).toBe('♥')
    })

    // Check for value symbols - there should be 2 Aces (top-left and bottom-right corners)
    const valueSymbols = container.querySelectorAll('.text-xs.font-bold > div:first-child')
    expect(valueSymbols).toHaveLength(2)
    valueSymbols.forEach(symbol => {
      expect(symbol.textContent).toBe('A')
    })
  })

  test('renders a hidden card when isHidden is true', () => {
    const { container } = render(<BlackjackCard card={mockCard} isHidden={true} />)

    // Should show card back pattern instead of suit/value
    const lightningSymbol = container.querySelector('div')
    expect(lightningSymbol?.textContent).toContain('⚡')

    // Should not show suit or value elements
    expect(container.querySelector('.text-lg.leading-none')).toBeNull()
    expect(container.querySelector('.text-3xl')).toBeNull()
  })

  test('renders empty slot when no card is provided', () => {
    const { container } = render(<BlackjackCard />)

    const emptyText = container.querySelector('div')
    expect(emptyText?.textContent).toContain('Empty')
  })

  test('applies correct color for red suits', () => {
    const { container } = render(<BlackjackCard card={{ suit: 'diamonds', value: 'K' }} />)

    // Check that red suit elements have the correct color class
    const redElements = container.querySelectorAll('.text-red-500')
    expect(redElements.length).toBeGreaterThan(0)

    // Verify that there are no black suit elements for a red suit card
    const blackElements = container.querySelectorAll('.text-gray-900')
    expect(blackElements.length).toBe(0)
  })

  test('applies correct color for black suits', () => {
    const { container } = render(<BlackjackCard card={{ suit: 'spades', value: 'Q' }} />)

    // Check that black suit elements have the correct color class
    const blackElements = container.querySelectorAll('.text-gray-900')
    expect(blackElements.length).toBeGreaterThan(0)

    // Verify that there are no red suit elements for a black suit card
    const redElements = container.querySelectorAll('.text-red-500')
    expect(redElements.length).toBe(0)
  })

  test('shows special border for face cards and aces', () => {
    const { container } = render(<BlackjackCard card={{ suit: 'clubs', value: 'J' }} />)

    // Should have Tarkov-themed border for face cards
    const borderElement = container.querySelector('.border-tarkov-accent\\/30')
    expect(borderElement).toBeInTheDocument()
  })

  test('does not show special border for number cards', () => {
    const { container } = render(<BlackjackCard card={{ suit: 'hearts', value: '7' }} />)

    // Should not have Tarkov-themed border for number cards
    const borderElement = container.querySelector('.border-tarkov-accent\\/30')
    expect(borderElement).toBeNull()
  })
})