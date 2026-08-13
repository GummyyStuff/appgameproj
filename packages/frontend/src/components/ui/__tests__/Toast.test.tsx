import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Toast from '../Toast'
import type { Toast as ToastType } from '../Toast'

describe('Toast', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    onClose.mockClear()
  })

  const createToast = (overrides: Partial<ToastType> = {}): ToastType => ({
    id: 'toast-1',
    type: 'info',
    title: 'Test Title',
    ...overrides,
  })

  test('renders the title', () => {
    render(<Toast toast={createToast()} onClose={onClose} />)
    expect(screen.getByText('Test Title')).toBeTruthy()
  })

  test('renders the message when provided', () => {
    render(<Toast toast={createToast({ message: 'Test message' })} onClose={onClose} />)
    expect(screen.getByText('Test message')).toBeTruthy()
  })

  test('does not render message element when message is absent', () => {
    const { container } = render(<Toast toast={createToast()} onClose={onClose} />)
    const messageElements = container.querySelectorAll('.text-gray-300.text-xs.mt-1')
    expect(messageElements.length).toBe(0)
  })

  test('calls onClose with toast id when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<Toast toast={createToast()} onClose={onClose} />)
    const closeButton = screen.getByText('✕')
    await user.click(closeButton)
    expect(onClose).toHaveBeenCalledWith('toast-1')
  })

  test('renders action button when action is provided', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Toast
        toast={createToast({ action: { label: 'Undo', onClick } })}
        onClose={onClose}
      />
    )
    const actionButton = screen.getByText('Undo')
    expect(actionButton).toBeTruthy()
    await user.click(actionButton)
    expect(onClick).toHaveBeenCalledOnce()
  })

  test('does not render action button when action is absent', () => {
    const { container } = render(<Toast toast={createToast()} onClose={onClose} />)
    const buttons = container.querySelectorAll('button')
    const actionButtons = Array.from(buttons).filter(
      (btn) => btn.classList.contains('underline')
    )
    expect(actionButtons.length).toBe(0)
  })

  test.each([
    ['success', '✅'],
    ['error', '❌'],
    ['warning', '⚠️'],
    ['info', 'ℹ️'],
  ] as const)('renders correct icon for type %s', (type, icon) => {
    render(<Toast toast={createToast({ type })} onClose={onClose} />)
    expect(screen.getByText(icon)).toBeTruthy()
  })

  test('close button has correct accessible role', () => {
    render(<Toast toast={createToast()} onClose={onClose} />)
    const closeButton = screen.getByText('✕')
    expect(closeButton.tagName).toBe('BUTTON')
  })

  test('action button has correct accessible role', () => {
    const onClick = vi.fn()
    render(
      <Toast
        toast={createToast({ action: { label: 'Retry', onClick } })}
        onClose={onClose}
      />
    )
    const actionButton = screen.getByText('Retry')
    expect(actionButton.tagName).toBe('BUTTON')
  })
})
