/**
 * User Service
 * Handles user profile operations using Appwrite
 */

import { appwriteDb } from './appwrite-database';
import { COLLECTION_IDS, UserProfile } from '../config/collections';
import { Permission, Role } from 'node-appwrite';

export class UserService {
  /**
   * Get user profile by user ID
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    // Try to find by userId attribute first
    const { data: users } = await appwriteDb.listDocuments<UserProfile>(
      COLLECTION_IDS.USERS,
      [appwriteDb.equal('userId', userId)]
    );

    if (users && users.length > 0) {
      return users[0];
    }

    return null;
  }

  /**
   * Get user balance
   */
  static async getUserBalance(userId: string): Promise<number> {
    const profile = await this.getUserProfile(userId);
    return profile?.balance ?? 0;
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
    }
  ): Promise<UserProfile> {
    // Check if user already exists
    const existing = await this.getUserProfile(userId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const profileData: Omit<UserProfile, '$id'> = {
      userId,
      username: data.username,
      displayName: data.displayName || data.username,
      email: data.email,
      balance: data.balance || 10000, // Starting balance
      totalWagered: 0,
      totalWon: 0,
      gamesPlayed: 0,
      isModerator: false,
      avatarPath: 'defaults/default-avatar.svg',
      chatRulesVersion: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const { data: createdProfile, error } = await appwriteDb.createDocument<UserProfile>(
      COLLECTION_IDS.USERS,
      profileData,
      userId, // Use userId as document ID for easy lookup
      [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
      ]
    );

    if (error || !createdProfile) {
      throw new Error(`Failed to create user profile: ${error || 'Unknown error'}`);
    }

    return createdProfile;
  }

  /**
   * Update user profile
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

    return { success: true, profile: data! };
  }

  /**
   * Update user balance (internal use only)
   */
  static async updateBalance(
    userId: string,
    newBalance: number
  ): Promise<{ success: boolean; error?: string }> {
    const profile = await this.getUserProfile(userId);
    if (!profile) {
      return { success: false, error: 'User profile not found' };
    }

    const { error } = await appwriteDb.updateDocument<UserProfile>(
      COLLECTION_IDS.USERS,
      profile.$id!,
      {
        balance: newBalance,
        updatedAt: new Date().toISOString(),
      }
    );

    return { success: !error, error: error || undefined };
  }

  /**
   * Increment user statistics
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

    return { success: !error, error: error || undefined };
  }

  /**
   * Get user statistics
   */
  static async getUserStatistics(userId: string) {
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

    return {
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
  }
}

