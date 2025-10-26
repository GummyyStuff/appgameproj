# Sentry Implementation - Current Status

## Summary

This document outlines what has been implemented so far and provides industry-standard best practices for Sentry integration.

## What Has Been Implemented

### ✅ Frontend (Roulette Game)

**File**: `packages/frontend/src/pages/RoulettePage.tsx`

1. **Sentry Spans for Bet Placement**
   - Wrapped bet placement action in `Sentry.startSpan`
   - Added meaningful span attributes (bet_type, bet_value, bet_amount)
   - Tracks entire bet lifecycle from click to API call

2. **Breadcrumbs for Context**
   - Tracks API calls before execution
   - Records successful bet completions
   - Captures winning numbers and balance updates

3. **Error Tracking**
   - Captures exceptions with full context
   - Includes bet details in error reports
   - Tags errors by game type and action

4. **API Call Instrumentation**
   - Wraps fetch calls in spans for performance monitoring
   - Tracks HTTP method, URL, and bet details
   - Measures API response times

### ✅ Backend (Roulette API Route)

**File**: `packages/backend/src/routes/games.ts`

1. **Comprehensive Span Instrumentation**
   - Database query spans for balance checks
   - Game execution spans with nested operations
   - Transaction processing spans
   - Real-time broadcast spans

2. **Breadcrumb Tracking**
   - Tracks authentication failures
   - Records game initiation
   - Logs successful completions
   - Captures transaction details

3. **Error Handling**
   - Captures exceptions with full context
   - Logs warnings for insufficient balance
   - Tracks transaction failures
   - Includes user and game context

4. **Performance Monitoring**
   - Tracks all key operations with spans
   - Measures database query times
   - Monitors game execution time
   - Measures transaction processing duration

## Industry Best Practices Implemented

Based on Sentry's official documentation and current best practices (2024):

### 1. ✅ Meaningful Span Names and Operations
```typescript
// Frontend
Sentry.startSpan(
  { op: 'ui.action', name: 'Roulette Bet Placement' },
  async (span) => { /* ... */ }
);

// Backend
Sentry.startSpan(
  { op: 'db.query', name: 'Get User Balance' },
  async (span) => { /* ... */ }
);
```

### 2. ✅ Rich Context with Attributes
```typescript
span?.setAttribute('game.type', 'roulette');
span?.setAttribute('game.bet_amount', amount);
span?.setAttribute('game.user_id', user.id);
```

### 3. ✅ Breadcrumbs for Debugging
```typescript
Sentry.addBreadcrumb({
  category: 'game',
  message: 'Roulette bet initiated',
  level: 'info',
  data: { bet_type: betType, bet_amount: amount }
});
```

### 4. ✅ Error Context
```typescript
Sentry.captureException(err, {
  tags: { game: 'roulette', action: 'bet_placement' },
  extra: { user_id: user.id, bet_amount: amount }
});
```

### 5. ✅ Nested Spans for Complex Operations
```typescript
await startSpan(
  { op: 'game.roulette', name: 'Roulette Bet Placement' },
  async (gameSpan) => {
    await startSpan(
      { op: 'realtime.broadcast', name: 'Broadcast Game Start' },
      async (broadcastSpan) => { /* ... */ }
    );
  }
);
```

## What Still Needs to Be Done

### High Priority

1. **Case Opening Routes** (`packages/backend/src/routes/games.ts`)
   - Add spans to case opening endpoint
   - Track case validation, item selection, transaction processing
   - Add breadcrumbs for user actions

2. **Stock Market Routes** (`packages/backend/src/routes/games.ts`)
   - Instrument buy/sell operations
   - Track position management
   - Monitor market state updates

3. **Other Game Routes**
   - Blackjack bet placement
   - Game validation flows
   - State machine transitions

### Medium Priority

4. **Frontend Error Boundaries**
   - Ensure all game components have error boundaries
   - Add error boundaries to critical flows

5. **User Context Management**
   - Set user context on login
   - Update context when balance changes
   - Track user segments

6. **Database Operations**
   - Add spans to all database queries
   - Track cache hits/misses
   - Monitor query performance

### Low Priority

7. **Real-time Updates**
   - Track WebSocket connections
   - Monitor broadcast performance
   - Track connection failures

8. **Performance Optimization**
   - Review sampling rates
   - Tune tracesSampler logic
   - Optimize attribute collection

## Industry Standards Reference

### Sentry Documentation Links

1. **Tracing Best Practices**: https://docs.sentry.io/concepts/key-terms/tracing/
2. **Error Tracking**: https://docs.sentry.io/product/sentry-basics/error-tracking/
3. **Performance Monitoring**: https://docs.sentry.io/product/sentry-basics/performance-monitoring/
4. **Breadcrumbs**: https://docs.sentry.io/platforms/javascript/enriching-events/breadcrumbs/

### Key Concepts Implemented

1. **Spans**: Timed operations with attributes and nested hierarchy
2. **Traces**: Collections of spans with trace_id
3. **Breadcrumbs**: User actions leading to events
4. **Error Context**: Rich metadata for debugging
5. **Performance Monitoring**: Automatic and manual instrumentation

## Testing the Implementation

### Frontend Testing
1. Place a roulette bet
2. Check Sentry dashboard for span data
3. Verify breadcrumbs are recorded
4. Confirm error context is captured

### Backend Testing
1. Make a roulette bet via API
2. Check Sentry for database query spans
3. Verify transaction spans
4. Confirm error handling

### Manual Testing Endpoints
```
# Test Sentry functionality
GET /api/sentry-test/config
GET /api/sentry-test/test-error
GET /api/sentry-test/test-performance
GET /api/sentry-test/test-logging
GET /api/sentry-test/test-nested-spans
GET /api/sentry-test/test-tracing
```

## DSNs

**Backend DSN**: `https://f06d826aff114252547b5f7a8aa77994@o4510190949695488.ingest.us.sentry.io/4510191069167616`

**Frontend DSN**: `https://6764f471d5f4ed6034c1d9efc9cb3f55@o4510190949695488.ingest.us.sentry.io/4510190950547456`

## Dashboard URLs

**Backend**: https://juan-moran-ramirez.sentry.io/projects/tarkov-backend/

**Frontend**: https://juan-moran-ramirez.sentry.io/projects/tarkov-frontend/

## Updated Status (Latest)

### ✅ Case Opening Instrumentation Added

**File**: `packages/backend/src/routes/games.ts`

Added comprehensive Sentry instrumentation to the case opening endpoint:
- Main span for entire case opening request
- Validation span for case opening validation
- Preview span for preview-only operations
- Open case span for actual case opening
- Transaction span for currency processing
- Breadcrumbs for all key operations
- Error tracking with full context
- Success breadcrumbs with item details

## Next Steps

1. Deploy to production
2. Monitor Sentry dashboard
3. Add stock market instrumentation (in progress)
4. Add remaining game instrumentation based on observed issues
5. Iterate based on performance data
6. Implement alerting rules

## Notes

- All Sentry calls are production-only (disabled in development)
- Sentry will automatically sample based on configured rates
- All spans include meaningful attributes for filtering and analysis
- Error tracking includes full context for debugging

