import { useEffect, useCallback } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  action: () => void
  description: string
  disabled?: boolean
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when user is typing in inputs
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      if (shortcut.disabled) return false
      
      return (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        !!event.ctrlKey === !!shortcut.ctrlKey &&
        !!event.altKey === !!shortcut.altKey &&
        !!event.shiftKey === !!shortcut.shiftKey &&
        !!event.metaKey === !!shortcut.metaKey
      )
    })

    if (matchingShortcut) {
      event.preventDefault()
      matchingShortcut.action()
    }
  }, [shortcuts])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Common game shortcuts
export const useGameShortcuts = (actions: {
  placeBet?: () => void
  maxBet?: () => void
  clearBet?: () => void
  quickBet?: (amount: number) => void
  toggleSound?: () => void
  showHelp?: () => void
  showHistory?: () => void
}) => {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'Enter',
      action: actions.placeBet || (() => {}),
      description: 'Place bet',
      disabled: !actions.placeBet
    },
    {
      key: 'm',
      action: actions.maxBet || (() => {}),
      description: 'Max bet',
      disabled: !actions.maxBet
    },
    {
      key: 'c',
      action: actions.clearBet || (() => {}),
      description: 'Clear bet',
      disabled: !actions.clearBet
    },
    {
      key: '1',
      action: () => actions.quickBet?.(10),
      description: 'Quick bet ₽10',
      disabled: !actions.quickBet
    },
    {
      key: '2',
      action: () => actions.quickBet?.(50),
      description: 'Quick bet ₽50',
      disabled: !actions.quickBet
    },
    {
      key: '3',
      action: () => actions.quickBet?.(100),
      description: 'Quick bet ₽100',
      disabled: !actions.quickBet
    },
    {
      key: '4',
      action: () => actions.quickBet?.(500),
      description: 'Quick bet ₽500',
      disabled: !actions.quickBet
    },
    {
      key: '5',
      action: () => actions.quickBet?.(1000),
      description: 'Quick bet ₽1000',
      disabled: !actions.quickBet
    },
    {
      key: 's',
      action: actions.toggleSound || (() => {}),
      description: 'Toggle sound',
      disabled: !actions.toggleSound
    },
    {
      key: 'h',
      action: actions.showHelp || (() => {}),
      description: 'Show help',
      disabled: !actions.showHelp
    },
    {
      key: 'g',
      action: actions.showHistory || (() => {}),
      description: 'Show game history',
      disabled: !actions.showHistory
    }
  ]

  useKeyboardShortcuts(shortcuts)

  return shortcuts.filter(s => !s.disabled)
}

// Blackjack specific shortcuts
export const useBlackjackShortcuts = (actions: {
  hit?: () => void
  stand?: () => void
  double?: () => void
  split?: () => void
}) => {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'h',
      action: actions.hit || (() => {}),
      description: 'Hit',
      disabled: !actions.hit
    },
    {
      key: 's',
      action: actions.stand || (() => {}),
      description: 'Stand',
      disabled: !actions.stand
    },
    {
      key: 'd',
      action: actions.double || (() => {}),
      description: 'Double down',
      disabled: !actions.double
    },
    {
      key: 'p',
      action: actions.split || (() => {}),
      description: 'Split',
      disabled: !actions.split
    }
  ]

  useKeyboardShortcuts(shortcuts)

  return shortcuts.filter(s => !s.disabled)
}