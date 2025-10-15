/**
 * Achievement Service
 * Handles all achievement-related operations using Appwrite
 */

import { appwriteDb } from './appwrite-database';
import { COLLECTION_IDS, AchievementDefinition, UserAchievement } from '../config/collections';
import { CurrencyService } from './currency';
import { ID, Query } from 'node-appwrite';

export interface AchievementWithProgress {
  id: string;
  title: string;
  description: string;
  category: 'gameplay' | 'progression' | 'special' | 'social';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: string;
  claimed: boolean;
  claimedAt?: string;
  reward?: {
    type: 'currency' | 'title' | 'cosmetic';
    amount?: number;
    item?: string;
  };
}

export class AchievementService {
  /**
   * Get all active achievement definitions
   * Used for populating the achievement list with all possible achievements
   */
  static async getAchievementDefinitions(): Promise<AchievementDefinition[]> {
    const { data, error } = await appwriteDb.listDocuments<AchievementDefinition>(
      COLLECTION_IDS.ACHIEVEMENT_DEFINITIONS,
      [Query.equal('isActive', true)]
    );
    
    if (error) {
      console.error('Error fetching achievement definitions:', error);
      throw new Error('Failed to fetch achievement definitions');
    }
    
    return data || [];
  }

  /**
   * Get a user's achievement progress for all achievements
   * Returns merged data: definitions + user progress
   */
  static async getUserAchievements(userId: string): Promise<AchievementWithProgress[]> {
    // Get all active achievement definitions
    const definitions = await this.getAchievementDefinitions();
    
    // Get user's progress records
    const { data: userProgress } = await appwriteDb.listDocuments<UserAchievement>(
      COLLECTION_IDS.USER_ACHIEVEMENTS,
      [Query.equal('userId', userId)]
    );

    // Create a map for faster lookup
    const progressMap = new Map<string, UserAchievement>();
    userProgress?.forEach(p => progressMap.set(p.achievementId, p));

    // Merge definitions with user progress
    return definitions.map(def => {
      const progress = progressMap.get(def.achievementId);
      
      return {
        id: def.achievementId,
        title: def.title,
        description: def.description,
        category: def.category,
        rarity: def.rarity,
        progress: progress?.progress || 0,
        maxProgress: def.maxProgress,
        unlocked: progress?.unlocked || false,
        unlockedAt: progress?.unlockedAt,
        claimed: progress?.claimed || false,
        claimedAt: progress?.claimedAt,
        reward: {
          type: def.rewardType,
          amount: def.rewardAmount,
          item: def.rewardItem,
        },
      };
    });
  }

  /**
   * Update achievement progress for a user
   * Creates a new record if it doesn't exist, updates if it does
   * Returns whether the achievement was newly unlocked
   */
  static async updateProgress(
    userId: string,
    achievementId: string,
    progressToAdd: number
  ): Promise<{ unlocked: boolean; newlyUnlocked: boolean }> {
    if (progressToAdd <= 0) {
      throw new Error('Progress to add must be positive');
    }

    const userAchievementKey = `${userId}_${achievementId}`;
    
    // Get achievement definition to know maxProgress
    const { data: definitions } = await appwriteDb.listDocuments<AchievementDefinition>(
      COLLECTION_IDS.ACHIEVEMENT_DEFINITIONS,
      [
        Query.equal('achievementId', achievementId),
        Query.equal('isActive', true)
      ]
    );
    
    if (!definitions || definitions.length === 0) {
      throw new Error(`Achievement not found: ${achievementId}`);
    }
    
    const definition = definitions[0];
    
    // Check if user achievement record exists
    const { data: existing } = await appwriteDb.listDocuments<UserAchievement>(
      COLLECTION_IDS.USER_ACHIEVEMENTS,
      [Query.equal('userAchievementKey', userAchievementKey)]
    );
    
    if (existing && existing.length > 0) {
      // Update existing record
      const current = existing[0];
      
      // Don't add progress if already unlocked
      if (current.unlocked) {
        return { unlocked: true, newlyUnlocked: false };
      }
      
      const newProgress = Math.min(current.progress + progressToAdd, definition.maxProgress);
      const nowUnlocked = newProgress >= definition.maxProgress;
      const wasUnlocked = current.unlocked;
      
      const { error } = await appwriteDb.updateDocument(
        COLLECTION_IDS.USER_ACHIEVEMENTS,
        current.$id!,
        {
          progress: newProgress,
          unlocked: nowUnlocked,
          unlockedAt: nowUnlocked && !wasUnlocked ? new Date().toISOString() : current.unlockedAt,
          updatedAt: new Date().toISOString(),
        }
      );
      
      if (error) {
        console.error('Error updating achievement progress:', error);
        throw new Error('Failed to update achievement progress');
      }
      
      return { unlocked: nowUnlocked, newlyUnlocked: nowUnlocked && !wasUnlocked };
    } else {
      // Create new record
      const newProgress = Math.min(progressToAdd, definition.maxProgress);
      const unlocked = newProgress >= definition.maxProgress;
      
      const { error } = await appwriteDb.createDocument(
        COLLECTION_IDS.USER_ACHIEVEMENTS,
        ID.unique(),
        {
          userId,
          achievementId,
          progress: newProgress,
          unlocked,
          unlockedAt: unlocked ? new Date().toISOString() : undefined,
          claimed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userAchievementKey,
        }
      );
      
      if (error) {
        console.error('Error creating user achievement:', error);
        throw new Error('Failed to create user achievement');
      }
      
      return { unlocked, newlyUnlocked: unlocked };
    }
  }

