import { useState, useRef, useCallback, useEffect, Suspense, lazy, FC } from 'react'
import * as Sentry from '@sentry/react'
import { useAuth } from '../hooks/useAuth'
import { useBalance, useBalanceUpdates } from '../hooks/useBalance'
import { useSoundPreferences } from '../hooks/useSoundEffects'
import { useSoundManager } from '../components/ui/SoundManager'
import { useToastContext } from '../components/providers/ToastProvider'
import { useGameShortcuts } from '../hooks/useKeyboardShortcuts'
import { useAchievements } from '../hooks/useAchievements'
import { FontAwesomeSVGIcons } from '../components/ui/FontAwesomeSVG'
import type {
  WheelSegment,
  WheelBetPlacement,
  WheelOfChanceResult,
  WheelGameResponse
} from '../types/wheel'
import type { WheelSpinnerHandle } from '../components/games/WheelSpinner'

const LazyWheelSpinner = lazy(() => import('../components/games/WheelSpinner'))
const LazyWheelBettingPanel = lazy(() => import('../components/games/WheelBettingPanel'))
const LazyWheelResultDisplay = lazy(() => import('../components/games/WheelResultDisplay'))
const LazyWheelHistoryStrip = lazy(() => import('../components/games/WheelHistoryStrip'))
const LazyAnimatePresence = lazy(() =>
  import('framer-motion').then(module => ({ default: module.AnimatePresence }))
)

const RESET_DELAY_MS = 3000

