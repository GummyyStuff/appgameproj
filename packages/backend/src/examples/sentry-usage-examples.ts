/**
 * Sentry Usage Examples - Backend
 * 
 * This file demonstrates how to use Sentry in the backend according to .cursorrules
 * These examples should be used as reference - delete this file after reviewing
 */

import * as Sentry from "@sentry/node";
import { startSpan, withSpan, logger, logError } from '../lib/sentry';

// ============================================================
// Example 1: Database Query with Span Tracking
// ============================================================

async function fetchUserProfile(userId: string) {
  return await withSpan(
    "database",
    "Fetch user profile",
    async () => {
      // Your database query here
      const user = await database.users.findOne({ id: userId });
      return user;
    }
  );
}

// ============================================================
// Example 2: Database Query with Attributes
// ============================================================

async function complexDatabaseQuery(filters: any) {
  return await startSpan(
    { 
      op: "database", 
      name: "Complex User Query" 
    },
    async (span) => {
      span?.setAttribute("queryType", "aggregation");
      span?.setAttribute("filterCount", Object.keys(filters).length);
      
      const results = await database.users.aggregate(filters);
      
      span?.setAttribute("rowCount", results.length);
      
      return results;
    }
  );
}

// ============================================================
// Example 3: API Call with Span Tracking
// ============================================================

