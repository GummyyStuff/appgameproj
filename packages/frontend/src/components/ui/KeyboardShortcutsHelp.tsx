import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyboardShortcut } from '../../hooks/useKeyboardShortcuts'

interface KeyboardShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
  shortcuts: KeyboardShortcut[]
  title?: string
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
  shortcuts,
  title = 'Keyboard Shortcuts'
}) => {
  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const keys = []
    
    if (shortcut.ctrlKey) keys.push('Ctrl')
    if (shortcut.altKey) keys.push('Alt')
    if (shortcut.shiftKey) keys.push('Shift')
    if (shortcut.metaKey) keys.push('Cmd')
    
    keys.push(shortcut.key.toUpperCase())
    
    return keys.join(' + ')
  }

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-tarkov-dark border border-gray-600 rounded-lg shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 pb-4 border-b border-gray-600">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                    <span>⌨️</span>
                    <span>{title}</span>
                  </h3>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-96">
                {shortcuts.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    No keyboard shortcuts available
                  </p>
                ) : (
                  <div className="space-y-3">
                    {shortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 bg-tarkov-secondary/30 rounded-lg"
                      >
                        <span className="text-gray-300 text-sm">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center space-x-1">
                          {formatShortcut(shortcut).split(' + ').map((key, keyIndex, array) => (
                            <React.Fragment key={keyIndex}>
                              <kbd className="px-2 py-1 bg-tarkov-secondary text-tarkov-accent text-xs rounded border border-gray-600 font-mono">
                                {key}
                              </kbd>
                              {keyIndex < array.length - 1 && (
                                <span className="text-gray-500 text-xs">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-600 bg-tarkov-secondary/20">
                <p className="text-xs text-gray-400 text-center">
                  Press <kbd className="px-1 py-0.5 bg-tarkov-secondary text-tarkov-accent text-xs rounded">ESC</kbd> to close
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export default KeyboardShortcutsHelp