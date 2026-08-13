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
Wheel of Chance is a Tarkov-themed spinner where players bet roubles on multiplier segments. Each player raids under a rotating **Environment** that modifies the wheel for 3 spins, and a rare **BONUS** segment triggers an automatic re-spin with every multiplier doubled.

## How It Works
1. The wheel displays 9 multiplier segments and 1 rare BONUS segment
2. Players place bets on multiplier segments only (the BONUS segment is not bettable)
3. Multiple bets can be placed across different multipliers in a single spin
4. The current Environment modifies the wheel; every player has their own Environment lasting exactly 3 spins
5. The wheel spins and the pointer indicates the winning segment
6. Landing on a multiplier pays bets on that segment at the segment's effective multiplier
7. Landing on BONUS holds your bets and automatically re-spins with all multipliers doubled (stacks with the Environment)

## Rules and Constraints

### Betting
- Select a denomination (₽10, ₽50, ₽100, ₽500, ₽1,000)
- Click wheel segments or multiplier buttons to place bets
- Click the same segment multiple times to stack bets
- Remove individual bets or clear all before spinning
- Minimum total bet: ₽1
- Maximum total bet: ₽10,000
- The BONUS segment cannot be bet on

### Wheel Layout
The wheel always has 10 segments in fixed positions:

**Base Multipliers (9 segments, ~38.33° each):**
- 0x, 0.5x, 1x, 1.5x, 2x, 3x, 5x, 10x, 50x
- These are always at the same positions and never change

**BONUS Segment (1 segment, 15° — the last slice):**
- Gold-colored, non-bettable
- ~4.2% chance per spin (15° of 360°)
- Landing on it holds your bets and automatically re-spins with all multipliers doubled
- If the re-spin lands on BONUS again, the wheel re-spins again with the same doubled multipliers (no further doubling)

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

Environments and the BONUS wheel modify these base values (see below).

## Environment System

Every player has a personal Environment that lasts exactly **3 spins**. After the 3rd spin a new Environment is randomly selected. The current Environment, its effect and spins remaining are displayed above the wheel.

| Environment | Effect |
|---|---|
| **Clear Skies** | No modifier — baseline wheel |
| **Scav Raid** | 5 random segments gain a +2x to +10x boost (e.g. 5x + 3 = 8x) |
| **EMP Strike** | 1–3 random segments gain a +5x to +20x boost |
| **Thermal Scan** | One random segment below 10x becomes "hot" and pays 10x |
| **Blackout** | All multipliers shift up one tier (0x→0.5x, 0.5x→1x … 10x→50x, 50x caps) |

- Boosted segments are highlighted on the wheel with an orange glow and their displayed multiplier updates
- Only multiplier segments are affected; the BONUS segment never changes

## Bonus Wheel

When the pointer lands on the BONUS segment:

1. Your bets are **held** (nothing is paid yet)
2. All multipliers are **doubled** (Environment boosts are applied first, then doubled)
3. The wheel automatically re-spins with the transformed layout
4. The final landing segment pays at the doubled multiplier
5. Everything is resolved in a single atomic spin request — no bet can be lost mid-sequence

**Example**: 5x segment with a Scav Raid +3 boost = 8x. BONUS doubles it to 16x. A ₽100 bet wins ₽1,600.

**Re-trigger**: if the re-spin lands on BONUS again, the wheel re-spins again with the same doubled multipliers.

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

### Environment Boost
1. Environment is Scav Raid; the 5x segment has a +3 boost (now 8x)
2. Player bets ₽100 on the boosted 8x segment
3. Wheel lands on it → wins ₽800

### Bonus Landing
1. Player bets ₽100 on 5x
2. Wheel lands on BONUS
3. Wheel transforms (5x → 10x) and re-spins automatically
4. Re-spin lands on the 10x segment → wins ₽1,000

## Best Practices
- Start with smaller denominations to learn the wheel
- Spread bets across multiple multipliers to manage risk
- Check the Environment bar each spin — boosted segments are high-value targets
- The BONUS segment is rare (~4.2%): when it hits, your held bets ride a doubled wheel
- Environments are per-player and change every 3 spins

## Provably Fair
All wheel results AND environment selections are generated using a provably fair system:
1. The wheel layout is generated **server-side** and signed with an HMAC signature (`GET /api/games/wheel-of-chance`). The client cannot alter the wheel geometry — layouts failing signature or structural validation are rejected.
2. For each spin the server generates a fresh secret server seed and combines it with a client seed and nonce.
3. HMAC-SHA256 produces a deterministic random value.
4. The winning segment is weighted by angle (the 15° BONUS segment is rarer).
5. BONUS re-spins use the same seed context with incremented nonces; every spin in the sequence carries its own verification data (`spin_sequence` in the result).
6. When an Environment is selected (every 3 spins), its selection is also provably fair and included in the result as `environment_verification`.
7. Results can be independently verified with `POST /api/games/provably-fair/verify` by submitting `{ server_seed, client_seed, nonce }` and comparing the returned `random_value` against the spin result.

## Related Features
- [Case Opening Rules](./case-opening.md)
- [Game Engine Architecture](../backend/game-engine-README.md)
- [Statistics System](../backend/statistics-README.md)
