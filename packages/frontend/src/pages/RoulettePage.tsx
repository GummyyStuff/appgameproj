import React, { useState, useEffect, Suspense } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useBalance, useBalanceUpdates } from '../hooks/useBalance'
import { useRouletteRealtime } from '../hooks/useRouletteRealtime'
import { useSoundEffects, useSoundPreferences } from '../hooks/useSoundEffects'
import { useToastContext } from '../components/providers/ToastProvider'
import { useGameShortcuts } from '../hooks/useKeyboardShortcuts'
import { useAdvancedFeatures } from '../hooks/useAdvancedFeatures'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../utils/currency'
import { trackRoulettePerformance } from '../utils/roulette-performance'
import RoulettePreloader from '../components/games/RoulettePreloader'
import { 
  LazyRouletteWheel, 
  LazyBettingPanel, 
  LazyResultDisplay, 
  LazyGameHistory,
  preloadRouletteComponents 
} from '../components/games/LazyRouletteComponents'
import { SkeletonGameCard, SkeletonCard } from '../components/ui/Skeleton'

// Lazy load AnimatePresence only when needed
const LazyAnimatePresence = React.lazy(() => 
  import('framer-motion').then(module => ({ default: module.AnimatePresence }))
)

interface RouletteBet {
  betType: 'number' | 'red' | 'black' | 'odd' | 'even' | 'low' | 'high' | 'dozen' | 'column'
  betValue: number | string
  amount: number
}

interface RouletteResult {
  success: boolean
  game_result: {
    bet_type: string
    bet_value: number | string
    winning_number: number
    multiplier: number
  }
  bet_amount: number
  win_amount: number
  net_result: number
  new_balance: number
  game_id: string
  error?: string
}

interface GameState {
  isSpinning: boolean
  winningNumber: number | null
  lastResult: RouletteResult | null
  gameHistory: RouletteResult[]
}

