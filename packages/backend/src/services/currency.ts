/**
 * Currency Service
 * Handles all virtual currency operations including balance management,
 * atomic transactions, and daily bonuses using Appwrite
 */

import { UserService } from './user-service';
import { GameService } from './game-service';
import { appwriteDb } from './appwrite-database';
import { CacheService } from './cache-service';
import { COLLECTION_IDS, DailyBonus } from '../config/collections';
import { ID } from 'node-appwrite';
import { env } from '../config/env';
import { Sentry, logger, startSpan } from '../lib/sentry';

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
   * Uses Appwrite atomic operations to prevent race conditions.
   * 
   * C1 FIX: Atomic balance operations
   * ==================================
   * Replaced read-modify-write TOCTOU pattern with atomic decrement/increment.
   * - balance is decremented by betAmount atomically (min: 0 prevents overdraft)
   * - balance is incremented by winAmount atomically
   * - stats are incremented atomically
   * No window for concurrent requests to corrupt balance.
   */
  static async processGameTransaction(
    userId: string,
    gameType: 'roulette' | 'blackjack' | 'case_opening' | 'wheel_of_chance',
    betAmount: number,
    winAmount: number,
    gameResultData: any,
    gameDuration?: number
  ) {
    return startSpan(
      { op: "currency.transaction", name: "Process Game Transaction" },
      async (span) => {
        try {
          span?.setAttribute("userId", userId);
          span?.setAttribute("gameType", gameType);
          span?.setAttribute("betAmount", betAmount);
          span?.setAttribute("winAmount", winAmount);
          span?.setAttribute("netAmount", winAmount - betAmount);

          logger.info("Starting game transaction", {
            userId,
            gameType,
            betAmount,
            winAmount,
            netAmount: winAmount - betAmount,
            gameDuration
          });

          if (betAmount <= 0) {
            span?.setStatus({ code: 2 });
            span?.setAttribute("error", "invalid_bet_amount");
            logger.error("Invalid bet amount", { userId, betAmount, gameType });
            throw new Error('Bet amount must be positive');
          }

          if (winAmount < 0) {
            span?.setStatus({ code: 2 });
            span?.setAttribute("error", "invalid_win_amount");
            logger.error("Invalid win amount: negative", { userId, winAmount, gameType });
            throw new Error('Win amount cannot be negative');
          }

          // Verify user exists (read-only, no race concern)
          const profile = await UserService.getUserProfile(userId);
          if (!profile) {
            logger.error("User profile not found", { userId });
            throw new Error('User profile not found');
          }

          const previousBalance = profile.balance;
          span?.setAttribute("currentBalance", previousBalance);

          // C1: Atomic decrement of balance by betAmount (min: 0 prevents negative balance)
          logger.info("Atomically deducting bet", {
            userId,
            profileId: profile.$id,
            betAmount,
          });

          const { data: deductResult, error: deductError } = await appwriteDb.decrementDocumentAttribute(
            COLLECTION_IDS.USERS,
            profile.$id!,
            'balance',
            betAmount,
            0 // min: 0 — atomic check prevents overdraft
          );

          if (deductError || !deductResult) {
            logger.error("Atomic bet deduction failed", {
              userId,
              betAmount,
              error: deductError,
            });
            span?.setStatus({ code: 2 });
            span?.setAttribute("error", "insufficient_balance_atomic");
            throw new Error(
              `Insufficient balance. Required: ${betAmount}`
            );
          }

          // C1: Atomic increment of balance by winAmount
          if (winAmount > 0) {
            const { data: creditResult, error: creditError } = await appwriteDb.incrementDocumentAttribute(
              COLLECTION_IDS.USERS,
              profile.$id!,
              'balance',
              winAmount
            );

            if (creditError || !creditResult) {
              logger.error("Atomic win credit failed", {
                userId,
                winAmount,
                error: creditError,
              });
              // Rollback: restore the bet amount that was deducted
              let rollbackSuccess = false;
              for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                  const { error: rollbackError } = await appwriteDb.incrementDocumentAttribute(
                    COLLECTION_IDS.USERS,
                    profile.$id!,
                    'balance',
                    betAmount
                  );
                  if (!rollbackError) {
                    rollbackSuccess = true;
                    break;
                  }
                } catch (rollbackErr) {
                  logger.warn(`Rollback attempt ${attempt} failed`, { userId, error: rollbackErr });
                }
              }
              if (!rollbackSuccess) {
                logger.error("CRITICAL: Rollback failed after 3 attempts - manual intervention required", {
                  userId,
                  betAmount,
                  winAmount,
                });
              }
              span?.setStatus({ code: 2 });
              throw new Error('Failed to credit winnings');
            }
          }

          // C1: Atomic increment of stats
          await Promise.all([
            appwriteDb.incrementDocumentAttribute(
              COLLECTION_IDS.USERS,
              profile.$id!,
              'totalWagered',
              betAmount
            ),
            appwriteDb.incrementDocumentAttribute(
              COLLECTION_IDS.USERS,
              profile.$id!,
              'totalWon',
              winAmount
            ),
            appwriteDb.incrementDocumentAttribute(
              COLLECTION_IDS.USERS,
              profile.$id!,
              'gamesPlayed',
              1
            ),
          ]).catch((err) => {
            logger.warn('Failed to increment user stats', { userId, error: err.message });
          });

          // Record game in history
          const gameId = ID.unique();

          logger.info("Recording game history", {
            userId,
            gameId,
            gameType,
            betAmount,
            winAmount,
            gameDuration: gameDuration || 0
          });

          await appwriteDb.createDocument(
            COLLECTION_IDS.GAME_HISTORY,
            {
              userId,
              gameType,
              betAmount,
              winAmount,
              resultData: JSON.stringify(gameResultData),
              gameDuration: gameDuration || 0,
            },
            gameId
          );

          // Invalidate caches
          logger.info("Invalidating caches", { userId });

          await Promise.all([
            CacheService.invalidateUserProfile(userId),
            CacheService.invalidateUserBalance(userId),
            CacheService.invalidateUserStats(userId),
          ]);

          // Read final balance from DB for response
          const finalProfile = await UserService.getUserProfile(userId);
          const newBalance = finalProfile?.balance ?? (previousBalance - betAmount + winAmount);
          const netResult = winAmount - betAmount;

          span?.setAttribute("newBalance", newBalance);
          span?.setAttribute("netResult", netResult);
          span?.setAttribute("transactionSuccess", true);
          span?.setStatus({ code: 1 });

          logger.info("Game transaction completed successfully", {
            userId,
            gameType,
            betAmount,
            winAmount,
            netResult,
            previousBalance,
            newBalance,
            gameId
          });

          return {
            success: true,
            newBalance,
            previousBalance,
            netResult,
            gameId,
          };
        } catch (error) {
          span?.setStatus({ code: 2 });
          if (error instanceof Error) {
            span?.setAttribute('error.message', error.message);
            span?.setAttribute('error.name', error.name);
          }
          logger.error("Game transaction failed", {
            userId,
            gameType,
            betAmount,
            winAmount,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        }
      }
    );
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
        { lastDailyBonus: now.toISOString() }
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

  /**
   * Credit balance to user account
   * Used for rewards, bonuses, refunds, etc.
   * 
   * C1 FIX: Uses atomic increment instead of read-modify-write.
   * 
   * @param userId - User ID to credit
   * @param amount - Amount to credit (must be positive)
   * @param reason - Reason for credit (for audit trail)
   * @param metadata - Additional metadata about the credit
   */
  static async creditBalance(
    userId: string,
    amount: number,
    reason: string,
    metadata?: any
  ): Promise<{ success: boolean; newBalance: number; previousBalance: number }> {
    if (amount <= 0) {
      throw new Error('Credit amount must be positive');
    }

    try {
      const profile = await UserService.getUserProfile(userId);
      if (!profile) {
        throw new Error('User not found');
      }

      const previousBalance = profile.balance;

      logger.info("Crediting balance", {
        userId,
        previousBalance,
        amount,
        reason,
        metadata,
      });

      // C1: Atomic increment — no TOCTOU window
      const { data: result, error: incrementError } = await appwriteDb.incrementDocumentAttribute(
        COLLECTION_IDS.USERS,
        profile.$id!,
        'balance',
        amount
      );

      if (incrementError || !result) {
        throw new Error('Failed to update user balance');
      }

      const newBalance = (result as any).balance ?? previousBalance + amount;

      await CacheService.invalidateUserProfile(userId);
      await CacheService.invalidateUserBalance(userId);

      logger.info("Balance credited successfully", {
        userId,
        previousBalance,
        newBalance,
        amount,
      });

      return {
        success: true,
        newBalance,
        previousBalance,
      };
    } catch (error) {
      logger.error('Error crediting balance:', error);
      throw error;
    }
  }
}

