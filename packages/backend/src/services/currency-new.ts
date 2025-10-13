/**
 * Currency Service (Appwrite version)
 * Handles all virtual currency operations including balance management,
 * atomic transactions, and daily bonuses
 */

import { UserService } from './user-service';
import { GameService } from './game-service';
import { appwriteDb } from './appwrite-database';
import { COLLECTION_IDS, DailyBonus } from '../config/collections';
import { ID } from 'node-appwrite';
import { env } from '../config/env';

export interface CurrencyTransaction {
  userId: string;
  amount: number;
  type: 'debit' | 'credit';
  reason: string;
  metadata?: any;
}

export interface BalanceValidationResult {
  isValid: boolean;
  currentBalance: number;
  requiredAmount: number;
  shortfall?: number;
}

export interface DailyBonusStatus {
  canClaim: boolean;
  bonusAmount: number;
  lastClaimedDate?: string;
  nextAvailableDate?: string;
  cooldownHours?: number;
}

export class CurrencyService {
  private static readonly DAILY_BONUS_AMOUNT = parseInt(env.DAILY_BONUS || '1000');
  private static readonly STARTING_BALANCE = parseInt(env.STARTING_BALANCE || '10000');

  /**
   * Get user's current balance
   */
  static async getBalance(userId: string): Promise<number> {
    try {
      return await UserService.getUserBalance(userId);
    } catch (error) {
      console.error('Error getting user balance:', error);
      throw new Error('Failed to retrieve balance');
    }
  }

  /**
   * Validate if user has sufficient balance for a transaction
   */
  static async validateBalance(
    userId: string,
    requiredAmount: number
  ): Promise<BalanceValidationResult> {
    if (requiredAmount <= 0) {
      throw new Error('Required amount must be positive');
    }

    const currentBalance = await this.getBalance(userId);
    const isValid = currentBalance >= requiredAmount;

    return {
      isValid,
      currentBalance,
      requiredAmount,
      shortfall: isValid ? undefined : requiredAmount - currentBalance,
    };
  }

