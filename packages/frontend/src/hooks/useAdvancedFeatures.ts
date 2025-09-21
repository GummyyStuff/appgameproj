import { useState, useEffect } from 'react'



interface Achievement {
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





export const useAdvancedFeatures = () => {






  // Achievement system state
  const [showAchievements, setShowAchievements] = useState(false)
  const [achievements, setAchievements] = useState<Achievement[]>([])







  // Load user preferences from localStorage
  useEffect(() => {
    const savedAchievements = localStorage.getItem('achievements')
    const achievementsVersion = localStorage.getItem('achievementsVersion')
    
    // Check if we need to reset achievements due to format change
    if (savedAchievements && achievementsVersion === '1.0') {
      try {
        const parsed = JSON.parse(savedAchievements)
        // Validate that achievements don't have icon property (old format)
        if (parsed.length > 0 && !parsed[0].hasOwnProperty('icon')) {
          // Convert date strings back to Date objects
          const achievementsWithDates = parsed.map((achievement: any) => ({
            ...achievement,
            unlockedAt: achievement.unlockedAt ? new Date(achievement.unlockedAt) : undefined
          }))
          setAchievements(achievementsWithDates)
        } else {
          // Old format detected, reinitialize
          initializeAchievements()
        }
      } catch {
        // Invalid data, reinitialize
        initializeAchievements()
      }
    } else {
      // Initialize with default achievements
      initializeAchievements()
    }
  }, [])

  const initializeAchievements = () => {
    const defaultAchievements: Achievement[] = [
      {
        id: 'first-win',
        title: 'First Extract',
        description: 'Win your first game',
        category: 'gameplay',
        rarity: 'common',
        progress: 0,
        maxProgress: 1,
        unlocked: false,
        reward: { type: 'currency', amount: 1000 }
      },
      {
        id: 'high-roller',
        title: 'High Roller',
        description: 'Place a bet of ₽10,000 or more',
        category: 'gameplay',
        rarity: 'rare',
        progress: 0,
        maxProgress: 10000,
        unlocked: false
      },
      {
        id: 'lucky-seven',
        title: 'Lucky Seven',
        description: 'Win 7 games in a row',
        category: 'gameplay',
        rarity: 'epic',
        progress: 0,
        maxProgress: 7,
        unlocked: false
      },
      {
        id: 'roulette-master',
        title: 'Roulette Master',
        description: 'Win 100 roulette games',
        category: 'progression',
        rarity: 'rare',
        progress: 0,
        maxProgress: 100,
        unlocked: false
      },
      {
        id: 'blackjack-ace',
        title: 'Blackjack Ace',
        description: 'Get 10 blackjacks in a single session',
        category: 'special',
        rarity: 'legendary',
        progress: 0,
        maxProgress: 10,
        unlocked: false
      },

    ]
    setAchievements(defaultAchievements)
    localStorage.setItem('achievements', JSON.stringify(defaultAchievements))
    localStorage.setItem('achievementsVersion', '1.0')
  }







  // Achievement functions
  const openAchievements = () => {
    setShowAchievements(true)
  }

  const closeAchievements = () => {
    setShowAchievements(false)
  }

  const updateAchievementProgress = (achievementId: string, progressToAdd: number) => {
    setAchievements(prev => {
      const updated = prev.map(achievement => {
        if (achievement.id === achievementId && !achievement.unlocked) {
          const newProgress = Math.min(achievement.progress + progressToAdd, achievement.maxProgress)
          const wasUnlocked = achievement.unlocked
          const unlocked = newProgress >= achievement.maxProgress
          
          // Show achievement unlocked notification
          if (unlocked && !wasUnlocked) {
            // In a real app, you'd use a toast system here
            console.log(`🏆 Achievement Unlocked: ${achievement.title}!`)
            
            // You could also trigger a custom event that components can listen to
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('achievementUnlocked', {
                detail: { achievement: { ...achievement, unlocked: true } }
              }))
            }
          }
          
          return {
            ...achievement,
            progress: newProgress,
            unlocked,
            unlockedAt: unlocked ? new Date() : achievement.unlockedAt
          }
        }
        return achievement
      })
      localStorage.setItem('achievements', JSON.stringify(updated))
      return updated
    })
  }

  const claimAchievementReward = (achievementId: string) => {
    const achievement = achievements.find(a => a.id === achievementId)
    if (achievement?.reward && achievement.unlocked) {
      // In a real app, this would add currency to user balance
      console.log(`Claimed reward: ${achievement.reward.type} - ${achievement.reward.amount || achievement.reward.item}`)
      
      // Mark reward as claimed (you might want to add a 'claimed' field to the achievement)
      setAchievements(prev => {
        const updated = prev.map(a => 
          a.id === achievementId 
            ? { ...a, reward: undefined } // Remove reward after claiming
            : a
        )
        localStorage.setItem('achievements', JSON.stringify(updated))
        return updated
      })
    }
  }



  // Session tracking functions
  const trackGamePlayed = (betAmount: number, winAmount: number, gameType?: string) => {
    // Update achievements based on game activity
    if (winAmount > 0) {
      // First win achievement - just needs any win
      updateAchievementProgress('first-win', 1)
    }
    
    // High roller achievement - track the bet amount
    if (betAmount >= 10000) {
      updateAchievementProgress('high-roller', betAmount)
    }
    
    // Track consecutive wins for lucky seven
    // This would need more sophisticated tracking in a real implementation
    // For now, we'll just increment on wins
    if (winAmount > 0) {
      // In a real implementation, you'd track consecutive wins
      // For demo purposes, we'll just increment progress
      updateAchievementProgress('lucky-seven', 1)
    }
  }

  return {





    // Achievements
    showAchievements,
    achievements,
    openAchievements,
    closeAchievements,
    updateAchievementProgress,
    claimAchievementReward,



    // Session Tracking
    trackGamePlayed
  }
}