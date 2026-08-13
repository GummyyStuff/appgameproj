---
title: "Sentry Error Tracking"
audience: developer
layer: both
status: stable
tags: [sentry, error-tracking, monitoring, observability]
last_updated: 08/10/2026
---

# Sentry Error Tracking

## Overview

Sentry provides production error tracking and performance monitoring for both the backend and frontend. The integration uses `@sentry/bun` for the backend and `@sentry/react` for the frontend.

## Backend Integration

### Setup

Backend Sentry is configured in `packages/backend/src/lib/sentry.ts`. It initializes automatically on server startup in production mode.

**Environment variable:**
```env
SENTRY_DSN=your_sentry_dsn_here
SENTRY_RELEASE=tarkov-backend@1.1.0  # optional
```

### Configuration

- **Production only**: Sentry is disabled in development mode
- **Intelligent sampling**: Critical game/auth routes sampled at 100%, health checks at 10%
- **Data scrubbing**: Sensitive data (passwords, tokens, API keys) is automatically redacted
- **Console logging**: `console.log/warn/error` captured as Sentry logs

### API

```typescript
import { logError, logMessage, setUserContext, withSpan, logger } from './lib/sentry';

// Log an error with context
logError(error, { userId: '123', gameType: 'roulette' });

// Log a message
logMessage('User logged in', 'info');

// Set user context for error correlation
setUserContext(userId, { username: 'player1', balance: 1000 });

// Performance tracking with spans
const result = await withSpan('database', 'Fetch user profile', async () => {
  return await database.getUser(userId);
});

// Structured logging
logger.info('Game completed', { userId: '123', gameType: 'roulette', result: 'win' });
```

### Sampling Strategy

| Transaction Type | Sample Rate |
|---|---|
| Game operations (`/api/game/`) | 100% |
| Auth operations (`/api/auth/`) | 100% |
| General API calls | 80% |
| Health checks | 10% |
| Database SELECT (users) | 30% |
| Database INSERT/UPDATE | 90% |
| Default | 20% |

### Known Issues

- `@sentry/profiling-node` is disabled — it crashes Bun due to unsupported libuv functions
- Performance monitoring uses `tracesSampleRate` instead of profiling

## Frontend Integration

Frontend Sentry is configured separately with its own DSN via `VITE_SENTRY_DSN`. It captures React errors, performance metrics, and user interactions.

## Related

- [Health Checks](../README.md#health-checks)
- [Deployment Guide](../deployment/deployment.md)
