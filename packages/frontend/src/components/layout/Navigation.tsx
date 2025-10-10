import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useUsername } from '../../hooks/useProfile'
import CurrencyDisplay from '../ui/CurrencyDisplay'
import { FontAwesomeSVGIcons } from '../ui/FontAwesomeSVG'
import { SoundControlPanel, useSoundManager } from '../ui/SoundManager'
import TarkovButton from '../ui/TarkovButton'
import RealtimeNotifications from '../ui/RealtimeNotifications'
import { useBalanceUpdates } from '../../hooks/useBalance'

const Navigation: React.FC = () => {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const username = useUsername()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const { invalidateBalance } = useBalanceUpdates()
  const profileDropdownRef = useRef<HTMLDivElement>(null)

  const { playGameSound } = useSoundManager()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  
  const navItems = [
    { path: '/', label: 'Home', icon: FontAwesomeSVGIcons.Home },
    { path: '/roulette', label: 'Roulette', icon: FontAwesomeSVGIcons.DiceD6 },
    { path: '/blackjack', label: 'Blackjack', icon: FontAwesomeSVGIcons.Spade },
    { path: '/cases', label: 'Cases', icon: FontAwesomeSVGIcons.Gem },
    { path: '/history', label: 'History', icon: FontAwesomeSVGIcons.History },
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
            <FontAwesomeSVGIcons.Crown className="text-tarkov-accent" size={32} />
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
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => {
                      playGameSound('click')
                      setIsProfileDropdownOpen(!isProfileDropdownOpen)
                    }}
                    className="flex items-center space-x-2 text-sm text-gray-300 hover:text-tarkov-accent transition-colors font-tarkov px-3 py-2 rounded-md hover:bg-tarkov-secondary/50 border border-transparent hover:border-tarkov-accent/30"
                  >
                    <FontAwesomeSVGIcons.Star size={16} />
                    <span>Welcome, {username}</span>
                    <span className={`transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>

                  {/* Profile Dropdown */}
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-tarkov-dark border border-tarkov-secondary/50 rounded-lg shadow-xl z-50">
                      <div className="py-2">
                        <Link
                          to="/profile"
                          onClick={() => {
                            playGameSound('click')
                            setIsProfileDropdownOpen(false)
                          }}
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-tarkov-secondary/50 transition-colors font-tarkov"
                        >
                          <FontAwesomeSVGIcons.User size={16} />
                          <span>Profile</span>
                        </Link>
                        <button
                          onClick={() => {
                            playGameSound('click')
                            signOut()
                            setIsProfileDropdownOpen(false)
                          }}
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors font-tarkov w-full text-left"
                        >
                          <FontAwesomeSVGIcons.Times size={16} />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <TarkovButton
                  variant="primary"
                  size="sm"
                  onClick={() => playGameSound('click')}
                >
                  <Link to="/login">Login with Discord</Link>
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
              {isMobileMenuOpen ? (
                <FontAwesomeSVGIcons.Times size={24} color="currentColor" />
              ) : (
                <FontAwesomeSVGIcons.Bars size={24} color="currentColor" />
              )}
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
              
              {/* Mobile User Section */}
              <div className="pt-4 border-t border-tarkov-secondary/50">
                {user ? (
                  <div className="space-y-3">
                    <div className="px-4 py-2">
                      <CurrencyDisplay />
                    </div>
                    <div className="px-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-300 font-tarkov mb-3">
                        <FontAwesomeSVGIcons.Star size={16} />
                        <span>Welcome, {username}</span>
                      </div>
                      <div className="space-y-2">
                        <Link
                          to="/profile"
                          onClick={() => {
                            playGameSound('click')
                            setIsMobileMenuOpen(false)
                          }}
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-tarkov-secondary/50 transition-colors font-tarkov rounded-md"
                        >
                          <FontAwesomeSVGIcons.User size={16} />
                          <span>Profile</span>
                        </Link>
                        <button
                          onClick={() => {
                            playGameSound('click')
                            signOut()
                            setIsMobileMenuOpen(false)
                          }}
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors font-tarkov w-full text-left rounded-md"
                        >
                          <FontAwesomeSVGIcons.Times size={16} />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 px-4">
                    <TarkovButton
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => {
                        playGameSound('click')
                        setIsMobileMenuOpen(false)
                      }}
                    >
                      <Link to="/login">Login with Discord</Link>
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