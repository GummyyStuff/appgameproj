/**
 * Game Service
 * Handles game history and game-related operations
 */

import { appwriteDb } from './appwrite-database';
import { COLLECTION_IDS, GameHistory } from '../config/collections';
import { ID } from 'node-appwrite';

export interface GameResultData {
  [key: string]: any;
}

export class GameService {
  /**
   * Record a game result
   */
  static async recordGameResult(
    userId: string,
    gameType: 'roulette' | 'blackjack' | 'case_opening',
    betAmount: number,
    winAmount: number,
    resultData: GameResultData,
    gameDuration?: number
  ): Promise<{ success: boolean; gameId?: string; error?: string }> {
    const gameRecord: Omit<GameHistory, '$id'> = {
      userId,
      gameType,
      betAmount,
      winAmount,
      resultData: JSON.stringify(resultData),
      gameDuration,
      createdAt: new Date().toISOString(),
    };

    const { data, error } = await appwriteDb.createDocument<GameHistory>(
      COLLECTION_IDS.GAME_HISTORY,
      gameRecord,
      ID.unique()
    );

    if (error) {
      return { success: false, error };
    }

    return { success: true, gameId: data!.$id };
  }

  /**
   * Get game history for a user
   */
  static async getGameHistory(
    userId: string,
    options: {
      gameType?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const queries = [appwriteDb.equal('userId', userId)];

    if (options.gameType) {
      queries.push(appwriteDb.equal('gameType', options.gameType));
    }

    queries.push(appwriteDb.orderDesc('createdAt'));

    if (options.limit) {
      queries.push(appwriteDb.limit(options.limit));
    }

    if (options.offset) {
      queries.push(appwriteDb.offset(options.offset));
    }

    const { data, total, error } = await appwriteDb.listDocuments<GameHistory>(
      COLLECTION_IDS.GAME_HISTORY,
      queries
    );

    if (error) {
      return { success: false, games: [], total: 0, error };
    }

    // Parse resultData JSON strings
    const games = data.map(game => ({
      ...game,
      result_data: JSON.parse(game.resultData),
    }));

    return { success: true, games, total };
  }

  /**
   * Get game statistics for a specific game type
   */
  static async getGameStatistics(userId: string, gameType?: string) {
    const queries = [appwriteDb.equal('userId', userId)];
    
    if (gameType) {
      queries.push(appwriteDb.equal('gameType', gameType));
    }

    const { data: games, error } = await appwriteDb.listDocuments<GameHistory>(
      COLLECTION_IDS.GAME_HISTORY,
      queries
    );

    if (error || !games) {
      return { success: false, stats: null, error };
    }

    const totalGames = games.length;
    const totalWagered = games.reduce((sum, g) => sum + g.betAmount, 0);
    const totalWon = games.reduce((sum, g) => sum + g.winAmount, 0);
    const wins = games.filter(g => g.winAmount > g.betAmount).length;
    const losses = games.filter(g => g.winAmount < g.betAmount).length;
    const biggestWin = games.length > 0 ? Math.max(...games.map(g => g.winAmount)) : 0;

    return {
      success: true,
      stats: {
        total_games: totalGames,
        total_wagered: totalWagered,
        total_won: totalWon,
        net_profit: totalWon - totalWagered,
        wins,
        losses,
        win_rate: totalGames > 0 ? (wins / totalGames) * 100 : 0,
        biggest_win: biggestWin,
      },
    };
  }

  /**
   * Get recent games (for activity feed)
   */
  static async getRecentGames(limit: number = 10) {
    const { data, error } = await appwriteDb.listDocuments<GameHistory>(
      COLLECTION_IDS.GAME_HISTORY,
      [appwriteDb.orderDesc('createdAt'), appwriteDb.limit(limit)]
    );

    if (error) {
      return { success: false, games: [], error };
    }

    const games = data.map(game => ({
      ...game,
      result_data: JSON.parse(game.resultData),
    }));

    return { success: true, games };
  }
}

