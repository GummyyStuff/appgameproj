import React, { memo, useEffect, useRef } from 'react'
import { motion, useAnimation } from 'framer-motion'

interface RouletteWheelProps {
  isSpinning: boolean
  winningNumber: number | null
  wheelNumbers: number[]
  getNumberColor: (num: number) => 'red' | 'black' | 'green'
}

// Export the rotation calculation for testing
export const calculateWinningRotation = (winningNumber: number | null, wheelNumbers: number[]): number => {
  if (winningNumber === null || wheelNumbers.length === 0) return 0
  
  const index = wheelNumbers.indexOf(winningNumber)
  
  // If number not found in wheel, return 0
  if (index === -1) return 0
  
  const segmentAngle = 360 / wheelNumbers.length
  
  // Calculate the angle to position the winning number at the top (12 o'clock position)
  // The wheel segments start at 0 degrees and go clockwise
  // We want the winning segment to be at the top (0 degrees) where the pointer is
  const targetAngle = -(index * segmentAngle)
  
  // Handle -0 case
  return targetAngle === 0 ? 0 : targetAngle
}

// Calculate the final rotation including spin effect
export const calculateFinalRotation = (
  winningNumber: number | null, 
  wheelNumbers: number[], 
  currentRotation: number = 0,
  minSpins: number = 3
): number => {
  if (winningNumber === null) return currentRotation
  
  const baseAngle = calculateWinningRotation(winningNumber, wheelNumbers)
  
  // Find the target angle that's at least minSpins full rotations ahead
  let targetRotation = baseAngle
  const minRotation = currentRotation + (360 * minSpins)
  
  // Keep adding full rotations until we're past the minimum
  while (targetRotation < minRotation) {
    targetRotation += 360
  }
  
  return targetRotation
}

const RouletteWheel: React.FC<RouletteWheelProps> = memo(({
  isSpinning,
  winningNumber,
  wheelNumbers,
  getNumberColor
}) => {
  const controls = useAnimation()
  const currentRotationRef = useRef(0)
  
  // Calculate rotation for winning number
  const getWinningRotation = () => calculateWinningRotation(winningNumber, wheelNumbers)

  // Handle spinning animation
  useEffect(() => {
    if (isSpinning && winningNumber === null) {
      // Phase 1: Continuous spinning while waiting for result
      // Start from current position and spin continuously
      const startRotation = currentRotationRef.current
      
      controls.start({
        rotate: [startRotation, startRotation + 360],
        transition: {
          duration: 1,
          ease: "linear",
          repeat: Infinity
        }
      })
    } else if (isSpinning && winningNumber !== null) {
      // Phase 2: Decelerate to winning number
      const currentRotation = currentRotationRef.current
      const targetRotation = calculateFinalRotation(winningNumber, wheelNumbers, currentRotation, 3)
      
      currentRotationRef.current = targetRotation
      
      controls.start({
        rotate: targetRotation,
        transition: {
          duration: 2.5,
          ease: "easeOut"
        }
      })
    } else if (!isSpinning && winningNumber !== null) {
      // Final position: ensure we're at the winning number
      // Keep the current rotation from the deceleration phase
      const currentTarget = currentRotationRef.current
      controls.start({
        rotate: currentTarget,
        transition: {
          duration: 0.1,
          ease: "easeInOut"
        }
      })
    } else {
      // Reset position for new game
      currentRotationRef.current = 0
      controls.start({
        rotate: 0,
        transition: {
          duration: 0.8,
          ease: "easeInOut"
        }
      })
    }
  }, [isSpinning, winningNumber, controls, wheelNumbers])

  return (
    <div className="relative flex flex-col items-center">
      {/* Wheel Container */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96">
        {/* Wheel Pointer - Points to winning number at top */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 z-20">
          <div className="relative">
            {/* Main pointer triangle */}
            <div className="w-0 h-0 border-l-6 border-r-6 border-b-12 border-l-transparent border-r-transparent border-b-tarkov-accent shadow-lg"></div>
            {/* Pointer base for better visibility */}
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-tarkov-accent rounded-full shadow-lg"></div>
          </div>
        </div>

        {/* Spinning Wheel */}
        <motion.div
          className="relative w-full h-full rounded-full border-8 border-tarkov-accent shadow-2xl overflow-hidden"
          animate={controls}
        >
          {/* Wheel Segments - Optimized rendering */}
          <svg 
            className="absolute inset-0 w-full h-full" 
            viewBox="0 0 400 400"
          >
            {wheelNumbers.map((number, index) => {
              const segmentAngle = 360 / wheelNumbers.length
              const startAngle = index * segmentAngle
              const endAngle = (index + 1) * segmentAngle
              const color = getNumberColor(number)
              
              // Convert to radians for calculations
              const startAngleRad = (startAngle * Math.PI) / 180
              const endAngleRad = (endAngle * Math.PI) / 180
              
              // Calculate path points (outer edge of wheel)
              const x1 = 200 + 180 * Math.cos(startAngleRad)
              const y1 = 200 + 180 * Math.sin(startAngleRad)
              const x2 = 200 + 180 * Math.cos(endAngleRad)
              const y2 = 200 + 180 * Math.sin(endAngleRad)
              
              // Calculate text position (middle of segment)
              const textAngle = startAngle + (segmentAngle / 2)
              const textAngleRad = (textAngle * Math.PI) / 180
              const textX = 200 + 140 * Math.cos(textAngleRad)
              const textY = 200 + 140 * Math.sin(textAngleRad)
              
              // Determine if we need a large arc flag (for segments > 180°)
              const largeArcFlag = segmentAngle > 180 ? 1 : 0
              
              return (
                <g key={`${number}-${index}`}>
                  <path
                    d={`M 200 200 L ${x1} ${y1} A 180 180 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                    fill={color === 'red' ? '#dc2626' : color === 'black' ? '#1f2937' : '#16a34a'}
                    stroke="rgba(255, 193, 7, 0.3)"
                    strokeWidth="1"
                  />
                  <text
                    x={textX}
                    y={textY}
                    fill="white"
                    fontSize="14"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${textAngle} ${textX} ${textY})`}
                  >
                    {number}
                  </text>
                </g>
              )
            })}
          </svg>

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
})

RouletteWheel.displayName = 'RouletteWheel'

export default RouletteWheel