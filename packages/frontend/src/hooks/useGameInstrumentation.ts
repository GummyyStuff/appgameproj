import { useCallback } from 'react';
import { startSpan } from '../../lib/sentry';
import { trackGameMetrics, trackUserMetrics, trackPaymentMetrics } from '../utils/spanMetrics';

/**
 * Game Instrumentation Hooks
 * 
 * Provides React hooks for instrumenting game-specific operations with Sentry.
 * These hooks automatically track business metrics, performance data, and user context.
 */

export interface GameInstrumentationProps {
  userId?: string;
  userMetrics?: {
    subscriptionTier: 'free' | 'premium' | 'vip';
    totalSpent: number;
    gamesPlayed: number;
    accountAge: number;
    deviceType: 'mobile' | 'desktop' | 'tablet';
  };
}

/**
 * Hook for instrumenting roulette game operations
 */
export function useRouletteInstrumentation({ userId, userMetrics }: GameInstrumentationProps) {
  const trackSpin = useCallback(async (
    betAmount: number,
    betType: 'red' | 'black' | 'green' | 'number',
    betValue?: number,
    callback?: () => Promise<any>
  ) => {
    return trackGameMetrics(
      'Roulette Spin',
      {
        gameType: 'roulette',
        betAmount,
        currency: 'USD',
        playerLevel: userMetrics?.totalSpent > 1000 ? 'expert' : 
                   userMetrics?.totalSpent > 100 ? 'intermediate' : 'beginner',
        sessionDuration: 0, // This would be calculated from session start
        winRate: 0, // This would be calculated from recent games
      },
      async () => {
        return startSpan(
          {
            op: 'game.roulette.spin',
            name: 'Roulette Spin Action'
          },
          async (span) => {
            span?.setAttribute('roulette.bet_amount', betAmount);
            span?.setAttribute('roulette.bet_type', betType);
            if (betValue !== undefined) {
              span?.setAttribute('roulette.bet_value', betValue);
            }
            span?.setAttribute('roulette.odds', 
              betType === 'green' ? 35 : 
              betType === 'number' ? 35 : 1
            );
            
            if (userId) {
              span?.setAttribute('user.id', userId);
            }
            
            const result = callback ? await callback() : null;
            
            // Add result metrics if available
            if (result && typeof result === 'object') {
              if ('win' in result) {
                span?.setAttribute('roulette.result', result.win ? 'win' : 'lose');
              }
              if ('payout' in result) {
                span?.setAttribute('roulette.payout', result.payout);
              }
            }
            
            return result;
          }
        );
      }
    );
  }, [userId, userMetrics]);

  const trackBetPlacement = useCallback(async (
    betAmount: number,
    callback?: () => Promise<any>
  ) => {
    return startSpan(
      {
        op: 'game.roulette.bet',
        name: 'Place Roulette Bet'
      },
      async (span) => {
        span?.setAttribute('roulette.bet_amount', betAmount);
        span?.setAttribute('business.transaction_value', betAmount);
        
        if (userId) {
          span?.setAttribute('user.id', userId);
        }
        
        return callback ? await callback() : null;
      }
    );
  }, [userId]);

  return { trackSpin, trackBetPlacement };
}

/**
 * Hook for instrumenting stock market game operations
 */
export function useStockMarketInstrumentation({ userId, userMetrics }: GameInstrumentationProps) {
  const trackTrade = useCallback(async (
    symbol: string,
    action: 'buy' | 'sell',
    quantity: number,
    price: number,
    callback?: () => Promise<any>
  ) => {
    return trackGameMetrics(
      'Stock Market Trade',
      {
        gameType: 'stock-market',
        betAmount: quantity * price,
        currency: 'USD',
        playerLevel: userMetrics?.totalSpent > 1000 ? 'expert' : 
                   userMetrics?.totalSpent > 100 ? 'intermediate' : 'beginner',
        sessionDuration: 0,
        winRate: 0,
      },
      async () => {
        return startSpan(
          {
            op: 'game.stock.trade',
            name: 'Stock Market Trade'
          },
          async (span) => {
            span?.setAttribute('stock.symbol', symbol);
            span?.setAttribute('stock.action', action);
            span?.setAttribute('stock.quantity', quantity);
            span?.setAttribute('stock.price', price);
            span?.setAttribute('stock.total_value', quantity * price);
            span?.setAttribute('stock.timestamp', Date.now());
            
            if (userId) {
              span?.setAttribute('user.id', userId);
            }
            
            const result = callback ? await callback() : null;
            
            // Add result metrics if available
            if (result && typeof result === 'object') {
              if ('success' in result) {
                span?.setAttribute('stock.success', result.success);
              }
              if ('newBalance' in result) {
                span?.setAttribute('stock.new_balance', result.newBalance);
              }
            }
            
            return result;
          }
        );
      }
    );
  }, [userId, userMetrics]);

  const trackPortfolioUpdate = useCallback(async (
    portfolioValue: number,
    callback?: () => Promise<any>
  ) => {
    return startSpan(
      {
        op: 'game.stock.portfolio',
        name: 'Portfolio Update'
      },
      async (span) => {
        span?.setAttribute('stock.portfolio_value', portfolioValue);
        span?.setAttribute('business.portfolio_value', portfolioValue);
        
        if (userId) {
          span?.setAttribute('user.id', userId);
        }
        
        return callback ? await callback() : null;
      }
    );
  }, [userId]);

  return { trackTrade, trackPortfolioUpdate };
}