  /**
   * Claim achievement reward
   * Credits currency to user balance and marks achievement as claimed
   */
  static async claimReward(userId: string, achievementId: string): Promise<{
    rewardType: string;
    rewardAmount?: number;
    rewardItem?: string;
  }> {
    const userAchievementKey = `${userId}_${achievementId}`;
    
    // Get user achievement record
    const { data: userAchievements } = await appwriteDb.listDocuments<UserAchievement>(
      COLLECTION_IDS.USER_ACHIEVEMENTS,
      [Query.equal('userAchievementKey', userAchievementKey)]
    );
    
    if (!userAchievements || userAchievements.length === 0) {
      throw new Error('Achievement progress not found');
    }
    
    const userAchievement = userAchievements[0];
    
    // Validate achievement is unlocked
    if (!userAchievement.unlocked) {
      throw new Error('Achievement not unlocked yet');
    }
    
    // Check if already claimed
    if (userAchievement.claimed) {
      throw new Error('Reward already claimed');
    }
    
    // Get achievement definition for reward details
    const { data: definitions } = await appwriteDb.listDocuments<AchievementDefinition>(
      COLLECTION_IDS.ACHIEVEMENT_DEFINITIONS,
      [Query.equal('achievementId', achievementId)]
    );
    
    if (!definitions || definitions.length === 0) {
      throw new Error('Achievement definition not found');
    }
    
    const definition = definitions[0];
    
    // Process currency reward if applicable
    if (definition.rewardType === 'currency' && definition.rewardAmount) {
      await CurrencyService.creditBalance(
        userId,
        definition.rewardAmount,
        'achievement_reward',
        {
          achievementId,
          achievementTitle: definition.title,
        }
      );
    }
    
    // Mark as claimed
    const { error } = await appwriteDb.updateDocument(
      COLLECTION_IDS.USER_ACHIEVEMENTS,
      userAchievement.$id!,
      {
        claimed: true,
        claimedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
    
    if (error) {
      console.error('Error marking achievement as claimed:', error);
      throw new Error('Failed to claim reward');
    }
    
    return {
      rewardType: definition.rewardType,
      rewardAmount: definition.rewardAmount,
      rewardItem: definition.rewardItem,
    };
  }

  /**
   * Batch update multiple achievements at once
   * Useful for tracking game events that affect multiple achievements
   */
  static async batchUpdateProgress(
    userId: string,
    updates: Array<{ achievementId: string; progress: number }>
  ): Promise<{ achievementId: string; newlyUnlocked: boolean }[]> {
    const results = await Promise.all(
      updates.map(async ({ achievementId, progress }) => {
        try {
          const result = await this.updateProgress(userId, achievementId, progress);
          return { achievementId, newlyUnlocked: result.newlyUnlocked };
        } catch (error) {
          console.error(`Failed to update achievement ${achievementId}:`, error);
          return { achievementId, newlyUnlocked: false };
        }
      })
    );
    
    return results.filter(r => r.newlyUnlocked);
  }
}

