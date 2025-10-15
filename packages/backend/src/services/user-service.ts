/**
 * User Service
 * Handles user profile operations using Appwrite with Redis caching
 * 
 * Cache Strategy:
 * - GET operations check cache first, fall back to Appwrite
 * - UPDATE operations invalidate cache
 * - Cache TTL: 5 minutes for profiles, 1 minute for balances
 */

import { appwriteDb } from './appwrite-database';
import { COLLECTION_IDS, UserProfile } from '../config/collections';
import { Permission, Role, ID } from 'node-appwrite';
import { CacheService } from './cache-service';

export class UserService {
  /**
   * Get user profile by user ID (with caching)
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Try cache first
      const cached = await CacheService.getUserProfile(userId);
      if (cached) {
        return cached;
      }

      // Cache miss - query Appwrite
      const { data, error } = await appwriteDb.listDocuments<UserProfile>(
        COLLECTION_IDS.USERS,
        [appwriteDb.equal('userId', userId)]
      );
      
      if (error) {
        console.error('Error querying user profile:', error);
        return null;
      }
      
      if (data && data.length > 0) {
        const profile = data[0];
        
        // Cache the result
        await CacheService.setUserProfile(userId, profile);
        
        return profile;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Get user balance (with caching)
   */
  static async getUserBalance(userId: string): Promise<number> {
    // Try cache first
    const cachedBalance = await CacheService.getUserBalance(userId);
    if (cachedBalance !== null) {
      return cachedBalance;
    }

    // Cache miss - get from profile
    const profile = await this.getUserProfile(userId);
    const balance = profile?.balance ?? 0;
    
    // Cache the balance
    if (profile) {
      await CacheService.setUserBalance(userId, balance);
    }
    
    return balance;
  }

