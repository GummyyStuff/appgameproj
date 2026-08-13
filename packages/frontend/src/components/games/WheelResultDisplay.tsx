import { useState } from 'react'
import { motion } from 'framer-motion'
import type { WheelOfChanceResult } from '../../types/wheel'

interface WheelResultDisplayProps {
  result: WheelOfChanceResult
  onDismiss?: () => void
}

interface VerifyResponse {
  hash: string
  random_value: number
  server_seed_hash: string
}

const WheelResultDisplay: React.FC<WheelResultDisplayProps> = ({ result, onDismiss }) => {
  const isWin = result.total_win > 0
  const winningSegment = result.wheel_layout[result.winning_segment]
  const verification = result.verification
  const [showFair, setShowFair] = useState(false)
  const [verifyState, setVerifyState] = useState<'idle' | 'checking' | 'passed' | 'failed'>('idle')

  const handleVerify = async () => {
    if (!verification) return
    setVerifyState('checking')
    try {
      const response = await fetch('/api/games/provably-fair/verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          server_seed: verification.server_seed,
          client_seed: verification.client_seed,
          nonce: verification.nonce
        })
      })

      if (!response.ok) {
        setVerifyState('failed')
        return
      }

      const data: VerifyResponse = await response.json()
      const matches =
        Math.abs(data.random_value - verification.random_value) < 0.0000001 &&
        data.server_seed_hash === verification.server_seed_hash

      setVerifyState(matches ? 'passed' : 'failed')
    } catch {
      setVerifyState('failed')
    }
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
      data-testid="wheel-result"
    >
      <motion.div
        className={`bg-tarkov-dark rounded-xl p-6 max-w-sm w-full mx-4 border-2 ${
          isWin ? 'border-tarkov-success' : 'border-tarkov-secondary'
        }`}
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 30 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <motion.div
            className={`text-4xl font-tarkov font-bold mb-2 ${
              isWin ? 'text-tarkov-success' : 'text-gray-400'
            }`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
          >
            {isWin ? `+₽${result.total_win.toLocaleString()}` : 'No Win'}
          </motion.div>

          <motion.div
            className="flex items-center justify-center gap-2 mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: winningSegment?.color }}
            />
            <span className="text-white font-tarkov text-lg">
              {winningSegment?.label}
            </span>
          </motion.div>
        </div>

        <motion.div
          className="bg-tarkov-secondary/50 rounded-lg p-3 space-y-2 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Bet:</span>
            <span className="text-white font-tarkov">₽{result.total_bet.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Multiplier:</span>
            <span className="text-tarkov-accent font-bold font-tarkov">{result.multiplier}x</span>
          </div>
          {result.special_triggered && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Special:</span>
              <span className="text-tarkov-warning font-tarkov capitalize">
                {result.special_triggered.replace('_', ' ')}
              </span>
            </div>
          )}
        </motion.div>

        {isWin && (
          <motion.div
            className="relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-tarkov-accent text-lg font-bold"
                initial={{
                  x: '50%',
                  y: '100%',
                  opacity: 0
                }}
                animate={{
                  x: `${20 + Math.random() * 60}%`,
                  y: `${-20 - Math.random() * 40}%`,
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 1.5,
                  delay: 0.5 + i * 0.15,
                  ease: 'easeOut'
                }}
              >
                ₽
              </motion.div>
            ))}
          </motion.div>
        )}

        {verification && (
          <div className="mt-4 border-t border-tarkov-secondary/60 pt-3">
            <button
              onClick={() => setShowFair(prev => !prev)}
              className="text-xs font-tarkov text-gray-400 hover:text-tarkov-accent transition-colors flex items-center gap-1.5 mx-auto"
            >
              <span>{showFair ? '▾' : '▸'}</span> Provably Fair
            </button>

            {showFair && (
              <div className="mt-3 space-y-2 text-xs font-mono bg-tarkov-secondary/30 rounded-lg p-3">
                <div>
                  <div className="text-gray-500 mb-1">Server Seed Hash</div>
                  <div className="text-gray-300 break-all">{verification.server_seed_hash}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Client Seed</div>
                  <div className="text-gray-300 break-all">{verification.client_seed}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Nonce</div>
                  <div className="text-gray-300">{verification.nonce}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Random Value</div>
                  <div className="text-gray-300">{verification.random_value.toFixed(12)}</div>
                </div>
                <button
                  onClick={handleVerify}
                  disabled={verifyState === 'checking'}
                  className="w-full py-2 rounded text-xs font-tarkov font-bold bg-tarkov-accent/20 text-tarkov-accent hover:bg-tarkov-accent/30 disabled:opacity-50 transition-colors"
                >
                  {verifyState === 'idle' && 'Verify on Server'}
                  {verifyState === 'checking' && 'Verifying...'}
                  {verifyState === 'passed' && '✓ Verified — spin is provably fair'}
                  {verifyState === 'failed' && '✗ Verification failed'}
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onDismiss}
          className="mt-4 w-full py-2 rounded-lg font-tarkov font-bold bg-tarkov-secondary hover:bg-tarkov-secondary/80 text-white transition-colors"
        >
          Continue
        </button>
      </motion.div>
    </motion.div>
  )
}

export default WheelResultDisplay
