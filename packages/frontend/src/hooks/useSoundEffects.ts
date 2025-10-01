import { useState, useCallback } from 'react'
import { useSoundManager } from '../components/ui/SoundManager'

export const useSoundPreferences = () => {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('tarkov-casino-sound-enabled')
    return saved !== null ? JSON.parse(saved) : true
  })

  const toggleSound = useCallback(() => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    localStorage.setItem('tarkov-casino-sound-enabled', JSON.stringify(newValue))
  }, [soundEnabled])

  return {
    soundEnabled,
    toggleSound
  }
}

interface SoundEffects {
  playSpinSound: () => void
  playWinSound: () => void
  playLoseSound: () => void
  playBetSound: () => void
  playClickSound: () => void
  playCardFlip: () => void
  playCardDeal: () => void
  playChipStack: () => void

  playJackpot: () => void
  playError: () => void
  playNotification: () => void
  playAmbient: () => void

  // Case opening specific sounds
  playCaseOpen: () => void
  playCaseReveal: () => void
  playRarityReveal: (rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary') => void
}

export const useSoundEffects = (): SoundEffects => {
  // Use the SoundManager context to get the sound functions
  const { playGameSound } = useSoundManager()

  // Create wrapper functions that call playGameSound with appropriate types
  const playSpinSound = useCallback(() => playGameSound('spin'), [playGameSound])
  const playWinSound = useCallback(() => playGameSound('win'), [playGameSound])
  const playLoseSound = useCallback(() => playGameSound('lose'), [playGameSound])
  const playBetSound = useCallback(() => playGameSound('bet'), [playGameSound])
  const playClickSound = useCallback(() => playGameSound('click'), [playGameSound])
  const playCardFlip = useCallback(() => playGameSound('card-flip'), [playGameSound])
  const playCardDeal = useCallback(() => playGameSound('card-deal'), [playGameSound])
  const playChipStack = useCallback(() => playGameSound('chip-stack'), [playGameSound])
  const playJackpot = useCallback(() => playGameSound('jackpot'), [playGameSound])
  const playError = useCallback(() => playGameSound('error'), [playGameSound])
  const playNotification = useCallback(() => playGameSound('notification'), [playGameSound])
  const playAmbient = useCallback(() => playGameSound('ambient'), [playGameSound])

  // Case opening sounds - these need special handling since they don't go through playGameSound
  const playCaseOpen = useCallback(() => playGameSound('case-open'), [playGameSound])
  const playCaseReveal = useCallback(() => playGameSound('case-reveal'), [playGameSound])
  const playRarityReveal = useCallback((rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary') => {
    playGameSound(`rarity-${rarity}`)
  }, [playGameSound])

  return {
    playSpinSound,
    playWinSound,
    playLoseSound,
    playBetSound,
    playClickSound,
    playCardFlip,
    playCardDeal,
    playChipStack,
    playJackpot,
    playError,
    playNotification,
    playAmbient,
    playCaseOpen,
    playCaseReveal,
    playRarityReveal
  }
}