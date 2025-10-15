/**
 * Sentry Usage Examples
 * 
 * This file demonstrates how to use Sentry according to the .cursorrules
 * These examples should be used as reference - delete this file after reviewing
 */

import * as Sentry from "@sentry/react";
import { startSpan, logger, logError } from '../lib/sentry';

// ============================================================
// Example 1: Custom Span Instrumentation in Component Actions
// ============================================================

function CoinFlipGameComponent() {
  const handlePlayButtonClick = (betAmount: number) => {
    // Create a transaction/span to measure performance
    startSpan(
      {
        op: "ui.click",
        name: "Play Coinflip Button Click",
      },
      (span) => {
        const gameType = "coinflip";
        const selectedSide = "heads";

        // Metrics can be added to the span
        span?.setAttribute("gameType", gameType);
        span?.setAttribute("betAmount", betAmount);
        span?.setAttribute("selectedSide", selectedSide);

        // Your game logic here
        playCoinflipGame(betAmount, selectedSide);
      },
    );
  };

  return (
    <button type="button" onClick={() => handlePlayButtonClick(100)}>
      Play Coinflip
    </button>
  );
}

// ============================================================
// Example 2: Custom Span Instrumentation in API Calls
// ============================================================

async function fetchUserData(userId: string) {
  return startSpan(
    {
      op: "http.client",
      name: `GET /api/users/${userId}`,
    },
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      return data;
    },
  );
}

// ============================================================
// Example 3: Using Sentry Logger with Structured Logging
// ============================================================

async function processPayment(orderId: string, amount: number, userId: string) {
  try {
    // Trace level - for detailed debugging
    logger.trace("Starting payment processing", { 
      orderId, 
      amount,
      userId 
    });
    
    // Debug with template literal
    logger.debug(logger.fmt`Processing payment for user: ${userId}`);
    
    // Simulate payment processing
    const result = await processPaymentAPI(orderId, amount);
    
    // Info level - successful operation
    logger.info("Payment processed successfully", { 
      orderId, 
      amount,
      transactionId: result.transactionId 
    });
    
    return result;
    
  } catch (error) {
    // Error level - operation failed
    logger.error("Failed to process payment", {
      orderId,
      amount,
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Also capture the exception
    Sentry.captureException(error);
    
    throw error;
  }
}

// ============================================================
// Example 4: Rate Limiting Warning
// ============================================================

function checkRateLimit(endpoint: string, isEnterprise: boolean) {
  const rateLimitReached = true; // Your rate limit logic
  
  if (rateLimitReached) {
    logger.warn("Rate limit reached for endpoint", {
      endpoint: endpoint,
      isEnterprise: isEnterprise,
    });
  }
}

// ============================================================
// Example 5: Fatal Error Logging
// ============================================================

async function initializeDatabaseConnection() {
  try {
    const connection = await connectToDatabase();
    
    if (connection.activeConnections >= connection.maxConnections) {
      logger.fatal("Database connection pool exhausted", {
        database: "users",
        activeConnections: connection.activeConnections,
        maxConnections: connection.maxConnections
      });
      
      throw new Error("Database connection pool exhausted");
    }
    
    return connection;
    
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

// ============================================================
// Example 6: Exception Tracking in Try-Catch
// ============================================================

async function openCaseWithTracking(caseId: string, userId: string) {
  try {
    logger.info("Opening case", { caseId, userId });
    
    const result = await openCase(caseId, userId);
    
    logger.info("Case opened successfully", { 
      caseId, 
      userId,
      itemReceived: result.item 
    });
    
    return result;
    
  } catch (error) {
    // Use Sentry.captureException to capture the exception
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
// Example 7: Nested Spans (Parent-Child Relationship)
// ============================================================

async function playGameWithDetailedTracking(gameType: string, betAmount: number) {
  // Parent span
  return Sentry.startSpan(
    {
      op: "game.play",
      name: `Play ${gameType}`,
    },
    async (parentSpan) => {
      parentSpan?.setAttribute("gameType", gameType);
      parentSpan?.setAttribute("betAmount", betAmount);
      
      // Child span 1: Validate bet
      await Sentry.startSpan(
        {
          op: "game.validate",
          name: "Validate Bet",
        },
        async (childSpan) => {
          childSpan?.setAttribute("betAmount", betAmount);
          await validateBet(betAmount);
        }
      );
      
      // Child span 2: Execute game logic
      const result = await Sentry.startSpan(
        {
          op: "game.execute",
          name: "Execute Game Logic",
        },
        async (childSpan) => {
          childSpan?.setAttribute("gameType", gameType);
          return await executeGameLogic(gameType);
        }
      );
      
      // Child span 3: Update balance
      await Sentry.startSpan(
        {
          op: "game.update-balance",
          name: "Update User Balance",
        },
        async (childSpan) => {
          childSpan?.setAttribute("won", result.won);
          childSpan?.setAttribute("payout", result.payout);
          await updateBalance(result);
        }
      );
      
      return result;
    }
  );
}

// ============================================================
// Example 8: Console Logging Integration (Automatic)
// ============================================================

function exampleWithConsoleLogging() {
  // These will automatically be sent to Sentry in production
  // because we have consoleLoggingIntegration enabled
  
  console.log("User logged in successfully");
  console.warn("Session about to expire");
  console.error("Failed to load user preferences");
  
  // Note: In development, these just log to console
  // In production, they're also sent to Sentry
}

// ============================================================
// Placeholder functions (not real implementations)
// ============================================================

function playCoinflipGame(betAmount: number, selectedSide: string) {}
async function processPaymentAPI(orderId: string, amount: number) {
  return { transactionId: "tx_123" };
}
async function connectToDatabase() {
  return { activeConnections: 100, maxConnections: 100 };
}
async function openCase(caseId: string, userId: string) {
  return { item: "AK-47" };
}
async function validateBet(betAmount: number) {}
async function executeGameLogic(gameType: string) {
  return { won: true, payout: 200 };
}
async function updateBalance(result: any) {}

export {
  CoinFlipGameComponent,
  fetchUserData,
  processPayment,
  checkRateLimit,
  initializeDatabaseConnection,
  openCaseWithTracking,
  playGameWithDetailedTracking,
  exampleWithConsoleLogging,
};

