/**
 * Statistics Service for Appwrite
 * Provides comprehensive statistics calculation and data visualization preparation
 * Migrated from Supabase to use Appwrite collections
 */

import { appwriteDb } from './appwrite-database';
import { COLLECTION_IDS } from '../config/collections';
import { GameService } from './game-service';

export interface GameStatistics {
  totalGames: number;
  totalWagered: number;
  totalWon: number;
  netProfit: number;
  winRate: number;
  biggestWin: number;
  biggestLoss: number;
  averageBet: number;
  averageWin: number;
  profitMargin: number;
}

export interface TimeSeriesData {
  date: string;
  games: number;
  wagered: number;
  won: number;
  profit: number;
}

export interface GameTypeBreakdown {
  gameType: string;
  statistics: GameStatistics;
  recentTrend: 'up' | 'down' | 'stable';
  popularityRank: number;
}

export interface StatisticsFilters {
  gameType?: 'roulette' | 'blackjack' | 'case_opening';
  dateFrom?: string;
  dateTo?: string;
  minBet?: number;
  maxBet?: number;
  winOnly?: boolean;
  lossOnly?: boolean;
}

export interface AdvancedStatistics {
  overview: GameStatistics;
  gameBreakdown: GameTypeBreakdown[];
  timeSeriesData: TimeSeriesData[];
  winStreaks: {
    current: number;
    longest: number;
    longestLoss: number;
  };
  betPatterns: {
    mostCommonBet: number;
    betDistribution: { range: string; count: number; percentage: number }[];
  };
  playingHabits: {
    mostActiveHour: number;
    mostActiveDay: string;
    averageSessionLength: number;
    totalPlayTime: number;
  };
}

interface GameHistoryDocument {
  $id: string;
  userId: string;
  gameType: 'roulette' | 'blackjack' | 'case_opening';
  betAmount: number;
  winAmount: number;
  resultData: string;
  gameDuration?: number;
  createdAt: string;
}

export class StatisticsServiceAppwrite {
  /**
   * Get comprehensive user statistics with data visualization preparation
   */
  static async getAdvancedStatistics(
    userId: string,
    filters: StatisticsFilters = {}
  ): Promise<AdvancedStatistics> {
    const gameHistory = await this.getFilteredGameHistory(userId, filters);
    
    if (gameHistory.length === 0) {
      return this.getEmptyStatistics();
    }

    const overview = this.calculateOverviewStatistics(gameHistory);
    const gameBreakdown = this.calculateGameTypeBreakdown(gameHistory);
    const timeSeriesData = this.calculateTimeSeriesData(gameHistory);
    const winStreaks = this.calculateWinStreaks(gameHistory);
    const betPatterns = this.calculateBetPatterns(gameHistory);
    const playingHabits = this.calculatePlayingHabits(gameHistory);

    return {
      overview,
      gameBreakdown,
      timeSeriesData,
      winStreaks,
      betPatterns,
      playingHabits
    };
  }

  /**
   * Get filtered game history based on criteria
   */
  static async getFilteredGameHistory(
    userId: string,
    filters: StatisticsFilters
  ): Promise<GameHistoryDocument[]> {
    // Build queries array
    const queries = [appwriteDb.equal('userId', userId)];

    // Apply filters
    if (filters.gameType) {
      queries.push(appwriteDb.equal('gameType', filters.gameType));
    }

    if (filters.dateFrom) {
      queries.push(appwriteDb.greaterThanEqual('createdAt', filters.dateFrom));
    }

    if (filters.dateTo) {
      queries.push(appwriteDb.lessThanEqual('createdAt', filters.dateTo));
    }

    if (filters.minBet) {
      queries.push(appwriteDb.greaterThanEqual('betAmount', filters.minBet));
    }

    if (filters.maxBet) {
      queries.push(appwriteDb.lessThanEqual('betAmount', filters.maxBet));
    }

    if (filters.winOnly) {
      queries.push(appwriteDb.greaterThan('winAmount', 0));
    }

    if (filters.lossOnly) {
      queries.push(appwriteDb.equal('winAmount', 0));
    }

    // Add ordering and limit
    queries.push(appwriteDb.orderDesc('createdAt'));
    queries.push(appwriteDb.limit(1000)); // Reasonable limit for statistics

    const { data, error } = await appwriteDb.listDocuments<GameHistoryDocument>(
      COLLECTION_IDS.GAME_HISTORY,
      queries
    );

    if (error || !data) {
      console.error('Error fetching filtered game history:', error);
      return [];
    }

    return data;
  }