async function fetchExternalData(apiUrl: string, userId: string) {
  return await startSpan(
    { 
      op: "http.client", 
      name: `POST ${apiUrl}` 
    },
    async (span) => {
      span?.setAttribute("userId", userId);
      span?.setAttribute("apiUrl", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      
      span?.setAttribute("statusCode", response.status);
      
      return await response.json();
    }
  );
}

// ============================================================
// Example 4: Game Logic with Performance Tracking
// ============================================================

async function playGameEndpoint(gameType: string, betAmount: number, userId: string) {
  // Parent span for entire game operation
  return await Sentry.startSpan(
    {
      op: "game.play",
      name: `Play ${gameType}`,
    },
    async (parentSpan) => {
      parentSpan?.setAttribute("gameType", gameType);
      parentSpan?.setAttribute("betAmount", betAmount);
      parentSpan?.setAttribute("userId", userId);
      
      try {
        // Child span 1: Validate bet
        await Sentry.startSpan(
          {
            op: "game.validate",
            name: "Validate Bet",
          },
          async (span) => {
            span?.setAttribute("betAmount", betAmount);
            await validateUserBalance(userId, betAmount);
          }
        );
        
        // Child span 2: Execute game logic
        const result = await Sentry.startSpan(
          {
            op: "game.execute",
            name: "Execute Game",
          },
          async (span) => {
            const gameResult = await executeGame(gameType, betAmount);
            span?.setAttribute("won", gameResult.won);
            span?.setAttribute("payout", gameResult.payout);
            return gameResult;
          }
        );
        
        // Child span 3: Update database
        await Sentry.startSpan(
          {
            op: "database.update",
            name: "Update Balance and Stats",
          },
          async (span) => {
            await updateUserBalance(userId, result.payout);
            await updateGameStatistics(userId, gameType, result);
            span?.setAttribute("balanceUpdated", true);
          }
        );
        
        logger.info("Game completed successfully", {
          userId,
          gameType,
          betAmount,
          won: result.won,
          payout: result.payout
        });
        
        return result;
        
      } catch (error) {
        // Log error with Sentry
        Sentry.captureException(error, {
          extra: {
            userId,
            gameType,
            betAmount,
            operation: "game-play"
          }
        });
        
        logger.error("Game execution failed", {
          userId,
          gameType,
          betAmount,
          error: error instanceof Error ? error.message : String(error)
        });
        
        throw error;
      }
    }
  );
}

// ============================================================
// Example 5: Structured Logging Examples
// ============================================================

async function databaseOperations(userId: string) {
  // Trace level - detailed debugging
  logger.trace("Starting database connection", { 
    database: "users",
    userId 
  });
  
  // Debug with template literal
  logger.debug(logger.fmt`Cache miss for user: ${userId}`);
  
  // Info level - normal operation
  logger.info("Updated profile", { 
    profileId: userId,
    timestamp: new Date().toISOString()
  });
  
  // Warning level
  logger.warn("Rate limit reached for endpoint", {
    endpoint: "/api/game/play",
    userId,
    isEnterprise: false,
  });
  
  // Error level
  logger.error("Failed to process payment", {
    orderId: "order_123",
    amount: 99.99,
    userId,
  });
  
  // Fatal level - critical system error
  logger.fatal("Database connection pool exhausted", {
    database: "users",
    activeConnections: 100,
    maxConnections: 100
  });
}

// ============================================================
// Example 6: Exception Handling in Route Handlers
// ============================================================

async function handleCaseOpening(caseId: string, userId: string) {
  try {
    logger.info("Opening case", { caseId, userId });
    
    // Track performance of case opening
    const result = await withSpan(
      "game.case-opening",
      `Open Case ${caseId}`,
      async () => {
        return await openCase(caseId, userId);
      }
    );
    
    logger.info("Case opened successfully", {
      caseId,
      userId,
      itemReceived: result.item,
      rarity: result.rarity
    });
    
    return result;
    
  } catch (error) {
    // Capture exception with context
    Sentry.captureException(error, {
      extra: {
        caseId,
        userId,
        operation: "case-opening"
      },
      tags: {
        feature: "cases",
        errorType: "case-opening-failed"
      }
    });
    
    logger.error("Failed to open case", {
      caseId,
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
    
    throw error;
  }
}

// ============================================================
// Example 7: Redis Cache Operations with Tracking
// ============================================================

async function getCachedUserData(userId: string) {
  return await startSpan(
    {
      op: "cache.get",
      name: "Get User from Cache",
    },
    async (span) => {
      span?.setAttribute("userId", userId);
      span?.setAttribute("cacheKey", `user:${userId}`);
      
      try {
        const cached = await redis.get(`user:${userId}`);
        
        if (cached) {
          span?.setAttribute("cacheHit", true);
          logger.debug(logger.fmt`Cache hit for user: ${userId}`);
          return JSON.parse(cached);
        } else {
          span?.setAttribute("cacheHit", false);
          logger.debug(logger.fmt`Cache miss for user: ${userId}`);
          
          // Fetch from database
          const user = await fetchUserProfile(userId);
          
          // Store in cache
          await redis.set(`user:${userId}`, JSON.stringify(user), 'EX', 300);
          
          return user;
        }
      } catch (error) {
        span?.setAttribute("cacheError", true);
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}

// ============================================================
// Example 8: Batch Operations with Progress Tracking
// ============================================================

async function processBatchPayouts(payouts: any[]) {
  return await startSpan(
    {
      op: "batch.process",
      name: "Process Batch Payouts",
    },
    async (span) => {
      span?.setAttribute("batchSize", payouts.length);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const payout of payouts) {
        try {
          await processPayoutTransaction(payout);
          successCount++;
        } catch (error) {
          errorCount++;
          logger.error("Payout failed", {
            payoutId: payout.id,
            userId: payout.userId,
            amount: payout.amount,
          });
          
          // Don't throw, continue processing other payouts
          Sentry.captureException(error, {
            extra: { payoutId: payout.id }
          });
        }
      }
      
      span?.setAttribute("successCount", successCount);
      span?.setAttribute("errorCount", errorCount);
      
      logger.info("Batch payouts processed", {
        total: payouts.length,
        successful: successCount,
        failed: errorCount
      });
      
      return { successCount, errorCount };
    }
  );
}

// ============================================================
// Placeholder functions (not real implementations)
// ============================================================

const database: any = {};
const redis: any = {};

async function validateUserBalance(userId: string, amount: number) {}
async function executeGame(gameType: string, betAmount: number) {
  return { won: true, payout: 200 };
}
async function updateUserBalance(userId: string, amount: number) {}
async function updateGameStatistics(userId: string, gameType: string, result: any) {}
async function openCase(caseId: string, userId: string) {
  return { item: "AK-47", rarity: "legendary" };
}
async function processPayoutTransaction(payout: any) {}

export {
  fetchUserProfile,
  complexDatabaseQuery,
  fetchExternalData,
  playGameEndpoint,
  databaseOperations,
  handleCaseOpening,
  getCachedUserData,
  processBatchPayouts,
};

