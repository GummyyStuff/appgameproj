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
  gameType: 'roulette' | 'blackjack' | 'case_opening';
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

