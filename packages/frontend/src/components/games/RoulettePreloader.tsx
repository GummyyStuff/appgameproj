import React from 'react'
import { motion } from 'framer-motion'

const RoulettePreloader: React.FC = () => {
  return (
    <div className="relative flex flex-col items-center">
      {/* Wheel Container */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96">
        {/* Wheel Pointer */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-20">
          <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-tarkov-accent"></div>
        </div>

        {/* Loading Wheel */}
        <motion.div
          className="relative w-full h-full rounded-full border-8 border-tarkov-accent shadow-2xl bg-gradient-conic from-tarkov-accent/20 via-tarkov-secondary/30 to-tarkov-accent/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          {/* Center Hub */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-tarkov-accent rounded-full border-4 border-white shadow-lg flex items-center justify-center">
            <div className="text-tarkov-dark font-bold text-sm">EFT</div>
          </div>
        </motion.div>
      </div>

      {/* Loading Status */}
      <div className="mt-6 text-center">
        <motion.div
          className="text-tarkov-accent font-bold text-xl"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          Loading Roulette...
        </motion.div>
      </div>
    </div>
  )
}

export default RoulettePreloader