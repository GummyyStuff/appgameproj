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
import CaseOpeningCarousel, { CarouselItemData } from './CaseOpeningCarousel'
import { formatCurrency } from '../../utils/currency'
import { generateCarouselSequence, calculateWinningPosition, validateCarouselSequence, CAROUSEL_TIMING } from '../../utils/carousel'

interface CaseOpeningGameState {
  isOpening: boolean
  isRevealing: boolean
  isCarouselSpinning: boolean
  isCarouselSetup: boolean
  selectedCase: CaseType | null
  lastResult: CaseOpeningResult | null
  openingHistory: CaseOpeningResult[]
  carouselItems: CarouselItemData[]
  winningItemIndex: number
  caseItems: any[] // Items available in the selected case
  useCarousel: boolean // Flag to enable/disable carousel
  pendingCompletion?: {
    caseTypeId: string
    openingId: string
    token: string
    predeterminedWinner?: any
  }
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
    isCarouselSpinning: false,
    isCarouselSetup: false,
    selectedCase: null,
    lastResult: null,
    openingHistory: [],
    carouselItems: [],
    winningItemIndex: 0,
    caseItems: [],
    useCarousel: true, // Enable carousel by default
    pendingCompletion: undefined
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

  const openCase = async (caseType?: CaseType) => {
    const selectedCase = caseType || gameState.selectedCase

    if (!selectedCase || !user) {
      return
    }

    if (balance < selectedCase.price) {
      toast.error('Insufficient balance', `You need ${formatCurrency(selectedCase.price - balance, 'roubles')} more`)
      return
    }

    // Update selected case if passed as parameter
    if (caseType) {
      setGameState(prev => ({ ...prev, selectedCase: caseType }))
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

      // Step 1: Start case opening (deduct balance)
      const startResponse = await fetch('/api/games/cases/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          caseTypeId: selectedCase.id
        })
      })

      if (!startResponse.ok) {
        let errorMessage = 'Failed to start case opening'
        try {
          const errorData = await startResponse.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = `Server error: ${startResponse.status} ${startResponse.statusText}`
        }
        throw new Error(errorMessage)
      }

      const startResult = await startResponse.json()

      if (!startResult.success) {
        throw new Error(startResult.error || 'Case opening start failed')
      }

      // Show deduction message
      toast.success('Case Opened', `-${formatCurrency(startResult.case_price, 'roubles')} spent on case`, {
        duration: 2000
      })

      // Store the opening ID for completion
      const openingId = startResult.opening_id

      // Generate carousel sequence and start animation
      setTimeout(async () => {
        if (gameState.useCarousel) {
          try {
            // Set carousel setup state
            setGameState(prev => ({ ...prev, isOpening: false, isCarouselSetup: true }))
            
            // Determine the winning item without crediting (for carousel sequence)
            const previewResponse = await fetch('/api/games/cases/complete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                caseTypeId: selectedCase.id,
                openingId: openingId,
                delayCredit: true // Get winner without crediting
              })
            })

            if (!previewResponse.ok) {
              throw new Error('Failed to preview case opening')
            }

            const previewResult = await previewResponse.json()
            if (!previewResult.success) {
              throw new Error(previewResult.error || 'Case opening preview failed')
            }

            // Now we have the winning item - generate sequence with winning item at winning position
            const winningItem = previewResult.opening_result.item_won
            const winningPosition = calculateWinningPosition(CAROUSEL_TIMING.SEQUENCE_LENGTH)

            // Ensure we have a proper item pool
            let itemPool = gameState.caseItems
            if (!itemPool || itemPool.length === 0) {
              // Create a basic item pool with the winning item and some variations
              itemPool = [
                winningItem,
                // Add some common items as fallback with proper structure
                {
                  id: 'fallback-1',
                  name: 'Bandage',
                  rarity: 'common',
                  base_value: 100,
                  category: 'medical',
                  is_active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                },
                {
                  id: 'fallback-2',
                  name: 'Salewa First Aid Kit',
                  rarity: 'uncommon',
                  base_value: 300,
                  category: 'medical',
                  is_active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                },
                {
                  id: 'fallback-3',
                  name: 'IFAK Personal Tactical First Aid Kit',
                  rarity: 'rare',
                  base_value: 1000,
                  category: 'medical',
                  is_active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ]
            }

            // Filter out any invalid items
            itemPool = itemPool.filter(item =>
              item &&
              item.id &&
              item.name &&
              item.rarity &&
              typeof item.base_value === 'number'
            )

            // Generate the full sequence with winning item at the correct position
            const carouselSequence = generateCarouselSequence(itemPool, winningItem, CAROUSEL_TIMING.SEQUENCE_LENGTH, winningPosition)

            // Set the carousel state with winning item already in place
            setGameState(prev => ({
              ...prev,
              carouselItems: carouselSequence,
              winningItemIndex: winningPosition,
              lastResult: previewResult.opening_result,
              isCarouselSpinning: true,
              isCarouselSetup: false
            }))

            // Store completion data for when carousel finishes
            setGameState(prev => ({
              ...prev,
              pendingCompletion: {
                caseTypeId: selectedCase.id,
                openingId: openingId,
                token: token,
                predeterminedWinner: previewResult.opening_result
              }
            }))

          } catch (error) {
            console.error('Carousel setup error:', error)
            toast.error('Animation Error', 'Using fallback animation')

            // For carousel errors, we need to complete the case opening first
            ;(async () => {
              try {
                const completeResponse = await fetch('/api/games/cases/complete', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    caseTypeId: selectedCase.id,
                    openingId: openingId
                  })
                })

                if (completeResponse.ok) {
                  const completeResult = await completeResponse.json()
                  if (completeResult.success) {
                  // Fallback to original reveal animation
                  setGameState(prev => ({
                    ...prev,
                    isOpening: false,
                    isCarouselSetup: false,
                    isRevealing: true,
                    lastResult: completeResult.opening_result,
                    openingHistory: [completeResult.opening_result, ...prev.openingHistory.slice(0, 9)],
                    isCarouselSpinning: false
                  }))

                // Show winnings message
                setTimeout(() => {
                  toast.success('Item Won!', `+${formatCurrency(completeResult.currency_awarded, 'roubles')} won!`, {
                    duration: 3000
                  })
                }, 500)

                    // Update balance and track game
                    refreshBalance()
                    trackGamePlayed(
                      selectedCase.price,
                      completeResult.currency_awarded,
                      'case_opening'
                    )
                  }
                }
              } catch (error) {
                console.error('Error in carousel fallback:', error)
                setGameState(prev => ({ ...prev, isOpening: false }))
              }
            })()
          }
        } else {
          // Use original reveal animation if carousel is disabled
          // First complete the case opening to get the result
          ;(async () => {
            try {
              const completeResponse = await fetch('/api/games/cases/complete', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  caseTypeId: selectedCase.id,
                  openingId: openingId
                })
              })

              if (completeResponse.ok) {
                const completeResult = await completeResponse.json()
                if (completeResult.success) {
                  setGameState(prev => ({
                    ...prev,
                    isOpening: false,
                    isRevealing: true,
                    lastResult: completeResult.opening_result,
                    openingHistory: [completeResult.opening_result, ...prev.openingHistory.slice(0, 9)],
                    isCarouselSpinning: false
                  }))

                  // Show winnings message
                  setTimeout(() => {
                    toast.success('Item Won!', `+${formatCurrency(completeResult.currency_awarded, 'roubles')} won!`, {
                      duration: 3000
                    })
                  }, 500)

                  // Update balance and track game
                  refreshBalance()
                  trackGamePlayed(
                    selectedCase.price,
                    completeResult.currency_awarded,
                    'case_opening'
                  )
                }
              }
            } catch (error) {
              console.error('Error completing case opening (non-carousel):', error)
              setGameState(prev => ({ ...prev, isOpening: false }))
            }
          })()
        }
      }, 1000)

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

  const handleCarouselSpinComplete = async () => {
    // Check if we have pending completion data
    if (gameState.pendingCompletion) {
      try {
        // Call complete API to credit tokens using predetermined winner
        const { caseTypeId, openingId, token, predeterminedWinner } = gameState.pendingCompletion
        const completeResponse = await fetch('/api/games/cases/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            caseTypeId,
            openingId,
            delayCredit: false, // Credit now
            predeterminedWinner // Use the winner from preview
          })
        })

        if (!completeResponse.ok) {
          throw new Error('Failed to complete case opening')
        }

        const completeResult = await completeResponse.json()
        if (!completeResult.success) {
          throw new Error(completeResult.error || 'Case opening completion failed')
        }

        const result = completeResult
        const winningItem = result.opening_result.item_won

        // Set the final item for carousel display (carousel will show this at winning position)
        setGameState(prev => ({
          ...prev,
          lastResult: result.opening_result,
          revealedItem: winningItem
        }))

        // Play victory sounds and start victory animation
        playCaseReveal()
        setTimeout(() => {
          playRarityReveal(winningItem.rarity)
        }, 500)

        setTimeout(() => {
          if (result.currency_awarded > gameState.selectedCase!.price) {
            playWinSound()
          } else {
            playLoseSound()
          }
        }, 1000)

        // Show winnings toast as victory animation plays
        setTimeout(() => {
          toast.success('Item Won!', `+${formatCurrency(result.currency_awarded, 'roubles')} won!`, {
            duration: 3000
          })
        }, 1500)

        // Update balance and track game
        refreshBalance()
        trackGamePlayed(
          gameState.selectedCase!.price,
          result.currency_awarded,
          'case_opening'
        )

        // Add to history after victory animation completes
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            isCarouselSpinning: false,
            openingHistory: [result.opening_result, ...prev.openingHistory.slice(0, 9)],
            pendingCompletion: undefined // Clear pending completion
          }))
        }, 3000)

      } catch (error) {
        console.error('Error completing case opening:', error)
        toast.error('Failed to complete case opening')
        setGameState(prev => ({
          ...prev,
          isCarouselSpinning: false,
          pendingCompletion: undefined
        }))
      }
    }
  }

  const handleSelectCase = async (caseType: CaseType) => {
    setGameState(prev => ({ ...prev, selectedCase: caseType }))
    
    // Load items for this case type
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      if (token) {
        const response = await fetch(`/api/games/cases/${caseType.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          const itemPool = data.item_pool || []
          
          // Ensure we have valid items
          const validItems = itemPool.filter((item: any) => 
            item && item.id && item.name && item.rarity && typeof item.base_value === 'number'
          )
          
          setGameState(prev => ({ 
            ...prev, 
            caseItems: validItems
          }))
          
          console.log(`Loaded ${validItems.length} valid items for case ${caseType.name}`)
        } else {
          console.warn('Failed to load case items from API')
          setGameState(prev => ({ ...prev, caseItems: [] }))
        }
      }
    } catch (err) {
      console.error('Failed to load case items:', err)
      setGameState(prev => ({ ...prev, caseItems: [] }))
    }
  }



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
                onClick={() => setGameState(prev => ({ ...prev, useCarousel: !prev.useCarousel }))}
                className={`
                  p-3 md:p-4 rounded-full transition-all duration-300 border-2
                  hover:scale-110 active:scale-95 ${
                  gameState.useCarousel 
                    ? 'bg-tarkov-accent/20 text-tarkov-accent border-tarkov-accent/50 shadow-lg shadow-tarkov-accent/30' 
                    : 'bg-gray-600/20 text-gray-400 border-gray-600/50'
                }`}
                title={gameState.useCarousel ? 'Disable carousel animation' : 'Enable carousel animation'}
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.3 }}
              >
                <span className="text-xl md:text-2xl">
                  {gameState.useCarousel ? '🎰' : '📦'}
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
          {/* Carousel Animation - Always visible at top */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          >
            <TarkovCard className="p-6 md:p-8">
              {gameState.isCarouselSpinning || gameState.isCarouselSetup ? (
                <>
                  <motion.h3 
                    className="text-xl md:text-2xl font-tarkov font-bold text-tarkov-accent mb-6 text-center"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🎰 Opening {gameState.selectedCase?.name}...
                  </motion.h3>
                  
                  {gameState.isCarouselSetup ? (
                    <div className="text-center py-12">
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-lg text-gray-300 mb-4"
                      >
                        🎰 Preparing Case Opening...
                      </motion.div>
                      
                      <div className="flex justify-center space-x-2 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-3 h-3 bg-tarkov-accent rounded-full"
                            animate={{ 
                              scale: [1, 1.5, 1],
                              opacity: [0.5, 1, 0.5]
                            }}
                            transition={{ 
                              duration: 1, 
                              repeat: Infinity, 
                              delay: i * 0.2 
                            }}
                          />
                        ))}
                      </div>
                      
                      <p className="text-gray-400 text-sm">
                        Setting up carousel animation...
                      </p>
                    </div>
                  ) : gameState.carouselItems.length > 0 ? (
                    <CaseOpeningCarousel
                      items={gameState.carouselItems}
                      winningIndex={gameState.winningItemIndex}
                      isSpinning={gameState.isCarouselSpinning}
                      onSpinComplete={handleCarouselSpinComplete}
                      caseType={gameState.selectedCase!}
                      finalItem={gameState.revealedItem}
                    />
                  ) : null}
                </>
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
                      Select a case and click "Open Case" to see the carousel animation
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
              onOpenCase={openCase}
              balance={balance}
              isLoading={isLoadingCases}
            />
          </motion.div>



          {/* Enhanced Opening History */}
          {gameState.openingHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
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

        {/* Item Reveal Modal (Fallback) */}
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