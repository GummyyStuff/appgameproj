import React, { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useBalance, useBalanceUpdates } from '../hooks/useBalance'
import { useRouletteRealtime } from '../hooks/useRouletteRealtime'
import { useSoundEffects, useSoundPreferences } from '../hooks/useSoundEffects'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../utils/currency'
import RouletteWheel from '../components/games/RouletteWheel'
import BettingPanel from '../components/games/BettingPanel'
import ResultDisplay from '../components/games/ResultDisplay'
import GameHistory from '../components/games/GameHistory'

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
  const { balance } = useBalance()
  const { updateBalance } = useBalanceUpdates()
  const { isConnected, broadcastGameStart } = useRouletteRealtime()
  const { soundEnabled, toggleSound } = useSoundPreferences()
  const { playSpinSound, playWinSound, playLoseSound, playBetSound } = useSoundEffects(soundEnabled)
  
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
      return
    }

    if (betAmount < 1) {
      setError('Minimum bet is ₽1')
      return
    }

    setError(null)
    setGameState(prev => ({ ...prev, isSpinning: true }))

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
        
        // Play result sound
        if (result.win_amount > 0) {
          playWinSound()
        } else {
          playLoseSound()
        }
        
        // Hide result after 5 seconds
        setTimeout(() => setShowResult(false), 5000)
      }, 3000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bet')
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
              <button
                onClick={toggleSound}
                className={`p-2 rounded-full transition-colors ${
                  soundEnabled ? 'bg-tarkov-accent/20 text-tarkov-accent' : 'bg-gray-600/20 text-gray-400'
                }`}
                title={soundEnabled ? 'Disable sound' : 'Enable sound'}
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
              {formatCurrency(balance, 'roubles')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Roulette Wheel */}
          <div className="xl:col-span-2 order-1 xl:order-1">
            <RouletteWheel 
              isSpinning={gameState.isSpinning}
              winningNumber={gameState.winningNumber}
              wheelNumbers={wheelNumbers}
              getNumberColor={getNumberColor}
            />
            
            {/* Result Display */}
            <AnimatePresence>
              {showResult && gameState.lastResult && (
                <ResultDisplay result={gameState.lastResult} />
              )}
            </AnimatePresence>
          </div>

          {/* Betting Panel and History */}
          <div className="space-y-6 order-2 xl:order-2">
            <BettingPanel
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

            {/* Game History - Hidden on mobile when spinning to save space */}
            <div className={`${gameState.isSpinning ? 'hidden md:block' : 'block'}`}>
              <GameHistory history={gameState.gameHistory} getNumberColor={getNumberColor} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoulettePage