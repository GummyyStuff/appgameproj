---
title: "Game Rules - Roulette"
audience: player | admin
category: gameplay
status: stable
tags: [roulette, game-rules, casino, gambling]
last_updated: 08/07/2026
---

# Game Rules - Roulette

## Introduction
Roulette is a classic casino table game where players place bets on where a ball will land on a spinning wheel. This implementation follows standard European roulette rules with Tarkov-themed elements.

## How It Works
The roulette game operates as follows:
1. Players place bets on the betting table
2. The dealer spins the wheel and releases the ball
3. The ball lands in a numbered pocket
4. Winning bets are paid out based on the odds

## Rules and Constraints
### Betting Options
- Do: Place bets on numbers, colors, or groups of numbers
- Don't: Place bets after the wheel has started spinning

### Game Limits
- Minimum bet: 100 virtual currency
- Maximum bet: 100,000 virtual currency
- Daily betting limit: 500,000 virtual currency

### Payouts
- Single number: 35:1
- Red/Black: 1:1  
- Even/Odd: 1:1
- Dozens: 2:1
- Columns: 2:1

## Usage Scenarios
### Typical Play Session
1. Player logs in and checks balance
2. Player places a bet on red (even money)
3. Game processes the bet
4. Wheel spins and result is displayed
5. Winnings are credited or losses are deducted

### Special Cases
- If player bets on a number that wins, they receive 35x their bet
- If player bets on red/black and the ball lands on green (0), all bets lose
- If player bets on even/odd and the ball lands on green (0), all bets lose

## Best Practices
- Start with smaller bets to learn the game
- Manage your bankroll effectively
- Understand the house edge of 2.7% in European roulette
- Use the demo mode to practice before betting real currency

## Examples and Illustrations
### Example Bet Process
1. Player places 500 bet on black
2. Wheel spins and lands on red 7
3. Player loses the bet (500 virtual currency deducted)
4. Player can place another bet

### Game Flow Diagram
```
Player Places Bet → Wheel Spins → Result Determined → Payout Calculated → Funds Updated
```

## Related Features
- [Blackjack Rules](./blackjack.md)
- [Case Opening Rules](./case-opening.md)
- [Statistics System](../backend/statistics-README.md)