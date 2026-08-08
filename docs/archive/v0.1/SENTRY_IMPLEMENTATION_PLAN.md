---
title: "Sentry Implementation Plan"
audience: developer
type: deployment
status: stable
tags: [sentry, monitoring, deployment]
last_updated: 2026-08-07
---

# Sentry Implementation Plan

## Overview
This document outlines the current status and implementation plan for Sentry.io integration in the Tarkov Casino project.

## Prerequisites
- Sentry account with project configured
- Sentry DSN keys for both frontend and backend
- Access to deployment environments

## Step-by-Step Instructions
### Current Status

#### ✅ What's Already Working
1. **Sentry SDKs Installed**: Both `@sentry/react` (frontend) and `@sentry/bun` (backend) are installed in root package.json
2. **Initialization Code**: Sentry is initialized in both frontend (`main.tsx`) and backend (`index.ts`)
3. **Basic Error Tracking**: Errors are captured in production
4. **Configuration Files**: `src/lib/sentry.ts` files exist for both frontend and backend with comprehensive configurations
5. **Sentry Test Routes**: `/api/sentry-test/*` endpoints exist for testing

#### ⚠️ What's Missing or Incomplete

##### Frontend
- ❌ Sentry spans NOT used in most game actions
- ❌ Breadcrumbs NOT added to critical user flows
- ❌ User context NOT set consistently across the app
- ⚠️ Only basic error tracking (ErrorBoundary, catch blocks)

##### Backend  
- ❌ Sentry spans NOT used in database operations
- ❌ API routes NOT instrumented with spans
- ❌ Missing DB and HTTP integrations in Sentry config
- ⚠️ Middleware exists but not fully utilized

## Implementation Progress

### ✅ Completed
1. Installed Sentry packages (already done)
2. Added Sentry instrumentation to Roulette betting flow:
   - Added `Sentry.startSpan` for bet placement tracking
   - Added breadcrumbs for API calls
   - Added error tracking with context
   - Wrapped API calls with spans

### 🚧 In Progress
None currently

### 📋 Remaining Tasks

#### High Priority
1. **Add Sentry spans to all game actions** (Frontend)
   - ✅ Roulette betting (done)
   - ⬜ Case opening
   - ⬜ Blackjack
   - ⬜ Stock Market Trading
   
2. **Instrument backend API routes** (Backend)
   - Add spans to all route handlers
   - Track performance for database operations
   - Add spans for game service calls

3. **User Context Tracking**
   - Set user context on login
   - Update user context on balance changes
   - Track user segments (premium, high-value, etc.)

#### Medium Priority
4. **Breadcrumb Tracking**
   - Login/logout
   - Balance updates
   - Navigation
   - Game state changes

5. **Sentry Integrations**
   - Enable DB integration for Bun
   - Enable HTTP client integration
   - Configure source maps for production builds

#### Low Priority
6. **Performance Optimization**
   - Review sampling rates
   - Tune tracesSampler logic
   - Optimize for quota limits

## Files Modified
- `packages/frontend/src/pages/RoulettePage.tsx`: Added comprehensive Sentry instrumentation

## Files To Modify Next
1. `packages/frontend/src/hooks/useCaseOpeningGame.ts`
2. `packages/frontend/src/services/stock-market-api.ts`
3. `packages/backend/src/routes/games.ts`
4. `packages/backend/src/services/currency.ts`
5. `packages/frontend/src/hooks/useAuth.tsx`

## DSNs

**Backend DSN**: `https://f06d826aff114252547b5f7a8aa77994@o4510190949695488.ingest.us.sentry.io/4510191069167616`

**Frontend DSN**: `https://6764f471d5f4ed6034c1d9efc9cb3f55@o4510190949695488.ingest.us.sentry.io/4510190950547456`

## Dashboard URLs

**Backend**: https://juan-moran-ramirez.sentry.io/projects/tarkov-backend/
**Frontend**: https://juan-moran-ramirez.sentry.io/projects/tarkov-frontend/

## Best Practices Implemented

From the repo rules:
1. ✅ Use `Sentry.captureException()` for error tracking
2. ✅ Use `Sentry.startSpan()` for performance tracking
3. ✅ Add meaningful span names and operations
4. ✅ Set context with `span?.setAttribute()`
5. ✅ Enable logging with `enableLogs: true`
6. ✅ Use `Sentry.addBreadcrumb()` for debugging context

## Next Steps

1. Run the application in production mode to test
2. Monitor Sentry dashboard for incoming events
3. Iterate on instrumentation based on observed issues
4. Add more granular tracking as needed

