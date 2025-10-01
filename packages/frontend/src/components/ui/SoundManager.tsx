import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { useSoundEffects, useSoundPreferences } from '../../hooks/useSoundEffects'
import TarkovButton from './TarkovButton'

interface SoundContextType {
  soundEnabled: boolean
  masterVolume: number
  effectsVolume: number
  musicVolume: number
  toggleSound: () => void
  setMasterVolume: (volume: number) => void
  setEffectsVolume: (volume: number) => void
  setMusicVolume: (volume: number) => void
  playGameSound: (soundType: string, gameType?: string) => void
}

const SoundContext = createContext<SoundContextType | undefined>(undefined)

export const useSoundManager = () => {
  const context = useContext(SoundContext)
  if (!context) {
    throw new Error('useSoundManager must be used within a SoundProvider')
  }
  return context
}

interface SoundProviderProps {
  children: React.ReactNode
}

export const SoundProvider: React.FC<SoundProviderProps> = ({ children }) => {
  const { soundEnabled, toggleSound } = useSoundPreferences()
  const soundEnabledRef = useRef(soundEnabled)

  // Keep soundEnabledRef in sync
  React.useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])
  
  const [masterVolume, setMasterVolume] = useState(() => {
    const saved = localStorage.getItem('tarkov-casino-master-volume')
    return saved ? parseFloat(saved) : 0.7
  })
  
  const [effectsVolume, setEffectsVolume] = useState(() => {
    const saved = localStorage.getItem('tarkov-casino-effects-volume')
    return saved ? parseFloat(saved) : 0.8
  })
  
  const [musicVolume, setMusicVolume] = useState(() => {
    const saved = localStorage.getItem('tarkov-casino-music-volume')
    return saved ? parseFloat(saved) : 0.5
  })

  const handleSetMasterVolume = useCallback((volume: number) => {
    setMasterVolume(volume)
    localStorage.setItem('tarkov-casino-master-volume', volume.toString())
  }, [])

  const handleSetEffectsVolume = useCallback((volume: number) => {
    setEffectsVolume(volume)
    localStorage.setItem('tarkov-casino-effects-volume', volume.toString())
  }, [])

  const handleSetMusicVolume = useCallback((volume: number) => {
    setMusicVolume(volume)
    localStorage.setItem('tarkov-casino-music-volume', volume.toString())
  }, [])

  // Audio context for sound generation
  const audioContextRef = useRef<AudioContext | null>(null)

  const getAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    const audioContext = audioContextRef.current

    // Resume audio context if it's suspended and we want sound enabled
    if (soundEnabled && audioContext.state === 'suspended') {
      try {
        await audioContext.resume()
      } catch (error) {
        console.warn('Failed to resume AudioContext:', error)
      }
    }

    return audioContext
  }, [soundEnabled])

  // Handle suspend/resume based on enabled state
  React.useEffect(() => {
    const handleAudioState = async () => {
      if (!audioContextRef.current) return

      const audioContext = audioContextRef.current

      try {
        if (soundEnabled && audioContext.state === 'suspended') {
          await audioContext.resume()
        } else if (!soundEnabled && audioContext.state === 'running') {
          await audioContext.suspend()
        }
      } catch (error) {
        console.warn('Failed to change AudioContext state:', error)
      }
    }

    handleAudioState()
  }, [soundEnabled])

  // Generate different tones for different actions
  const playTone = useCallback(async (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    // Always check current sound state at call time using ref
    if (!soundEnabledRef.current) {
      return
    }

    try {
      const audioContext = await getAudioContext()
      // Double check AudioContext state
      if (audioContext.state !== 'running') {
        return
      }

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
  }, [getAudioContext])

  // Individual sound functions
  const playSpinSound = useCallback(async () => {
    // Spinning wheel sound - ascending tone
    await playTone(200, 0.1, 'sawtooth')
    setTimeout(async () => await playTone(300, 0.1, 'sawtooth'), 100)
    setTimeout(async () => await playTone(400, 0.1, 'sawtooth'), 200)
  }, [playTone])

  const playWinSound = useCallback(async () => {
    // Victory sound - major chord progression
    await playTone(523, 0.2, 'sine') // C
    setTimeout(async () => await playTone(659, 0.2, 'sine'), 100) // E
    setTimeout(async () => await playTone(784, 0.3, 'sine'), 200) // G
  }, [playTone])

  const playLoseSound = useCallback(async () => {
    // Loss sound - descending minor tone
    await playTone(400, 0.2, 'triangle')
    setTimeout(async () => await playTone(300, 0.2, 'triangle'), 150)
    setTimeout(async () => await playTone(200, 0.3, 'triangle'), 300)
  }, [playTone])

  const playBetSound = useCallback(async () => {
    // Bet placed sound - quick beep
    await playTone(800, 0.1, 'square')
  }, [playTone])

  const playClickSound = useCallback(async () => {
    // UI click sound - short tick
    await playTone(1000, 0.05, 'square')
  }, [playTone])

  const playCardFlip = useCallback(async () => {
    // Card flip sound - quick swoosh
    await playTone(600, 0.08, 'sawtooth')
    setTimeout(async () => await playTone(800, 0.05, 'sawtooth'), 50)
  }, [playTone])

  const playCardDeal = useCallback(async () => {
    // Card dealing sound - soft thud
    await playTone(300, 0.1, 'triangle')
    setTimeout(async () => await playTone(250, 0.08, 'triangle'), 60)
  }, [playTone])

  const playChipStack = useCallback(async () => {
    // Chip stacking sound - multiple clicks
    await playTone(800, 0.05, 'square')
    setTimeout(async () => await playTone(900, 0.05, 'square'), 50)
    setTimeout(async () => await playTone(1000, 0.05, 'square'), 100)
  }, [playTone])

  const playJackpot = useCallback(async () => {
    // Big win sound - celebration
    await playTone(523, 0.3, 'sine') // C
    setTimeout(async () => await playTone(659, 0.3, 'sine'), 100) // E
    setTimeout(async () => await playTone(784, 0.3, 'sine'), 200) // G
    setTimeout(async () => await playTone(1047, 0.4, 'sine'), 300) // C (octave)
    setTimeout(async () => await playTone(1319, 0.5, 'sine'), 400) // E (octave)
  }, [playTone])

  const playError = useCallback(async () => {
    // Error sound - harsh buzz
    await playTone(200, 0.2, 'sawtooth')
    setTimeout(async () => await playTone(150, 0.3, 'sawtooth'), 100)
  }, [playTone])

  const playNotification = useCallback(async () => {
    // Notification sound - gentle chime
    await playTone(800, 0.15, 'sine')
    setTimeout(async () => await playTone(1000, 0.2, 'sine'), 150)
  }, [playTone])

  const playAmbient = useCallback(async () => {
    // Ambient casino sound - low rumble
    await playTone(100, 2, 'triangle')
    setTimeout(async () => await playTone(120, 1.5, 'triangle'), 500)
  }, [playTone])

  // Case opening sounds
  const playCaseOpen = useCallback(async () => {
    // Case opening sound - mechanical click and whoosh
    await playTone(400, 0.1, 'square')
    setTimeout(async () => await playTone(600, 0.2, 'sawtooth'), 100)
    setTimeout(async () => await playTone(800, 0.3, 'sine'), 300)
  }, [playTone])

  const playCaseReveal = useCallback(async () => {
    // Item reveal sound - magical chime
    await playTone(800, 0.2, 'sine')
    setTimeout(async () => await playTone(1000, 0.2, 'sine'), 100)
    setTimeout(async () => await playTone(1200, 0.3, 'sine'), 200)
  }, [playTone])

  const playRarityReveal = useCallback(async (rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary') => {
    // Different sounds based on rarity
    switch (rarity) {
      case 'common':
        await playTone(400, 0.3, 'sine')
        break
      case 'uncommon':
        await playTone(500, 0.4, 'sine')
        setTimeout(async () => await playTone(600, 0.2, 'sine'), 200)
        break
      case 'rare':
        await playTone(600, 0.4, 'sine')
        setTimeout(async () => await playTone(800, 0.3, 'sine'), 150)
        setTimeout(async () => await playTone(1000, 0.2, 'sine'), 300)
        break
      case 'epic':
        await playTone(700, 0.5, 'sine')
        setTimeout(async () => await playTone(900, 0.4, 'sine'), 100)
        setTimeout(async () => await playTone(1100, 0.3, 'sine'), 200)
        setTimeout(async () => await playTone(1300, 0.2, 'sine'), 300)
        break
      case 'legendary':
        // Epic legendary sound sequence
        await playTone(800, 0.6, 'sine')
        setTimeout(async () => await playTone(1000, 0.5, 'sine'), 100)
        setTimeout(async () => await playTone(1200, 0.4, 'sine'), 200)
        setTimeout(async () => await playTone(1400, 0.3, 'sine'), 300)
        setTimeout(async () => await playTone(1600, 0.4, 'sine'), 400)
        setTimeout(async () => await playTone(1800, 0.5, 'sine'), 500)
        break
    }
  }, [playTone])

  const playGameSound = useCallback(async (soundType: string, _gameType?: string) => {
    if (!soundEnabledRef.current) return

    // Map sound types to appropriate sound effects
    switch (soundType) {
      case 'bet':
        await playBetSound()
        break
      case 'win':
        await playWinSound()
        break
      case 'lose':
        await playLoseSound()
        break
      case 'click':
        await playClickSound()
        break
      case 'spin':
        await playSpinSound()
        break
      case 'card-flip':
        await playCardFlip()
        break
      case 'card-deal':
        await playCardDeal()
        break
      case 'chip-stack':
        await playChipStack()
        break

      case 'jackpot':
        await playJackpot()
        break
      case 'error':
        await playError()
        break
      case 'notification':
        await playNotification()
        break
      case 'ambient':
        await playAmbient()
        break
      case 'case-open':
        await playCaseOpen()
        break
      case 'case-reveal':
        await playCaseReveal()
        break
      default:
        // Handle rarity sounds like 'rarity-common', 'rarity-rare', etc.
        if (soundType.startsWith('rarity-')) {
          const rarity = soundType.split('-')[1] as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
          await playRarityReveal(rarity)
        } else {
          console.warn(`Unknown sound type: ${soundType}`)
        }
    }
  }, [soundEnabled, playBetSound, playWinSound, playLoseSound, playClickSound, playSpinSound, playCardFlip, playCardDeal, playChipStack, playJackpot, playError, playNotification, playAmbient, playCaseOpen, playCaseReveal, playRarityReveal])

  const value: SoundContextType = {
    soundEnabled,
    masterVolume,
    effectsVolume,
    musicVolume,
    toggleSound,
    setMasterVolume: handleSetMasterVolume,
    setEffectsVolume: handleSetEffectsVolume,
    setMusicVolume: handleSetMusicVolume,
    playGameSound
  }

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  )
}

// Sound control panel component
export const SoundControlPanel: React.FC<{
  className?: string
  compact?: boolean
}> = ({ className = '', compact = false }) => {
  const {
    soundEnabled,
    masterVolume,
    effectsVolume,
    musicVolume,
    toggleSound,
    setMasterVolume,
    setEffectsVolume,
    setMusicVolume,
    playGameSound
  } = useSoundManager()

  const VolumeSlider: React.FC<{
    label: string
    value: number
    onChange: (value: number) => void
    disabled?: boolean
  }> = ({ label, value, onChange, disabled = false }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <span className="text-xs text-gray-400">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled || !soundEnabled}
        className="w-full h-2 bg-tarkov-dark rounded-lg appearance-none cursor-pointer slider-tarkov"
      />
    </div>
  )

  if (compact) {
    return (
      <div className={`flex items-center ${className}`}>
        <TarkovButton
          variant="ghost"
          size="sm"
          onClick={toggleSound}
          icon={soundEnabled ? '🔊' : '🔇'}
          className="px-2"
          title={soundEnabled ? 'Disable sound' : 'Enable sound'}
        />
      </div>
    )
  }

  return (
    <div className={`bg-tarkov-dark border border-tarkov-secondary rounded-lg p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white font-tarkov uppercase">
          Audio Settings
        </h3>
        <TarkovButton
          variant={soundEnabled ? 'success' : 'danger'}
          size="sm"
          onClick={toggleSound}
          icon={soundEnabled ? '🔊' : '🔇'}
        >
          {soundEnabled ? 'On' : 'Off'}
        </TarkovButton>
      </div>

      <div className="space-y-4">
        <VolumeSlider
          label="Master Volume"
          value={masterVolume}
          onChange={setMasterVolume}
        />
        
        <VolumeSlider
          label="Sound Effects"
          value={effectsVolume}
          onChange={setEffectsVolume}
          disabled={!soundEnabled}
        />
        
        <VolumeSlider
          label="Background Music"
          value={musicVolume}
          onChange={setMusicVolume}
          disabled={!soundEnabled}
        />
      </div>

      {/* Sound test buttons */}
      <div className="border-t border-tarkov-secondary pt-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Test Sounds</h4>
        <div className="grid grid-cols-2 gap-2">
          <TarkovButton
            variant="ghost"
            size="sm"
            onClick={() => playGameSound('win')}
            disabled={!soundEnabled}
          >
            Win
          </TarkovButton>
          <TarkovButton
            variant="ghost"
            size="sm"
            onClick={() => playGameSound('lose')}
            disabled={!soundEnabled}
          >
            Lose
          </TarkovButton>
          <TarkovButton
            variant="ghost"
            size="sm"
            onClick={() => playGameSound('bet')}
            disabled={!soundEnabled}
          >
            Bet
          </TarkovButton>
          <TarkovButton
            variant="ghost"
            size="sm"
            onClick={() => playGameSound('spin')}
            disabled={!soundEnabled}
          >
            Spin
          </TarkovButton>
        </div>
      </div>
    </div>
  )
}

export default SoundProvider