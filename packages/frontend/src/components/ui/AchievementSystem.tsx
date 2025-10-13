import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TarkovButton, TarkovCard, FontAwesomeSVGIcons } from './index'

export interface Achievement {
  id: string
  title: string
  description: string
  category: 'gameplay' | 'progression' | 'special' | 'social'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  progress: number
  maxProgress: number
  unlocked: boolean
  unlockedAt?: Date | string
  reward?: {
    type: 'currency' | 'title' | 'cosmetic'
    amount?: number
    item?: string
  }
}

interface AchievementSystemProps {
  isOpen: boolean
  onClose: () => void
  achievements: Achievement[]
  loading?: boolean
  error?: string | null
  onClaimReward?: (achievementId: string) => Promise<void>
}

const achievementCategories = [
  { id: 'all', label: 'All Achievements', icon: FontAwesomeSVGIcons.Shield },
  { id: 'gameplay', label: 'Combat', icon: FontAwesomeSVGIcons.Sword },
  { id: 'progression', label: 'Progression', icon: FontAwesomeSVGIcons.Bolt },
  { id: 'special', label: 'Special', icon: FontAwesomeSVGIcons.Heart },
  { id: 'social', label: 'Social', icon: FontAwesomeSVGIcons.Axe }
]

const rarityColors = {
  common: 'from-gray-600 to-gray-800 border-gray-500',
  rare: 'from-blue-600 to-blue-800 border-blue-500',
  epic: 'from-purple-600 to-purple-800 border-purple-500',
  legendary: 'from-yellow-600 to-yellow-800 border-yellow-500'
}

const rarityGlow = {
  common: 'shadow-gray-500/20',
  rare: 'shadow-blue-500/30',
  epic: 'shadow-purple-500/30',
  legendary: 'shadow-yellow-500/40'
}

