import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect } from 'bun:test'
import BettingPanel from '../BettingPanel'

const mockBetTypeOptions = [
  { type: 'red', value: 'red', label: 'Red', payout: '1:1' },
  { type: 'black', value: 'black', label: 'Black', payout: '1:1' },
  { type: 'odd', value: 'odd', label: 'Odd', payout: '1:1' }
]

const mockCurrentBet = {
  betType: 'red' as const,
  betValue: 'red',
  amount: 100
}

const defaultProps = {
  currentBet: mockCurrentBet,
  setCurrentBet: mock(),
  betAmount: 100,
  setBetAmount: mock(),
  balance: 1000,
  betTypeOptions: mockBetTypeOptions,
  onPlaceBet: mock(),
  isSpinning: false,
  error: null
}

describe('BettingPanel', () => {
  test('renders betting panel with correct elements', () => {
    render(<BettingPanel {...defaultProps} />)

    expect(screen.getByText('Place Your Bet')).toBeInTheDocument()
    expect(screen.getByText('Bet Type')).toBeInTheDocument()
    expect(screen.getByText('Bet Amount')).toBeInTheDocument()
    expect(screen.getByText('Current Bet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Place Bet' })).toBeInTheDocument()
  })

  test('displays bet type options', () => {
    render(<BettingPanel {...defaultProps} />)

    expect(screen.getByText('Red')).toBeInTheDocument()
    expect(screen.getByText('Black')).toBeInTheDocument()
    expect(screen.getByText('Odd')).toBeInTheDocument()
  })

  test('shows current bet information', () => {
    render(<BettingPanel {...defaultProps} />)

    expect(screen.getByText('red')).toBeInTheDocument()
    // Check for bet amount in the current bet summary
    const betAmountElements = screen.getAllByText(/₽100/)
    expect(betAmountElements.length).toBeGreaterThan(0)
  })

  test('disables place bet button when spinning', () => {
    render(<BettingPanel {...defaultProps} isSpinning={true} />)

    const placeBetButton = screen.getByRole('button', { name: 'Spinning...' })
    expect(placeBetButton).toBeDisabled()
  })

  test('shows error message when provided', () => {
    render(<BettingPanel {...defaultProps} error="Insufficient balance" />)

    expect(screen.getByText('Insufficient balance')).toBeInTheDocument()
  })

  test('calls onPlaceBet when place bet button is clicked', () => {
    const mockOnPlaceBet = mock()
    render(<BettingPanel {...defaultProps} onPlaceBet={mockOnPlaceBet} />)

    const placeBetButton = screen.getByRole('button', { name: 'Place Bet' })
    fireEvent.click(placeBetButton)

    expect(mockOnPlaceBet).toHaveBeenCalledTimes(1)
  })

  test('updates bet amount when quick bet button is clicked', () => {
    const mockSetBetAmount = mock()
    render(<BettingPanel {...defaultProps} setBetAmount={mockSetBetAmount} />)

    const quickBetButton = screen.getByRole('button', { name: '₽50' })
    fireEvent.click(quickBetButton)

    expect(mockSetBetAmount).toHaveBeenCalledWith(50)
  })
})