const WheelOfChancePage: FC = () => {
  const { user } = useAuth()
  const { balance, isLoading: balanceLoading } = useBalance()
  const { updateBalance } = useBalanceUpdates()
  const { soundEnabled, toggleSound } = useSoundPreferences()
  const { playGameSound } = useSoundManager()
  const { trackGamePlayed, updateAchievementProgress } = useAchievements()
  const toast = useToastContext()

  const [segments, setSegments] = useState<WheelSegment[]>([])
  const [layoutSignature, setLayoutSignature] = useState<string>('')
  const [layoutLoading, setLayoutLoading] = useState(true)
  const [layoutError, setLayoutError] = useState<string | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [lastResult, setLastResult] = useState<WheelOfChanceResult | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [history, setHistory] = useState<WheelOfChanceResult[]>([])
  const [betPlacements, setBetPlacements] = useState<WheelBetPlacement[]>([])
  const [selectedDenomination, setSelectedDenomination] = useState(100)
  const [pacing, setPacing] = useState<'normal' | 'slow'>('normal')
  const [error, setError] = useState<string | null>(null)

  const wheelRef = useRef<WheelSpinnerHandle>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastResultRef = useRef<WheelOfChanceResult | null>(null)
  lastResultRef.current = lastResult

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }, [])

  const fetchWheelLayout = useCallback(async () => {
    setLayoutLoading(true)
    setLayoutError(null)
    try {
      const response = await fetch('/api/games/wheel-of-chance', {
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      })
      if (!response.ok) {
        throw new Error(`Failed to load wheel layout: ${response.status}`)
      }
      const data = await response.json()
      if (!data.wheel_layout || !data.layout_signature) {
        throw new Error('Invalid wheel layout response')
      }
      setSegments(data.wheel_layout)
      setLayoutSignature(data.layout_signature)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load wheel layout'
      Sentry.captureException(err, { tags: { game: 'wheel_of_chance', action: 'layout_fetch' } })
      setLayoutError(errorMessage)
    } finally {
      setLayoutLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWheelLayout()
  }, [fetchWheelLayout])

  const handleSegmentClick = useCallback((index: number) => {
    if (isSpinning) return
    clearResetTimer()

    setBetPlacements(prev => {
      const existing = prev.find(b => b.segmentIndex === index)
      if (existing) {
        const newAmount = existing.amount + selectedDenomination
        const totalAfter = prev.reduce((sum, b) => sum + b.amount, 0) + selectedDenomination
        if (totalAfter > balance) {
          toast.error('Insufficient balance', 'Not enough roubles for this bet')
          return prev
        }
        playGameSound('bet')
        return prev.map(b =>
          b.segmentIndex === index ? { ...b, amount: newAmount } : b
        )
      }

      const totalAfter = prev.reduce((sum, b) => sum + b.amount, 0) + selectedDenomination
      if (totalAfter > balance) {
        toast.error('Insufficient balance', 'Not enough roubles for this bet')
        return prev
      }

      playGameSound('bet')
      return [...prev, { segmentIndex: index, amount: selectedDenomination }]
    })
  }, [isSpinning, selectedDenomination, balance, toast, playGameSound, clearResetTimer])

  const handleRemoveBet = useCallback((segmentIndex: number) => {
    setBetPlacements(prev => prev.filter(b => b.segmentIndex !== segmentIndex))
  }, [])

  const handleClearBets = useCallback(() => {
    setBetPlacements([])
  }, [])

  const handleWheelTick = useCallback(() => {
    playGameSound('click')
  }, [playGameSound])

  const handleSpinComplete = useCallback(() => {
    setIsSpinning(false)
    setShowResult(true)

    const result = lastResultRef.current
    if (result) {
      trackGamePlayed(result.total_bet, result.total_win, 'wheel_of_chance')
      
      if (result.total_win > 0) {
        toast.success('You won!', `₽${result.total_win.toLocaleString()}`, { duration: 4000 })
        updateAchievementProgress('wheel-master', 1)
        playGameSound('win')
      } else {
        toast.info('No win', `Landed on ${result.wheel_layout[result.winning_segment]?.label}`, { duration: 3000 })
        playGameSound('lose')
      }
    }

    resetTimerRef.current = setTimeout(() => {
      setShowResult(false)
      setLastResult(null)
      setBetPlacements([])
      fetchWheelLayout()
    }, RESET_DELAY_MS)
  }, [trackGamePlayed, updateAchievementProgress, playGameSound, toast, fetchWheelLayout])

  const placeBet = useCallback(async () => {
    if (!user || isSpinning || betPlacements.length === 0) return

    const totalBet = betPlacements.reduce((sum, b) => sum + b.amount, 0)
    if (totalBet > balance) {
      toast.error('Insufficient balance', `You need ₽${(totalBet - balance).toLocaleString()} more`)
      return
    }
    if (!layoutSignature || segments.length === 0) {
      toast.error('Wheel not ready', 'Waiting for the wheel layout to load')
      return
    }

    setError(null)
    clearResetTimer()
    setShowResult(false)
    setIsSpinning(true)
    playGameSound('spin')
    wheelRef.current?.startSpin()

    try {
      Sentry.addBreadcrumb({
        category: 'http',
        message: 'POST /api/games/wheel-of-chance/spin',
        level: 'info',
        data: { bet_count: betPlacements.length, total_bet: totalBet }
      })

      const response = await fetch('/api/games/wheel-of-chance/spin', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-User-Id': user.id,
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          amount: totalBet,
          bets: betPlacements,
          wheel_layout: segments,
          layout_signature: layoutSignature
        })
      })

      if (!response.ok) {
        let errorMessage = 'Failed to spin'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error?.message || errorData.error || errorMessage
        } catch {
          errorMessage = `Server error: ${response.status}`
        }
        throw new Error(errorMessage)
      }

      const result: WheelGameResponse = await response.json()
      const gameResult = result.game_result

      setSegments(gameResult.wheel_layout)
      setLastResult(gameResult)
      setHistory(prev => [{ ...gameResult, uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }, ...prev].slice(0,20))
      updateBalance(result.new_balance)
      
      wheelRef.current?.settleTo(gameResult.winning_segment, handleSpinComplete)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to spin'
      Sentry.captureException(err, {
        tags: { game: 'wheel_of_chance', action: 'spin' },
        extra: { bet_count: betPlacements.length, total_bet: totalBet }
      })
      wheelRef.current?.stop()
      setError(errorMessage)
      toast.error('Spin failed', errorMessage)
      setIsSpinning(false)
    }
  }, [user, isSpinning, betPlacements, balance, clearResetTimer, updateBalance, toast, playGameSound, layoutSignature, segments, handleSpinComplete])

  useGameShortcuts({
    placeBet: !isSpinning && betPlacements.length > 0 ? placeBet : undefined,
    clearBet: !isSpinning ? handleClearBets : undefined,
    toggleSound,
    quickBet: !isSpinning ? (amount) => setSelectedDenomination(Math.min(amount, balance)) : undefined
  })

  if (balanceLoading || (layoutLoading && segments.length === 0)) {
    return (
      <div className="min-h-screen bg-tarkov-darker text-white p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="h-12 bg-tarkov-secondary/50 rounded-lg w-64 mx-auto mb-4 animate-pulse" />
            <div className="h-4 bg-tarkov-secondary/30 rounded w-48 mx-auto animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-tarkov-darker text-white p-4">
      <div className="max-w-5xl mx-auto flex flex-col items-center">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center mb-2">
            <h1 className="text-3xl md:text-4xl font-tarkov font-bold text-tarkov-accent uppercase tracking-wider">
              Wheel of Chance
            </h1>
            <button
              onClick={toggleSound}
              className={`ml-4 p-2 rounded-full transition-colors ${
                soundEnabled ? 'bg-tarkov-accent/20 text-tarkov-accent' : 'bg-gray-600/20 text-gray-400'
              }`}
            >
              {soundEnabled ? (
                <FontAwesomeSVGIcons.VolumeUp size={18} />
              ) : (
                <FontAwesomeSVGIcons.VolumeMute size={18} />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="w-full max-w-md mb-4 bg-tarkov-danger/20 border border-tarkov-danger rounded-lg p-3 text-tarkov-danger text-sm text-center">
            {error}
          </div>
        )}

        {layoutError && (
          <div className="w-full max-w-md mb-4 bg-tarkov-danger/20 border border-tarkov-danger rounded-lg p-3 text-tarkov-danger text-sm text-center">
            {layoutError}{' '}
            <button
              onClick={fetchWheelLayout}
              className="underline font-bold text-tarkov-accent ml-2 hover:text-tarkov-accent/80"
            >
              Retry
            </button>
          </div>
        )}

        <Suspense fallback={
          <div className="w-72 h-72 sm:w-96 sm:h-96 md:w-[500px] md:h-[500px] rounded-full bg-tarkov-secondary/30 animate-pulse" />
        }>
          <LazyWheelSpinner
            ref={wheelRef}
            segments={segments}
            isSpinning={isSpinning}
            onSegmentClick={handleSegmentClick}
            onTick={handleWheelTick}
            onSpinClick={placeBet}
            betPlacements={betPlacements}
            pacing={pacing}
          />
        </Suspense>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => setPacing('normal')}
            className={`px-3 py-1 rounded text-xs font-tarkov uppercase transition-all ${
              pacing === 'normal'
                ? 'bg-tarkov-accent text-tarkov-dark'
                : 'bg-tarkov-secondary text-gray-400 hover:text-white'
            }`}
          >
            Normal
          </button>
          <button
            onClick={() => setPacing('slow')}
            className={`px-3 py-1 rounded text-xs font-tarkov uppercase transition-all ${
              pacing === 'slow'
                ? 'bg-tarkov-accent text-tarkov-dark'
                : 'bg-tarkov-secondary text-gray-400 hover:text-white'
            }`}
          >
            Slow
          </button>
          {isSpinning && (
            <span className="text-gray-500 text-xs font-tarkov">Click wheel to skip</span>
          )}
        </div>

        <div className="w-full max-w-3xl mt-6">
          <Suspense fallback={
            <div className="bg-tarkov-dark rounded-lg p-4 h-64 animate-pulse" />
          }>
            <LazyWheelBettingPanel
              segments={segments}
              selectedDenomination={selectedDenomination}
              onDenominationChange={setSelectedDenomination}
              betPlacements={betPlacements}
              onAddBet={handleSegmentClick}
              onRemoveBet={handleRemoveBet}
              onClearBets={handleClearBets}
              onPlaceBet={placeBet}
              isSpinning={isSpinning}
              balance={balance}
            />
          </Suspense>
        </div>

        <div className="w-full max-w-3xl mt-4">
          <Suspense fallback={null}>
            <LazyWheelHistoryStrip history={history} />
          </Suspense>
        </div>

        <Suspense fallback={null}>
          <LazyAnimatePresence>
            {showResult && lastResult && (
              <LazyWheelResultDisplay
                result={lastResult}
                onDismiss={() => setShowResult(false)}
              />
            )}
          </LazyAnimatePresence>
        </Suspense>
      </div>
    </div>
  )
}

export default WheelOfChancePage
