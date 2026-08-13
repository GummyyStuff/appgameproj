import { memo } from 'react'
import { motion } from 'framer-motion'

interface WheelBonusAnimationProps {
  visible: boolean
  onComplete?: () => void
}

const WheelBonusAnimationInner: React.FC<WheelBonusAnimationProps> = ({
  visible,
  onComplete
}) => {
  if (!visible) return null

  return (
    <motion.div
      data-testid="wheel-bonus-animation"
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
      <motion.div
        className="relative flex flex-col items-center"
        initial={{ scale: 0.4, rotate: -8 }}
        animate={{ scale: [0.4, 1.15, 1], rotate: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        onAnimationComplete={onComplete}
      >
        <motion.div
          className="text-5xl md:text-7xl font-tarkov font-bold text-tarkov-accent uppercase tracking-wider drop-shadow-[0_0_25px_rgba(246,173,85,0.8)]"
          animate={{ textShadow: [
            '0 0 10px rgba(246,173,85,0.4)',
            '0 0 40px rgba(246,173,85,0.95)',
            '0 0 10px rgba(246,173,85,0.4)'
          ] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          BONUS WHEEL!
        </motion.div>
        <motion.div
          className="mt-2 text-sm md:text-base font-tarkov text-white/90 tracking-widest uppercase"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          All multipliers doubled
        </motion.div>
        <div className="mt-4 flex gap-2">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full bg-tarkov-accent"
              animate={{ scale: [1, 1.6, 1], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.12
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

const WheelBonusAnimation = memo(WheelBonusAnimationInner)
export default WheelBonusAnimation
