export interface UserFlowPhase {
  phase: string
  title: string
  description: string
  icon: string
  color: string
  estimatedDuration?: number
}

export interface UserFlowConfig {
  phases: UserFlowPhase[]
  getPhaseByName: (name: string) => UserFlowPhase | undefined
  getNextPhase: (currentPhase: string) => UserFlowPhase | undefined
  getPhaseProgress: (currentPhase: string) => number
}

// Define the complete user flow for case opening
export const CASE_OPENING_USER_FLOW: UserFlowConfig = {
  phases: [
    {
      phase: 'idle',
      title: 'Ready to Play',
      description: 'Select a case to begin',
      icon: '🎯',
      color: 'text-gray-400',
    },
    {
      phase: 'case_selected',
      title: 'Case Selected',
      description: 'Confirm your choice',
      icon: '📦',
      color: 'text-blue-400',
    },
    {
      phase: 'confirming',
      title: 'Confirm Purchase',
      description: 'Review and confirm your case opening',
      icon: '💳',
      color: 'text-yellow-400',
    },
    {
      phase: 'loading',
      title: 'Processing',
      description: 'Preparing your case opening...',
      icon: '⏳',
      color: 'text-blue-400',
      estimatedDuration: 1000,
    },
    {
      phase: 'opening',
      title: 'Opening Case',
      description: 'Initializing case opening sequence...',
      icon: '🔓',
      color: 'text-purple-400',
      estimatedDuration: 1500,
    },
    {
      phase: 'animating',
      title: 'Spinning',
      description: 'Watch the carousel spin to reveal your prize!',
      icon: '🎰',
      color: 'text-orange-400',
      estimatedDuration: 5000,
    },
    {
      phase: 'revealing',
      title: 'Revealing',
      description: 'Your item is being revealed...',
      icon: '✨',
      color: 'text-yellow-400',
      estimatedDuration: 2000,
    },
    {
      phase: 'complete',
      title: 'Item Won!',
      description: 'Congratulations on your prize!',
      icon: '🎉',
      color: 'text-green-400',
    },
    {
      phase: 'error',
      title: 'Something Went Wrong',
      description: 'Please try again or contact support',
      icon: '⚠️',
      color: 'text-red-400',
    }
  ],

  getPhaseByName: function(name: string): UserFlowPhase | undefined {
    return this.phases.find(phase => phase.phase === name)
  },

  getNextPhase: function(currentPhase: string): UserFlowPhase | undefined {
    const currentIndex = this.phases.findIndex(phase => phase.phase === currentPhase)
    if (currentIndex === -1 || currentIndex === this.phases.length - 1) {
      return undefined
    }
    return this.phases[currentIndex + 1]
  },

  getPhaseProgress: function(currentPhase: string): number {
    const currentIndex = this.phases.findIndex(phase => phase.phase === currentPhase)
    if (currentIndex === -1) return 0

    // Calculate progress as percentage (idle = 0%, complete = 100%)
    const totalPhases = this.phases.length - 1 // Exclude error phase from progress calculation
    return Math.round((currentIndex / totalPhases) * 100)
  }
}

// Helper functions for user flow management
export const getUserFlowMessage = (phase: string): { title: string; description: string; icon: string; color: string } => {
  const flowPhase = CASE_OPENING_USER_FLOW.getPhaseByName(phase)
  if (!flowPhase) {
    return {
      title: 'Unknown State',
      description: 'Something unexpected happened',
      icon: '❓',
      color: 'text-gray-400'
    }
  }

  return {
    title: flowPhase.title,
    description: flowPhase.description,
    icon: flowPhase.icon,
    color: flowPhase.color
  }
}

export const getProgressPercentage = (phase: string): number => {
  return CASE_OPENING_USER_FLOW.getPhaseProgress(phase)
}

export const isInteractivePhase = (phase: string): boolean => {
  return ['idle', 'case_selected', 'complete'].includes(phase)
}

export const isLoadingPhase = (phase: string): boolean => {
  return ['loading', 'opening', 'animating', 'revealing'].includes(phase)
}

export const isErrorPhase = (phase: string): boolean => {
  return phase === 'error'
}

export const canTransitionToPhase = (fromPhase: string, toPhase: string): boolean => {
  const validTransitions: Record<string, string[]> = {
    'idle': ['case_selected', 'loading'],
    'case_selected': ['confirming', 'idle'],
    'confirming': ['loading', 'idle'],
    'loading': ['opening', 'error'],
    'opening': ['animating', 'revealing', 'error'],
    'animating': ['revealing', 'complete', 'error'],
    'revealing': ['complete', 'error'],
    'complete': ['idle'],
    'error': ['idle']
  }

  return validTransitions[fromPhase]?.includes(toPhase) ?? false
}
