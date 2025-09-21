import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useUsername } from '../../hooks/useProfile'
import CurrencyDisplay from '../ui/CurrencyDisplay'
import { TarkovIcons } from '../ui/TarkovIcons'
import { SoundControlPanel, useSoundManager } from '../ui/SoundManager'
import TarkovButton from '../ui/TarkovButton'
import RealtimeNotifications from '../ui/RealtimeNotifications'
import { useBalanceUpdates } from '../../hooks/useBalance'

const Navigation: React.FC = () => {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const username = useUsername()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { invalidateBalance } = useBalanceUpdates()

  const { playGameSound } = useSoundManager()
  
  const navItems = [
    { path: '/', label: 'Home', icon: TarkovIcons.Helmet },
    { path: '/roulette', label: 'Roulette', icon: TarkovIcons.Roulette },
    { path: '/blackjack', label: 'Blackjack', icon: TarkovIcons.Blackjack },

    { path: '/history', label: 'History', icon: TarkovIcons.Ammo },
  ]

  const userNavItems = [
    { path: '/profile', label: 'Profile', icon: TarkovIcons.Skull },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="bg-tarkov-dark/90 backdrop-blur-sm border-b border-tarkov-secondary/50 relative z-20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-3 hover:scale-105 transition-transform"
            onClick={() => playGameSound('click')}
          >
            <TarkovIcons.Skull className="text-tarkov-accent" size={32} />
            <div className="flex flex-col">
              <span className="text-xl font-tarkov font-bold text-tarkov-accent uppercase tracking-wider">
                Tarkov Casino
              </span>
              <span className="text-xs text-tarkov-steel uppercase tracking-widest">
                Escape from Poverty
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => {
              const IconComponent = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => playGameSound('click')}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium font-tarkov uppercase tracking-wide
                    transition-all duration-300 transform hover:scale-105
                    ${isActive(item.path)
                      ? 'bg-gradient-to-r from-tarkov-accent to-orange-500 text-tarkov-dark shadow-lg shadow-tarkov-accent/25'
                      : 'text-gray-300 hover:text-white hover:bg-tarkov-secondary/50 border border-transparent hover:border-tarkov-accent/30'
                    }
                  `}
                >
                  <IconComponent size={18} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            {user && userNavItems.map((item) => {
              const IconComponent = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => playGameSound('click')}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium font-tarkov uppercase tracking-wide
                    transition-all duration-300 transform hover:scale-105
                    ${isActive(item.path)
                      ? 'bg-gradient-to-r from-tarkov-accent to-orange-500 text-tarkov-dark shadow-lg shadow-tarkov-accent/25'
                      : 'text-gray-300 hover:text-white hover:bg-tarkov-secondary/50 border border-transparent hover:border-tarkov-accent/30'
                    }
                  `}
                >
                  <IconComponent size={18} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* User Section */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <CurrencyDisplay />
                <RealtimeNotifications 
                  onBalanceUpdate={(_update) => {
                    // Refresh balance when real-time update is received
                    invalidateBalance()
                    playGameSound('coin')
                  }}
                  showBigWins={true}
                />
                <SoundControlPanel compact />
                <div className="flex items-center space-x-3">
                  <Link
                    to="/profile"
                    onClick={() => playGameSound('click')}
                    className="flex items-center space-x-2 text-sm text-gray-300 hover:text-tarkov-accent transition-colors font-tarkov"
                  >
                    <TarkovIcons.Health size={16} />
                    <span>Welcome, {username}</span>
                  </Link>
                  <TarkovButton
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      playGameSound('click')
                      signOut()
                    }}
                  >
                    Extract
                  </TarkovButton>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <TarkovButton
                  variant="secondary"
                  size="sm"
                  onClick={() => playGameSound('click')}
                >
                  <Link to="/login">Login</Link>
                </TarkovButton>
                <TarkovButton
                  variant="primary"
                  size="sm"
                  onClick={() => playGameSound('click')}
                >
                  <Link to="/register">Register</Link>
                </TarkovButton>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {user && (
              <>
                <RealtimeNotifications 
                  onBalanceUpdate={(_update) => {
                    invalidateBalance()
                    playGameSound('coin')
                  }}
                  showBigWins={true}
                />
                <SoundControlPanel compact />
              </>
            )}
            <TarkovButton
              variant="ghost"
              size="sm"
              onClick={() => {
                playGameSound('click')
                setIsMobileMenuOpen(!isMobileMenuOpen)
              }}
              className="p-2"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </TarkovButton>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-tarkov-secondary/50 bg-tarkov-dark/95 backdrop-blur-sm">
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const IconComponent = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      playGameSound('click')
                      setIsMobileMenuOpen(false)
                    }}
                    className={`
                      flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium font-tarkov uppercase tracking-wide
                      transition-all duration-300
                      ${isActive(item.path)
                        ? 'bg-gradient-to-r from-tarkov-accent to-orange-500 text-tarkov-dark shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-tarkov-secondary/50 border border-transparent hover:border-tarkov-accent/30'
                      }
                    `}
                  >
                    <IconComponent size={20} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
              {user && userNavItems.map((item) => {
                const IconComponent = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      playGameSound('click')
                      setIsMobileMenuOpen(false)
                    }}
                    className={`
                      flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium font-tarkov uppercase tracking-wide
                      transition-all duration-300
                      ${isActive(item.path)
                        ? 'bg-gradient-to-r from-tarkov-accent to-orange-500 text-tarkov-dark shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-tarkov-secondary/50 border border-transparent hover:border-tarkov-accent/30'
                      }
                    `}
                  >
                    <IconComponent size={20} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
              
              {/* Mobile User Section */}
              <div className="pt-4 border-t border-tarkov-secondary/50">
                {user ? (
                  <div className="space-y-3">
                    <div className="px-4 py-2">
                      <CurrencyDisplay />
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => {
                        playGameSound('click')
                        setIsMobileMenuOpen(false)
                      }}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-300 hover:text-tarkov-accent transition-colors font-tarkov"
                    >
                      <TarkovIcons.Health size={16} />
                      <span>Welcome, {username}</span>
                    </Link>
                    <div className="px-4">
                      <TarkovButton
                        variant="danger"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          playGameSound('click')
                          signOut()
                          setIsMobileMenuOpen(false)
                        }}
                      >
                        Extract
                      </TarkovButton>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 px-4">
                    <TarkovButton
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={() => {
                        playGameSound('click')
                        setIsMobileMenuOpen(false)
                      }}
                    >
                      <Link to="/login">Login</Link>
                    </TarkovButton>
                    <TarkovButton
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => {
                        playGameSound('click')
                        setIsMobileMenuOpen(false)
                      }}
                    >
                      <Link to="/register">Register</Link>
                    </TarkovButton>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation