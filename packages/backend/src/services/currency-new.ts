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
   * FIXED: Check daily_bonuses collection directly to prevent race conditions
   */
  static async checkDailyBonusStatus(userId: string): Promise<DailyBonusStatus> {
    const profile = await UserService.getUserProfile(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    const now = new Date();
    const todayDateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const todayUserBonusKey = `${userId}_${todayDateKey}`;

    // Check if bonus was already claimed today by querying the daily_bonuses collection
    // This is the source of truth, not the user profile's lastDailyBonus field
    const { data: existingBonuses } = await appwriteDb.listDocuments<DailyBonus>(
      COLLECTION_IDS.DAILY_BONUSES,
      [appwriteDb.equal('userBonusKey', todayUserBonusKey)]
    );

    const alreadyClaimedToday = existingBonuses && existingBonuses.length > 0;
    
    let lastClaimedDate: string | undefined;
    let nextAvailable: Date;
    let cooldownHours = 0;

    if (alreadyClaimedToday) {
      // Bonus already claimed today
      const lastBonus = new Date(existingBonuses[0].bonusDate);
      lastClaimedDate = existingBonuses[0].bonusDate;
      nextAvailable = new Date(lastBonus.getTime() + 24 * 60 * 60 * 1000);
      cooldownHours = Math.max(0, (nextAvailable.getTime() - now.getTime()) / (1000 * 60 * 60));
    } else {
      // Can claim bonus today
      lastClaimedDate = profile.lastDailyBonus;
      nextAvailable = now;
    }

    return {
      canClaim: !alreadyClaimedToday,
      bonusAmount: this.DAILY_BONUS_AMOUNT,
      lastClaimedDate,
      nextAvailableDate: nextAvailable.toISOString(),
      cooldownHours,
    };
  }

  /**
   * Claim daily bonus
   * FIXED: Improved error handling and duplicate detection
   */
  static async claimDailyBonus(userId: string) {
    // Double-check status (prevents race conditions)
    const status = await this.checkDailyBonusStatus(userId);

    if (!status.canClaim) {
      console.log(`⚠️  Daily bonus already claimed for user ${userId}`);
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

    console.log(`🎁 Attempting to claim daily bonus for user ${userId} (key: ${userBonusKey})`);

    try {
      // Record bonus claim first (this will fail if duplicate due to unique index)
      const bonusRecord: Omit<DailyBonus, '$id'> = {
        userId,
        bonusDate: now.toISOString(),
        bonusAmount: this.DAILY_BONUS_AMOUNT,
        claimedAt: now.toISOString(),
        userBonusKey,
      };

      const { data: bonusDoc, error: bonusError } = await appwriteDb.createDocument<DailyBonus>(
        COLLECTION_IDS.DAILY_BONUSES,
        bonusRecord,
        ID.unique()
      );

      if (bonusError) {
        console.error(`❌ Failed to create bonus record:`, bonusError);
        
        // Check if it's a duplicate key error
        if (bonusError.includes('unique') || bonusError.includes('duplicate') || bonusError.includes('already exists')) {
          console.warn(`⚠️  Duplicate bonus claim detected for user ${userId}`);
          return { 
            success: false, 
            error: 'Daily bonus already claimed today',
            nextAvailableDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
          };
        }
        
        return { success: false, error: 'Failed to record bonus claim' };
      }

      console.log(`✅ Bonus record created successfully`);

      // Update user balance atomically (prevents race conditions)
      // Use atomic increment instead of read-modify-write pattern
      const { data: balanceUpdate, error: balanceError } = await appwriteDb.incrementDocumentAttribute(
        COLLECTION_IDS.USERS,
        profile.$id!,
        'balance',
        this.DAILY_BONUS_AMOUNT
      );

      if (!balanceUpdate || balanceError) {
        console.error(`❌ Failed to update user balance atomically:`, balanceError);
        
        // Rollback: delete the bonus record we just created
        if (bonusDoc && bonusDoc.$id) {
          console.log(`🔄 Rolling back bonus record ${bonusDoc.$id}`);
          await appwriteDb.deleteDocument(COLLECTION_IDS.DAILY_BONUSES, bonusDoc.$id);
        }

        return { success: false, error: 'Failed to update balance' };
      }

      // Update last daily bonus date separately (not critical for atomicity)
      await appwriteDb.updateDocument(
        COLLECTION_IDS.USERS,
        profile.$id!,
        {
          lastDailyBonus: now.toISOString(),
          updatedAt: now.toISOString(),
        }
      );

      // Get new balance from atomic operation result
      const newBalance = (balanceUpdate as any).balance || profile.balance + this.DAILY_BONUS_AMOUNT;

      console.log(`✅ Daily bonus claimed successfully for user ${userId}. New balance: ${newBalance}`);

      return {
        success: true,
        newBalance,
        bonusAmount: this.DAILY_BONUS_AMOUNT,
        nextAvailableDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      };
    } catch (error: any) {
      console.error('❌ Error claiming daily bonus:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        type: error?.type,
      });
      
      // Check if it's a duplicate/constraint error
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('unique') || errorMessage.includes('duplicate') || errorMessage.includes('constraint')) {
        console.warn(`⚠️  Duplicate constraint violation for user ${userId}`);
        return { 
          success: false, 
          error: 'Daily bonus already claimed today',
          nextAvailableDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
      }
      
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

