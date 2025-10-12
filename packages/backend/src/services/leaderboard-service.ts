/**
 * Leaderboard Service
 * ===================
 * 
 * Redis-powered leaderboards for real-time player rankings
 * Uses Redis sorted sets for O(log N) performance
 * 
 * Leaderboards:
 * - Daily winners (resets daily)
 * - Weekly winners (resets weekly)
 * - All-time winners
 * - Biggest wins (single game)
 * - Most games played
 * 
 * All methods gracefully fall back if Redis is unavailable
 */

import { redisService } from './redis-service';
import { UserService } from './user-service';
import { config } from '../config/env';

// Leaderboard key prefixes
const LEADERBOARD_KEYS = {
  DAILY_WINS: 'leaderboard:daily:wins',
  WEEKLY_WINS: 'leaderboard:weekly:wins',
  ALL_TIME_WINS: 'leaderboard:alltime:wins',
  BIGGEST_WIN: 'leaderboard:biggest_win',
  MOST_GAMES: 'leaderboard:most_games',
  DAILY_PROFIT: 'leaderboard:daily:profit',
  WEEKLY_PROFIT: 'leaderboard:weekly:profit',
};

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName?: string;
  avatarPath?: string;
  score: number;
  rank: number;
}

export class LeaderboardService {
  // ===================
  // UPDATE LEADERBOARDS
  // ===================

  /**
   * Update leaderboards after a win
   */
  static async updateAfterWin(userId: string, winAmount: number): Promise<void> {
    if (!redisService.isAvailable()) {
      return;
    }

    // Update all relevant leaderboards
    await Promise.all([
      redisService.zadd(LEADERBOARD_KEYS.DAILY_WINS, winAmount, userId),
      redisService.zadd(LEADERBOARD_KEYS.WEEKLY_WINS, winAmount, userId),
      redisService.zadd(LEADERBOARD_KEYS.ALL_TIME_WINS, winAmount, userId),
    ]);

    // Update biggest win if this is larger
    const currentBiggest = await redisService.zscore(LEADERBOARD_KEYS.BIGGEST_WIN, userId);
    if (!currentBiggest || winAmount > currentBiggest) {
      await redisService.zadd(LEADERBOARD_KEYS.BIGGEST_WIN, winAmount, userId);
    }
  }

  /**
   * Update profit leaderboards
   */
  static async updateProfit(userId: string, profit: number): Promise<void> {
    if (!redisService.isAvailable()) {
      return;
    }

    await Promise.all([
      redisService.zadd(LEADERBOARD_KEYS.DAILY_PROFIT, profit, userId),
      redisService.zadd(LEADERBOARD_KEYS.WEEKLY_PROFIT, profit, userId),
    ]);
  }

  /**
   * Increment games played counter
   */
  static async incrementGamesPlayed(userId: string): Promise<void> {
    if (!redisService.isAvailable()) {
      return;
    }

    // Get current count and increment
    const current = await redisService.zscore(LEADERBOARD_KEYS.MOST_GAMES, userId) || 0;
    await redisService.zadd(LEADERBOARD_KEYS.MOST_GAMES, current + 1, userId);
  }

  // ===================
  // GET LEADERBOARDS
  // ===================

  /**
   * Get top winners (daily)
   */
  static async getDailyWinners(limit: number = 10): Promise<LeaderboardEntry[]> {
    return await this.getLeaderboard(LEADERBOARD_KEYS.DAILY_WINS, limit);
  }

  /**
   * Get top winners (weekly)
   */
  static async getWeeklyWinners(limit: number = 10): Promise<LeaderboardEntry[]> {
    return await this.getLeaderboard(LEADERBOARD_KEYS.WEEKLY_WINS, limit);
  }

  /**
   * Get top winners (all-time)
   */
  static async getAllTimeWinners(limit: number = 10): Promise<LeaderboardEntry[]> {
    return await this.getLeaderboard(LEADERBOARD_KEYS.ALL_TIME_WINS, limit);
  }

  /**
   * Get biggest single wins
   */
  static async getBiggestWins(limit: number = 10): Promise<LeaderboardEntry[]> {
    return await this.getLeaderboard(LEADERBOARD_KEYS.BIGGEST_WIN, limit);
  }

  /**
   * Get most active players (by games played)
   */
  static async getMostActiveUsers(limit: number = 10): Promise<LeaderboardEntry[]> {
    return await this.getLeaderboard(LEADERBOARD_KEYS.MOST_GAMES, limit);
  }

  /**
   * Get daily profit leaders
   */
  static async getDailyProfitLeaders(limit: number = 10): Promise<LeaderboardEntry[]> {
    return await this.getLeaderboard(LEADERBOARD_KEYS.DAILY_PROFIT, limit);
  }

  /**
   * Get weekly profit leaders
   */
  static async getWeeklyProfitLeaders(limit: number = 10): Promise<LeaderboardEntry[]> {
    return await this.getLeaderboard(LEADERBOARD_KEYS.WEEKLY_PROFIT, limit);
  }

  // ===================
  // USER RANKINGS
  // ===================

  /**
   * Get user's rank in daily winners
   */
  static async getUserDailyRank(userId: string): Promise<number | null> {
    return await redisService.zrevrank(LEADERBOARD_KEYS.DAILY_WINS, userId);
  }

