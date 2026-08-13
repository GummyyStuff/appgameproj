import { memo, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { WheelSegment } from '../../types/wheel'

interface WheelSpinnerProps {
  segments: WheelSegment[]
  isSpinning: boolean
  onSegmentClick?: (index: number) => void
  onSpinClick?: () => void
  onTick?: () => void
  betPlacements?: { segmentIndex: number; amount: number }[]
  pacing?: 'normal' | 'slow'
  highlightedSegments?: number[]
  bonusActive?: boolean
}

export interface WheelSpinnerHandle {
  startSpin: () => void
  settleTo: (target: number, onComplete?: () => void) => void
  stop: () => void
  skip: () => void
}

const POINTER_ANGLE = 270
const FAST_SPIN_DURATION_MS = 4000
const SLOW_SPIN_DURATION_MS = 8000
const PRE_SPIN_TURNS = 10
const SETTLE_EXTRA_SPINS = 2
const SETTLE_DWELL_MS = 400
const MIN_PRE_SPIN_MS = 1000
const MIN_TICK_SOUND_MS = 90

interface BezierParams {
  x1: number
  y1: number
  x2: number
  y2: number
}

const NORMAL_BEZIER: BezierParams = { x1: 0.15, y1: 0.55, x2: 0.2, y2: 1 }
const SLOW_BEZIER: BezierParams = { x1: 0.2, y1: 0.5, x2: 0.3, y2: 1 }

const bezierPoint = (b: BezierParams, t: number) => {
  const mt = 1 - t
  return {
    x: 3 * mt * mt * t * b.x1 + 3 * mt * t * t * b.x2 + t * t * t,
    y: 3 * mt * mt * t * b.y1 + 3 * mt * t * t * b.y2 + t * t * t
  }
}

const bezierY = (b: BezierParams, x: number): number => {
  let t = Math.min(Math.max(x, 0), 1)
  for (let i = 0; i < 8; i++) {
    const p = bezierPoint(b, t)
    const dx = 3 * (1 - t) * (1 - t) * b.x1 + 6 * (1 - t) * t * (b.x2 - b.x1) + 3 * t * t * (1 - b.x2)
    const err = p.x - x
    if (Math.abs(err) < 1e-6) break
    t = Math.min(Math.max(t - err / (dx || 1e-6), 0), 1)
  }
  return bezierPoint(b, t).y
}

const bezierSlope = (b: BezierParams) => b.y1 / b.x1

const calculateTargetRotation = (
  segments: WheelSegment[],
  winningIndex: number,
  currentRotation: number,
  minSpins: number
): number => {
  const seg = segments[winningIndex]
  if (!seg) return currentRotation
  const segMidAngle = (seg.startAngle + seg.endAngle) / 2
  const baseAngle = POINTER_ANGLE - segMidAngle
  const normalizedBase = ((baseAngle % 360) + 360) % 360
  const currentNormalized = ((currentRotation % 360) + 360) % 360
  let delta = normalizedBase - currentNormalized
  if (delta < 0) delta += 360
  return currentRotation + delta + 360 * minSpins
}

interface PhaseState {
  kind: 'pre' | 'settle'
  startRotation: number
  spinSpeed: number
  bezier: BezierParams
  settleDistance?: number
  settleDurationMs?: number
  onComplete?: () => void
}

const WheelSpinnerInner = forwardRef<WheelSpinnerHandle, WheelSpinnerProps>(({
  segments,
  isSpinning,
  onSegmentClick,
  onSpinClick,
  onTick,
  betPlacements = [],
  pacing = 'normal',
  highlightedSegments = [],
  bonusActive = false
}, ref) => {
  const wheelRef = useRef<HTMLDivElement>(null)
  const rotationRef = useRef(0)
  const animRef = useRef<Animation | null>(null)
  const phaseRef = useRef<PhaseState | null>(null)
  const settleReqRef = useRef<{ target: number; onComplete?: () => void } | null>(null)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const preSpinStartRef = useRef(0)
  const lastTickSegmentRef = useRef<number | null>(null)
  const lastTickSoundRef = useRef(0)

  const onTickRef = useRef(onTick)
  const segmentsRef = useRef(segments)
  const pacingRef = useRef(pacing)
  onTickRef.current = onTick
  segmentsRef.current = segments
  pacingRef.current = pacing

  const setWheelTransform = (deg: number) => {
    rotationRef.current = deg
    if (wheelRef.current) {
      wheelRef.current.style.transform = `rotate(${deg}deg)`
    }
  }

  const cancelAnimation = () => {
    if (animRef.current) {
      animRef.current.cancel()
      animRef.current = null
    }
  }

  const clearSettleTimer = () => {
    if (settleTimerRef.current !== null) {
      clearTimeout(settleTimerRef.current)
      settleTimerRef.current = null
    }
  }

  const cancelTickInterval = () => {
    if (tickIntervalRef.current !== null) {
      clearInterval(tickIntervalRef.current)
      tickIntervalRef.current = null
    }
  }

  const currentRotation = (): number => {
    const phase = phaseRef.current
    const anim = animRef.current
    if (!phase || !anim) return rotationRef.current
    const tMs = typeof anim.currentTime === 'number' ? anim.currentTime : 0
    if (phase.kind === 'pre') {
      return phase.startRotation + phase.spinSpeed * (tMs / 1000)
    }
    const progress = Math.min(tMs / (phase.settleDurationMs ?? 1), 1)
    const eased = bezierY(phase.bezier, progress)
    return phase.startRotation + (phase.settleDistance ?? 0) * eased
  }

  const getCurrentSegment = useCallback((): number => {
    let normalized = 0
    const el = wheelRef.current
    if (el) {
      const matrix = getComputedStyle(el).transform
      const match = matrix.match(/matrix\(([^)]+)\)/)
      if (match) {
        const parts = match[1].split(',').map(Number)
        normalized = (((Math.atan2(parts[1], parts[0]) * 180) / Math.PI % 360) + 360) % 360
      }
    }
    const adjustedAngle = ((POINTER_ANGLE - normalized) % 360 + 360) % 360
    for (let i = 0; i < segmentsRef.current.length; i++) {
      const s = segmentsRef.current[i]
      if (adjustedAngle >= s.startAngle && adjustedAngle < s.endAngle) {
        return i
      }
    }
    return 0
  }, [])

  const startSpin = useCallback(() => {
    clearSettleTimer()
    settleReqRef.current = null
    if (animRef.current) {
      setWheelTransform(currentRotation())
      cancelAnimation()
    }
    const el = wheelRef.current
    if (!el || typeof el.animate !== 'function') return

    const isSlow = pacingRef.current === 'slow'
    const durationMs = isSlow ? SLOW_SPIN_DURATION_MS : FAST_SPIN_DURATION_MS
    const spinSpeed = (PRE_SPIN_TURNS * 360) / (durationMs / 1000)
    const startRotation = rotationRef.current

    el.style.transform = `rotate(${startRotation}deg)`
    const anim = el.animate(
      [
        { transform: `rotate(${startRotation}deg)` },
        { transform: `rotate(${startRotation + PRE_SPIN_TURNS * 360}deg)` }
      ],
      { duration: durationMs, easing: 'linear', iterations: Infinity }
    )
    animRef.current = anim
    phaseRef.current = { kind: 'pre', startRotation, spinSpeed, bezier: NORMAL_BEZIER }
    preSpinStartRef.current = performance.now()

    cancelTickInterval()
    tickIntervalRef.current = setInterval(() => {
      const currentSeg = getCurrentSegment()
      if (currentSeg !== lastTickSegmentRef.current) {
        lastTickSegmentRef.current = currentSeg
        const now = performance.now()
        if (now - lastTickSoundRef.current >= MIN_TICK_SOUND_MS) {
          lastTickSoundRef.current = now
          onTickRef.current?.()
        }
      }
    }, 50)
  }, [getCurrentSegment])

  const beginSettle = useCallback(() => {
    const req = settleReqRef.current
    const el = wheelRef.current
    const anim = animRef.current
    const phase = phaseRef.current
    if (!req || !el || !anim || !phase || phase.kind !== 'pre') return
    settleReqRef.current = null

    const current = currentRotation()
    const targetRotation = calculateTargetRotation(segmentsRef.current, req.target, current, SETTLE_EXTRA_SPINS)
    const distance = targetRotation - current
    const bezier = pacingRef.current === 'slow' ? SLOW_BEZIER : NORMAL_BEZIER
    const durationMs = ((bezierSlope(bezier) * distance) / phase.spinSpeed) * 1000

    el.style.transform = `rotate(${current}deg)`
    cancelAnimation()

    const settleAnim = el.animate(
      [
        { transform: `rotate(${current}deg)` },
        { transform: `rotate(${targetRotation}deg)` }
      ],
      {
        duration: durationMs,
        easing: `cubic-bezier(${bezier.x1}, ${bezier.y1}, ${bezier.x2}, ${bezier.y2})`,
        fill: 'forwards'
      }
    )
    animRef.current = settleAnim
    phaseRef.current = {
      kind: 'settle',
      startRotation: current,
      spinSpeed: phase.spinSpeed,
      bezier,
      settleDistance: distance,
      settleDurationMs: durationMs,
      onComplete: req.onComplete
    }

    settleAnim.onfinish = () => {
      animRef.current = null
      phaseRef.current = null
      rotationRef.current = targetRotation
      cancelTickInterval()
      const onComplete = req.onComplete
      setTimeout(() => {
        onComplete?.()
      }, SETTLE_DWELL_MS)
    }
  }, [])

  const settleTo = useCallback((target: number, onComplete?: () => void) => {
    if (!animRef.current || !phaseRef.current) {
      startSpin()
    }
    settleReqRef.current = { target, onComplete }
    const waitMs = Math.max(0, preSpinStartRef.current + MIN_PRE_SPIN_MS - performance.now())
    clearSettleTimer()
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null
      beginSettle()
    }, waitMs)
  }, [startSpin, beginSettle])

  const stop = useCallback(() => {
    clearSettleTimer()
    settleReqRef.current = null
    if (animRef.current) {
      setWheelTransform(currentRotation())
    }
    cancelAnimation()
    phaseRef.current = null
    cancelTickInterval()
  }, [])

  const doSkip = useCallback(() => {
    const pending = settleReqRef.current
    const phase = phaseRef.current
    if (!pending && (!phase || phase.kind !== 'settle')) return

    let onComplete: (() => void) | undefined
    let targetRotation: number | null = null

    if (pending) {
      onComplete = pending.onComplete
      const current = currentRotation()
      targetRotation = calculateTargetRotation(segmentsRef.current, pending.target, current, SETTLE_EXTRA_SPINS)
    } else if (phase && phase.kind === 'settle') {
      onComplete = phase.onComplete
      targetRotation = phase.startRotation + (phase.settleDistance ?? 0)
    }

    clearSettleTimer()
    settleReqRef.current = null
    if (targetRotation !== null) {
      setWheelTransform(targetRotation)
    }
    cancelAnimation()
    phaseRef.current = null
    cancelTickInterval()
    onComplete?.()
  }, [])

  useImperativeHandle(ref, () => ({
    startSpin,
    settleTo,
    stop,
    skip: doSkip
  }), [startSpin, settleTo, stop, doSkip])

  useEffect(() => {
    return () => {
      clearSettleTimer()
      cancelAnimation()
      cancelTickInterval()
    }
  }, [])

  const centerX = 250
  const centerY = 250
  const radius = 230
  const textRadius = 170

  const getBetAmount = (index: number): number => {
    const placement = betPlacements.find(b => b.segmentIndex === index)
    return placement?.amount || 0
  }

  const createSegmentPath = (startAngle: number, endAngle: number) => {
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    const x1 = centerX + radius * Math.cos(startRad)
    const y1 = centerY + radius * Math.sin(startRad)
    const x2 = centerX + radius * Math.cos(endRad)
    const y2 = centerY + radius * Math.sin(endRad)
    const largeArc = endAngle - startAngle > 180 ? 1 : 0
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
  }

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="relative w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] md:w-[540px] md:h-[540px] lg:w-[600px] lg:h-[600px] cursor-pointer"
        data-testid="wheel-spinner"
        onClick={() => {
          if (isSpinning) {
            doSkip()
          }
        }}
      >
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 z-20">
          <div className="relative">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-tarkov-accent drop-shadow-lg" />
            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-tarkov-accent rounded-full" />
          </div>
        </div>

        <div
          ref={wheelRef}
          className="relative w-full h-full rounded-full overflow-hidden"
          style={{ transform: 'rotate(0deg)', willChange: 'transform' }}
        >
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 500">
            <defs>
              <radialGradient id="wheelMetallic" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                <stop offset="70%" stopColor="rgba(0,0,0,0)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
              </radialGradient>
            </defs>

            <circle cx={centerX} cy={centerY} r={radius + 12} fill="#1a1a1a" />
            <circle cx={centerX} cy={centerY} r={radius + 6} fill="none" stroke="#4a3f35" strokeWidth="4" />

            {segments.map((segment) => {
              const midAngle = (segment.startAngle + segment.endAngle) / 2
              const midAngleRad = (midAngle * Math.PI) / 180
              const textX = centerX + textRadius * Math.cos(midAngleRad)
              const textY = centerY + textRadius * Math.sin(midAngleRad)
              const betAmount = getBetAmount(segment.index)
              const isSpecial = !segment.bettable
              const isBonusWheel = segment.type === 'bonus_wheel'
              const isHighlighted = highlightedSegments.includes(segment.index)
              const segAngle = segment.endAngle - segment.startAngle
              const fontSize = segAngle < 20 ? 11 : 16

              return (
                <g
                  key={segment.index}
                  data-testid={`wheel-segment-${segment.index}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isSpinning && segment.bettable && onSegmentClick) {
                      onSegmentClick(segment.index)
                    }
                  }}
                  className={!isSpinning && segment.bettable ? 'cursor-pointer' : ''}
                >
                  <path
                    d={createSegmentPath(segment.startAngle, segment.endAngle)}
                    fill={segment.color}
                    stroke="#2a2520"
                    strokeWidth="2"
                    className={`transition-opacity ${!isSpinning && segment.bettable ? 'hover:opacity-80' : ''}`}
                  />

                  {isSpecial && (
                    <>
                      <path
                        d={createSegmentPath(segment.startAngle, segment.endAngle)}
                        fill="none"
                        stroke="rgba(255,255,255,0.4)"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                      />
                      <path
                        d={createSegmentPath(segment.startAngle, segment.endAngle)}
                        fill="rgba(255,255,255,0.06)"
                      />
                    </>
                  )}

                  {isBonusWheel && (
                    <path
                      d={createSegmentPath(segment.startAngle, segment.endAngle)}
                      fill="none"
                      stroke="rgba(251,191,36,0.85)"
                      strokeWidth="3"
                      className={bonusActive ? 'animate-pulse' : ''}
                    />
                  )}

                  {isHighlighted && !isSpecial && (
                    <path
                      d={createSegmentPath(segment.startAngle, segment.endAngle)}
                      fill="none"
                      stroke="rgba(246,173,85,0.9)"
                      strokeWidth="2.5"
                    />
                  )}

                  <text
                    x={textX}
                    y={textY - (betAmount > 0 ? 10 : 0)}
                    fill="white"
                    fontSize={fontSize}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${midAngle} ${textX} ${textY - (betAmount > 0 ? 10 : 0)})`}
                    className="pointer-events-none select-none"
                  >
                    {segment.label}
                  </text>

                  {betAmount > 0 && (
                    <text
                      x={textX}
                      y={textY + 12}
                      fill="#F6AD55"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${midAngle} ${textX} ${textY + 12})`}
                      className="pointer-events-none select-none"
                    >
                      ₽{betAmount}
                    </text>
                  )}
                </g>
              )
            })}

            <circle cx={centerX} cy={centerY} r={radius} fill="url(#wheelMetallic)" className="pointer-events-none" />

            {[0, 60, 120, 180, 240, 300].map((angle) => {
              const rad = (angle * Math.PI) / 180
              const bx = centerX + (radius - 18) * Math.cos(rad)
              const by = centerY + (radius - 18) * Math.sin(rad)
              return (
                <circle key={`bolt-${angle}`} cx={bx} cy={by} r="5" fill="#3a3530" stroke="#5a5045" strokeWidth="1.5" className="pointer-events-none" />
              )
            })}
          </svg>

          <button
            type="button"
            data-testid="wheel-center-spin"
            onClick={(e) => {
              e.stopPropagation()
              if (!isSpinning && onSpinClick) {
                onSpinClick()
              }
            }}
            disabled={isSpinning}
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-tarkov-accent to-orange-700 rounded-full border-4 border-tarkov-dark shadow-lg flex items-center justify-center transition-transform ${
              isSpinning
                ? 'cursor-not-allowed opacity-70'
                : 'cursor-pointer hover:scale-105 active:scale-95'
            }`}
          >
            <div className="text-tarkov-dark font-bold text-sm sm:text-base font-tarkov">
              {isSpinning ? '...' : 'SPIN'}
            </div>
          </button>
        </div>

        {isSpinning && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            style={{
              background: 'radial-gradient(circle, transparent 40%, rgba(246, 173, 85, 0.15) 70%, transparent 100%)'
            }}
          />
        )}

        {bonusActive && (
          <motion.div
            className="absolute -inset-2 rounded-full pointer-events-none"
            data-testid="wheel-bonus-glow"
            animate={{ opacity: [0.35, 0.8, 0.35] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{
              boxShadow: '0 0 45px 8px rgba(251, 191, 36, 0.55), inset 0 0 45px 8px rgba(251, 191, 36, 0.25)'
            }}
          />
        )}
      </div>

      {isSpinning && (
        <motion.div
          className="mt-4 text-tarkov-accent font-tarkov font-bold text-lg"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          Spinning...
        </motion.div>
      )}

      {!isSpinning && segments.length > 0 && (
        <div className="mt-4 text-gray-400 font-tarkov text-sm">
          Click segments to place bets
        </div>
      )}
    </div>
  )
})

WheelSpinnerInner.displayName = 'WheelSpinner'

const WheelSpinner = memo(WheelSpinnerInner)
export default WheelSpinner
