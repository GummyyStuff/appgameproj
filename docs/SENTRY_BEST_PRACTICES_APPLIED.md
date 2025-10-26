# Sentry Best Practices Applied - Based on Industry Standards

## Overview

This document outlines the comprehensive Sentry implementation for the Tarkov Casino application, following industry best practices from Sentry's official documentation and 2024 standards.

## Implementation Summary

### ✅ What's Been Implemented

#### 1. **Frontend Roulette Game** (`packages/frontend/src/pages/RoulettePage.tsx`)

**Spans for Performance Tracking:**
```typescript
// Main bet placement span
return Sentry.startSpan(
  {
    op: 'ui.action',
    name: 'Roulette Bet Placement'
  },
  async (span) => {
    span?.setAttribute('bet_type', currentBet.betType);
    span?.setAttribute('bet_value', currentBet.betValue);
    span?.setAttribute('bet_amount', betAmount);
    // ... rest of implementation
  }
);

// HTTP API call span
const response = await Sentry.startSpan(
  {
    op: 'http.client',
    name: 'POST /api/games/roulette/bet'
  },
  async (span) => {
    span?.setAttribute('http.method', 'POST');
    span?.setAttribute('http.url', '/api/games/roulette/bet');
    // ... fetch call
  }
);
```

**Breadcrumbs for Context:**
```typescript
// Before API call
Sentry.addBreadcrumb({
  category: 'http',
  message: 'POST /api/games/roulette/bet',
  level: 'info',
  data: { bet_type: currentBet.betType, bet_amount: betAmount }
});

// On successful bet
Sentry.addBreadcrumb({
  category: 'user',
  message: 'Roulette bet placed successfully',
  level: 'info',
  data: {
    winning_number: result.game_result.winning_number,
    win_amount: result.win_amount,
    new_balance: result.new_balance
  }
});
```

**Error Tracking with Context:**
```typescript
catch (err) {
  Sentry.captureException(err, {
    tags: {
      game: 'roulette',
      action: 'bet_placement'
    },
    extra: {
      bet_type: currentBet.betType,
      bet_amount: betAmount,
      user_balance: balance
    }
  });
}
```

#### 2. **Backend Roulette API Route** (`packages/backend/src/routes/games.ts`)

**Database Query Span:**
```typescript
const balance = await startSpan(
  {
    op: 'db.query',
    name: 'Get User Balance'
  },
  async (span) => {
    span?.setAttribute('db.operation', 'GET_BALANCE');
    span?.setAttribute('db.user_id', user.id);
    return await CurrencyService.getBalance(user.id);
  }
);
```

**Nested Spans for Complex Operations:**
```typescript
await startSpan(
  {
    op: 'game.roulette',
    name: 'Roulette Bet Placement'
  },
  async (gameSpan) => {
    gameSpan?.setAttribute('game.type', 'roulette');
    gameSpan?.setAttribute('game.bet_type', betType);
    gameSpan?.setAttribute('game.user_id', user.id);
    
    // Nested span for broadcast
    await startSpan(
      { op: 'realtime.broadcast', name: 'Broadcast Game Start' },
      async (broadcastSpan) => {
        broadcastSpan?.setAttribute('event.type', 'game_start');
        return await realtimeGameService.handleRouletteGameStart(user.id, amount, betType, betValue);
      }
    );
    
    // Nested span for game play
    const result = await startSpan(
      { op: 'game.play', name: 'Play Roulette' },
      async (playSpan) => {
        playSpan?.setAttribute('game_id', gameId);
        return await rouletteGame.play(bet);
      }
    );
    
    // Nested span for transaction
    const transactionResult = await startSpan(
      {
        op: 'currency.transaction',
        name: 'Process Game Transaction'
      },
      async (txSpan) => {
        txSpan?.setAttribute('transaction.type', 'game');
        txSpan?.setAttribute('game.type', 'roulette');
        return await CurrencyService.processGameTransaction(...);
      }
    );
  }
);
```

