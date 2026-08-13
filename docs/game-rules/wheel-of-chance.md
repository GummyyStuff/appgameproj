---
title: "Game Rules - Wheel of Chance"
audience: player | admin
category: gameplay
status: stable
tags: [wheel-of-chance, game-rules, casino, gambling, provably-fair]
last_updated: 08/12/2026
---

# Game Rules - Wheel of Chance

## Introduction
Wheel of Chance is an industrial-themed spinner where players bet roubles on multiplier segments. The wheel has fixed base multipliers at permanent positions, with thinner bonus segments between them that change type each spin.

## How It Works
1. The wheel displays 9 fixed multiplier segments and 3 thinner bonus segments
2. Players place bets on multiplier segments only (bonus segments are not bettable)
3. Multiple bets can be placed across different multipliers in a single spin
4. The wheel spins and the pointer indicates the winning segment
5. If the pointer lands on a multiplier, bets on that segment win at that multiplier
6. If the pointer lands on a bonus segment, the bonus effect applies to all bets

## Rules and Constraints

### Betting
- Select a denomination (₽10, ₽50, ₽100, ₽500, ₽1,000)
- Click wheel segments or multiplier buttons to place bets
- Click the same segment multiple times to stack bets
- Remove individual bets or clear all before spinning
- Minimum total bet: ₽1
- Maximum total bet: ₽10,000
- Bonus segments cannot be bet on

### Wheel Layout
The wheel always has 12 segments in fixed positions:

**Base Multipliers (9 segments, 35° each):**
- 0x, 0.5x, 1x, 1.5x, 2x, 3x, 5x, 10x, 50x
- These are always at the same positions and never change

**Bonus Segments (3 segments, 15° each):**
- Thinner slices between base multipliers
- Types change randomly each spin
- Cannot be bet on
- When landed on, the bonus effect applies to all bets

### Multiplier Payouts
- **0x**: Lose bet on this segment
- **0.5x**: Win half your bet
- **1x**: Break even (get your bet back)
- **1.5x**: Win 1.5x your bet
- **2x**: Win double your bet
- **3x**: Win triple your bet
- **5x**: Win 5x your bet
- **10x**: Win 10x your bet
- **50x**: Win 50x your bet

### Bonus Segment Effects
When the pointer lands on a bonus segment, the effect applies to ALL bets:

- **Free Spin**: All bets returned (no loss, no win)
- **Double Bet**: All bets × 2
- **2x Winnings**: Normal multiplier winnings × 2
- **Jackpot**: All bets × 100

### Pacing Options
- **Normal**: Fast pre-spin (~4 seconds) followed by a ~3 second settle onto the winning slice
- **Slow**: Relaxed pre-spin (~8 seconds) followed by a longer settle
- **Skip**: Click the wheel during the settle to instantly reveal the result

## Usage Scenarios

### Typical Play Session
1. Player selects denomination (e.g., ₽100)
2. Player clicks 2x segment to bet ₽100
3. Player clicks 5x segment to bet another ₽100
4. Total bet is ₽200 across two segments
5. Player clicks "Spin"
6. Wheel spins and lands on 5x
7. Player wins ₽500 on 5x segment, loses ₽100 on 2x segment
8. Net win: ₽500 - ₽200 bet = ₽300 profit

### Bonus Landing
1. Player bets ₽100 on 3x and ₽100 on 10x
2. Wheel lands on Jackpot bonus
3. Total bet (₽200) × 100 = ₽20,000 win

## Best Practices
- Start with smaller denominations to learn the wheel
- Spread bets across multiple multipliers to manage risk
- Watch for bonus segments — they can dramatically increase payouts
- Bonus segments are thinner (15° vs 35°) so they land less often
- Use the "Normal" pace for quick play, "Slow" for suspense

## Provably Fair
All wheel results are generated using a provably fair system:
1. The wheel layout (bonus segment types) is generated **server-side** and signed with an HMAC signature (`GET /api/games/wheel-of-chance`). The client cannot alter the wheel geometry — layouts failing signature or structural validation are rejected.
2. For each spin the server generates a fresh secret server seed and combines it with a client seed and nonce.
3. HMAC-SHA256 produces a deterministic random value.
4. The winning segment is weighted by angle (thinner bonus segments are rarer).
5. Every spin response includes verification data: `server_seed`, `server_seed_hash`, `client_seed`, `nonce` and `random_value`.
6. Results can be independently verified with `POST /api/games/provably-fair/verify` by submitting `{ server_seed, client_seed, nonce }` and comparing the returned `random_value` against the spin result.

## Related Features
- [Case Opening Rules](./case-opening.md)
- [Game Engine Architecture](../backend/game-engine-README.md)
- [Statistics System](../backend/statistics-README.md)
