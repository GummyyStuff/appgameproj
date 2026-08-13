import { motion } from 'framer-motion'
import type { WheelSegment } from '../../types/wheel'

interface WheelBettingPanelProps {
  segments: WheelSegment[]
  selectedDenomination: number
  onDenominationChange: (amount: number) => void
  betPlacements: { segmentIndex: number; amount: number }[]
  onAddBet: (segmentIndex: number) => void
  onRemoveBet: (segmentIndex: number) => void
  onClearBets: () => void
  onPlaceBet: () => void
  isSpinning: boolean
  balance: number
}

const DENOMINATIONS = [10, 50, 100, 500, 1000]

const WheelBettingPanel: React.FC<WheelBettingPanelProps> = ({
  segments,
  selectedDenomination,
  onDenominationChange,
  betPlacements,
  onAddBet,
  onRemoveBet,
  onClearBets,
  onPlaceBet,
  isSpinning,
  balance
}) => {
  const totalBet = betPlacements.reduce((sum, b) => sum + b.amount, 0)
  const bettableSegments = segments.filter(s => s.bettable)

  return (
    <div className="bg-tarkov-dark rounded-lg p-3 space-y-3">
      <h3 className="text-sm font-tarkov font-bold text-tarkov-accent uppercase tracking-wide">
        Place Bets
      </h3>

      <div className="md:grid md:grid-cols-2 gap-3 space-y-3 md:space-y-0">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {DENOMINATIONS.map((amount) => {
              const disabled = isSpinning || amount > balance
              return (
                <motion.button
                  key={amount}
                  data-testid={`denomination-${amount}`}
                  className={`px-3 py-1.5 rounded text-sm font-bold font-tarkov transition-all ${
                    selectedDenomination === amount
                      ? 'bg-tarkov-accent text-tarkov-dark shadow-lg shadow-tarkov-accent/25'
                      : 'bg-tarkov-secondary text-gray-300 hover:bg-tarkov-accent/20 hover:text-tarkov-accent'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => onDenominationChange(amount)}
                  disabled={disabled}
                  whileHover={!disabled ? { scale: 1.05 } : {}}
                  whileTap={!disabled ? { scale: 0.95 } : {}}
                >
                  ₽{amount}
                </motion.button>
              )
            })}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {bettableSegments.map((seg) => {
              const bet = betPlacements.find(b => b.segmentIndex === seg.index)
              const hasBet = !!bet
              return (
                <motion.button
                  key={seg.index}
                  data-testid={`multiplier-bet-${seg.index}`}
                  className={`relative rounded px-2 py-1.5 text-center transition-all border-2 ${
                    hasBet
                      ? 'border-tarkov-accent bg-tarkov-accent/10'
                      : 'border-gray-700 bg-tarkov-secondary/50 hover:border-tarkov-accent/40'
                  } ${isSpinning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={() => !isSpinning && onAddBet(seg.index)}
                  disabled={isSpinning}
                  whileHover={!isSpinning ? { scale: 1.03 } : {}}
                  whileTap={!isSpinning ? { scale: 0.97 } : {}}
                >
                  <div className="text-sm font-bold font-tarkov" style={{ color: seg.color }}>
                    {seg.label}
                  </div>
                  {hasBet && (
                    <div className="text-xs text-tarkov-accent font-tarkov font-bold mt-0.5">
                      ₽{bet.amount}
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3 flex flex-col">
          {betPlacements.length > 0 && (
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {betPlacements.map((placement) => {
                const segment = segments[placement.segmentIndex]
                if (!segment) return null
                return (
                  <motion.div
                    key={placement.segmentIndex}
                    className="flex items-center justify-between bg-tarkov-secondary/50 rounded px-3 py-1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                      <span className="text-sm text-white font-tarkov">{segment.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-tarkov-accent font-tarkov">₽{placement.amount}</span>
                      <button onClick={() => onRemoveBet(placement.segmentIndex)} disabled={isSpinning} className="text-gray-500 hover:text-tarkov-danger text-xs">✕</button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          <div className="bg-tarkov-secondary/30 rounded-lg p-2.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400 font-tarkov">Total Bet:</span>
              <span className="text-tarkov-accent font-bold font-tarkov">₽{totalBet.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-2 mt-auto">
            <motion.button
              className="flex-1 py-2 rounded text-sm font-tarkov font-medium bg-tarkov-secondary text-gray-300 hover:bg-tarkov-secondary/80 disabled:opacity-50"
              onClick={onClearBets}
              disabled={isSpinning || betPlacements.length === 0}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-testid="wheel-clear-button"
            >
              Clear
            </motion.button>
            <motion.button
              className={`flex-[2] py-3 rounded-lg font-tarkov font-bold text-lg transition-all ${
                isSpinning || totalBet === 0 || totalBet > balance
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-tarkov-accent text-tarkov-dark hover:bg-tarkov-accent/90 shadow-lg hover:shadow-tarkov-accent/25'
              }`}
              onClick={onPlaceBet}
              disabled={isSpinning || totalBet === 0 || totalBet > balance}
              whileHover={!isSpinning && totalBet > 0 ? { scale: 1.02 } : {}}
              whileTap={!isSpinning && totalBet > 0 ? { scale: 0.98 } : {}}
              data-testid="wheel-spin-button"
            >
              {isSpinning ? 'Spinning...' : 'Spin'}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WheelBettingPanel