  /**
   * Get user's rank in weekly winners
   */
  static async getUserWeeklyRank(userId: string): Promise<number | null> {
    return await redisService.zrevrank(LEADERBOARD_KEYS.WEEKLY_WINS, userId);
  }

  /**
   * Get user's rank in all-time winners
   */
  static async getUserAllTimeRank(userId: string): Promise<number | null> {
    return await redisService.zrevrank(LEADERBOARD_KEYS.ALL_TIME_WINS, userId);
  }

  /**
   * Get user's score in a leaderboard
   */
  static async getUserScore(leaderboardKey: string, userId: string): Promise<number | null> {
    return await redisService.zscore(leaderboardKey, userId);
  }

  /**
   * Get all user rankings
   */
  static async getUserRankings(userId: string): Promise<{
    dailyRank: number | null;
    weeklyRank: number | null;
    allTimeRank: number | null;
    biggestWinRank: number | null;
    dailyScore: number | null;
    weeklyScore: number | null;
    allTimeScore: number | null;
  }> {
    if (!redisService.isAvailable()) {
      return {
        dailyRank: null,
        weeklyRank: null,
        allTimeRank: null,
        biggestWinRank: null,
        dailyScore: null,
        weeklyScore: null,
        allTimeScore: null,
      };
    }

    const [
      dailyRank,
      weeklyRank,
      allTimeRank,
      biggestWinRank,
      dailyScore,
      weeklyScore,
      allTimeScore,
    ] = await Promise.all([
      redisService.zrevrank(LEADERBOARD_KEYS.DAILY_WINS, userId),
      redisService.zrevrank(LEADERBOARD_KEYS.WEEKLY_WINS, userId),
      redisService.zrevrank(LEADERBOARD_KEYS.ALL_TIME_WINS, userId),
      redisService.zrevrank(LEADERBOARD_KEYS.BIGGEST_WIN, userId),
      redisService.zscore(LEADERBOARD_KEYS.DAILY_WINS, userId),
      redisService.zscore(LEADERBOARD_KEYS.WEEKLY_WINS, userId),
      redisService.zscore(LEADERBOARD_KEYS.ALL_TIME_WINS, userId),
    ]);

    return {
      dailyRank,
      weeklyRank,
      allTimeRank,
      biggestWinRank,
      dailyScore,
      weeklyScore,
      allTimeScore,
    };
  }

  // ===================
  // MAINTENANCE
  // ===================

  /**
   * Reset daily leaderboards (call at midnight)
   */
  static async resetDailyLeaderboards(): Promise<void> {
    if (!redisService.isAvailable()) {
      return;
    }

    console.log('🔄 Resetting daily leaderboards...');
    
    await Promise.all([
      redisService.del(LEADERBOARD_KEYS.DAILY_WINS),
      redisService.del(LEADERBOARD_KEYS.DAILY_PROFIT),
    ]);
    
    console.log('✅ Daily leaderboards reset');
  }

  /**
   * Reset weekly leaderboards (call on Sunday midnight)
   */
  static async resetWeeklyLeaderboards(): Promise<void> {
    if (!redisService.isAvailable()) {
      return;
    }

    console.log('🔄 Resetting weekly leaderboards...');
    
    await Promise.all([
      redisService.del(LEADERBOARD_KEYS.WEEKLY_WINS),
      redisService.del(LEADERBOARD_KEYS.WEEKLY_PROFIT),
    ]);
    
    console.log('✅ Weekly leaderboards reset');
  }

  // ===================
  // INTERNAL HELPERS
  // ===================

  /**
   * Get leaderboard with user details
   */
  private static async getLeaderboard(
    key: string,
    limit: number
  ): Promise<LeaderboardEntry[]> {
    if (!redisService.isAvailable()) {
      return [];
    }

    try {
      // Get top N users with scores
      const results = await redisService.zrevrange(key, 0, limit - 1, true);
      
      if (results.length === 0) {
        return [];
      }

      // Parse results (format: [user1, score1, user2, score2, ...])
      const entries: LeaderboardEntry[] = [];
      
      for (let i = 0; i < results.length; i += 2) {
        const userId = results[i];
        const score = parseFloat(results[i + 1]);
        const rank = (i / 2) + 1;

        // Fetch user details
        const profile = await UserService.getUserProfile(userId);
        
        entries.push({
          userId,
          username: profile?.username || 'Unknown Player',
          displayName: profile?.displayName,
          avatarPath: profile?.avatarPath,
          score,
          rank,
        });
      }

      return entries;
    } catch (error) {
      console.error(`Error fetching leaderboard ${key}:`, error);
      return [];
    }
  }
}

// Schedule daily reset at midnight
if (config.redisEnabled) {
  const scheduleDailyReset = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(async () => {
      await LeaderboardService.resetDailyLeaderboards();
      
      // Check if it's Sunday for weekly reset
      if (tomorrow.getDay() === 0) {
        await LeaderboardService.resetWeeklyLeaderboards();
      }
      
      // Schedule next day
      scheduleDailyReset();
    }, msUntilMidnight);
    
    console.log(`⏰ Daily leaderboard reset scheduled for ${tomorrow.toLocaleString()}`);
  };
  
  scheduleDailyReset();
}