  /**
   * Create user profile (on first login)
   */
  static async createUserProfile(
    userId: string,
    data: {
      username: string;
      displayName?: string;
      email?: string;
      balance?: number;
      avatarUrl?: string;
    }
  ): Promise<UserProfile> {
    // Check if user already exists
    const existing = await this.getUserProfile(userId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const profileData = {
      userId,
      username: data.username,
      displayName: data.displayName || data.username,
      balance: data.balance || 10000, // Starting balance
      totalWagered: 0,
      totalWon: 0,
      gamesPlayed: 0,
      isModerator: false,
      avatarPath: data.avatarUrl || 'defaults/default-avatar.svg',
      chatRulesVersion: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      email: data.email,
    };

    try {
      // Create document using Appwrite SDK
      const { data: createdProfile, error } = await appwriteDb.createDocument<UserProfile>(
        COLLECTION_IDS.USERS,
        profileData,
        undefined, // Let the database service generate a unique ID
        [
          `read("user:${userId}")`,
          `update("user:${userId}")`,
        ]
      );

      if (error) {
        throw new Error(error);
      }

      return createdProfile!;
    } catch (error: any) {
      console.error('Error creating user profile:', error);
      throw new Error(`Failed to create user profile: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Update user profile (invalidates cache)
   */
  static async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
    const profile = await this.getUserProfile(userId);
    if (!profile) {
      return { success: false, error: 'User profile not found' };
    }

    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await appwriteDb.updateDocument<UserProfile>(
      COLLECTION_IDS.USERS,
      profile.$id!,
      updatedData
    );

    if (error) {
      return { success: false, error };
    }

    // Invalidate cache after update
    await CacheService.invalidateUserProfile(userId);
    
    // If balance was updated, invalidate balance cache too
    if (updates.balance !== undefined) {
      await CacheService.invalidateUserBalance(userId);
    }

    return { success: true, profile: data! };
  }

  /**
   * Update user balance (internal use only, with cache invalidation)
   */
  static async updateBalance(
    userId: string,
    newBalance: number
  ): Promise<{ success: boolean; error?: string }> {
    const profile = await this.getUserProfile(userId);
    if (!profile) {
      console.error('❌ User profile not found for userId:', userId);
      return { success: false, error: 'User profile not found' };
    }

    console.log(`💰 Updating balance for user ${userId}:`, {
      currentBalance: profile.balance,
      newBalance,
      documentId: profile.$id
    });

    const { error } = await appwriteDb.updateDocument<UserProfile>(
      COLLECTION_IDS.USERS,
      profile.$id!,
      {
        balance: newBalance,
        updatedAt: new Date().toISOString(),
      }
    );

    if (error) {
      console.error('❌ Failed to update balance in Appwrite:', error);
    } else {
      console.log('✅ Balance updated successfully');
      // Invalidate both caches after successful update
      await Promise.all([
        CacheService.invalidateUserBalance(userId),
        CacheService.invalidateUserProfile(userId),
      ]);
    }

    return { success: !error, error: error || undefined };
  }

  /**
   * BUG FIX #9: Update balance with optimistic locking to prevent race conditions
   * Returns success: true if update succeeded, or versionMismatch: true if balance changed
   */
  static async updateBalanceWithVersion(
    userId: string, 
    newBalance: number, 
    expectedVersion: string
  ): Promise<{ success: boolean; versionMismatch?: boolean; error?: string }> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return { success: false, error: 'User not found' };
      }

      // Check if version (updatedAt) has changed since we read it
      if (profile.updatedAt !== expectedVersion) {
        console.log('⚠️ Version mismatch detected:', {
          expected: expectedVersion,
          actual: profile.updatedAt
        });
        return { success: false, versionMismatch: true };
      }

      // Invalidate cache before updating
      await CacheService.invalidateUserProfile(userId);
      await CacheService.invalidateUserBalance(userId);

      await appwriteDb.updateDocument(
        COLLECTION_IDS.USERS,
        profile.$id!,
        { balance: newBalance }
      );

      return { success: true };
    } catch (error) {
      console.error('Error updating balance with version check:', error);
      return { success: false, error: 'Failed to update balance' };
    }
  }

  /**
   * Increment user statistics (invalidates cache)
   */
  static async incrementStats(
    userId: string,
    wagered: number,
    won: number
  ): Promise<{ success: boolean; error?: string }> {
    const profile = await this.getUserProfile(userId);
    if (!profile) {
      return { success: false, error: 'User profile not found' };
    }

    const { error } = await appwriteDb.updateDocument<UserProfile>(
      COLLECTION_IDS.USERS,
      profile.$id!,
      {
        totalWagered: profile.totalWagered + wagered,
        totalWon: profile.totalWon + won,
        gamesPlayed: profile.gamesPlayed + 1,
        updatedAt: new Date().toISOString(),
      }
    );

    if (!error) {
      // Invalidate user caches after stats update
      await Promise.all([
        CacheService.invalidateUserProfile(userId),
        CacheService.invalidateUserStats(userId),
      ]);
    }

    return { success: !error, error: error || undefined };
  }

  /**
   * Get user statistics (with caching)
   */
  static async getUserStatistics(userId: string) {
    // Try cache first
    const cached = await CacheService.getUserStats(userId);
    if (cached) {
      return cached;
    }

    // Cache miss - compute from database
    const profile = await this.getUserProfile(userId);
    if (!profile) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Get game-specific statistics from game history
    const { data: gameHistory } = await appwriteDb.listDocuments(
      COLLECTION_IDS.GAME_HISTORY,
      [appwriteDb.equal('userId', userId)]
    );

    // Calculate game-specific stats
    const gameStats: Record<string, any> = {};
    
    if (gameHistory) {
      const gamesByType = gameHistory.reduce((acc: any, game: any) => {
        if (!acc[game.gameType]) {
          acc[game.gameType] = [];
        }
        acc[game.gameType].push(game);
        return acc;
      }, {});

      for (const [gameType, games] of Object.entries(gamesByType) as [string, any[]][]) {
        const totalWagered = games.reduce((sum, g) => sum + g.betAmount, 0);
        const totalWon = games.reduce((sum, g) => sum + g.winAmount, 0);
        const wins = games.filter(g => g.winAmount > g.betAmount).length;
        const biggestWin = Math.max(...games.map(g => g.winAmount));

        gameStats[gameType] = {
          games_played: games.length,
          total_wagered: totalWagered,
          total_won: totalWon,
          biggest_win: biggestWin,
          win_rate: games.length > 0 ? (wins / games.length) * 100 : 0,
        };
      }
    }

    const stats = {
      success: true,
      balance: profile.balance,
      total_wagered: profile.totalWagered,
      total_won: profile.totalWon,
      games_played: profile.gamesPlayed,
      net_profit: profile.totalWon - profile.totalWagered,
      member_since: profile.createdAt,
      last_daily_bonus: profile.lastDailyBonus,
      can_claim_bonus: !profile.lastDailyBonus || 
        new Date(profile.lastDailyBonus).toDateString() !== new Date().toDateString(),
      game_statistics: gameStats,
    };

    // Cache the computed stats
    await CacheService.setUserStats(userId, stats);

    return stats;
  }
}