/**
 * Hook for instrumenting case opening operations
 */
export function useCaseOpeningInstrumentation({ userId, userMetrics }: GameInstrumentationProps) {
  const trackCaseOpen = useCallback(async (
    caseId: string,
    casePrice: number,
    callback?: () => Promise<any>
  ) => {
    return trackGameMetrics(
      'Case Opening',
      {
        gameType: 'case-opening',
        betAmount: casePrice,
        currency: 'USD',
        playerLevel: userMetrics?.totalSpent > 1000 ? 'expert' : 
                   userMetrics?.totalSpent > 100 ? 'intermediate' : 'beginner',
        sessionDuration: 0,
        winRate: 0,
      },
      async () => {
        return startSpan(
          {
            op: 'game.case.open',
            name: 'Open Case'
          },
          async (span) => {
            span?.setAttribute('case.id', caseId);
            span?.setAttribute('case.price', casePrice);
            span?.setAttribute('case.timestamp', Date.now());
            
            if (userId) {
              span?.setAttribute('user.id', userId);
            }
            
            const result = callback ? await callback() : null;
            
            // Add result metrics if available
            if (result && typeof result === 'object') {
              if ('item' in result) {
                span?.setAttribute('case.item_name', result.item?.name || 'unknown');
                span?.setAttribute('case.item_rarity', result.item?.rarity || 'unknown');
                span?.setAttribute('case.item_value', result.item?.value || 0);
              }
              if ('profit' in result) {
                span?.setAttribute('case.profit', result.profit);
                span?.setAttribute('case.roi', (result.profit / casePrice) * 100);
              }
            }
            
            return result;
          }
        );
      }
    );
  }, [userId, userMetrics]);

  const trackCasePurchase = useCallback(async (
    caseId: string,
    casePrice: number,
    callback?: () => Promise<any>
  ) => {
    return trackPaymentMetrics(
      'Case Purchase',
      {
        amount: casePrice,
        currency: 'USD',
        paymentMethod: 'virtual_currency',
        processingTime: 0,
        success: true,
        userId: userId || 'anonymous',
        gameType: 'case-opening',
      },
      async () => {
        return startSpan(
          {
            op: 'game.case.purchase',
            name: 'Purchase Case'
          },
          async (span) => {
            span?.setAttribute('case.id', caseId);
            span?.setAttribute('case.price', casePrice);
            span?.setAttribute('business.transaction_value', casePrice);
            
            if (userId) {
              span?.setAttribute('user.id', userId);
            }
            
            return callback ? await callback() : null;
          }
        );
      }
    );
  }, [userId]);

  return { trackCaseOpen, trackCasePurchase };
}

/**
 * Hook for instrumenting user authentication operations
 */
export function useAuthInstrumentation({ userId, userMetrics }: GameInstrumentationProps) {
  const trackLogin = useCallback(async (
    method: 'email' | 'google' | 'discord',
    callback?: () => Promise<any>
  ) => {
    return trackUserMetrics(
      'User Login',
      {
        userId: userId || 'anonymous',
        subscriptionTier: userMetrics?.subscriptionTier || 'free',
        totalSpent: userMetrics?.totalSpent || 0,
        gamesPlayed: userMetrics?.gamesPlayed || 0,
        accountAge: userMetrics?.accountAge || 0,
        deviceType: userMetrics?.deviceType || 'desktop',
      },
      async () => {
        return startSpan(
          {
            op: 'auth.login',
            name: 'User Login'
          },
          async (span) => {
            span?.setAttribute('auth.method', method);
            span?.setAttribute('auth.timestamp', Date.now());
            
            if (userId) {
              span?.setAttribute('user.id', userId);
            }
            
            return callback ? await callback() : null;
          }
        );
      }
    );
  }, [userId, userMetrics]);

  const trackLogout = useCallback(async (callback?: () => Promise<any>) => {
    return startSpan(
      {
        op: 'auth.logout',
        name: 'User Logout'
      },
      async (span) => {
        span?.setAttribute('auth.timestamp', Date.now());
        
        if (userId) {
          span?.setAttribute('user.id', userId);
        }
        
        return callback ? await callback() : null;
      }
    );
  }, [userId]);

  return { trackLogin, trackLogout };
}

/**
 * Hook for instrumenting balance operations
 */
export function useBalanceInstrumentation({ userId }: GameInstrumentationProps) {
  const trackBalanceChange = useCallback(async (
    operation: 'deposit' | 'withdraw' | 'win' | 'loss',
    amount: number,
    newBalance: number,
    callback?: () => Promise<any>
  ) => {
    return startSpan(
      {
        op: 'balance.change',
        name: `Balance ${operation}`
      },
      async (span) => {
        span?.setAttribute('balance.operation', operation);
        span?.setAttribute('balance.amount', amount);
        span?.setAttribute('balance.new_balance', newBalance);
        span?.setAttribute('balance.timestamp', Date.now());
        span?.setAttribute('business.transaction_value', amount);
        
        if (userId) {
          span?.setAttribute('user.id', userId);
        }
        
        return callback ? await callback() : null;
      }
    );
  }, [userId]);

  return { trackBalanceChange };
}
