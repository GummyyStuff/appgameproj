import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'
import TarkovBackground, { TarkovParticles } from '../ui/TarkovBackground'
import { SoundProvider } from '../ui/SoundManager'
import { PerformanceDashboard } from '../games/PerformanceDashboard'
import { useKeyboardShortcuts, KeyboardShortcut } from '../../hooks/useKeyboardShortcuts'

const AppLayout: React.FC = () => {
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false)

  // Performance dashboard keyboard shortcut (Ctrl+Shift+P)
  const performanceShortcuts: KeyboardShortcut[] = [
    {
      key: 'p',
      ctrlKey: true,
      shiftKey: true,
      action: () => setShowPerformanceDashboard(prev => !prev),
      description: 'Toggle Performance Dashboard'
    }
  ]

  useKeyboardShortcuts(performanceShortcuts)

  return (
    <SoundProvider>
      <TarkovBackground variant="default" className="min-h-screen">
        <TarkovParticles count={15} />
        <Navigation />
        <main className="container mx-auto px-4 py-6 relative z-10">
          <Outlet />
        </main>

        {/* Performance Dashboard Overlay */}
        <PerformanceDashboard
          isVisible={showPerformanceDashboard}
          onClose={() => setShowPerformanceDashboard(false)}
        />
      </TarkovBackground>
    </SoundProvider>
  )
}

export default AppLayout