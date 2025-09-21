import { useCallback, useRef, useState } from 'react'

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
}

export const useSoundEffects = (enabled: boolean = true): SoundEffects => {
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize audio context on first use
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  // Generate different tones for different actions
  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!enabled) return

    try {
      const audioContext = getAudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
      oscillator.type = type

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
    } catch (error) {
      console.warn('Sound effect failed:', error)
    }
  }, [enabled, getAudioContext])

  const playSpinSound = useCallback(() => {
    // Spinning wheel sound - ascending tone
    playTone(200, 0.1, 'sawtooth')
    setTimeout(() => playTone(300, 0.1, 'sawtooth'), 100)
    setTimeout(() => playTone(400, 0.1, 'sawtooth'), 200)
  }, [playTone])

  const playWinSound = useCallback(() => {
    // Victory sound - major chord progression
    playTone(523, 0.2, 'sine') // C
    setTimeout(() => playTone(659, 0.2, 'sine'), 100) // E
    setTimeout(() => playTone(784, 0.3, 'sine'), 200) // G
  }, [playTone])

  const playLoseSound = useCallback(() => {
    // Loss sound - descending minor tone
    playTone(400, 0.2, 'triangle')
    setTimeout(() => playTone(300, 0.2, 'triangle'), 150)
    setTimeout(() => playTone(200, 0.3, 'triangle'), 300)
  }, [playTone])

  const playBetSound = useCallback(() => {
    // Bet placed sound - quick beep
    playTone(800, 0.1, 'square')
  }, [playTone])

  const playClickSound = useCallback(() => {
    // UI click sound - short tick
    playTone(1000, 0.05, 'square')
  }, [playTone])

  const playCardFlip = useCallback(() => {
    // Card flip sound - quick swoosh
    playTone(600, 0.08, 'sawtooth')
    setTimeout(() => playTone(800, 0.05, 'sawtooth'), 50)
  }, [playTone])

  const playCardDeal = useCallback(() => {
    // Card dealing sound - soft thud
    playTone(300, 0.1, 'triangle')
    setTimeout(() => playTone(250, 0.08, 'triangle'), 60)
  }, [playTone])

  const playChipStack = useCallback(() => {
    // Chip stacking sound - multiple clicks
    playTone(800, 0.05, 'square')
    setTimeout(() => playTone(900, 0.05, 'square'), 50)
    setTimeout(() => playTone(1000, 0.05, 'square'), 100)
  }, [playTone])



  const playJackpot = useCallback(() => {
    // Big win sound - celebration
    playTone(523, 0.3, 'sine') // C
    setTimeout(() => playTone(659, 0.3, 'sine'), 100) // E
    setTimeout(() => playTone(784, 0.3, 'sine'), 200) // G
    setTimeout(() => playTone(1047, 0.4, 'sine'), 300) // C (octave)
    setTimeout(() => playTone(1319, 0.5, 'sine'), 400) // E (octave)
  }, [playTone])

  const playError = useCallback(() => {
    // Error sound - harsh buzz
    playTone(200, 0.2, 'sawtooth')
    setTimeout(() => playTone(150, 0.3, 'sawtooth'), 100)
  }, [playTone])

  const playNotification = useCallback(() => {
    // Notification sound - gentle chime
    playTone(800, 0.15, 'sine')
    setTimeout(() => playTone(1000, 0.2, 'sine'), 150)
  }, [playTone])

  const playAmbient = useCallback(() => {
    // Ambient casino sound - low rumble
    playTone(100, 2, 'triangle')
    setTimeout(() => playTone(120, 1.5, 'triangle'), 500)
  }, [playTone])

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
    playAmbient
  }
}

// Hook for managing sound preferences
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