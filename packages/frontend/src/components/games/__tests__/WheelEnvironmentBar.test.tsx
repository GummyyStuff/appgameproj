import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import WheelEnvironmentBar from '../WheelEnvironmentBar'
import type { EnvironmentState } from '../../../types/wheel'

vi.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: {
      div: ({ children, ...props }: any) => React.createElement('div', props, children),
    },
  }
})

const environment = (overrides: Partial<EnvironmentState> = {}): EnvironmentState => ({
  type: 'clear_skies',
  spins_remaining: 3,
  modifiers: [],
  ...overrides
})

describe('WheelEnvironmentBar', () => {
  test('renders nothing when there is no environment', () => {
    const { container } = render(<WheelEnvironmentBar environment={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  test('renders the environment name and spins remaining', () => {
    render(<WheelEnvironmentBar environment={environment({ type: 'scav_raid', spins_remaining: 2 })} />)
    expect(screen.getByText('Scav Raid')).toBeInTheDocument()
    expect(screen.getByTestId('wheel-environment-spins')).toHaveTextContent('2')
  })

  test('renders affected segment info when modifiers are present', () => {
    render(<WheelEnvironmentBar
      environment={environment({
        type: 'emp_strike',
        spins_remaining: 1,
        modifiers: [
          { segmentIndex: 2, operation: 'add', value: 10 },
          { segmentIndex: 5, operation: 'add', value: 15 }
        ]
      })}
    />)
    expect(screen.getByText('EMP Strike')).toBeInTheDocument()
    expect(screen.getByText(/Affected: #3, #6/)).toBeInTheDocument()
    expect(screen.getByTestId('wheel-environment-spins')).toHaveTextContent('1')
  })

  test('shows the bonus badge when bonus is active', () => {
    render(<WheelEnvironmentBar environment={environment()} bonusActive />)
    expect(screen.getByText('2x Bonus')).toBeInTheDocument()
  })
})
