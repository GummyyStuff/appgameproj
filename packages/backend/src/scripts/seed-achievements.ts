/**
 * Achievement Definitions Seed Script
 * Populates the achievement_definitions collection with all standard achievements
 * 
 * Run with: bun run packages/backend/src/scripts/seed-achievements.ts
 */

import { appwriteDb } from '../services/appwrite-database';
import { COLLECTION_IDS, AchievementDefinition } from '../config/collections';
import { ID } from 'node-appwrite';

// All achievement definitions (from current useAchievements hook)
const achievementDefinitions: Omit<AchievementDefinition, '$id' | 'createdAt'>[] = [
  // Case Opening Achievements
  {
    achievementId: 'first-case',
    title: 'First Case',
    description: 'Open your first case',
    category: 'gameplay',
    rarity: 'common',
    maxProgress: 1,
    rewardType: 'currency',
    rewardAmount: 500,
    isActive: true,
  },
  {
    achievementId: 'case-opener-10',
    title: 'Case Opener',
    description: 'Open 10 cases',
    category: 'progression',
    rarity: 'common',
    maxProgress: 10,
    rewardType: 'currency',
    rewardAmount: 1000,
    isActive: true,
  },
  {
    achievementId: 'case-master-50',
    title: 'Case Master',
    description: 'Open 50 cases',
    category: 'progression',
    rarity: 'rare',
    maxProgress: 50,
    rewardType: 'currency',
    rewardAmount: 5000,
    isActive: true,
  },
  {
    achievementId: 'case-legend-100',
    title: 'Case Legend',
    description: 'Open 100 cases',
    category: 'progression',
    rarity: 'epic',
    maxProgress: 100,
    rewardType: 'currency',
    rewardAmount: 10000,
    isActive: true,
  },
  {
    achievementId: 'case-god-500',
    title: 'Case God',
    description: 'Open 500 cases',
    category: 'progression',
    rarity: 'legendary',
    maxProgress: 500,
    rewardType: 'currency',
    rewardAmount: 50000,
    isActive: true,
  },
  {
    achievementId: 'scav-collector',
    title: 'Scav Collector',
    description: 'Open 25 Scav cases',
    category: 'gameplay',
    rarity: 'common',
    maxProgress: 25,
    rewardType: 'currency',
    rewardAmount: 2000,
    isActive: true,
  },
  {
    achievementId: 'pmc-veteran',
    title: 'PMC Veteran',
    description: 'Open 50 PMC cases',
    category: 'gameplay',
    rarity: 'rare',
    maxProgress: 50,
    rewardType: 'currency',
    rewardAmount: 10000,
    isActive: true,
  },
  {
    achievementId: 'labs-elite',
    title: 'Labs Elite',
    description: 'Open 25 Labs cases',
    category: 'gameplay',
    rarity: 'epic',
    maxProgress: 25,
    rewardType: 'currency',
    rewardAmount: 25000,
    isActive: true,
  },
  {
    achievementId: 'legendary-pull',
    title: 'Legendary Pull',
    description: 'Get your first legendary item',
    category: 'special',
    rarity: 'legendary',
    maxProgress: 1,
    rewardType: 'currency',
    rewardAmount: 5000,
    isActive: true,
  },
  {
    achievementId: 'legendary-collector',
    title: 'Legendary Collector',
    description: 'Get 10 legendary items',
    category: 'special',
    rarity: 'legendary',
    maxProgress: 10,
    rewardType: 'currency',
    rewardAmount: 50000,
    isActive: true,
  },
  {
    achievementId: 'epic-hunter',
    title: 'Epic Hunter',
    description: 'Get 25 epic items',
    category: 'special',
    rarity: 'epic',
    maxProgress: 25,
    rewardType: 'currency',
    rewardAmount: 15000,
    isActive: true,
  },
  {
    achievementId: 'rare-finder',
    title: 'Rare Finder',
    description: 'Get 50 rare items',
    category: 'special',
    rarity: 'rare',
    maxProgress: 50,
    rewardType: 'currency',
    rewardAmount: 10000,
    isActive: true,
  },
  {
    achievementId: 'lucky-streak-3',
    title: 'Lucky Streak',
    description: 'Get 3 rare or better items in a row',
    category: 'special',
    rarity: 'rare',
    maxProgress: 3,
    rewardType: 'currency',
    rewardAmount: 5000,
    isActive: true,
  },
  {
    achievementId: 'lucky-streak-5',
    title: 'Super Lucky',
    description: 'Get 5 rare or better items in a row',
    category: 'special',
    rarity: 'epic',
    maxProgress: 5,
    rewardType: 'currency',
    rewardAmount: 15000,
    isActive: true,
  },
  {
    achievementId: 'big-win',
    title: 'Big Win',
    description: 'Win an item worth ₽10,000 or more',
    category: 'special',
    rarity: 'rare',
    maxProgress: 1,
    rewardType: 'currency',
    rewardAmount: 5000,
    isActive: true,
  },
  {
    achievementId: 'jackpot',
    title: 'Jackpot',
    description: 'Win an item worth ₽50,000 or more',
    category: 'special',
    rarity: 'legendary',
    maxProgress: 1,
    rewardType: 'currency',
    rewardAmount: 25000,
    isActive: true,
  },
  {
    achievementId: 'profit-master',
    title: 'Profit Master',
    description: 'Make ₽100,000 profit from cases',
    category: 'progression',
    rarity: 'epic',
    maxProgress: 100000,
    rewardType: 'currency',
    rewardAmount: 20000,
    isActive: true,
  },
  {
    achievementId: 'medical-supplies',
    title: 'Medical Supplies',
    description: 'Collect 50 medical items',
    category: 'special',
    rarity: 'common',
    maxProgress: 50,
    rewardType: 'currency',
    rewardAmount: 3000,
    isActive: true,
  },
  {
    achievementId: 'tech-collector',
    title: 'Tech Collector',
    description: 'Collect 50 electronics',
    category: 'special',
    rarity: 'common',
    maxProgress: 50,
    rewardType: 'currency',
    rewardAmount: 3000,
    isActive: true,
  },
  {
    achievementId: 'key-master',
    title: 'Key Master',
    description: 'Collect 25 keycards and keys',
    category: 'special',
    rarity: 'rare',
    maxProgress: 25,
    rewardType: 'currency',
    rewardAmount: 5000,
    isActive: true,
  },
  {
    achievementId: 'valuables-hoarder',
    title: 'Valuables Hoarder',
    description: 'Collect 50 valuables',
    category: 'special',
    rarity: 'rare',
    maxProgress: 50,
    rewardType: 'currency',
    rewardAmount: 8000,
    isActive: true,
  },
  {
    achievementId: 'daily-opener',
    title: 'Daily Opener',
    description: 'Open cases for 7 days in a row',
    category: 'progression',
    rarity: 'rare',
    maxProgress: 7,
    rewardType: 'currency',
    rewardAmount: 10000,
    isActive: true,
  },
  {
    achievementId: 'weekly-warrior',
    title: 'Weekly Warrior',
    description: 'Open cases for 30 days in a row',
    category: 'progression',
    rarity: 'epic',
    maxProgress: 30,
    rewardType: 'currency',
    rewardAmount: 50000,
    isActive: true,
  },
  {
    achievementId: 'break-even',
    title: 'Break Even',
    description: 'Open 10 cases without losing money',
    category: 'special',
    rarity: 'rare',
    maxProgress: 10,
    rewardType: 'currency',
    rewardAmount: 5000,
    isActive: true,
  },
  {
    achievementId: 'first-epic',
    title: 'First Epic',
    description: 'Get your first epic item',
    category: 'special',
    rarity: 'epic',
    maxProgress: 1,
    rewardType: 'currency',
    rewardAmount: 3000,
    isActive: true,
  },
  {
    achievementId: 'first-rare',
    title: 'First Rare',
    description: 'Get your first rare item',
    category: 'special',
    rarity: 'common',
    maxProgress: 1,
    rewardType: 'currency',
    rewardAmount: 1000,
    isActive: true,
  },
  // Gambling Game Achievements (Roulette/Blackjack)
  {
    achievementId: 'high-roller',
    title: 'High Roller',
    description: 'Place a bet of ₽10,000 or more',
    category: 'gameplay',
    rarity: 'rare',
    maxProgress: 10000,
    rewardType: 'currency',
    rewardAmount: 5000,
    isActive: true,
  },
  {
    achievementId: 'lucky-seven',
    title: 'Lucky Seven',
    description: 'Win 7 games in a row',
    category: 'gameplay',
    rarity: 'epic',
    maxProgress: 7,
    rewardType: 'currency',
    rewardAmount: 10000,
    isActive: true,
  },
  {
    achievementId: 'roulette-master',
    title: 'Roulette Master',
    description: 'Win 100 roulette games',
    category: 'progression',
    rarity: 'rare',
    maxProgress: 100,
    rewardType: 'currency',
    rewardAmount: 15000,
    isActive: true,
  },
  {
    achievementId: 'blackjack-ace',
    title: 'Blackjack Ace',
    description: 'Get 10 blackjacks in a single session',
    category: 'special',
    rarity: 'legendary',
    maxProgress: 10,
    rewardType: 'currency',
    rewardAmount: 25000,
    isActive: true,
  },
];

