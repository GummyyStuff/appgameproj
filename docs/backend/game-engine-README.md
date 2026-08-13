---
title: "Game Engine Architecture"
audience: developer
layer: backend
status: stable
tags: [game-engine, provably-fair, random-generation, payout]
last_updated: 08/10/2026
---

# Game Engine Architecture

## Overview

The game engine is a modular system in `packages/backend/src/services/game-engine/` that handles game logic, provably fair random number generation, payout calculation, and game state management.

## Components

### CoreGameEngine

Main orchestrator that validates bets, processes games, and calculates payouts. Exported as a singleton `gameEngine`.

### BaseGame

Abstract class that all game implementations extend. Defines:
- `play(bet)`: Execute a game round
- `calculatePayout(bet, result)`: Calculate winnings
- `validateGameSpecificBet(bet)`: Game-specific validation

### Game Implementations

- `RouletteGame` — Classic roulette with number/color/bet types
- `BlackjackGame` — Card game with hit/stand/double/split actions
- `WheelOfChanceGame` — Industrial wheel spinner with multipliers and specials

### ProvablyFairService

Reusable provably fair system for all games. Provides:
- Server/client seed generation (cryptographic)
- HMAC-SHA256 outcome generation
- Weighted random selection
- Result verification
- Exported as singleton `provablyFairService`

### SecureRandomGenerator

Cryptographically secure random number generation using `crypto.getRandomValues()`. Supports:
- Secure random floats (0-1)
- Secure random integers
- Provably fair seed-based generation
- Result verification

### PayoutCalculator

Handles odds and multipliers for each game type:
- Roulette: Straight up (35:1), split (17:1), color (1:1), etc.
- Blackjack: Natural (3:2), win (1:1), push (0:0)
- Wheel of Chance: Multiplier segments (0x-50x), specials (Free Spin, Double Bet, 2x Winnings, Jackpot)

### GameValidator

Validates game results and payouts:
- Result structure validation per game type
- Payout reasonableness checks
- Provably fair result verification

### GameStateManager

Manages game lifecycle:
- Create, update, complete game states
- Track pending/active/completed/cancelled states

## Types

Key types in `types.ts`:
- `GameBet` — User bet with amount and game type
- `GameResult` — Game outcome with win amount and result data
- `GameState` — Lifecycle state tracking
- `ProvablyFairSeed` — Server seed, client seed, nonce
- `ProvablyFairResult` — Hash, random value, validity

## Provably Fair System

Each game result can be verified using:
1. Server seed (hashed and shared before game)
2. Client seed (provided by player)
3. Nonce (incrementing counter)
4. Combined hash produces deterministic random value

## Usage

```typescript
import { gameEngine } from './services/game-engine';

const result = await gameEngine.processGame({
  userId: 'user-123',
  amount: 100,
  gameType: 'roulette'
});
```

## Testing

Comprehensive test suite covers:
- Core engine operations
- Roulette game logic
- Blackjack game logic
- Payout calculations
- Game validation
- Random generation
- Game state management

## Related

- [Statistics System](./statistics-README.md)
- [API Reference](../api/README.md)
