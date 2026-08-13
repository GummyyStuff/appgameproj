---
title: "Game Rules - Blackjack"
audience: player | admin
category: gameplay
status: stable
tags: [blackjack, game-rules, casino, card-game]
last_updated: 08/07/2026
---

# Game Rules - Blackjack

## Introduction
Blackjack is a strategic card game where players aim to get a hand value as close to 21 as possible without going over. This implementation follows standard casino rules with Tarkov-themed elements.

## How It Works
The blackjack game operates as follows:
1. Player and dealer each receive two cards (one dealer card face down)
2. Player decides whether to hit, stand, double down, or split
3. Dealer must hit until reaching 17 or higher
4. Hand values are compared to determine the winner

## Rules and Constraints
### Basic Rules
- Do: Follow standard blackjack strategy for optimal play
- Don't: Take more than one card after standing

### Game Limits
- Minimum bet: 200 virtual currency
- Maximum bet: 50,000 virtual currency
- Daily betting limit: 250,000 virtual currency

### Hand Values
- Number cards: Face value (2-10)
- Face cards (J, Q, K): 10 points each
- Aces: 1 or 11 points (player's choice)

### Winning Conditions
- Player gets 21 with first two cards (Blackjack): 3:2 payout
- Player hand closer to 21 than dealer without busting: Win
- Dealer busts (goes over 21): Player wins
- Player and dealer have same hand value: Push (no winner)

## Usage Scenarios
### Typical Play Session
1. Player logs in and checks balance
2. Player places a bet on the table
3. Cards are dealt to player and dealer
4. Player makes decision (hit, stand, double down, split)
5. Dealer plays out their hand
6. Winner is determined and payout calculated

### Special Cases
- If player gets 21 with first two cards (Ace + 10-value card), they get a Blackjack (3:2 payout)
- If dealer gets 21 with first two cards, it's a push unless player also has Blackjack
- Player can split pairs of identical cards
- Player can double down after initial deal

## Best Practices
- Learn basic strategy for optimal play
- Manage risk by not betting more than you can afford to lose
- Understand when to hit or stand based on dealer's up card
- Use the practice mode to improve your skills before real money play

## Examples and Illustrations
### Example Hand Scenarios
1. Player: 8 + 7 = 15, Dealer: 10 (face down)
   - Player chooses to hit and gets 6 = 21
   - Player wins against dealer's 10

2. Player: K + 9 = 19, Dealer: 7 (face down)  
   - Player stands with 19
   - Dealer reveals face down card as 8 = 15
   - Dealer hits and gets 5 = 20
   - Player wins (19 vs 20)

### Game Flow Diagram
```
Player Places Bet → Cards Dealt → Player Makes Decision → Dealer Plays Hand → Winner Determined → Payout Calculated
```

## Related Features
- [Roulette Rules](./roulette.md)
- [Case Opening Rules](./case-opening.md)
- [Statistics System](../backend/statistics-README.md)
