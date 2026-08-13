---
title: "Achievements System"
audience: developer
layer: both
status: stable
tags: [achievements, rewards, gamification]
last_updated: 08/10/2026
---

# Achievements System

## Overview

The achievements system tracks user progress toward milestones and rewards completions with virtual currency or special items.

## Backend

### Service

`AchievementService` in `packages/backend/src/services/achievement-service.ts` handles:
- Progress tracking
- Achievement unlocking
- Reward claiming
- Definition management

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/achievements` | Get all achievements with user progress |
| POST | `/api/achievements/progress` | Update achievement progress |
| POST | `/api/achievements/claim` | Claim achievement reward |
| GET | `/api/achievements/definitions` | Get all achievement definitions |

### Data Model

Each achievement has:
- `id`: Unique identifier
- `title`: Display name
- `description`: What the user needs to accomplish
- `requirements`: Progress threshold to unlock
- `rewardType`: `currency` or `item`
- `rewardAmount` / `rewardItem`: Reward value

### Seeding

Achievements are seeded via `packages/backend/src/scripts/seed-achievements.ts`. Run with:
```bash
bun run scripts/seed-achievements.ts
```

## Frontend

### Components

- `AchievementSystem` — Main achievement display and management UI
- Located in `packages/frontend/src/components/ui/AchievementSystem.tsx`

### Features

- Progress bars showing completion percentage
- Unlock notifications
- Reward claiming flow
- Achievement categories (roulette, blackjack, general)

## Related

- [API Reference](../api/README.md)
- [Frontend Architecture](../frontend/README.md)
