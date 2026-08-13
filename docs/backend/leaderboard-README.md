---
title: "Leaderboard System"
audience: developer
layer: backend
status: stable
tags: [leaderboard, redis, rankings, sorted-sets]
last_updated: 08/10/2026
---

# Leaderboard System

## Overview

The leaderboard system provides real-time player rankings using Redis sorted sets for O(log N) performance. All methods gracefully fall back if Redis is unavailable.

## Service

`LeaderboardService` in `packages/backend/src/services/leaderboard-service.ts` manages seven leaderboard categories using Redis sorted sets.

## Leaderboard Categories

| Key | Description | Reset Schedule |
|---|---|---|
| `leaderboard:daily:wins` | Top daily winners by total wins | Daily at midnight |
| `leaderboard:weekly:wins` | Top weekly winners | Weekly (Sunday midnight) |
| `leaderboard:alltime:wins` | All-time top winners | Never |
| `leaderboard:biggest_win` | Biggest single game win | Never |
| `leaderboard:most_games` | Most games played | Never |
| `leaderboard:daily:profit` | Daily profit leaders | Daily at midnight |
| `leaderboard:weekly:profit` | Weekly profit leaders | Weekly (Sunday midnight) |

## Data Model

```typescript
interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName?: string;
  avatarPath?: string;
  score: number;
  rank: number;
}
```

## Automatic Updates

Leaderboards are updated automatically after each game win:
- `updateAfterWin()` — Updates daily, weekly, all-time wins and biggest win
- `updateProfit()` — Updates daily and weekly profit rankings
- `incrementGamesPlayed()` — Increments most-games counter

## Scheduled Resets

Daily and weekly leaderboards reset automatically via scheduled `setTimeout` on server startup. Resets are enabled when `config.redisEnabled` is true.

## API

### Public Endpoint

```
GET /api/statistics/leaderboard?metric=daily_wins&limit=10
```

The public endpoint is cached and has no rate limiting. Available metrics: `daily_wins`, `weekly_wins`, `alltime_wins`, `biggest_win`, `most_games`, `daily_profit`, `weekly_profit`.

### Service Methods

```typescript
import { LeaderboardService } from './services/leaderboard-service';

// Get top players
const dailyWinners = await LeaderboardService.getDailyWinners(10);
const weeklyWinners = await LeaderboardService.getWeeklyWinners(10);
const allTimeWinners = await LeaderboardService.getAllTimeWinners(10);
const biggestWins = await LeaderboardService.getBiggestWins(10);
const mostActive = await LeaderboardService.getMostActiveUsers(10);

// Get user rankings
const rankings = await LeaderboardService.getUserRankings(userId);
// Returns: { dailyRank, weeklyRank, allTimeRank, biggestWinRank, dailyScore, weeklyScore, allTimeScore }

// Update after game
await LeaderboardService.updateAfterWin(userId, winAmount);
await LeaderboardService.updateProfit(userId, profit);
await LeaderboardService.incrementGamesPlayed(userId);
```

## Configuration

Environment variables in `packages/backend/src/config/env.ts`:
- `CACHE_LEADERBOARD_TTL` — TTL for leaderboard cache entries

## Redis Dependency

Leaderboard features require Redis. If Redis is unavailable, all methods return empty results or `null` without throwing errors.

## Testing

Tests located in `packages/backend/src/services/__tests__/leaderboard-service.test.ts`.

## Related

- [Redis Integration](./redis-README.md)
- [Statistics System](./statistics-README.md)
- [API Reference](../api/README.md)
