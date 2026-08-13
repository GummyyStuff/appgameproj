import { motion } from 'framer-motion'
import type { WheelOfChanceResult } from '../../types/wheel'

interface WheelHistoryStripProps {
  history: WheelOfChanceResult[]
}

const WheelHistoryStrip: React.FC<WheelHistoryStripProps> = ({ history }) => {
  if (history.length === 0) {
    return null
  }

  return (
    <div className="bg-tarkov-dark rounded-lg p-3">
      <div className="text-xs font-tarkov text-gray-400 uppercase mb-2">Recent</div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {history.slice(0, 10).map((result, index) => {
          const segment = result.wheel_layout[result.winning_segment]
          const isWin = result.total_win > 0
          return (
            <motion.div
              key={result.uid ?? `history-${result.winning_segment}-${result.total_win}-${index}`}
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                isWin ? 'border-tarkov-success/50' : 'border-gray-600'
              }`}
              style={{ backgroundColor: segment?.color || '#4a4a4a' }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05 }}
              title={`${segment?.label} - ${isWin ? `+₽${result.total_win}` : 'Loss'}`}
            >
              <span className="text-white text-[10px] font-tarkov">
                {segment?.label?.substring(0, 3) || '?'}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default WheelHistoryStrip
