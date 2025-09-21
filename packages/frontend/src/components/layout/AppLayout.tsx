import React from 'react'
import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'
import TarkovBackground, { TarkovParticles } from '../ui/TarkovBackground'
import { SoundProvider } from '../ui/SoundManager'

const AppLayout: React.FC = () => {
  return (
    <SoundProvider>
      <TarkovBackground variant="default" className="min-h-screen">
        <TarkovParticles count={15} />
        <Navigation />
        <main className="container mx-auto px-4 py-6 relative z-10">
          <Outlet />
        </main>
      </TarkovBackground>
    </SoundProvider>
  )
}

export default AppLayout