  /**
   * Calculate overview statistics
   */
  static calculateOverviewStatistics(games: GameHistoryDocument[]): GameStatistics {
    if (games.length === 0) {
      return this.getEmptyGameStatistics();
    }

    const totalGames = games.length;
    const totalWagered = games.reduce((sum, game) => sum + game.betAmount, 0);
    const totalWon = games.reduce((sum, game) => sum + game.winAmount, 0);
    const netProfit = totalWon - totalWagered;
    const wins = games.filter(game => game.winAmount > game.betAmount).length;
    const winRate = (wins / totalGames) * 100;
    const biggestWin = games.length > 0 ? Math.max(...games.map(game => game.winAmount)) : 0;
    const biggestLoss = games.length > 0 ? Math.max(...games.map(game => game.betAmount - game.winAmount)) : 0;
    const averageBet = totalWagered / totalGames;
    const averageWin = totalWon / totalGames;
    const profitMargin = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0;

    return {
      totalGames,
      totalWagered,
      totalWon,
      netProfit,
      winRate,
      biggestWin,
      biggestLoss,
      averageBet,
      averageWin,
      profitMargin
    };
  }

  /**
   * Calculate game type breakdown with trends
   */
  static calculateGameTypeBreakdown(games: GameHistoryDocument[]): GameTypeBreakdown[] {
    const gameTypes = ['roulette', 'blackjack', 'case_opening'] as const;
    const breakdown: GameTypeBreakdown[] = [];

    gameTypes.forEach((gameType, index) => {
      const gameTypeGames = games.filter(game => game.gameType === gameType);
      const statistics = this.calculateOverviewStatistics(gameTypeGames);
      
      // Calculate recent trend (last 10 games vs previous 10)
      const recentGames = gameTypeGames.slice(0, 10);
      const previousGames = gameTypeGames.slice(10, 20);
      const recentProfit = recentGames.reduce((sum, game) => sum + (game.winAmount - game.betAmount), 0);
      const previousProfit = previousGames.reduce((sum, game) => sum + (game.winAmount - game.betAmount), 0);
      
      let recentTrend: 'up' | 'down' | 'stable' = 'stable';
      if (recentProfit > previousProfit * 1.1) recentTrend = 'up';
      else if (recentProfit < previousProfit * 0.9) recentTrend = 'down';

      breakdown.push({
        gameType,
        statistics,
        recentTrend,
        popularityRank: index + 1 // Simple ranking for now
      });
    });

    // Sort by total games played for actual popularity ranking
    breakdown.sort((a, b) => b.statistics.totalGames - a.statistics.totalGames);
    breakdown.forEach((item, index) => {
      item.popularityRank = index + 1;
    });

    return breakdown;
  }

  /**
   * Calculate time series data for charts
   */
  static calculateTimeSeriesData(games: GameHistoryDocument[]): TimeSeriesData[] {
    const dailyData = new Map<string, TimeSeriesData>();

    games.forEach(game => {
      const date = new Date(game.createdAt).toISOString().split('T')[0];
      
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          games: 0,
          wagered: 0,
          won: 0,
          profit: 0
        });
      }