## Industry Best Practices Applied

### 1. ✅ Span Operations and Names
- **Use descriptive operation types**: `ui.action`, `http.client`, `db.query`, `game.roulette`
- **Use meaningful span names**: Include context about what the operation does
- **Set attributes**: Add metadata that helps filter and understand spans

### 2. ✅ Nested Spans for Hierarchical Operations
- Parent spans for high-level operations
- Child spans for sub-operations
- Maintains execution context and timing

### 3. ✅ Breadcrumbs for User Context
- Track user actions leading to events
- Use appropriate categories: `auth`, `http`, `user`, `game`
- Include relevant data in breadcrumb payloads

### 4. ✅ Error Context
- Include tags for filtering
- Add extra data for debugging
- Use structured logging where appropriate

### 5. ✅ Performance Monitoring
- Track all database operations
- Monitor API response times
- Measure game execution time
- Track transaction processing duration

### 6. ✅ Production-Only Activation
- Disabled in development to reduce noise
- Only active in production environment
- Reduces unnecessary data collection

## Key Files Modified

1. **`packages/frontend/src/pages/RoulettePage.tsx`**
   - Added Sentry import
   - Instrumented bet placement flow
   - Added API call tracking
   - Implemented error handling

2. **`packages/backend/src/routes/games.ts`**
   - Added Sentry imports
   - Instrumented roulette betting route
   - Added nested spans for complex operations
   - Implemented comprehensive error tracking

3. **Documentation Created:**
   - `docs/SENTRY_IMPLEMENTATION_PLAN.md` - Initial plan
   - `docs/SENTRY_IMPLEMENTATION_COMPLETE.md` - Status summary
   - `docs/SENTRY_BEST_PRACTICES_APPLIED.md` - This document

## What's Next

### High Priority (Remaining Work)

1. **Case Opening Routes** - Add similar instrumentation
2. **Stock Market Routes** - Add similar instrumentation  
3. **Blackjack Routes** - Add similar instrumentation
4. **User Context** - Set user context on login/logout
5. **Database Queries** - Instrument all database operations

### Medium Priority

6. **Real-time Updates** - Track WebSocket performance
7. **Cache Operations** - Monitor cache hits/misses
8. **Authentication** - Track auth flows

## Testing Recommendations

1. **Local Testing**: Run in development and check console logs
2. **Production Testing**: Deploy and monitor Sentry dashboard
3. **Load Testing**: Generate load and observe span performance
4. **Error Testing**: Trigger errors and verify capture

## Monitoring Recommendations

1. **Set up Alerts**: Configure alerts for critical errors
2. **Track P95/P99 Latencies**: Monitor span durations
3. **Filter by Game Type**: Use tags to filter spans
4. **Monitor Error Rates**: Track error rates per game type

## DSNs and Dashboards

**Backend**: 
- DSN: `https://f06d826aff114252547b5f7a8aa77994@o4510190949695488.ingest.us.sentry.io/4510191069167616`
- Dashboard: https://juan-moran-ramirez.sentry.io/projects/tarkov-backend/

**Frontend**:
- DSN: `https://6764f471d5f4ed6034c1d9efc9cb3f55@o4510190949695488.ingest.us.sentry.io/4510190950547456`
- Dashboard: https://juan-moran-ramirez.sentry.io/projects/tarkov-frontend/

## References

- [Sentry JavaScript Documentation](https://docs.sentry.io/platforms/javascript/)
- [Sentry Best Practices](https://docs.sentry.io/product/sentry-basics/)
- [Distributed Tracing Guide](https://docs.sentry.io/concepts/key-terms/tracing/distributed-tracing/)
- [Span Metrics](https://docs.sentry.io/concepts/key-terms/tracing/span-metrics/)
- [Breadcrumbs](https://docs.sentry.io/platforms/javascript/enriching-events/breadcrumbs/)