// Mock achievements data
const mockAchievements: Achievement[] = [
  // Case Opening Achievements
  {
    id: 'first-case',
    title: 'First Case',
    description: 'Open your first case',
    category: 'gameplay',
    rarity: 'common',
    progress: 1,
    maxProgress: 1,
    unlocked: true,
    unlockedAt: new Date(Date.now() - 86400000),
    reward: { type: 'currency', amount: 500 }
  },
  {
    id: 'case-opener-10',
    title: 'Case Opener',
    description: 'Open 10 cases',
    category: 'progression',
    rarity: 'common',
    progress: 3,
    maxProgress: 10,
    unlocked: false,
    reward: { type: 'currency', amount: 1000 }
  },
  {
    id: 'case-master-50',
    title: 'Case Master',
    description: 'Open 50 cases',
    category: 'progression',
    rarity: 'rare',
    progress: 12,
    maxProgress: 50,
    unlocked: false,
    reward: { type: 'currency', amount: 5000 }
  },
  {
    id: 'case-legend-100',
    title: 'Case Legend',
    description: 'Open 100 cases',
    category: 'progression',
    rarity: 'epic',
    progress: 12,
    maxProgress: 100,
    unlocked: false,
    reward: { type: 'currency', amount: 10000 }
  },
  {
    id: 'case-god-500',
    title: 'Case God',
    description: 'Open 500 cases',
    category: 'progression',
    rarity: 'legendary',
    progress: 12,
    maxProgress: 500,
    unlocked: false,
    reward: { type: 'currency', amount: 50000 }
  },
  {
    id: 'scav-collector',
    title: 'Scav Collector',
    description: 'Open 25 Scav cases',
    category: 'gameplay',
    rarity: 'common',
    progress: 8,
    maxProgress: 25,
    unlocked: false,
    reward: { type: 'currency', amount: 2000 }
  },
  {
    id: 'pmc-veteran',
    title: 'PMC Veteran',
    description: 'Open 50 PMC cases',
    category: 'gameplay',
    rarity: 'rare',
    progress: 3,
    maxProgress: 50,
    unlocked: false,
    reward: { type: 'currency', amount: 10000 }
  },
  {
    id: 'labs-elite',
    title: 'Labs Elite',
    description: 'Open 25 Labs cases',
    category: 'gameplay',
    rarity: 'epic',
    progress: 1,
    maxProgress: 25,
    unlocked: false,
    reward: { type: 'currency', amount: 25000 }
  },
  {
    id: 'legendary-pull',
    title: 'Legendary Pull',
    description: 'Get your first legendary item',
    category: 'special',
    rarity: 'legendary',
    progress: 0,
    maxProgress: 1,
    unlocked: false,
    reward: { type: 'currency', amount: 5000 }
  },
  {
    id: 'legendary-collector',
    title: 'Legendary Collector',
    description: 'Get 10 legendary items',
    category: 'special',
    rarity: 'legendary',
    progress: 0,
    maxProgress: 10,
    unlocked: false,
    reward: { type: 'currency', amount: 50000 }
  },
  {
    id: 'epic-hunter',
    title: 'Epic Hunter',
    description: 'Get 25 epic items',
    category: 'special',
    rarity: 'epic',
    progress: 2,
    maxProgress: 25,
    unlocked: false,
    reward: { type: 'currency', amount: 15000 }
  },
  {
    id: 'rare-finder',
    title: 'Rare Finder',
    description: 'Get 50 rare items',
    category: 'special',
    rarity: 'rare',
    progress: 8,
    maxProgress: 50,
    unlocked: false,
    reward: { type: 'currency', amount: 10000 }
  },
  {
    id: 'lucky-streak-3',
    title: 'Lucky Streak',
    description: 'Get 3 rare or better items in a row',
    category: 'special',
    rarity: 'rare',
    progress: 1,
    maxProgress: 3,
    unlocked: false,
    reward: { type: 'currency', amount: 5000 }
  },
  {
    id: 'lucky-streak-5',
    title: 'Super Lucky',
    description: 'Get 5 rare or better items in a row',
    category: 'special',
    rarity: 'epic',
    progress: 1,
    maxProgress: 5,
    unlocked: false,
    reward: { type: 'currency', amount: 15000 }
  },
  {
    id: 'big-win',
    title: 'Big Win',
    description: 'Win an item worth ₽10,000 or more',
    category: 'special',
    rarity: 'rare',
    progress: 0,
    maxProgress: 1,
    unlocked: false,
    reward: { type: 'currency', amount: 5000 }
  },
  {
    id: 'jackpot',
    title: 'Jackpot',
    description: 'Win an item worth ₽50,000 or more',
    category: 'special',
    rarity: 'legendary',
    progress: 0,
    maxProgress: 1,
    unlocked: false,
    reward: { type: 'currency', amount: 25000 }
  },
  {
    id: 'profit-master',
    title: 'Profit Master',
    description: 'Make ₽100,000 profit from cases',
    category: 'progression',
    rarity: 'epic',
    progress: 15000,
    maxProgress: 100000,
    unlocked: false,
    reward: { type: 'currency', amount: 20000 }
  },
  {
    id: 'medical-supplies',
    title: 'Medical Supplies',
    description: 'Collect 50 medical items',
    category: 'special',
    rarity: 'common',
    progress: 12,
    maxProgress: 50,
    unlocked: false,
    reward: { type: 'currency', amount: 3000 }
  },
  {
    id: 'tech-collector',
    title: 'Tech Collector',
    description: 'Collect 50 electronics',
    category: 'special',
    rarity: 'common',
    progress: 8,
    maxProgress: 50,
    unlocked: false,
    reward: { type: 'currency', amount: 3000 }
  },
  {
    id: 'key-master',
    title: 'Key Master',
    description: 'Collect 25 keycards and keys',
    category: 'special',
    rarity: 'rare',
    progress: 3,
    maxProgress: 25,
    unlocked: false,
    reward: { type: 'currency', amount: 5000 }
  },
  {
    id: 'valuables-hoarder',
    title: 'Valuables Hoarder',
    description: 'Collect 50 valuables',
    category: 'special',
    rarity: 'rare',
    progress: 15,
    maxProgress: 50,
    unlocked: false,
    reward: { type: 'currency', amount: 8000 }
  },
  {
    id: 'daily-opener',
    title: 'Daily Opener',
    description: 'Open cases for 7 days in a row',
    category: 'progression',
    rarity: 'rare',
    progress: 2,
    maxProgress: 7,
    unlocked: false,
    reward: { type: 'currency', amount: 10000 }
  },
  {
    id: 'weekly-warrior',
    title: 'Weekly Warrior',
    description: 'Open cases for 30 days in a row',
    category: 'progression',
    rarity: 'epic',
    progress: 2,
    maxProgress: 30,
    unlocked: false,
    reward: { type: 'currency', amount: 50000 }
  },
  {
    id: 'break-even',
    title: 'Break Even',
    description: 'Open 10 cases without losing money',
    category: 'special',
    rarity: 'rare',
    progress: 3,
    maxProgress: 10,
    unlocked: false,
    reward: { type: 'currency', amount: 5000 }
  },
  {
    id: 'first-epic',
    title: 'First Epic',
    description: 'Get your first epic item',
    category: 'special',
    rarity: 'epic',
    progress: 0,
    maxProgress: 1,
    unlocked: false,
    reward: { type: 'currency', amount: 3000 }
  },
  {
    id: 'first-rare',
    title: 'First Rare',
    description: 'Get your first rare item',
    category: 'special',
    rarity: 'common',
    progress: 1,
    maxProgress: 1,
    unlocked: true,
    unlockedAt: new Date(Date.now() - 172800000),
    reward: { type: 'currency', amount: 1000 }
  },
  // Original achievements (Roulette/Blackjack)
  {
    id: 'high-roller',
    title: 'High Roller',
    description: 'Place a bet of ₽10,000 or more',
    category: 'gameplay',
    rarity: 'rare',
    progress: 7500,
    maxProgress: 10000,
    unlocked: false
  },
  {
    id: 'lucky-seven',
    title: 'Lucky Seven',
    description: 'Win 7 games in a row',
    category: 'gameplay',
    rarity: 'epic',
    progress: 3,
    maxProgress: 7,
    unlocked: false
  },
  {
    id: 'roulette-master',
    title: 'Roulette Master',
    description: 'Win 100 roulette games',
    category: 'progression',
    rarity: 'rare',
    progress: 45,
    maxProgress: 100,
    unlocked: false
  },
  {
    id: 'blackjack-ace',
    title: 'Blackjack Ace',
    description: 'Get 10 blackjacks in a single session',
    category: 'special',
    rarity: 'legendary',
    progress: 2,
    maxProgress: 10,
    unlocked: false
  }
]

