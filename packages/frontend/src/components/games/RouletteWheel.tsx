import React from 'react'
import { motion } from 'framer-motion'

interface RouletteWheelProps {
  isSpinning: boolean
  winningNumber: number | null
  wheelNumbers: number[]
  getNumberColor: (num: number) => 'red' | 'black' | 'green'
}

const RouletteWheel: React.FC<RouletteWheelProps> = ({
  isSpinning,
  winningNumber,
  wheelNumbers,
  getNumberColor
}) => {
  // Calculate rotation for winning number
  const getWinningRotation = () => {
    if (winningNumber === null) return 0
    const index = wheelNumbers.indexOf(winningNumber)
    const segmentAngle = 360 / wheelNumbers.length
    return -(index * segmentAngle) + (segmentAngle / 2) + 720 // Extra rotations for effect
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Wheel Container */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96">
        {/* Wheel Pointer */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-20">
          <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-tarkov-accent"></div>
        </div>

        {/* Spinning Wheel */}
        <motion.div
          className="relative w-full h-full rounded-full border-8 border-tarkov-accent shadow-2xl overflow-hidden"
          animate={{
            rotate: isSpinning ? getWinningRotation() : 0
          }}
          transition={{
            duration: isSpinning ? 3 : 0,
            ease: "easeOut"
          }}
        >
          {/* Wheel Segments */}
          {wheelNumbers.map((number, index) => {
            const angle = (360 / wheelNumbers.length) * index
            const color = getNumberColor(number)
            
            return (
              <div
                key={number}
                className="absolute w-full h-full"
                style={{
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: 'center'
                }}
              >
                <div
                  className={`absolute w-full h-1/2 origin-bottom ${
                    color === 'red' ? 'bg-red-600' :
                    color === 'black' ? 'bg-gray-900' :
                    'bg-green-600'
                  } border-r border-tarkov-accent/30`}
                  style={{
                    clipPath: `polygon(45% 0%, 55% 0%, 50% 100%)`
                  }}
                >
                  {/* Number Label */}
                  <div
                    className="absolute text-white font-bold text-sm transform -rotate-90 origin-center"
                    style={{
                      top: '20px',
                      left: '50%',
                      transform: `translateX(-50%) rotate(${-angle + 90}deg)`
                    }}
                  >
                    {number}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Center Hub */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-tarkov-accent rounded-full border-4 border-white shadow-lg flex items-center justify-center">
            <div className="text-tarkov-dark font-bold text-sm">EFT</div>
          </div>
        </motion.div>

        {/* Spinning Effect Overlay */}
        {isSpinning && (
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-radial from-transparent via-tarkov-accent/20 to-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )}
      </div>

      {/* Wheel Status */}
      <div className="mt-6 text-center">
        {isSpinning ? (
          <motion.div
            className="text-tarkov-accent font-bold text-xl"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            Spinning...
          </motion.div>
        ) : winningNumber !== null ? (
          <motion.div
            className="text-2xl font-bold"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <span className="text-gray-300">Winning Number: </span>
            <span className={`
              ${getNumberColor(winningNumber) === 'red' ? 'text-red-500' :
                getNumberColor(winningNumber) === 'black' ? 'text-gray-300' :
                'text-green-500'}
            `}>
              {winningNumber}
            </span>
          </motion.div>
        ) : (
          <div className="text-gray-400">Place your bet and spin!</div>
        )}
      </div>
    </div>
  )
}

export default RouletteWheel