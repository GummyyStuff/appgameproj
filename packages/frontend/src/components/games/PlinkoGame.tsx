import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useBalance } from '../../hooks/useBalance'
import { useSoundEffects } from '../../hooks/useSoundEffects'
import PlinkoBoard from './PlinkoBoard'
import PlinkoControls from './PlinkoControls'
import PlinkoResult from './PlinkoResult'

interface PlinkoGameProps {
  className?: string
}

interface PlinkoBet {
  amount: number
  riskLevel: 'low' | 'medium' | 'high'
}

interface PlinkoResult {
  success: boolean
  game_result: {
    risk_level: 'low' | 'medium' | 'high'
    ball_path: number[]
    multiplier: number
    landing_slot: number
  }
  bet_amount: number
  win_amount: number
  net_result: number
  new_balance: number
  game_id: string
}

interface BoardConfig {
  rows: number
  slots: number
  startingPosition: number
  multipliers: Record<string, number[]>
}

interface RiskLevelInfo {
  description: string
  maxMultiplier: number
  minMultiplier: number
  expectedReturn: number
}

const PlinkoGame: React.FC<PlinkoGameProps> = ({ className = '' }) => {
  const { user, session } = useAuth()
  const { balance, refetch: refetchBalance } = useBalance()
  const { playBetSound, playWinSound, playLoseSound } = useSoundEffects()

  // Game state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBet, setCurrentBet] = useState<PlinkoBet>({ amount: 100, riskLevel: 'medium' })
  const [gameResult, setGameResult] = useState<PlinkoResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [boardConfig, setBoardConfig] = useState<BoardConfig | null>(null)
  const [riskLevels, setRiskLevels] = useState<Record<string, RiskLevelInfo> | null>(null)
  
  // Animation state
  const [ballPosition, setBallPosition] = useState<{ x: number; y: number } | null>(null)
  const [ballPath, setBallPath] = useState<number[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [showResult, setShowResult] = useState(false)

  // Load game configuration
  useEffect(() => {
    const loadGameConfig = async () => {
      try {
        const response = await fetch('/api/games/plinko', {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setBoardConfig(data.board_config)
          setRiskLevels(data.risk_levels)
        }
      } catch (error) {
        console.error('Failed to load plinko config:', error)
      }
    }

    if (user) {
      loadGameConfig()
    }
  }, [user])

  const handleBetChange = (bet: PlinkoBet) => {
    setCurrentBet(bet)
    setError(null)
  }

  const animateBallDrop = useCallback(async (path: number[], landingSlot: number) => {
    if (!boardConfig) return

    setIsAnimating(true)
    setBallPath(path)
    
    // Start from the top center
    const startX = boardConfig.startingPosition
    setBallPosition({ x: startX, y: 0 })

    // Animate through each row
    for (let row = 0; row < path.length; row++) {
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const movement = path[row]
      const newX = Math.max(0, Math.min(boardConfig.slots - 1, 
        (ballPosition?.x || startX) + (movement === 0 ? -0.5 : 0.5)))
      
      setBallPosition({ x: newX, y: row + 1 })
      playBetSound()
    }

    // Final position
    await new Promise(resolve => setTimeout(resolve, 300))
    setBallPosition({ x: landingSlot, y: boardConfig.rows + 1 })
    
    setIsAnimating(false)
    setShowResult(true)
    playWinSound()
  }, [boardConfig, ballPosition, playBetSound, playWinSound])

  const handleDropBall = async () => {
    if (!user || isPlaying || currentBet.amount > balance) return

    setIsPlaying(true)
    setError(null)
    setGameResult(null)
    setShowResult(false)
    setBallPosition(null)
    setBallPath([])

    try {
      const response = await fetch('/api/games/plinko/drop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          amount: currentBet.amount,
          riskLevel: currentBet.riskLevel
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setGameResult(data)
        await animateBallDrop(data.game_result.ball_path, data.game_result.landing_slot)
        refetchBalance()
      } else {
        setError(data.error || 'Game failed')
        playLoseSound()
      }
    } catch (error) {
      console.error('Plinko drop error:', error)
      setError('Network error occurred')
      playLoseSound()
    } finally {
      setIsPlaying(false)
    }
  }

  const handlePlayAgain = () => {
    setGameResult(null)
    setShowResult(false)
    setBallPosition(null)
    setBallPath([])
    setError(null)
  }

  if (!boardConfig || !riskLevels) {
    return (
      <div className={`flex items-center justify-center min-h-96 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tarkov-accent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Plinko game...</p>
        </div>
      </div>
    )
  }



  return (
    <div className={`space-y-6 ${className}`}>
      {/* Game Header */}
      <div className="text-center">
        <h2 className="text-3xl font-tarkov font-bold text-tarkov-accent mb-2">
          Plinko Drop
        </h2>
        <p className="text-gray-400">
          Drop the ball and watch it bounce through the pegs to win multipliers!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Betting Controls */}
        <div className="lg:col-span-1">
          <PlinkoControls
            currentBet={currentBet}
            onBetChange={handleBetChange}
            balance={balance}
            riskLevels={riskLevels}
            isPlaying={isPlaying}
            isAnimating={isAnimating}
            error={error}
            onDropBall={handleDropBall}
            onPlayAgain={handlePlayAgain}
            showPlayAgain={showResult}
          />
        </div>

        {/* Plinko Board */}
        <div className="lg:col-span-2">
          <div className="bg-tarkov-dark rounded-lg p-6">
            <PlinkoBoard
              boardConfig={boardConfig}
              riskLevel={currentBet.riskLevel}
              ballPosition={ballPosition}
              ballPath={ballPath}
              isAnimating={isAnimating}
              landingSlot={gameResult?.game_result.landing_slot}
            />
          </div>
        </div>
      </div>

      {/* Result Display */}
      <PlinkoResult
        result={gameResult}
        isVisible={showResult}
        onPlayAgain={handlePlayAgain}
      />
    </div>
  )
}

export default PlinkoGame