const AchievementSystem: React.FC<AchievementSystemProps> = ({
  isOpen,
  onClose,
  achievements,
  loading = false,
  error = null,
  onClaimReward
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)

  // Function to get icon based on achievement ID
  const getAchievementIcon = (achievementId: string) => {
    const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
      // Case Opening Achievements
      'first-case': FontAwesomeSVGIcons.Gift,
      'case-opener-10': FontAwesomeSVGIcons.Box,
      'case-master-50': FontAwesomeSVGIcons.Boxes,
      'case-legend-100': FontAwesomeSVGIcons.Star,
      'case-god-500': FontAwesomeSVGIcons.Crown,
      'scav-collector': FontAwesomeSVGIcons.Backpack,
      'pmc-veteran': FontAwesomeSVGIcons.Shield,
      'labs-elite': FontAwesomeSVGIcons.Flask,
      'legendary-pull': FontAwesomeSVGIcons.Gem,
      'legendary-collector': FontAwesomeSVGIcons.Gems,
      'epic-hunter': FontAwesomeSVGIcons.Target,
      'rare-finder': FontAwesomeSVGIcons.MagnifyingGlass,
      'lucky-streak-3': FontAwesomeSVGIcons.Clover,
      'lucky-streak-5': FontAwesomeSVGIcons.Clover,
      'big-win': FontAwesomeSVGIcons.Trophy,
      'jackpot': FontAwesomeSVGIcons.Coins,
      'profit-master': FontAwesomeSVGIcons.RubleSign,
      'medical-supplies': FontAwesomeSVGIcons.Heart,
      'tech-collector': FontAwesomeSVGIcons.Laptop,
      'key-master': FontAwesomeSVGIcons.Key,
      'valuables-hoarder': FontAwesomeSVGIcons.Coin,
      'daily-opener': FontAwesomeSVGIcons.Calendar,
      'weekly-warrior': FontAwesomeSVGIcons.CalendarCheck,
      'break-even': FontAwesomeSVGIcons.BalanceScale,
      'first-epic': FontAwesomeSVGIcons.Sparkles,
      'first-rare': FontAwesomeSVGIcons.Star,
      // Original achievements (Roulette/Blackjack)
      'high-roller': FontAwesomeSVGIcons.RubleSign,
      'lucky-seven': FontAwesomeSVGIcons.Bolt,
      'roulette-master': FontAwesomeSVGIcons.Circle,
      'blackjack-ace': FontAwesomeSVGIcons.Spade,
    }
    return iconMap[achievementId] || FontAwesomeSVGIcons.Shield
  }

  const filteredAchievements = achievements.filter(achievement => 
    selectedCategory === 'all' || achievement.category === selectedCategory
  )

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalCount = achievements.length
  const completionPercentage = Math.round((unlockedCount / totalCount) * 100)

  const handleClaimReward = async (achievement: Achievement) => {
    if (onClaimReward) {
      try {
        await onClaimReward(achievement.id)
      } catch (error) {
        console.error('Failed to claim reward:', error)
        // Error handling is done in the hook
      }
    }
  }

  const AchievementCard: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
    const IconComponent = getAchievementIcon(achievement.id)
    const progressPercentage = (achievement.progress / achievement.maxProgress) * 100

    return (
      <motion.div
        className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
          achievement.unlocked
            ? `bg-gradient-to-br ${rarityColors[achievement.rarity]} ${rarityGlow[achievement.rarity]} shadow-lg`
            : 'bg-gray-800/50 border-gray-600 hover:border-gray-500'
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setSelectedAchievement(achievement)}
      >
        {/* Rarity indicator */}
        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
          achievement.rarity === 'common' ? 'bg-gray-500' :
          achievement.rarity === 'rare' ? 'bg-blue-500' :
          achievement.rarity === 'epic' ? 'bg-purple-500' :
          'bg-yellow-500'
        }`} />

        {/* Icon */}
        <div className="flex items-center space-x-3 mb-3">
          <div className={`p-2 rounded-lg ${
            achievement.unlocked ? 'bg-white/10' : 'bg-gray-700/50'
          }`}>
            <IconComponent 
              size={24} 
              className={achievement.unlocked ? 'text-white' : 'text-gray-500'} 
            />
          </div>
          <div className="flex-1">
            <h3 className={`font-tarkov font-bold text-sm uppercase ${
              achievement.unlocked ? 'text-white' : 'text-gray-400'
            }`}>
              {achievement.title}
            </h3>
            <p className={`text-xs ${
              achievement.unlocked ? 'text-gray-200' : 'text-gray-500'
            }`}>
              {achievement.description}
            </p>
          </div>
        </div>

        {/* Progress */}
        {!achievement.unlocked && (
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{achievement.progress}/{achievement.maxProgress}</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-tarkov-accent h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Unlocked indicator */}
        {achievement.unlocked && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-green-400 text-xs">
              <FontAwesomeSVGIcons.Heart size={12} />
              <span>Unlocked</span>
            </div>
            {achievement.unlockedAt && (
              <span className="text-xs text-gray-300">
                {achievement.unlockedAt.toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {/* Reward indicator */}
        {achievement.reward && achievement.unlocked && !achievement.claimed && (
          <div className="mt-2 p-2 bg-green-900/20 border border-green-500/30 rounded text-xs">
            <TarkovButton
              variant="success"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleClaimReward(achievement);
              }}
            >
              Claim ₽{achievement.reward.amount}
            </TarkovButton>
          </div>
        )}

        {achievement.claimed && achievement.reward && (
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
            <FontAwesomeSVGIcons.Check size={12} />
            <span>Reward claimed</span>
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <TarkovCard className="p-8" glow>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <FontAwesomeSVGIcons.Shield className="text-tarkov-accent" size={32} />
                  <div>
                    <h2 className="text-2xl font-tarkov font-bold text-tarkov-accent uppercase">
                      Achievements
                    </h2>
                    <p className="text-sm text-gray-400">
                      {unlockedCount}/{totalCount} unlocked ({completionPercentage}%)
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close achievements"
                >
                  <FontAwesomeSVGIcons.Times size={24} />
                </button>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-400">Loading achievements...</div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {/* Progress Overview */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Overall Progress</span>
                  <span>{completionPercentage}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <motion.div
                    className="bg-gradient-to-r from-tarkov-accent to-green-500 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercentage}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                  />
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {achievementCategories.map((category) => {
                  const IconComponent = category.icon
                  const categoryCount = category.id === 'all' 
                    ? achievements.length 
                    : achievements.filter(a => a.category === category.id).length
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-tarkov-accent text-tarkov-dark font-bold'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <IconComponent size={16} />
                      <span className="font-tarkov text-sm uppercase">{category.label}</span>
                      <span className="text-xs opacity-75">({categoryCount})</span>
                    </button>
                  )
                })}
              </div>

              {/* Achievements Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAchievements.map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
              </div>

              {/* Achievement Detail Modal */}
              <AnimatePresence>
                {selectedAchievement && (
                  <motion.div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-60"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedAchievement(null)}
                  >
                    <motion.div
                      className="max-w-md w-full mx-4"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TarkovCard className="p-6" glow>
                        <div className="text-center">
                          <div className={`inline-flex p-4 rounded-full mb-4 ${
                            selectedAchievement.unlocked ? 'bg-white/10' : 'bg-gray-700/50'
                          }`}>
                            {React.createElement(getAchievementIcon(selectedAchievement.id), {
                              size: 48,
                              className: selectedAchievement.unlocked ? 'text-white' : 'text-gray-500'
                            })}
                          </div>
                          
                          <h3 className="text-xl font-tarkov font-bold text-white mb-2 uppercase">
                            {selectedAchievement.title}
                          </h3>
                          
                          <p className="text-gray-300 mb-4">
                            {selectedAchievement.description}
                          </p>

                          <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase mb-4 ${
                            selectedAchievement.rarity === 'common' ? 'bg-gray-600 text-white' :
                            selectedAchievement.rarity === 'rare' ? 'bg-blue-600 text-white' :
                            selectedAchievement.rarity === 'epic' ? 'bg-purple-600 text-white' :
                            'bg-yellow-600 text-black'
                          }`}>
                            {selectedAchievement.rarity}
                          </div>

                          {!selectedAchievement.unlocked && (
                            <div className="mb-4">
                              <div className="text-sm text-gray-400 mb-2">
                                Progress: {selectedAchievement.progress}/{selectedAchievement.maxProgress}
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-tarkov-accent h-2 rounded-full"
                                  style={{ width: `${(selectedAchievement.progress / selectedAchievement.maxProgress) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {selectedAchievement.reward && selectedAchievement.unlocked && !selectedAchievement.claimed && (
                            <div className="mb-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                              <div className="text-sm text-green-400 mb-2">Reward Available!</div>
                              <TarkovButton
                                variant="success"
                                size="sm"
                                onClick={() => handleClaimReward(selectedAchievement)}
                              >
                                Claim {selectedAchievement.reward.type === 'currency' ? `₽${selectedAchievement.reward.amount}` : selectedAchievement.reward.item}
                              </TarkovButton>
                            </div>
                          )}

                          {selectedAchievement.claimed && selectedAchievement.reward && (
                            <div className="mb-4 text-sm text-gray-500 flex items-center justify-center gap-2">
                              <FontAwesomeSVGIcons.Check size={16} />
                              <span>Reward claimed</span>
                            </div>
                          )}

                          <TarkovButton
                            variant="secondary"
                            onClick={() => setSelectedAchievement(null)}
                            aria-label="Close achievement details"
                          >
                            Close
                          </TarkovButton>
                        </div>
                      </TarkovCard>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </TarkovCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AchievementSystem