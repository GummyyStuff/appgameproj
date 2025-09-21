import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import BlackjackCard, { Card } from '../BlackjackCard'

describe('BlackjackCard', () => {
  const mockCard: Card = {
    suit: 'hearts',
    value: 'A'
  }

  it('renders a card with correct suit and value', () => {
    render(<BlackjackCard card={mockCard} />)
    
    // Check for suit symbol (there are multiple instances)
    expect(screen.getAllByText('♥')).toHaveLength(3) // Top-left, center, bottom-right
    
    // Check for value
    expect(screen.getAllByText('A')).toHaveLength(2) // Top-left and bottom-right
  })

  it('renders a hidden card when isHidden is true', () => {
    render(<BlackjackCard card={mockCard} isHidden={true} />)
    
    // Should show card back pattern instead of suit/value
    expect(screen.getByText('⚡')).toBeInTheDocument()
    expect(screen.queryByText('♥')).not.toBeInTheDocument()
    expect(screen.queryByText('A')).not.toBeInTheDocument()
  })

  it('renders empty slot when no card is provided', () => {
    render(<BlackjackCard />)
    
    expect(screen.getByText('Empty')).toBeInTheDocument()
  })

  it('applies correct color for red suits', () => {
    const { container } = render(<BlackjackCard card={{ suit: 'diamonds', value: 'K' }} />)
    
    // Check that red suit elements have the correct color class
    const redElements = container.querySelectorAll('.text-red-500')
    expect(redElements.length).toBeGreaterThan(0)
  })

  it('applies correct color for black suits', () => {
    const { container } = render(<BlackjackCard card={{ suit: 'spades', value: 'Q' }} />)
    
    // Check that black suit elements have the correct color class
    const blackElements = container.querySelectorAll('.text-gray-900')
    expect(blackElements.length).toBeGreaterThan(0)
  })

  it('shows special border for face cards and aces', () => {
    const { container } = render(<BlackjackCard card={{ suit: 'clubs', value: 'J' }} />)
    
    // Should have Tarkov-themed border for face cards
    const borderElement = container.querySelector('.border-tarkov-accent\\/30')
    expect(borderElement).toBeInTheDocument()
  })
})