      const dayData = dailyData.get(date)!;
      dayData.games += 1;
      dayData.wagered += game.betAmount;
      dayData.won += game.winAmount;
      dayData.profit += (game.winAmount - game.betAmount);
    });

    return Array.from(dailyData.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30); // Last 30 days
  }

  /**
   * Calculate win/loss streaks
   */
  static calculateWinStreaks(games: GameHistoryDocument[]) {
    let currentStreak = 0;
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    // Sort games by date (oldest first) for streak calculation
    const sortedGames = [...games].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sortedGames.forEach(game => {
      const isWin = game.winAmount > game.betAmount;

      if (isWin) {
        tempWinStreak += 1;
        tempLossStreak = 0;
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
      } else {
        tempLossStreak += 1;
        tempWinStreak = 0;
        longestLossStreak = Math.max(longestLossStreak, tempLossStreak);
      }
    });

    // Calculate current streak from most recent games
    for (let i = 0; i < Math.min(games.length, 10); i++) {
      const game = games[i];
      const isWin = game.winAmount > game.betAmount;
      
      if (i === 0) {
        currentStreak = isWin ? 1 : -1;
      } else {
        const prevWin = currentStreak > 0;
        if ((isWin && prevWin) || (!isWin && !prevWin)) {
          currentStreak = isWin ? currentStreak + 1 : currentStreak - 1;
        } else {
          break;
        }
      }
    }

    return {
      current: currentStreak,
      longest: longestWinStreak,
      longestLoss: longestLossStreak
    };
  }

  /**
   * Calculate betting patterns
   */
  static calculateBetPatterns(games: GameHistoryDocument[]) {
    const betAmounts = games.map(game => game.betAmount);
    const betCounts = new Map<number, number>();

    betAmounts.forEach(amount => {
      betCounts.set(amount, (betCounts.get(amount) || 0) + 1);
    });

    const mostCommonBet = Array.from(betCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

    // Create bet distribution ranges
    const ranges = [
      { min: 0, max: 10, label: '1-10' },
      { min: 11, max: 50, label: '11-50' },
      { min: 51, max: 100, label: '51-100' },
      { min: 101, max: 500, label: '101-500' },
      { min: 501, max: 1000, label: '501-1000' },
      { min: 1001, max: Infinity, label: '1000+' }
    ];

    const betDistribution = ranges.map(range => {
      const count = betAmounts.filter(amount => 
        amount >= range.min && amount <= range.max
      ).length;
      const percentage = games.length > 0 ? (count / games.length) * 100 : 0;

      return {
        range: range.label,
        count,
        percentage: Math.round(percentage * 100) / 100
      };
    }).filter(item => item.count > 0);

    return {
      mostCommonBet,
      betDistribution
    };
  }

  /**
   * Calculate playing habits and patterns
   */
  static calculatePlayingHabits(games: GameHistoryDocument[]) {
    const hours = games.map(game => new Date(game.createdAt).getHours());
    const days = games.map(game => new Date(game.createdAt).toLocaleDateString('en-US', { weekday: 'long' }));
    
    // Most active hour
    const hourCounts = new Map<number, number>();
    hours.forEach(hour => {
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });
    const mostActiveHour = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

    // Most active day
    const dayCounts = new Map<string, number>();
    days.forEach(day => {
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    });
    const mostActiveDay = Array.from(dayCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Monday';

    // Calculate session data (games within 1 hour of each other are considered same session)
    const sessions = this.calculateSessions(games);
    const averageSessionLength = sessions.length > 0 
      ? sessions.reduce((sum, session) => sum + session.duration, 0) / sessions.length 
      : 0;
    const totalPlayTime = sessions.reduce((sum, session) => sum + session.duration, 0);

    return {
      mostActiveHour,
      mostActiveDay,
      averageSessionLength: Math.round(averageSessionLength),
      totalPlayTime: Math.round(totalPlayTime)
    };
  }

  /**
   * Calculate gaming sessions
   */
  static calculateSessions(games: GameHistoryDocument[]) {
    if (games.length === 0) return [];

    const sortedGames = [...games].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const sessions: { start: Date; end: Date; games: number; duration: number }[] = [];
    let currentSession = {
      start: new Date(sortedGames[0].createdAt),
      end: new Date(sortedGames[0].createdAt),
      games: 1
    };

    for (let i = 1; i < sortedGames.length; i++) {
      const gameTime = new Date(sortedGames[i].createdAt);
      const timeDiff = gameTime.getTime() - currentSession.end.getTime();
      
      // If more than 1 hour gap, start new session
      if (timeDiff > 60 * 60 * 1000) {
        sessions.push({
          ...currentSession,
          duration: (currentSession.end.getTime() - currentSession.start.getTime()) / (1000 * 60) // minutes
        });
        
        currentSession = {
          start: gameTime,
          end: gameTime,
          games: 1
        };
      } else {
        currentSession.end = gameTime;
        currentSession.games += 1;
      }
    }

    // Add the last session
    sessions.push({
      ...currentSession,
      duration: (currentSession.end.getTime() - currentSession.start.getTime()) / (1000 * 60) // minutes
    });

    return sessions;
  }

  /**
   * Get leaderboard with enhanced statistics
   */
  static async getLeaderboard(
    metric: 'balance' | 'totalWon' | 'gamesPlayed' | 'totalWagered' = 'balance',
    limit: number = 10
  ) {
    try {
      // Map metric to actual attribute name
      const attributeMap = {
        balance: 'balance',
        totalWon: 'totalWon',
        gamesPlayed: 'gamesPlayed',
        totalWagered: 'totalWagered'
      };

      const attribute = attributeMap[metric];

      const queries = [
        appwriteDb.orderDesc(attribute),
        appwriteDb.limit(limit)
      ];

      const { data, error } = await appwriteDb.listDocuments(
        COLLECTION_IDS.USERS,
        queries
      );

      if (error || !data) {
        console.error('Error fetching leaderboard:', error);
        return [];
      }

      return data.map((user: any, index: number) => ({
        rank: index + 1,
        userId: user.userId,
        username: user.username,
        value: user[attribute],
        balance: user.balance,
        totalWagered: user.totalWagered,
        totalWon: user.totalWon,
        gamesPlayed: user.gamesPlayed
      }));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  /**
   * Get global game statistics for admin/analytics
   */
  static async getGlobalStatistics(days: number = 30) {
    try {
      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const queries = [
        appwriteDb.greaterThanEqual('createdAt', dateFrom),
        appwriteDb.limit(10000) // Large limit for global stats
      ];

      const { data, error } = await appwriteDb.listDocuments<GameHistoryDocument>(
        COLLECTION_IDS.GAME_HISTORY,
        queries
      );

      if (error) {
        console.error('Error fetching global statistics:', error);
        throw new Error(`Failed to fetch global statistics: ${error}`);
      }

      // Handle empty data (no games played yet)
      const games = data || [];
      const overview = this.calculateOverviewStatistics(games);
      const gameBreakdown = this.calculateGameTypeBreakdown(games);
      const timeSeriesData = this.calculateTimeSeriesData(games);

      return {
        overview,
        gameBreakdown,
        timeSeriesData,
        totalUsers: await this.getTotalActiveUsers(),
        period: `${days} days`
      };
    } catch (error) {
      console.error('Global statistics error:', error);
      throw error;
    }
  }

  /**
   * Get total active users count
   */
  static async getTotalActiveUsers(): Promise<number> {
    try {
      const { data, total, error } = await appwriteDb.listDocuments(
        COLLECTION_IDS.USERS,
        [appwriteDb.equal('isActive', true)]
      );

      if (error) {
        console.error('Error counting active users:', error);
        return 0;
      }

      // Return total count from Appwrite's response
      return total || 0;
    } catch (error) {
      console.error('Error counting active users:', error);
      return 0;
    }
  }

  /**
   * Helper methods
   */
  static getEmptyStatistics(): AdvancedStatistics {
    return {
      overview: this.getEmptyGameStatistics(),
      gameBreakdown: [],
      timeSeriesData: [],
      winStreaks: { current: 0, longest: 0, longestLoss: 0 },
      betPatterns: { mostCommonBet: 0, betDistribution: [] },
      playingHabits: { mostActiveHour: 0, mostActiveDay: 'Monday', averageSessionLength: 0, totalPlayTime: 0 }
    };
  }

  static getEmptyGameStatistics(): GameStatistics {
    return {
      totalGames: 0,
      totalWagered: 0,
      totalWon: 0,
      netProfit: 0,
      winRate: 0,
      biggestWin: 0,
      biggestLoss: 0,
      averageBet: 0,
      averageWin: 0,
      profitMargin: 0
    };
  }
}

// Export as default and named export for compatibility
export const StatisticsService = StatisticsServiceAppwrite;
export default StatisticsServiceAppwrite;

