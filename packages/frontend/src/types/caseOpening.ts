// Simplified state management for case opening game
export type GamePhase = 'idle' | 'loading' | 'opening' | 'animating' | 'revealing' | 'complete' | 'error'

export interface SimplifiedGameState {
  phase: GamePhase
  selectedCase: CaseType | null
  result: CaseOpeningResult | null
  history: CaseOpeningResult[]
  error: string | null
  transactionId?: string | null
  animationConfig?: AnimationConfig
  pendingCompletion?: {
    caseTypeId: string
    openingId: string
    token: string
    predeterminedWinner?: any
  }
}

// Re-export existing types for convenience
export type { CaseType } from '../components/games/CaseSelector'
export type { CaseOpeningResult } from '../components/games/ItemReveal'
export type { CarouselItemData } from '../components/games/CaseOpeningCarousel'

export type { AnimationConfig } from './animation'

// State transition logger for debugging
export class StateTransitionLogger {
  private static transitions: Array<{
    timestamp: number
    from: GamePhase
    to: GamePhase
    context?: string
  }> = []

  static logTransition(from: GamePhase, to: GamePhase, context?: string) {
    const transition = {
      timestamp: Date.now(),
      from,
      to,
      context
    }

    this.transitions.push(transition)

    // Keep only last 50 transitions to prevent memory issues
    if (this.transitions.length > 50) {
      this.transitions.shift()
    }

    console.log(`[StateTransition] ${from} → ${to}${context ? ` (${context})` : ''}`)
  }

  static getRecentTransitions(count = 10) {
    return this.transitions.slice(-count)
  }

  static clear() {
    this.transitions = []
  }
}
