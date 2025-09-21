import React, { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PlinkoBoardProps {
  boardConfig: {
    rows: number
    slots: number
    startingPosition: number
    multipliers: Record<string, number[]>
  }
  riskLevel: 'low' | 'medium' | 'high'
  ballPosition: { x: number; y: number } | null
  ballPath: number[]
  isAnimating: boolean
  landingSlot?: number
  className?: string
}

interface PegPosition {
  row: number
  position: number
}

const PlinkoBoard: React.FC<PlinkoBoardProps> = ({
  boardConfig,
  riskLevel,
  ballPosition,
  ballPath,
  landingSlot,
  className = ''
}) => {
  const boardRef = useRef<HTMLDivElement>(null)
  const BOARD_WIDTH = 400
  const BOARD_HEIGHT = 300
  const PEG_SIZE = 8
  const BALL_SIZE = 12

  // Calculate peg positions
  const getPegPositions = (): PegPosition[] => {
    const pegs: PegPosition[] = []
    
    for (let row = 0; row < boardConfig.rows; row++) {
      // Each row has one more peg than the previous, centered
      const pegsInRow = row + 2
      const startPosition = (boardConfig.slots - pegsInRow) / 2
      
      for (let peg = 0; peg < pegsInRow; peg++) {
        pegs.push({
          row,
          position: startPosition + peg
        })
      }
    }
    
    return pegs
  }

  // Convert board position to pixel coordinates
  const getPixelPosition = (boardX: number, boardY: number) => {
    const slotWidth = BOARD_WIDTH / boardConfig.slots
    const rowHeight = BOARD_HEIGHT / (boardConfig.rows + 2)
    
    return {
      x: (boardX + 0.5) * slotWidth,
      y: (boardY + 0.5) * rowHeight
    }
  }

  const pegPositions = getPegPositions()
  const currentMultipliers = boardConfig.multipliers[riskLevel] || []

  return (
    <div className={`relative ${className}`}>
      {/* Board Container */}
      <div 
        ref={boardRef}
        className="relative bg-gradient-to-b from-tarkov-secondary/30 to-tarkov-secondary/60 rounded-lg border border-gray-600 mx-auto"
        style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}
      >
        {/* Pegs */}
        {pegPositions.map((peg, index) => {
          const pixelPos = getPixelPosition(peg.position, peg.row)
          return (
            <div
              key={index}
              className="absolute bg-gray-400 rounded-full shadow-lg"
              style={{
                width: PEG_SIZE,
                height: PEG_SIZE,
                left: pixelPos.x - PEG_SIZE / 2,
                top: pixelPos.y - PEG_SIZE / 2,
              }}
            />
          )
        })}

        {/* Ball Path Visualization */}
        {ballPath.length > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={BOARD_WIDTH}
            height={BOARD_HEIGHT}
          >
            {ballPath.map((_, index) => {
              if (index === 0) return null
              
              const prevX = ballPath.slice(0, index).reduce((pos, move) => {
                return Math.max(0, Math.min(boardConfig.slots - 1, pos + (move === 0 ? -0.5 : 0.5)))
              }, boardConfig.startingPosition)
              
              const currentX = ballPath.slice(0, index + 1).reduce((pos, move) => {
                return Math.max(0, Math.min(boardConfig.slots - 1, pos + (move === 0 ? -0.5 : 0.5)))
              }, boardConfig.startingPosition)
              
              const prevPos = getPixelPosition(prevX, index - 1)
              const currentPos = getPixelPosition(currentX, index)
              
              return (
                <motion.line
                  key={index}
                  x1={prevPos.x}
                  y1={prevPos.y}
                  x2={currentPos.x}
                  y2={currentPos.y}
                  stroke="#ffd700"
                  strokeWidth="2"
                  strokeOpacity="0.6"
                  strokeDasharray="4,4"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: index * 0.3, duration: 0.3 }}
                />
              )
            })}
          </svg>
        )}

        {/* Animated Ball */}
        <AnimatePresence>
          {ballPosition && (
            <motion.div
              className="absolute bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg border-2 border-yellow-300"
              style={{
                width: BALL_SIZE,
                height: BALL_SIZE,
                zIndex: 10
              }}
              initial={{
                left: getPixelPosition(boardConfig.startingPosition, 0).x - BALL_SIZE / 2,
                top: getPixelPosition(boardConfig.startingPosition, 0).y - BALL_SIZE / 2,
              }}
              animate={{
                left: getPixelPosition(ballPosition.x, ballPosition.y).x - BALL_SIZE / 2,
                top: getPixelPosition(ballPosition.x, ballPosition.y).y - BALL_SIZE / 2,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                duration: 0.3
              }}
              exit={{ opacity: 0, scale: 0 }}
            >
              {/* Ball glow effect */}
              <div className="absolute inset-0 bg-yellow-400 rounded-full animate-pulse opacity-50 scale-150" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drop Zone Indicator */}
        <div
          className="absolute border-t-2 border-dashed border-tarkov-accent opacity-50"
          style={{
            left: getPixelPosition(boardConfig.startingPosition, -0.5).x - 20,
            top: getPixelPosition(boardConfig.startingPosition, -0.5).y,
            width: 40,
          }}
        />

        {/* Ball Entry Point */}
        <div
          className="absolute w-4 h-4 bg-tarkov-accent rounded-full opacity-75"
          style={{
            left: getPixelPosition(boardConfig.startingPosition, -0.5).x - 8,
            top: getPixelPosition(boardConfig.startingPosition, -0.5).y - 8,
          }}
        />
      </div>

      {/* Multiplier Slots */}
      <div className="flex justify-center mt-4 space-x-1">
        {currentMultipliers.map((multiplier, index) => (
          <motion.div
            key={index}
            className={`px-3 py-2 rounded-lg text-sm font-bold text-center min-w-12 transition-all ${
              multiplier >= 2 ? 'bg-tarkov-success text-tarkov-dark' :
              multiplier >= 1 ? 'bg-tarkov-warning text-tarkov-dark' :
              'bg-tarkov-danger text-white'
            } ${
              landingSlot === index ? 'ring-2 ring-tarkov-accent scale-110 shadow-lg' : ''
            }`}
            animate={landingSlot === index ? {
              scale: [1, 1.1, 1],
              boxShadow: [
                '0 0 0 0 rgba(255, 215, 0, 0)',
                '0 0 0 10px rgba(255, 215, 0, 0.3)',
                '0 0 0 0 rgba(255, 215, 0, 0)'
              ]
            } : {}}
            transition={{ duration: 0.6, repeat: landingSlot === index ? 2 : 0 }}
          >
            {multiplier}x
          </motion.div>
        ))}
      </div>

      {/* Board Labels */}
      <div className="text-center mt-2 space-y-1">
        <div className="text-xs text-gray-400 uppercase tracking-wide">
          Risk Level: <span className="text-tarkov-accent capitalize">{riskLevel}</span>
        </div>
        <div className="text-xs text-gray-500">
          Drop the ball and watch it bounce through the pegs!
        </div>
      </div>

      {/* Physics Visualization (Optional Debug) */}
      {process.env.NODE_ENV === 'development' && ballPath.length > 0 && (
        <div className="mt-4 p-2 bg-gray-800 rounded text-xs font-mono">
          <div className="text-gray-400">Ball Path: [{ballPath.join(', ')}]</div>
          {landingSlot !== undefined && (
            <div className="text-gray-400">Landing Slot: {landingSlot}</div>
          )}
        </div>
      )}
    </div>
  )
}

export default PlinkoBoard