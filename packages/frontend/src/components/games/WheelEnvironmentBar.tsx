import { memo } from 'react'
import { motion } from 'framer-motion'
import type { EnvironmentState } from '../../types/wheel'
import { ENVIRONMENT_META } from '../../utils/wheel-layout'

interface WheelEnvironmentBarProps {
  environment: EnvironmentState | null
  bonusActive?: boolean
}

const WheelEnvironmentBarInner: React.FC<WheelEnvironmentBarProps> = ({
  environment,
  bonusActive = false
}) => {
  if (!environment) return null

  const meta = ENVIRONMENT_META[environment.type]
  if (!meta) return null

  const affectedLabels = environment.modifiers
    .map(m => `#${m.segmentIndex + 1}`)
    .join(', ')

  return (
    <motion.div
      data-testid="wheel-environment-bar"
      className="w-full max-w-md flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 mb-4"
      style={{
        borderColor: `${meta.color}66`,
        backgroundColor: `${meta.color}14`
      }}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      key={environment.type + environment.spins_remaining}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
          style={{ backgroundColor: `${meta.color}26`, color: meta.color }}
          data-testid="wheel-environment-icon"
        >
          {environment.type === 'clear_skies' && '☀'}
          {environment.type === 'scav_raid' && '☠'}
          {environment.type === 'emp_strike' && '⚡'}
          {environment.type === 'thermal_scan' && '◎'}
          {environment.type === 'blackout' && '☾'}
        </div>
        <div className="min-w-0">
          <div
            className="text-sm font-tarkov font-bold uppercase tracking-wide truncate"
            style={{ color: meta.color }}
          >
            {meta.label}
          </div>
          <div className="text-xs text-gray-400 truncate" title={meta.description}>
            {meta.description}
          </div>
          {affectedLabels && (
            <div className="text-[10px] text-gray-500 font-tarkov truncate">
              Affected: {affectedLabels}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {bonusActive && (
          <span className="px-2 py-1 rounded bg-tarkov-accent/20 text-tarkov-accent text-[10px] font-tarkov font-bold uppercase animate-pulse">
            2x Bonus
          </span>
        )}
        <div className="text-right">
          <div className="text-[10px] text-gray-500 uppercase font-tarkov">Spins left</div>
          <div
            className="text-lg font-tarkov font-bold leading-none"
            data-testid="wheel-environment-spins"
            style={{ color: environment.spins_remaining === 1 ? '#f87171' : meta.color }}
          >
            {environment.spins_remaining}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

const WheelEnvironmentBar = memo(WheelEnvironmentBarInner)
export default WheelEnvironmentBar
