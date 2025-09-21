import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { 
  TarkovIcons, 
  TarkovButton, 
  TarkovCard, 
  StatsCard,
  TarkovDecorations,
  useSoundManager 
} from '../components/ui'

const HomePage: React.FC = () => {
  const { user } = useAuth()
  const { playGameSound } = useSoundManager()

  const games = [
    {
      name: 'Roulette',
      icon: TarkovIcons.Roulette,
      description: 'Classic casino roulette with Tarkov theming',
      path: '/roulette',
      color: 'from-red-900 to-red-700',
    },
    {
      name: 'Blackjack',
      icon: TarkovIcons.Blackjack,
      description: 'Strategic card game with dealer AI',
      path: '/blackjack',
      color: 'from-green-900 to-green-700',
    },
    {
      name: 'Case Opening',
      icon: TarkovIcons.Weapon,
      description: 'Open Tarkov-themed cases for valuable items',
      path: '/cases',
      color: 'from-purple-900 to-purple-700',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <TarkovCard variant="accent" className="text-center py-12 relative overflow-hidden" glow>
        <TarkovDecorations.CornerBrackets />
        <TarkovDecorations.ScanLines />
        
        <div className="relative z-10">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <TarkovIcons.Skull className="text-tarkov-accent animate-pulse" size={48} />
            <h1 className="text-4xl md:text-6xl font-tarkov font-bold text-tarkov-accent uppercase tracking-wider">
              Tarkov Casino
            </h1>
            <TarkovIcons.Skull className="text-tarkov-accent animate-pulse" size={48} />
          </div>
          
          <p className="text-xl text-gray-300 mb-2 max-w-2xl mx-auto font-tarkov">
            Experience the thrill of classic casino games with Escape from Tarkov theming.
          </p>
          <p className="text-lg text-tarkov-accent mb-8 max-w-2xl mx-auto font-tarkov uppercase tracking-wide">
            Play with virtual currency for pure entertainment!
          </p>
          
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <TarkovButton
                variant="primary"
                size="lg"
                onClick={() => playGameSound('click')}
                icon={<TarkovIcons.Weapon size={20} />}
              >
                <Link to="/register">Enter the Raid</Link>
              </TarkovButton>
              <TarkovButton
                variant="secondary"
                size="lg"
                onClick={() => playGameSound('click')}
                icon={<TarkovIcons.Helmet size={20} />}
              >
                <Link to="/login">Return to Base</Link>
              </TarkovButton>
            </div>
          )}
          
          {user && (
            <div className="flex justify-center">
              <TarkovButton
                variant="success"
                size="lg"
                onClick={() => playGameSound('notification')}
                icon={<TarkovIcons.Health size={20} />}
              >
                Welcome back, Survivor!
              </TarkovButton>
            </div>
          )}
        </div>
      </TarkovCard>

      {/* Games Section */}
      <div className="grid md:grid-cols-3 gap-6">
        {games.map((game) => {
          const IconComponent = game.icon
          return (
            <TarkovCard
              key={game.name}
              hover
              className={`p-6 bg-gradient-to-br ${game.color} border-2 border-tarkov-accent/30 hover:border-tarkov-accent/60 transition-all duration-300`}
            >
              <Link
                to={game.path}
                onClick={() => playGameSound('click')}
                className="block text-center group"
              >
                <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">
                  <IconComponent className="text-tarkov-accent mx-auto" size={64} />
                </div>
                <h3 className="text-2xl font-tarkov font-bold mb-3 text-white uppercase tracking-wide">
                  {game.name}
                </h3>
                <p className="text-gray-300 mb-4 font-tarkov">
                  {game.description}
                </p>
                <TarkovButton
                  variant="ghost"
                  size="sm"
                  className="group-hover:bg-tarkov-accent group-hover:text-tarkov-dark"
                >
                  Play Now
                </TarkovButton>
              </Link>
            </TarkovCard>
          )
        })}
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
        <TarkovCard className="text-center p-6" hover>
          <TarkovIcons.Helmet className="text-tarkov-accent mx-auto mb-3" size={48} />
          <h4 className="font-tarkov font-bold text-tarkov-accent mb-2 uppercase tracking-wide">
            Tarkov Themed
          </h4>
          <p className="text-sm text-gray-400 font-tarkov">
            Immersive Escape from Tarkov aesthetics and atmosphere
          </p>
        </TarkovCard>
        
        <TarkovCard className="text-center p-6" hover>
          <TarkovIcons.Roubles className="text-roubles mx-auto mb-3" size={48} />
          <h4 className="font-tarkov font-bold text-tarkov-accent mb-2 uppercase tracking-wide">
            Virtual Currency
          </h4>
          <p className="text-sm text-gray-400 font-tarkov">
            Play with Roubles, Dollars, and Euros - no real money
          </p>
        </TarkovCard>
        
        <TarkovCard className="text-center p-6" hover>
          <TarkovIcons.Energy className="text-yellow-500 mx-auto mb-3" size={48} />
          <h4 className="font-tarkov font-bold text-tarkov-accent mb-2 uppercase tracking-wide">
            Real-time
          </h4>
          <p className="text-sm text-gray-400 font-tarkov">
            Live game updates and real-time interactions
          </p>
        </TarkovCard>
        
        <TarkovCard className="text-center p-6" hover>
          <TarkovIcons.Weapon className="text-tarkov-steel mx-auto mb-3" size={48} />
          <h4 className="font-tarkov font-bold text-tarkov-accent mb-2 uppercase tracking-wide">
            Responsive
          </h4>
          <p className="text-sm text-gray-400 font-tarkov">
            Optimized for desktop, tablet, and mobile devices
          </p>
        </TarkovCard>
      </div>

      {/* Stats Section (if user is logged in) */}
      {user && (
        <TarkovCard className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <TarkovIcons.Ammo className="text-tarkov-accent" size={24} />
            <h3 className="text-2xl font-tarkov font-bold text-tarkov-accent uppercase tracking-wide">
              Combat Statistics
            </h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard
              title="Raids Completed"
              value="0"
              icon={<TarkovIcons.Helmet size={20} />}
              trend="neutral"
            />
            <StatsCard
              title="Successful Extracts"
              value="0"
              icon={<TarkovIcons.Health size={20} />}
              trend="neutral"
            />
            <StatsCard
              title="Total Wagered"
              value="₽0"
              icon={<TarkovIcons.Roubles size={20} />}
              trend="neutral"
            />
            <StatsCard
              title="Biggest Haul"
              value="₽0"
              icon={<TarkovIcons.Weapon size={20} />}
              trend="neutral"
            />
          </div>
        </TarkovCard>
      )}
    </div>
  )
}

export default HomePage