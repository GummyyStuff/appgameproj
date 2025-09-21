import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useToastContext } from '../components/providers/ToastProvider'
import { useGameShortcuts } from '../hooks/useKeyboardShortcuts'
import { useEnhancedButton } from '../hooks/useTouchInteractions'
import { 
  SkeletonCard, 
  SkeletonGameCard, 
  SkeletonTable, 
  SkeletonText,
  ConfirmDialog,
  KeyboardShortcutsHelp
} from '../components/ui'

const UXDemoPage: React.FC = () => {
  const toast = useToastContext()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [showSkeletons, setShowSkeletons] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Demo keyboard shortcuts
  const shortcuts = useGameShortcuts({
    placeBet: () => toast.success('Shortcut triggered!', 'Place bet shortcut (Enter) pressed'),
    maxBet: () => toast.info('Max bet!', 'Max bet shortcut (M) pressed'),
    quickBet: (amount) => toast.info('Quick bet!', `₽${amount} shortcut pressed`),
    toggleSound: () => toast.info('Sound toggled!', 'Sound shortcut (S) pressed'),
    showHelp: () => setShowShortcutsHelp(true),
    showHistory: () => toast.info('History!', 'History shortcut (G) pressed')
  })

  // Enhanced button for touch interactions
  const enhancedButtonProps = useEnhancedButton({
    onClick: () => toast.success('Button clicked!', 'Regular click detected'),
    onLongPress: () => toast.warning('Long press!', 'Long press detected - special action!'),
    disabled: false
  })

  const simulateLoading = () => {
    setIsLoading(true)
    setShowSkeletons(true)
    setTimeout(() => {
      setIsLoading(false)
      setShowSkeletons(false)
      toast.success('Loading complete!', 'Content loaded successfully')
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-tarkov-darker text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-tarkov font-bold text-tarkov-accent mb-4">
            UX Enhancement Demo
          </h1>
          <p className="text-gray-300">
            Showcasing all the new user experience improvements
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Toast Notifications Demo */}
          <div className="bg-tarkov-dark rounded-lg p-6">
            <h2 className="text-2xl font-bold text-tarkov-accent mb-4">
              🍞 Toast Notifications
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => toast.success('Success!', 'Operation completed successfully')}
                className="w-full bg-tarkov-success text-white px-4 py-2 rounded hover:bg-tarkov-success/80"
              >
                Show Success Toast
              </button>
              <button
                onClick={() => toast.error('Error!', 'Something went wrong')}
                className="w-full bg-tarkov-danger text-white px-4 py-2 rounded hover:bg-tarkov-danger/80"
              >
                Show Error Toast
              </button>
              <button
                onClick={() => toast.warning('Warning!', 'Please be careful')}
                className="w-full bg-tarkov-warning text-tarkov-dark px-4 py-2 rounded hover:bg-tarkov-warning/80"
              >
                Show Warning Toast
              </button>
              <button
                onClick={() => toast.info('Info!', 'Here is some information')}
                className="w-full bg-tarkov-accent text-tarkov-dark px-4 py-2 rounded hover:bg-tarkov-accent/80"
              >
                Show Info Toast
              </button>
            </div>
          </div>

          {/* Confirmation Dialogs Demo */}
          <div className="bg-tarkov-dark rounded-lg p-6">
            <h2 className="text-2xl font-bold text-tarkov-accent mb-4">
              ⚠️ Confirmation Dialogs
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => setShowConfirmDialog(true)}
                className="w-full bg-tarkov-warning text-tarkov-dark px-4 py-2 rounded hover:bg-tarkov-warning/80"
              >
                Show Confirmation Dialog
              </button>
              <p className="text-sm text-gray-400">
                Used for important actions like large bets or account changes
              </p>
            </div>
          </div>

          {/* Enhanced Touch Interactions Demo */}
          <div className="bg-tarkov-dark rounded-lg p-6">
            <h2 className="text-2xl font-bold text-tarkov-accent mb-4">
              👆 Enhanced Touch Interactions
            </h2>
            <div className="space-y-3">
              <motion.button
                {...enhancedButtonProps}
                className={`w-full bg-tarkov-accent text-tarkov-dark px-4 py-2 rounded font-bold ${enhancedButtonProps.className || ''}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Try Long Press (Mobile) or Click
              </motion.button>
              <p className="text-sm text-gray-400">
                On mobile: tap for normal action, long press for special action
              </p>
            </div>
          </div>

          {/* Keyboard Shortcuts Demo */}
          <div className="bg-tarkov-dark rounded-lg p-6">
            <h2 className="text-2xl font-bold text-tarkov-accent mb-4">
              ⌨️ Keyboard Shortcuts
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="w-full bg-tarkov-secondary text-white px-4 py-2 rounded hover:bg-tarkov-secondary/80"
              >
                Show Keyboard Shortcuts (H)
              </button>
              <div className="text-sm text-gray-400 space-y-1">
                <p>Try these shortcuts:</p>
                <p>• <kbd className="bg-tarkov-secondary px-1 rounded">Enter</kbd> - Place bet</p>
                <p>• <kbd className="bg-tarkov-secondary px-1 rounded">M</kbd> - Max bet</p>
                <p>• <kbd className="bg-tarkov-secondary px-1 rounded">1-5</kbd> - Quick bets</p>
                <p>• <kbd className="bg-tarkov-secondary px-1 rounded">H</kbd> - Show help</p>
              </div>
            </div>
          </div>

          {/* Loading States Demo */}
          <div className="lg:col-span-2">
            <div className="bg-tarkov-dark rounded-lg p-6">
              <h2 className="text-2xl font-bold text-tarkov-accent mb-4">
                ⏳ Loading States & Skeletons
              </h2>
              <div className="mb-4">
                <button
                  onClick={simulateLoading}
                  disabled={isLoading}
                  className="bg-tarkov-accent text-tarkov-dark px-6 py-2 rounded hover:bg-tarkov-accent/80 disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Simulate Loading'}
                </button>
              </div>

              {showSkeletons ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <SkeletonCard />
                  <SkeletonGameCard />
                  <div className="space-y-4">
                    <SkeletonText lines={3} />
                    <SkeletonTable rows={5} columns={3} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-tarkov-secondary/30 rounded-lg p-4">
                    <h3 className="font-bold mb-2">Card Content</h3>
                    <p className="text-sm text-gray-300">
                      This is what appears after loading completes.
                    </p>
                  </div>
                  <div className="bg-tarkov-secondary/30 rounded-lg p-4">
                    <h3 className="font-bold mb-2">Game Area</h3>
                    <div className="w-full h-32 bg-tarkov-accent/20 rounded flex items-center justify-center">
                      <span className="text-tarkov-accent">🎰</span>
                    </div>
                  </div>
                  <div className="bg-tarkov-secondary/30 rounded-lg p-4">
                    <h3 className="font-bold mb-2">Data Table</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Game</span>
                        <span>Result</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-400">
                        <span>Roulette</span>
                        <span className="text-tarkov-success">+₽500</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-400">
                        <span>Blackjack</span>
                        <span className="text-tarkov-danger">-₽100</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Responsiveness Note */}
        <div className="mt-8 bg-tarkov-secondary/20 rounded-lg p-6 text-center">
          <h3 className="text-xl font-bold text-tarkov-accent mb-2">
            📱 Mobile Responsiveness
          </h3>
          <p className="text-gray-300">
            All components are optimized for mobile devices with touch-friendly interactions,
            proper spacing, and responsive layouts that adapt to different screen sizes.
          </p>
        </div>

        {/* Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={() => {
            setShowConfirmDialog(false)
            toast.success('Confirmed!', 'Action was confirmed')
          }}
          title="Confirm Action"
          message="Are you sure you want to proceed with this action? This is a demonstration of the confirmation dialog."
          confirmText="Yes, Proceed"
          cancelText="Cancel"
          type="warning"
        />

        {/* Keyboard Shortcuts Help */}
        <KeyboardShortcutsHelp
          isOpen={showShortcutsHelp}
          onClose={() => setShowShortcutsHelp(false)}
          shortcuts={shortcuts}
          title="Demo Keyboard Shortcuts"
        />
      </div>
    </div>
  )
}

export default UXDemoPage