async function seedAchievements() {
  console.log('🌱 Starting achievement definitions seed...');
  console.log(`📊 Total achievements to seed: ${achievementDefinitions.length}`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const achievement of achievementDefinitions) {
    try {
      const { error } = await appwriteDb.createDocument(
        COLLECTION_IDS.ACHIEVEMENT_DEFINITIONS,
        ID.unique(),
        {
          ...achievement,
          createdAt: new Date().toISOString(),
        }
      );
      
      if (error) {
        console.error(`❌ Failed to seed ${achievement.achievementId}:`, error);
        errorCount++;
      } else {
        console.log(`✅ Seeded: ${achievement.achievementId} (${achievement.title})`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Error seeding ${achievement.achievementId}:`, error);
      errorCount++;
    }
  }
  
  console.log('\n📊 Seeding Summary:');
  console.log(`✅ Successfully seeded: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📈 Total: ${achievementDefinitions.length}`);
  
  if (errorCount === 0) {
    console.log('\n🎉 All achievements seeded successfully!');
  } else {
    console.log('\n⚠️  Some achievements failed to seed. Check errors above.');
  }
  
  process.exit(errorCount === 0 ? 0 : 1);
}

// Run the seed
seedAchievements().catch((error) => {
  console.error('💥 Fatal error during seeding:', error);
  process.exit(1);
});

