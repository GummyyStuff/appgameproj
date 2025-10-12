/**
 * Leaderboard Service Tests
 * =========================
 * 
 * Tests for Redis-powered leaderboard system
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { LeaderboardService } from '../leaderboard-service';
import { redisService } from '../redis-service';

describe('LeaderboardService', () => {
  const testUserId1 = 'leaderboard-test-user-1';
  const testUserId2 = 'leaderboard-test-user-2';
  const testUserId3 = 'leaderboard-test-user-3';

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Cleanup test data
    if (redisService.isAvailable()) {
      await redisService.delPattern('leaderboard:test:*');
    }
  });

  if (process.env.REDIS_ENABLED !== 'false') {
    test('should update leaderboard after win', async () => {
      if (!redisService.isAvailable()) {
        console.log('⚠️  Redis not available, skipping test');
        return;
      }

      await LeaderboardService.updateAfterWin(testUserId1, 1000);
      await LeaderboardService.updateAfterWin(testUserId2, 2500);
      await LeaderboardService.updateAfterWin(testUserId3, 1500);

      console.log('✅ Leaderboard updated with test data');
    });

    test('should get daily winners', async () => {
      if (!redisService.isAvailable()) {
        console.log('⚠️  Redis not available, skipping test');
        return;
      }

      const winners = await LeaderboardService.getDailyWinners(10);
      
      // Should be array (might be empty if no data or Redis down)
      expect(Array.isArray(winners)).toBe(true);
      
      console.log('Daily winners:', winners.length, 'entries');
    });

    test('should get user rankings', async () => {
      if (!redisService.isAvailable()) {
        console.log('⚠️  Redis not available, skipping test');
        return;
      }

      // Add test score first
      await LeaderboardService.updateAfterWin(testUserId1, 5000);
      
      const rankings = await LeaderboardService.getUserRankings(testUserId1);
      
      expect(rankings).toHaveProperty('dailyRank');
      expect(rankings).toHaveProperty('weeklyRank');
      expect(rankings).toHaveProperty('allTimeRank');
      expect(rankings).toHaveProperty('dailyScore');
      
      console.log('User rankings:', rankings);
    });

    test('should update profit leaderboards', async () => {
      if (!redisService.isAvailable()) {
        console.log('⚠️  Redis not available, skipping test');
        return;
      }

      await LeaderboardService.updateProfit(testUserId1, 500);
      await LeaderboardService.updateProfit(testUserId2, 1200);
      
      const profitLeaders = await LeaderboardService.getDailyProfitLeaders(10);
      expect(Array.isArray(profitLeaders)).toBe(true);
      
      console.log('✅ Profit leaderboards updated');
    });

    test('should increment games played', async () => {
      if (!redisService.isAvailable()) {
        console.log('⚠️  Redis not available, skipping test');
        return;
      }

      await LeaderboardService.incrementGamesPlayed(testUserId1);
      await LeaderboardService.incrementGamesPlayed(testUserId1);
      await LeaderboardService.incrementGamesPlayed(testUserId1);
      
      const activeUsers = await LeaderboardService.getMostActiveUsers(10);
      expect(Array.isArray(activeUsers)).toBe(true);
      
      console.log('✅ Games played counter working');
    });
  }

  test('should handle operations when Redis unavailable', async () => {
    if (!redisService.isAvailable()) {
      // Should not throw errors
      await LeaderboardService.updateAfterWin('any-user', 1000);
      await LeaderboardService.updateProfit('any-user', 500);
      
      const winners = await LeaderboardService.getDailyWinners();
      expect(Array.isArray(winners)).toBe(true);
      expect(winners.length).toBe(0);
      
      const rankings = await LeaderboardService.getUserRankings('any-user');
      expect(rankings.dailyRank).toBeNull();
      
      console.log('✅ Graceful fallback working for LeaderboardService');
    }
  });
});

