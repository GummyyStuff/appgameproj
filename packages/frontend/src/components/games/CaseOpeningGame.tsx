import React from 'react'
import { motion } from 'framer-motion'
import { useBalance } from '../../hooks/useBalance'
import { useSoundPreferences } from '../../hooks/useSoundEffects'
import { TarkovCard } from '../ui/TarkovCard'
import CaseSelector from './CaseSelector'
import ItemReveal from './ItemReveal'
import CaseOpeningAnimation from './CaseOpeningAnimation'
import CaseOpeningErrorBoundary from './ErrorBoundary'
import CaseResult from './CaseResult'
import CaseHistory from './CaseHistory'
import { formatCurrency } from '../../utils/currency'
import { useCaseOpeningGame } from '../../hooks/useCaseOpeningGame'
import { getErrorStrategy, getUserFriendlyMessage, isRecoverableError } from '../../utils/errorHandling'
import { animationVariants } from '../../styles/animationVariants'

// Enhanced error display component
const ErrorDisplay: React.FC<{
  error: string
  onRetry: () => void
  onRefresh: () => void
}> = ({ error, onRetry, onRefresh }) => {
  const errorObj = new Error(error)
  const strategy = getErrorStrategy(errorObj, 'case opening')
  const isRecoverable = isRecoverableError(errorObj, 'case opening')
  const userMessage = getUserFriendlyMessage(errorObj, 'case opening')

  return (
    <>
      <motion.h3
        className="text-xl md:text-2xl font-tarkov font-bold text-red-400 mb-6 text-center"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        ⚠️ {strategy.type === 'network' ? 'Connection Problem' :
            strategy.type === 'animation' ? 'Animation Error' :
            strategy.type === 'authentication' ? 'Authentication Required' :
            'Something Went Wrong'}
      </motion.h3>

      <div className="text-center py-8">
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-gray-300 text-lg mb-4">
            {userMessage}
          </div>

          {/* Error severity indicator */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            strategy.severity === 'critical' ? 'bg-red-900/30 text-red-400 border border-red-500/30' :
            strategy.severity === 'high' ? 'bg-orange-900/30 text-orange-400 border border-orange-500/30' :
            strategy.severity === 'medium' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30' :
            'bg-gray-900/30 text-gray-400 border border-gray-500/30'
          }`}>
            <span className="mr-1">
              {strategy.severity === 'critical' ? '🚨' :
               strategy.severity === 'high' ? '⚠️' :
               strategy.severity === 'medium' ? '🔔' : 'ℹ️'}
            </span>
            {strategy.severity.charAt(0).toUpperCase() + strategy.severity.slice(1)} Priority
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {isRecoverable && strategy.retry && (
            <motion.button
              onClick={onRetry}
              className="px-6 py-3 bg-tarkov-accent/20 border border-tarkov-accent/50 rounded-lg text-tarkov-accent hover:bg-tarkov-accent/30 transition-colors font-semibold"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🔄 Try Again
            </motion.button>
          )}

          <motion.button
            onClick={onRefresh}
            className="px-6 py-3 bg-gray-600/50 border border-gray-500/50 rounded-lg text-gray-300 hover:bg-gray-600/70 transition-colors font-semibold"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🔄 Refresh Page
          </motion.button>
        </motion.div>

        {/* Additional help text */}
        <motion.div
          className="mt-6 text-sm text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {strategy.type === 'network' && (
            <p>💡 <strong>Tip:</strong> Check your internet connection and try again.</p>
          )}
          {strategy.type === 'animation' && (
            <p>💡 <strong>Tip:</strong> The game will use a simpler animation mode.</p>
          )}
          {strategy.type === 'authentication' && (
            <p>💡 <strong>Tip:</strong> Please log in again to continue playing.</p>
          )}
          {strategy.type === 'validation' && (
            <p>💡 <strong>Tip:</strong> Check your balance and try a different case.</p>
          )}
        </motion.div>
      </div>
    </>
  )
}

/**
 * Main case opening game component with simplified state management and unified animations.
 * 
 * This component provides the complete case opening experience:
 * - Simplified state machine with clear phases
 * - Unified animation system supporting carousel and reveal modes
 * - Comprehensive error handling with user-friendly messages
 * - Performance-optimized carousel with virtualization
 * - Sound effects and visual feedback
 * - Opening history and result display
 * 
 * The component uses the useCaseOpeningGame hook for centralized state management
 * and provides a clean, maintainable interface for case opening functionality.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <CaseOpeningGame />
 * 
 * // The component handles all state internally
 * // No props required - uses hooks for data and state management
 * ```
 */
const CaseOpeningGame: React.FC = () => {
  const { balance } = useBalance()
  const { soundEnabled, toggleSound } = useSoundPreferences()
  const {
    gameState,
    caseTypes,
    isLoadingCases,
    openCase,
    completeAnimation
  } = useCaseOpeningGame()

  // Handle case selection (move to case_selected phase)
  const handleCaseSelected = (caseType: any) => {
    setSelectedCase(caseType)
    setShowConfirmation(true)
  }

  // Handle confirmation cancellation
  const handleCancelConfirmation = () => {
    setShowConfirmation(false)
    setSelectedCase(null)
  }

  // Local state for confirmation dialog
  const [showConfirmation, setShowConfirmation] = React.useState(false)
  const [selectedCase, setSelectedCase] = React.useState<any>(null)


  const handleRevealComplete = () => {
    if (gameState.result) {
      completeAnimation(gameState.result)
    }
  }

  const handleCarouselSpinComplete = () => {
    if (gameState.result) {
      completeAnimation(gameState.result)
    }
  }




  return (
    <CaseOpeningErrorBoundary gameType="case opening">
      <div className="min-h-screen bg-gradient-to-br from-tarkov-darker via-tarkov-dark to-tarkov-primary">
        <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Enhanced Header */}
        <motion.div
          className="text-center mb-8 md:mb-12"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center mb-6">
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-tarkov font-bold text-tarkov-accent mb-4 sm:mb-0 sm:mr-6"
              animate={{ 
                textShadow: [
                  "0 0 10px #F6AD55",
                  "0 0 20px #F6AD55",
                  "0 0 10px #F6AD55"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              📦 Case Opening
            </motion.h1>
            
            <div className="flex space-x-3">
              <motion.button
                onClick={toggleSound}
                className={`
                  p-3 md:p-4 rounded-full transition-all duration-300 border-2
                  hover:scale-110 active:scale-95 ${
                  soundEnabled 
                    ? 'bg-tarkov-accent/20 text-tarkov-accent border-tarkov-accent/50 shadow-lg shadow-tarkov-accent/30' 
                    : 'bg-gray-600/20 text-gray-400 border-gray-600/50'
                }`}
                title={soundEnabled ? 'Disable sound' : 'Enable sound'}
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.3 }}
              >
                <span className="text-xl md:text-2xl">
                  {soundEnabled ? '🔊' : '🔇'}
                </span>
              </motion.button>

              <motion.button
                onClick={() => {/* Carousel toggle disabled for now - always use carousel */}}
                className="p-3 md:p-4 rounded-full transition-all duration-300 border-2 bg-tarkov-accent/20 text-tarkov-accent border-tarkov-accent/50 shadow-lg shadow-tarkov-accent/30 hover:scale-110 active:scale-95"
                title="Carousel animation enabled"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.3 }}
              >
                <span className="text-xl md:text-2xl">
                  🎰
                </span>
              </motion.button>
            </div>
          </div>
          
          <motion.p 
            className="text-lg md:text-xl text-gray-300 mb-6 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Open Tarkov-themed cases to win valuable items and currency
          </motion.p>
          
          <motion.div
            className="balance-display"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            whileHover={{ scale: 1.05 }}
          >
            <span className="balance-label">💰 Balance:</span>
            <motion.span
              className="balance-amount"
              key={balance} // Re-animate when balance changes
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.3 }}
            >
              {formatCurrency(balance, 'roubles')}
            </motion.span>
            {gameState.phase === 'loading' && (
              <motion.div
                className="ml-2 w-2 h-2 bg-tarkov-accent rounded-full"
                {...animationVariants.loading.pulse}
              />
            )}
          </motion.div>
        </motion.div>

        <div className="max-w-6xl mx-auto space-y-8">
          {/* Carousel Animation - Always visible at top */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          >
            <TarkovCard className="p-6 md:p-8">

              {gameState.phase === 'animating' && gameState.animationConfig ? (
                <>
                  <motion.h3
                    className="text-xl md:text-2xl font-tarkov font-bold text-tarkov-accent mb-6 text-center"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {gameState.animationConfig.type === 'carousel' ? '🎰' : '✨'} Opening {gameState.selectedCase?.name}...
                  </motion.h3>

                  <CaseOpeningAnimation
                    config={gameState.animationConfig}
                    result={gameState.result}
                    onComplete={handleCarouselSpinComplete}
                    soundEnabled={soundEnabled}
                  />
                </>
              ) : gameState.phase === 'revealing' && gameState.result ? (
                <>
                  <motion.h3
                    className="text-xl md:text-2xl font-tarkov font-bold text-tarkov-accent mb-6 text-center"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    ✨ Revealing your prize...
                  </motion.h3>

                  <CaseOpeningAnimation
                    config={{ type: 'reveal', duration: 1500, easing: 'easeOut' }}
                    result={gameState.result}
                    onComplete={handleRevealComplete}
                    soundEnabled={soundEnabled}
                  />
                </>
              ) : gameState.phase === 'complete' && gameState.result ? (
                <CaseResult result={gameState.result} />
              ) : gameState.phase === 'error' ? (
                <ErrorDisplay
                  error={gameState.error || 'An unexpected error occurred'}
                  onRetry={() => {
                    // Reset to idle state to allow retry
                    setSelectedCase(null)
                    setShowConfirmation(false)
                  }}
                  onRefresh={() => window.location.reload()}
                />
              ) : (
                <>
                  <motion.h3
                    className="text-xl md:text-2xl font-tarkov font-bold text-tarkov-accent mb-6 text-center"
                    initial={{ opacity: 0.7 }}
                    animate={{ opacity: 1 }}
                  >
                    🎰 Case Opening Carousel
                  </motion.h3>

                  <div className="text-center py-12">
                    <motion.div
                      className="text-6xl mb-4 opacity-30"
                      animate={{
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      🎰
                    </motion.div>
                    <div className="text-gray-400 text-lg mb-2">
                      Select a case below and click "Open Case" to see the carousel animation
                    </div>
                    <div className="text-gray-500 text-sm">
                      Items will spin and reveal your prize here
                    </div>
                  </div>
                </>
              )}
            </TarkovCard>
          </motion.div>

          {/* Case Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <CaseSelector
              caseTypes={caseTypes}
              onCaseSelected={handleCaseSelected}
              onOpenCase={(caseType) => {
                setShowConfirmation(false)
                setSelectedCase(null)
                openCase(caseType)
              }}
              balance={balance}
              isLoading={isLoadingCases}
              selectedCase={selectedCase}
              showConfirmation={showConfirmation}
              onCancelConfirmation={handleCancelConfirmation}
            />
          </motion.div>



          {/* Enhanced Opening History */}
          <CaseHistory history={gameState.history} />

        </div>  {/* closes max-w-6xl container */}


        </div>  {/* closes container */}

        {/* Item Reveal Modal (Legacy fallback - only show for reveal animations) */}
        {gameState.phase === 'revealing' && gameState.animationConfig?.type === 'reveal' && gameState.result && (
          <ItemReveal
            result={gameState.result}
            isRevealing={true}
            onRevealComplete={handleRevealComplete}
          />
        )}
      </div>
    </CaseOpeningErrorBoundary>
  )
}

export default CaseOpeningGame