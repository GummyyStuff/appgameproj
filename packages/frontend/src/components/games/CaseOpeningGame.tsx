import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { useBalance } from '../../hooks/useBalance'
import { useAdvancedFeatures } from '../../hooks/useAdvancedFeatures'
import { useSoundEffects, useSoundPreferences } from '../../hooks/useSoundEffects'
import { useToastContext } from '../providers/ToastProvider'
import { supabase } from '../../lib/supabase'
import { TarkovCard } from '../ui/TarkovCard'
import { TarkovButton } from '../ui/TarkovButton'
import CaseSelector, { CaseType } from './CaseSelector'
import ItemReveal, { CaseOpeningResult } from './ItemReveal'
import { formatCurrency } from '../../utils/currency'

interface CaseOpeningGameState {
  isOpening: boolean
  isRevealing: boolean
  selectedCase: CaseType | null
  lastResult: CaseOpeningResult | null
  openingHistory: CaseOpeningResult[]
}

const CaseOpeningGame: React.FC = () => {
  const { user } = useAuth()
  const { balance, refetch: refreshBalance } = useBalance()
  const { trackGamePlayed, updateAchievementProgress } = useAdvancedFeatures()
  const { soundEnabled, toggleSound } = useSoundPreferences()
  const { playBetSound, playWinSound, playLoseSound, playCaseOpen, playCaseReveal, playRarityReveal } = useSoundEffects(soundEnabled)
  const toast = useToastContext()

  // Game state
  const [gameState, setGameState] = useState<CaseOpeningGameState>({
    isOpening: false,
    isRevealing: false,
    selectedCase: null,
    lastResult: null,
    openingHistory: []
  })

  // Data loading states
  const [caseTypes, setCaseTypes] = useState<CaseType[]>([])
  const [isLoadingCases, setIsLoadingCases] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load available case types
  useEffect(() => {
    loadCaseTypes()
  }, [])

  const loadCaseTypes = async () => {
    try {
      setIsLoadingCases(true)
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      if (!token) {
        throw new Error('Please log in to view cases')
      }

      const response = await fetch('/api/games/cases', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load case types')
      }

      const data = await response.json()
      setCaseTypes(data.case_types || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load cases'
      setError(errorMessage)
      toast.error('Loading failed', errorMessage)
    } finally {
      setIsLoadingCases(false)
    }
  }

  const openCase = async () => {
    if (!gameState.selectedCase || !user) {
      return
    }

    if (balance < gameState.selectedCase.price) {
      toast.error('Insufficient balance', `You need ${formatCurrency(gameState.selectedCase.price - balance, 'roubles')} more`)
      return
    }

    setError(null)
    setGameState(prev => ({ 
      ...prev, 
      isOpening: true,
      lastResult: null
    }))

    // Play case opening sound
    playCaseOpen()

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      if (!token) {
        throw new Error('Please log in to open cases')
      }

      const response = await fetch('/api/games/cases/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          caseTypeId: gameState.selectedCase.id
        })
      })

      if (!response.ok) {
        let errorMessage = 'Failed to open case'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Case opening failed')
      }

      // Start reveal animation after opening delay
      setTimeout(() => {
        // Play reveal sound
        playCaseReveal()
        
        setGameState(prev => ({
          ...prev,
          isOpening: false,
          isRevealing: true,
          lastResult: result.opening_result,
          openingHistory: [result.opening_result, ...prev.openingHistory.slice(0, 9)]
        }))

        // Update balance
        refreshBalance()

        // Track game for achievements
        trackGamePlayed(
          gameState.selectedCase!.price, 
          result.opening_result.currency_awarded, 
          'case_opening'
        )

        // Play rarity-specific sound after a short delay
        setTimeout(() => {
          playRarityReveal(result.opening_result.item_won.rarity)
        }, 1500)

        // Play result sound based on profit/loss
        setTimeout(() => {
          if (result.opening_result.currency_awarded > gameState.selectedCase!.price) {
            playWinSound()
          } else {
            playLoseSound()
          }
        }, 2500)

        // Show toast notification
        const profit = result.opening_result.currency_awarded - gameState.selectedCase!.price
        setTimeout(() => {
          if (profit > 0) {
            toast.success(
              `${result.opening_result.item_won.rarity.toUpperCase()} Item!`,
              `You won ${result.opening_result.item_won.name} (+${formatCurrency(profit, 'roubles')})`,
              { duration: 5000 }
            )
          } else {
            toast.info(
              'Item Received',
              `You got ${result.opening_result.item_won.name}`,
              { duration: 4000 }
            )
          }
        }, 3000)
      }, 2000)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open case'
      setError(errorMessage)
      toast.error('Case opening failed', errorMessage)
      setGameState(prev => ({ ...prev, isOpening: false }))
    }
  }

  const handleRevealComplete = () => {
    setTimeout(() => {
      setGameState(prev => ({ ...prev, isRevealing: false }))
    }, 2000)
  }

  const handleSelectCase = (caseType: CaseType) => {
    setGameState(prev => ({ ...prev, selectedCase: caseType }))
  }

  const canOpenCase = gameState.selectedCase && 
                     balance >= gameState.selectedCase.price && 
                     !gameState.isOpening && 
                     !gameState.isRevealing

  return (
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
            className="inline-flex items-center bg-tarkov-dark/50 rounded-full px-6 py-3 border border-tarkov-accent/30"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          >
            <span className="text-sm md:text-base text-gray-300 mr-2">Balance:</span>
            <span className="text-lg md:text-xl font-tarkov font-bold text-tarkov-accent">
              {formatCurrency(balance, 'roubles')}
            </span>
          </motion.div>
        </motion.div>

        <div className="max-w-6xl mx-auto space-y-8">
          {/* Case Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <CaseSelector
              caseTypes={caseTypes}
              selectedCaseType={gameState.selectedCase}
              onSelectCase={handleSelectCase}
              balance={balance}
              isLoading={isLoadingCases}
            />
          </motion.div>

          {/* Enhanced Opening Controls */}
          {gameState.selectedCase && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <TarkovCard className="p-6 md:p-8 text-center relative overflow-hidden">
                {/* Background animation for selected case */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-tarkov-accent/5 via-tarkov-accent/10 to-tarkov-accent/5"
                  animate={{ x: [-100, 100] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                
                <div className="relative z-10">
                  <motion.h3 
                    className="text-2xl md:text-3xl font-tarkov font-bold text-white mb-4"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Ready to Open: {gameState.selectedCase.name}
                  </motion.h3>
                  
                  <motion.div 
                    className="mb-8"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="inline-flex items-center bg-tarkov-primary/50 rounded-full px-6 py-3 border border-tarkov-accent/30 mb-4">
                      <span className="text-gray-300 mr-2">Cost:</span>
                      <span className="text-xl font-tarkov font-bold text-tarkov-accent">
                        {formatCurrency(gameState.selectedCase.price, 'roubles')}
                      </span>
                    </div>
                    
                    {/* Remaining balance after purchase */}
                    <div className="text-sm text-gray-400">
                      Remaining balance: {formatCurrency(balance - gameState.selectedCase.price, 'roubles')}
                    </div>
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <TarkovButton
                      onClick={openCase}
                      disabled={!canOpenCase}
                      loading={gameState.isOpening}
                      size="lg"
                      className="px-12 py-4 text-lg md:text-xl relative overflow-hidden"
                    >
                      {gameState.isOpening ? (
                        <motion.span
                          className="flex items-center"
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <motion.span
                            className="mr-3 text-2xl"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            📦
                          </motion.span>
                          Opening Case...
                        </motion.span>
                      ) : (
                        <span className="flex items-center">
                          <span className="mr-3 text-2xl">🎲</span>
                          Open Case
                        </span>
                      )}
                      
                      {/* Button glow effect */}
                      {canOpenCase && !gameState.isOpening && (
                        <motion.div
                          className="absolute inset-0 bg-tarkov-accent/20 rounded-lg"
                          animate={{ opacity: [0, 0.5, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </TarkovButton>
                  </motion.div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 bg-tarkov-danger/20 border border-tarkov-danger/50 rounded-lg"
                    >
                      <div className="text-tarkov-danger font-semibold mb-1">⚠️ Error</div>
                      <div className="text-tarkov-danger/80 text-sm">{error}</div>
                    </motion.div>
                  )}
                </div>
              </TarkovCard>
            </motion.div>
          )}

          {/* Enhanced Opening History */}
          {gameState.openingHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            >
              <TarkovCard className="p-6 md:p-8">
                <motion.h3 
                  className="text-xl md:text-2xl font-tarkov font-bold text-tarkov-accent mb-6 text-center"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  🏆 Recent Openings
                </motion.h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {gameState.openingHistory.slice(0, 6).map((result, index) => {
                    const rarityColors = {
                      common: 'border-gray-400 text-gray-400 bg-gray-400/10',
                      uncommon: 'border-green-400 text-green-400 bg-green-400/10',
                      rare: 'border-blue-400 text-blue-400 bg-blue-400/10',
                      epic: 'border-purple-400 text-purple-400 bg-purple-400/10',
                      legendary: 'border-yellow-400 text-yellow-400 bg-yellow-400/10'
                    }
                    
                    const profit = result.currency_awarded - result.case_type.price
                    
                    return (
                      <motion.div
                        key={result.opening_id}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ 
                          delay: index * 0.1,
                          type: "spring",
                          stiffness: 200,
                          damping: 20
                        }}
                        whileHover={{ 
                          scale: 1.05,
                          y: -5,
                          transition: { duration: 0.2 }
                        }}
                        className={`
                          p-4 md:p-5 rounded-xl border-2 backdrop-blur-sm
                          ${rarityColors[result.item_won.rarity]}
                          hover:shadow-lg transition-all duration-300
                        `}
                      >
                        <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">
                          {result.case_type.name}
                        </div>
                        
                        <div className="font-bold mb-3 text-sm md:text-base leading-tight">
                          {result.item_won.name}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-sm text-tarkov-accent font-semibold">
                            {formatCurrency(result.currency_awarded, 'roubles')}
                          </div>
                          
                          <div className={`text-xs font-medium ${
                            profit > 0 
                              ? 'text-green-400' 
                              : profit === 0 
                                ? 'text-yellow-400'
                                : 'text-red-400'
                          }`}>
                            {profit > 0 && '📈 '}
                            {profit === 0 && '➖ '}
                            {profit < 0 && '📉 '}
                            {profit > 0 
                              ? `+${formatCurrency(profit, 'roubles')}`
                              : profit === 0
                                ? 'Break Even'
                                : formatCurrency(Math.abs(profit), 'roubles')} 
                          </div>
                        </div>
                        
                        {/* Rarity indicator */}
                        <div className="absolute top-2 right-2">
                          <div className={`
                            w-3 h-3 rounded-full border-2 
                            ${rarityColors[result.item_won.rarity].split(' ')[0]}
                          `} />
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
                
                {/* Show more button if there are more results */}
                {gameState.openingHistory.length > 6 && (
                  <motion.div 
                    className="text-center mt-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    <button className="text-tarkov-accent hover:text-tarkov-accent/80 text-sm font-semibold">
                      View All History ({gameState.openingHistory.length} total)
                    </button>
                  </motion.div>
                )}
              </TarkovCard>
            </motion.div>
          )}
        </div>

        {/* Item Reveal Modal */}
        <ItemReveal
          result={gameState.lastResult}
          isRevealing={gameState.isRevealing}
          onRevealComplete={handleRevealComplete}
        />
      </div>
    </div>
  )
}

export default CaseOpeningGame