const RoulettePage: React.FC = () => {
  const { user } = useAuth()
  const { balance, isLoading: balanceLoading } = useBalance()
  const { updateBalance } = useBalanceUpdates()
  const { isConnected, broadcastGameStart } = useRouletteRealtime()
  const { soundEnabled, toggleSound } = useSoundPreferences()
  const { playSpinSound, playWinSound, playLoseSound, playBetSound } = useSoundEffects()
  const { trackGamePlayed, updateAchievementProgress } = useAdvancedFeatures()
  const toast = useToastContext()
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  
  // Performance tracking
  const performanceTracker = React.useMemo(() => trackRoulettePerformance(), [])
  
  const [gameState, setGameState] = useState<GameState>({
    isSpinning: false,
    winningNumber: null,
    lastResult: null,
    gameHistory: []
  })
  
  const [currentBet, setCurrentBet] = useState<RouletteBet>({
    betType: 'red',
    betValue: 'red',
    amount: 100
  })
  
  const [betAmount, setBetAmount] = useState(100)
  const [error, setError] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)

  // Roulette wheel numbers in European layout order
  const wheelNumbers = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
    24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ]

  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]

  // Initialize loading state based on actual data loading and preload components
  useEffect(() => {
    if (!balanceLoading && user) {
      // Preload components while showing initial loading
      preloadRouletteComponents()
      performanceTracker.markComponentLoaded('core-hooks')
      
      // Small delay to ensure components are preloaded
      const timer = setTimeout(() => {
        setIsInitialLoading(false)
        performanceTracker.markInteractionReady()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [balanceLoading, user, performanceTracker])

  const getNumberColor = (num: number): 'red' | 'black' | 'green' => {
    if (num === 0) return 'green'
    return redNumbers.includes(num) ? 'red' : 'black'
  }

  const placeBet = async () => {
    if (!user) {
      setError('Please log in to place bets')
      return
    }

    if (betAmount > balance) {
      setError('Insufficient balance')
      toast.error('Insufficient balance', `You need ₽${(betAmount - balance).toLocaleString()} more`)
      return
    }

    if (betAmount < 1) {
      setError('Minimum bet is ₽1')
      toast.error('Invalid bet', 'Minimum bet amount is ₽1')
      return
    }

    setError(null)
    setGameState(prev => ({ 
      ...prev, 
      isSpinning: true, 
      winningNumber: null, // Reset winning number for new spin
      lastResult: null 
    }))

    // Play bet sound
    playBetSound()

    try {
      // Broadcast game start for real-time updates
      await broadcastGameStart(betAmount, currentBet.betType, currentBet.betValue)

      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      if (!token) {
        throw new Error('Please log in to place bets')
      }

      console.log('Making API call with token:', token ? 'Token present' : 'No token')

      const response = await fetch('/api/games/roulette/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: betAmount,
          betType: currentBet.betType,
          betValue: currentBet.betValue
        })
      })

      if (!response.ok) {
        let errorMessage = 'Failed to place bet'
        try {
          const errorData = await response.json()
          console.error('API Error Response:', errorData)
          errorMessage = errorData.error?.message || errorData.error || errorMessage
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result: RouletteResult = await response.json()

      // Play spin sound
      playSpinSound()

      // Simulate wheel spin duration
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          isSpinning: false,
          winningNumber: result.game_result.winning_number,
          lastResult: result,
          gameHistory: [result, ...prev.gameHistory.slice(0, 9)]
        }))
        
        updateBalance(result.new_balance)
        setShowResult(true)
        
        // Track game for achievements
        trackGamePlayed(betAmount, result.win_amount, 'roulette')
        
        // Update specific roulette achievements
        if (result.win_amount > 0) {
          // Track roulette wins for roulette master achievement
          updateAchievementProgress('roulette-master', 1)
        }
        
        // Play result sound and show toast
        if (result.win_amount > 0) {
          playWinSound()
          toast.success(
            'You won!', 
            `₽${result.win_amount.toLocaleString()} on ${result.game_result.winning_number}`,
            { duration: 4000 }
          )
        } else {
          playLoseSound()
          toast.info(
            'Better luck next time!', 
            `Number ${result.game_result.winning_number} came up`,
            { duration: 3000 }
          )
        }
        
        // Hide result after 5 seconds
        setTimeout(() => setShowResult(false), 5000)
      }, 3000)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to place bet'
      setError(errorMessage)
      toast.error('Bet failed', errorMessage)
      setGameState(prev => ({ ...prev, isSpinning: false }))
    }
  }

  const betTypeOptions = [
    { type: 'red', value: 'red', label: 'Red', payout: '1:1' },
    { type: 'black', value: 'black', label: 'Black', payout: '1:1' },
    { type: 'odd', value: 'odd', label: 'Odd', payout: '1:1' },
    { type: 'even', value: 'even', label: 'Even', payout: '1:1' },
    { type: 'low', value: 'low', label: '1-18', payout: '1:1' },
    { type: 'high', value: 'high', label: '19-36', payout: '1:1' },
    { type: 'dozen', value: 1, label: '1st 12', payout: '2:1' },
    { type: 'dozen', value: 2, label: '2nd 12', payout: '2:1' },
    { type: 'dozen', value: 3, label: '3rd 12', payout: '2:1' }
  ]

  // Keyboard shortcuts for roulette (after placeBet function is declared)
  useGameShortcuts({
    placeBet: !gameState.isSpinning ? placeBet : undefined,
    toggleSound,
    quickBet: (amount) => setBetAmount(Math.min(amount, balance))
  })

  // Show loading skeleton during initial load
  if (isInitialLoading || balanceLoading) {
    return (
      <div className="min-h-screen bg-tarkov-darker text-white p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header Skeleton */}
          <div className="text-center mb-8">
            <div className="h-12 bg-tarkov-secondary/50 rounded-lg w-64 mx-auto mb-4 animate-pulse" />
            <div className="h-4 bg-tarkov-secondary/30 rounded w-48 mx-auto mb-4 animate-pulse" />
            <div className="h-6 bg-tarkov-secondary/40 rounded w-32 mx-auto animate-pulse" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
            {/* Game Area Skeleton */}
            <div className="xl:col-span-2">
              <SkeletonGameCard />
            </div>

            {/* Betting Panel Skeleton */}
            <div className="space-y-6">
              <SkeletonCard />
              <SkeletonCard className="h-64" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-tarkov-darker text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <h1 className="text-4xl font-tarkov font-bold text-tarkov-accent">
              Tarkov Roulette
            </h1>
            <div className="ml-4 flex items-center space-x-3">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                isConnected ? 'bg-tarkov-success/20 text-tarkov-success' : 'bg-tarkov-danger/20 text-tarkov-danger'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-tarkov-success animate-pulse' : 'bg-tarkov-danger'
                }`}></div>
                <span>{isConnected ? 'Live' : 'Offline'}</span>
              </div>
              {!isInitialLoading && (
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-tarkov-accent/20 text-tarkov-accent">
                  <div className="w-2 h-2 rounded-full bg-tarkov-accent"></div>
                  <span>Ready</span>
                </div>
              )}
              <button
                onClick={toggleSound}
                className={`p-2 rounded-full transition-colors hover:scale-110 active:scale-95 ${
                  soundEnabled ? 'bg-tarkov-accent/20 text-tarkov-accent' : 'bg-gray-600/20 text-gray-400'
                }`}
                title={soundEnabled ? 'Disable sound (S)' : 'Enable sound (S)'}
              >
                {soundEnabled ? '🔊' : '🔇'}
              </button>
            </div>
          </div>
          <p className="text-gray-300">
            Place your bets and spin the wheel of fortune
          </p>
          <div className="mt-4 text-xl">
            Balance: <span className="text-tarkov-accent font-bold">
              {balanceLoading ? (
                <span className="inline-block w-24 h-6 bg-tarkov-secondary/50 rounded animate-pulse" />
              ) : (
                formatCurrency(balance, 'roubles')
              )}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Roulette Wheel */}
          <div className="xl:col-span-2 order-1 xl:order-1">
            {isInitialLoading ? (
              <RoulettePreloader />
            ) : (
              <>
                <Suspense fallback={<RoulettePreloader />}>
                  <LazyRouletteWheel 
                    isSpinning={gameState.isSpinning}
                    winningNumber={gameState.winningNumber}
                    wheelNumbers={wheelNumbers}
                    getNumberColor={getNumberColor}
                  />
                </Suspense>
                
                {/* Result Display */}
                <Suspense fallback={null}>
                  <LazyAnimatePresence>
                    {showResult && gameState.lastResult && (
                      <LazyResultDisplay result={gameState.lastResult} />
                    )}
                  </LazyAnimatePresence>
                </Suspense>
              </>
            )}
          </div>

          {/* Betting Panel and History */}
          <div className="space-y-6 order-2 xl:order-2">
            {isInitialLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard className="h-64" />
              </>
            ) : (
              <>
                <Suspense fallback={<SkeletonCard />}>
                  <LazyBettingPanel
                    currentBet={currentBet}
                    setCurrentBet={setCurrentBet}
                    betAmount={betAmount}
                    setBetAmount={setBetAmount}
                    balance={balance}
                    betTypeOptions={betTypeOptions}
                    onPlaceBet={placeBet}
                    isSpinning={gameState.isSpinning}
                    error={error}
                  />
                </Suspense>

                {/* Game History - Hidden on mobile when spinning to save space */}
                <div className={`${gameState.isSpinning ? 'hidden md:block' : 'block'}`}>
                  <Suspense fallback={<SkeletonCard className="h-64" />}>
                    <LazyGameHistory history={gameState.gameHistory} getNumberColor={getNumberColor} />
                  </Suspense>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoulettePage