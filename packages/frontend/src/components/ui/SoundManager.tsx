import React, { createContext, useContext, useState, useCallback } from 'react'
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
  const soundEffects = useSoundEffects(soundEnabled)
  
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

  const playGameSound = useCallback((soundType: string, _gameType?: string) => {
    if (!soundEnabled) return

    // Map sound types to appropriate sound effects
    switch (soundType) {
      case 'bet':
        soundEffects.playBetSound()
        break
      case 'win':
        soundEffects.playWinSound()
        break
      case 'lose':
        soundEffects.playLoseSound()
        break
      case 'click':
        soundEffects.playClickSound()
        break
      case 'spin':
        soundEffects.playSpinSound()
        break
      case 'card-flip':
        soundEffects.playCardFlip()
        break
      case 'card-deal':
        soundEffects.playCardDeal()
        break
      case 'chip-stack':
        soundEffects.playChipStack()
        break

      case 'jackpot':
        soundEffects.playJackpot()
        break
      case 'error':
        soundEffects.playError()
        break
      case 'notification':
        soundEffects.playNotification()
        break
      case 'ambient':
        soundEffects.playAmbient()
        break
      default:
        console.warn(`Unknown sound type: ${soundType}`)
    }
  }, [soundEnabled, soundEffects])

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
      <div className={`flex items-center space-x-2 ${className}`}>
        <TarkovButton
          variant="ghost"
          size="sm"
          onClick={toggleSound}
          icon={soundEnabled ? '🔊' : '🔇'}
          className="px-2"
        />
        {soundEnabled && (
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={masterVolume}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            className="w-16 h-1 bg-tarkov-dark rounded-lg appearance-none cursor-pointer slider-tarkov"
          />
        )}
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