/**
 * Appwrite Collection IDs and Database Configuration
 * Centralized constants for all collection references
 */

export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'main_db';

export const COLLECTION_IDS = {
  USERS: 'users',
  GAME_HISTORY: 'game_history',
  DAILY_BONUSES: 'daily_bonuses',
  CASE_TYPES: 'case_types',
  TARKOV_ITEMS: 'tarkov_items',
  CASE_ITEM_POOLS: 'case_item_pools',
  CHAT_MESSAGES: 'chat_messages',
  CHAT_PRESENCE: 'chat_presence',
  AUDIT_LOGS: 'audit_logs',
  ACHIEVEMENT_DEFINITIONS: 'achievement_definitions',
  USER_ACHIEVEMENTS: 'user_achievements',
} as const;

export type CollectionId = typeof COLLECTION_IDS[keyof typeof COLLECTION_IDS];

/**
 * TypeScript interfaces matching Appwrite collection schemas
 */

export interface UserProfile {
  $id?: string;
  userId: string;
  username: string;
  displayName?: string;
  email?: string; // User's email from Discord OAuth
  balance: number;
  totalWagered: number;
  totalWon: number;
  gamesPlayed: number;
  lastDailyBonus?: string; // ISO datetime string
  isModerator: boolean;
  avatarPath?: string;
  chatRulesVersion: number;
  chatRulesAcceptedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GameHistory {
  $id?: string;
  userId: string;
  gameType: 'roulette' | 'stock_market' | 'case_opening';
  betAmount: number;
  winAmount: number;
  resultData: string; // JSON string
  gameDuration?: number;
  createdAt: string;
}

export interface DailyBonus {
  $id?: string;
  userId: string;
  bonusDate: string;
  bonusAmount: number;
  claimedAt: string;
  userBonusKey: string; // Composite: userId_date
}

export interface CaseType {
  $id?: string;
  name: string;
  price: number;
  description: string;
  imageUrl?: string;
  rarityDistribution: string; // JSON string
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TarkovItem {
  $id?: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  baseValue: number;
  category: 'medical' | 'electronics' | 'consumables' | 'valuables' | 'keycards';
  imageUrl?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CaseItemPool {
  $id?: string;
  caseTypeId: string;
  itemId: string;
  weight: number;
  valueMultiplier: number;
  createdAt: string;
  caseItemKey: string; // Composite: caseTypeId_itemId
}

export interface ChatMessage {
  $id?: string;
  userId: string;
  username: string;
  content: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatPresence {
  $id?: string;
  userId: string;
  username: string;
  lastSeen: string;
  isOnline: boolean;
}

export interface AuditLog {
  $id?: string;
  userId?: string;
  action: string;
  resourceType: string;
  timestamp: string;
  success: boolean;
  details?: string; // JSON string containing: resourceId, oldValues, newValues, ipAddress, userAgent, errorMessage, metadata
}

/**
 * Achievement Definition - Global achievement templates
 * These are shared across all users and define what achievements exist
 */
export interface AchievementDefinition {
  $id?: string;
  achievementId: string; // Unique identifier: 'first-case', 'case-opener-10', etc.
  title: string; // Display name: "First Case"
  description: string; // "Open your first case"
  category: 'gameplay' | 'progression' | 'special' | 'social';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  maxProgress: number; // Required progress to unlock (e.g., 10 for "Open 10 cases")
  rewardType: 'currency' | 'title' | 'cosmetic';
  rewardAmount?: number; // Currency amount if rewardType is 'currency'
  rewardItem?: string; // Item identifier if rewardType is 'title' or 'cosmetic'
  isActive: boolean; // Can be used to disable achievements
  createdAt: string; // ISO 8601 datetime
}

/**
 * User Achievement - Per-user progress tracking
 * Each user has their own progress records for each achievement
 */
export interface UserAchievement {
  $id?: string;
  userId: string; // References UserProfile.userId
  achievementId: string; // References AchievementDefinition.achievementId
  progress: number; // Current progress (0 to maxProgress)
  unlocked: boolean; // True when progress >= maxProgress
  unlockedAt?: string; // ISO 8601 datetime when unlocked
  claimed: boolean; // True when reward has been claimed
  claimedAt?: string; // ISO 8601 datetime when reward was claimed
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
  userAchievementKey: string; // Composite unique key: `${userId}_${achievementId}`
}