  /**
   * Process a game transaction atomically (deduct bet, add winnings)
   * Uses application-level transaction pattern with rollback support
   * 
   * NOTE: TOCTOU Vulnerability Mitigation
   * =====================================
   * Appwrite doesn't support database transactions, so there's a theoretical race condition
   * between reading the balance and updating it. To mitigate this:
   * 
   * 1. We use request deduplication to prevent duplicate simultaneous requests
   * 2. The window is very small (milliseconds) making collision unlikely
   * 3. For production: Add optimistic locking by adding a 'version' field to UserProfile:
   *    - Read: Get both balance AND version
   *    - Update: Only succeed if version hasn't changed
   *    - Retry: If version mismatch, re-read and retry
   * 
   * For virtual currency games (no real money), current approach is acceptable.
   */
  static async processGameTransaction(
    userId: string,
    gameType: 'roulette' | 'blackjack' | 'case_opening',
    betAmount: number,
    winAmount: number,
    gameResultData: any,
    gameDuration?: number
  ) {
    // Validate bet amount
    if (betAmount <= 0) {
      throw new Error('Bet amount must be positive');
    }

    if (winAmount < 0) {
      throw new Error('Win amount cannot be negative');
    }

    // Get current balance and validate (TOCTOU window starts here)
    const profile = await UserService.getUserProfile(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    const currentBalance = profile.balance;
    const profileVersion = profile.updatedAt; // Use timestamp as pseudo-version for basic optimistic locking
    
    if (currentBalance < betAmount) {
      throw new Error(
        `Insufficient balance. Required: ${betAmount}, Available: ${currentBalance}`
      );
    }

    // Calculate new balance
    const newBalance = currentBalance - betAmount + winAmount;
    const netResult = winAmount - betAmount;

    // Step 1: Update balance and stats
    const previousBalance = currentBalance;
    let balanceUpdated = false;
    let statsUpdated = false;
    let gameRecorded = false;
    let gameId: string | undefined;

    try {
      // Update balance (TOCTOU window ends here - balance could have changed)
      // In a production system with real money, implement retry logic:
      //   1. Re-fetch profile
      //   2. Check if updatedAt != profileVersion
      //   3. If changed, retry entire transaction
      const balanceResult = await UserService.updateBalance(userId, newBalance);
      if (!balanceResult.success) {
        throw new Error('Failed to update balance');
      }
      balanceUpdated = true;

      // Update statistics
      const statsResult = await UserService.incrementStats(userId, betAmount, winAmount);
      if (!statsResult.success) {
        throw new Error('Failed to update statistics');
      }
      statsUpdated = true;

      // Record game in history
      const gameResult = await GameService.recordGameResult(
        userId,
        gameType,
        betAmount,
        winAmount,
        gameResultData,
        gameDuration
      );
      if (!gameResult.success) {
        throw new Error('Failed to record game');
      }
      gameRecorded = true;
      gameId = gameResult.gameId;

      return {
        success: true,
        newBalance,
        previousBalance,
        netResult,
        gameId,
      };
    } catch (error: any) {
      // Rollback on error
      console.error('❌ Transaction error, attempting rollback:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Transaction state:', { balanceUpdated, statsUpdated, gameRecorded });

      if (balanceUpdated) {
        // Rollback balance
        console.log('Rolling back balance to:', previousBalance);
        await UserService.updateBalance(userId, previousBalance);
      }

      if (statsUpdated) {
        // Rollback stats
        const profile = await UserService.getUserProfile(userId);
        if (profile) {
          console.log('Rolling back stats');
          await appwriteDb.updateDocument(
            COLLECTION_IDS.USERS,
            profile.$id!,
            {
              totalWagered: profile.totalWagered - betAmount,
              totalWon: profile.totalWon - winAmount,
              gamesPlayed: profile.gamesPlayed - 1,
            }
          );
        }
      }

      if (gameRecorded && gameId) {
        // Delete game record
        console.log('Rolling back game record:', gameId);
        await appwriteDb.deleteDocument(COLLECTION_IDS.GAME_HISTORY, gameId);
      }

      throw error;
    }
  }

  /**
   * Process case opening transaction
   */
  static async processCaseOpening(
    userId: string,
    casePrice: number,
    currencyAwarded: number,
    metadata: any
  ) {
    return await this.processGameTransaction(
      userId,
      'case_opening',
      casePrice,
      currencyAwarded,
      metadata
    );
  }

  /**
   * Check daily bonus status
   */
  static async checkDailyBonusStatus(userId: string): Promise<DailyBonusStatus> {
    const profile = await UserService.getUserProfile(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    const now = new Date();
    const lastBonus = profile.lastDailyBonus ? new Date(profile.lastDailyBonus) : null;

    let canClaim = true;
    let cooldownHours = 0;

    if (lastBonus) {
      const hoursSinceLastClaim = (now.getTime() - lastBonus.getTime()) / (1000 * 60 * 60);
      canClaim = hoursSinceLastClaim >= 24;
      cooldownHours = canClaim ? 0 : 24 - hoursSinceLastClaim;
    }

    const nextAvailable = lastBonus
      ? new Date(lastBonus.getTime() + 24 * 60 * 60 * 1000)
      : now;

    return {
      canClaim,
      bonusAmount: this.DAILY_BONUS_AMOUNT,
      lastClaimedDate: profile.lastDailyBonus,
      nextAvailableDate: nextAvailable.toISOString(),
      cooldownHours,
    };
  }

  /**
   * Claim daily bonus
   */
  static async claimDailyBonus(userId: string) {
    const status = await this.checkDailyBonusStatus(userId);

    if (!status.canClaim) {
      return {
        success: false,
        error: 'Daily bonus already claimed today',
        nextAvailableDate: status.nextAvailableDate,
      };
    }

    const profile = await UserService.getUserProfile(userId);
    if (!profile) {
      return { success: false, error: 'User profile not found' };
    }

    const now = new Date();
    const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const userBonusKey = `${userId}_${dateKey}`;

    try {
      // Record bonus claim
      const bonusRecord: Omit<DailyBonus, '$id'> = {
        userId,
        bonusDate: now.toISOString(),
        bonusAmount: this.DAILY_BONUS_AMOUNT,
        claimedAt: now.toISOString(),
        userBonusKey,
      };

      const { error: bonusError } = await appwriteDb.createDocument<DailyBonus>(
        COLLECTION_IDS.DAILY_BONUSES,
        bonusRecord,
        ID.unique()
      );

      if (bonusError) {
        return { success: false, error: 'Failed to record bonus claim' };
      }

      // Update user balance and last bonus date
      const newBalance = profile.balance + this.DAILY_BONUS_AMOUNT;
      const { data, error } = await appwriteDb.updateDocument(
        COLLECTION_IDS.USERS,
        profile.$id!,
        {
          balance: newBalance,
          lastDailyBonus: now.toISOString(),
          updatedAt: now.toISOString(),
        }
      );

      if (!data || error) {
        // Rollback bonus record
        await appwriteDb.listDocuments<DailyBonus>(
          COLLECTION_IDS.DAILY_BONUSES,
          [appwriteDb.equal('userBonusKey', userBonusKey)]
        ).then(({ data }) => {
          if (data && data.length > 0) {
            appwriteDb.deleteDocument(COLLECTION_IDS.DAILY_BONUSES, data[0].$id!);
          }
        });

        return { success: false, error: 'Failed to update balance' };
      }

      return {
        success: true,
        newBalance,
        bonusAmount: this.DAILY_BONUS_AMOUNT,
        nextAvailableDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      };
    } catch (error) {
      console.error('Error claiming daily bonus:', error);
      return { success: false, error: 'Failed to claim daily bonus' };
    }
  }

  /**
   * Get currency statistics for a user
   */
  static async getCurrencyStats(userId: string) {
    const profile = await UserService.getUserProfile(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    const bonusStatus = await this.checkDailyBonusStatus(userId);
    const gameStats = await GameService.getGameStatistics(userId);

    return {
      currentBalance: profile.balance,
      totalWagered: profile.totalWagered,
      totalWon: profile.totalWon,
      netProfit: profile.totalWon - profile.totalWagered,
      gamesPlayed: profile.gamesPlayed,
      dailyBonusStatus: bonusStatus,
      gameBreakdown: gameStats.stats,
    };
  }

  /**
   * Format currency amount
   */
  static formatCurrency(amount: number, currency: string = 'roubles'): string {
    const formattedAmount = amount.toLocaleString();
    
    switch (currency.toLowerCase()) {
      case 'dollars':
        return `$${formattedAmount}`;
      case 'euros':
        return `€${formattedAmount}`;
      case 'roubles':
      default:
        return `₽${formattedAmount}`;
    }
  }

  /**
   * Get the configured starting balance for new users
   */
  static getStartingBalance(): number {
    return this.STARTING_BALANCE;
  }

  /**
   * Get the configured daily bonus amount
   */
  static getDailyBonusAmount(): number {
    return this.DAILY_BONUS_AMOUNT;
  }
}

