---
title: "Update game_history Collection for Stock Market"
audience: developer
layer: database
status: stable
tags: [appwrite, database, collection, game_history]
last_updated: 2026-08-07
---

# Update game_history Collection for Stock Market

## Overview
This document explains how to update the `game_history` Appwrite collection to support additional game types required for the stock market feature.

## Architecture & Logic
The game history collection tracks user activities across different games. Originally designed for roulette, blackjack, and case opening, it now needs to support stock market games as well.

## Dependencies & Integration
This update modifies an existing Appwrite collection and requires database access permissions. It integrates with the existing game history tracking system.

## Implementation Notes
Since Appwrite doesn't allow modifying enum values after creation, this requires manual intervention through the Appwrite Console. The process involves deleting and recreating the `game_type` attribute.

## Problem
The `game_history` collection was created with an enum attribute `game_type` that only allows: `['roulette', 'blackjack', 'case_opening']`

Since Appwrite Collections API doesn't support modifying enum values after creation, we need to manually update it.

## Solution

### Option 1: Manual Update via Appwrite Console (Recommended)

1. Go to your Appwrite Console
2. Navigate to **Databases** → **tarkov_casino** → **game_history** collection
3. Go to the **Attributes** tab
4. Find the `game_type` attribute (it's an enum type)
5. **Delete** the `game_type` attribute
6. **Recreate** the `game_type` attribute with these values:
   - `roulette`
   - `blackjack`
   - `case_opening`
   - `stock_market`
   - `stock_market` ⬅️ **ADD THIS ONE**
7. Make it **required**
8. Save

**⚠️ WARNING**: This will temporarily remove the attribute validation. Make sure no invalid data is inserted during this time.

### Option 2: Recreate Collection (If you have no important data)

If the `game_history` collection doesn't have important data yet:

1. Delete the `game_history` collection entirely
2. Run the setup script:
   ```bash
   bun run packages/backend/scripts/setup-game-history-collection.ts
   ```

### Option 3: Create New Collection (Safest)

1. Create a new collection called `game_history_v2` with the correct enum
2. Migrate data from old to new collection
3. Update code to use new collection name

## Verification

After updating, test by creating a game history entry:

```bash
curl -X POST http://localhost:3001/api/games/stock-market/buy \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"shares": 10}'
```

Then check the game_history collection to see if the entry was created with `game_type: 'stock_market'`.

## Notes

- The backend code has been updated to accept `'stock_market'` as a valid game type
- All validation logic has been updated
- The stock market game engine already records to game_history correctly
- This only needs to be done once

