---
title: "Game Rules - Case Opening"
audience: player | admin
category: gameplay
status: stable
tags: [case-opening, game-rules, casino, gambling, provably-fair]
last_updated: 08/07/2026
---

# Game Rules - Case Opening

## Introduction
Case opening is a Tarkov-themed loot system where players open virtual cases to win items with provably fair algorithms. This implementation ensures transparency and fairness through cryptographic methods.

## How It Works
The case opening process operates as follows:
1. Player selects a case type and places a bet
2. System generates a cryptographic seed for randomness
3. Case contents are determined using the seed
4. Items are awarded based on probability distributions
5. Results are verifiable by players

## Rules and Constraints
### Betting Rules
- Do: Select cases with appropriate bet amounts
- Don't: Open cases without sufficient balance

### Game Limits
- Minimum bet: 500 virtual currency
- Maximum bet: 25,000 virtual currency
- Daily betting limit: 100,000 virtual currency

### Case Types and Probabilities
- Common case: 70% chance of common items (100-500 virtual currency)
- Uncommon case: 20% chance of uncommon items (500-2000 virtual currency)  
- Rare case: 8% chance of rare items (2000-10,000 virtual currency)
- Legendary case: 2% chance of legendary items (10,000+ virtual currency)

### Fairness Requirements
- All randomization must be provably fair
- Players can verify results using cryptographic hash functions
- No manipulation or bias in item distribution

## Usage Scenarios
### Typical Play Session
1. Player logs in and checks balance
2. Player selects case type and places bet
3. System confirms sufficient balance
4. Case opening process begins
5. Items are revealed and awarded
6. Result is logged for verification

### Verification Process
1. Player receives cryptographic hash of the seed used
2. Player can verify results using provided tools
3. All outcomes are logged in Appwrite database
4. History is available for review

## Best Practices
- Understand the probability distributions before playing
- Manage your virtual currency wisely
- Verify results when possible for maximum transparency
- Use case opening as entertainment, not real money gambling

## Examples and Illustrations
### Example Case Opening
1. Player opens a Rare case with 2000 bet
2. System generates cryptographic seed 
3. Results: 15,000 virtual currency item (rare)
4. Player receives 15,000 virtual currency in balance

### Game Flow Diagram
```
Player Selects Case → Bet Confirmed → Seed Generated → Items Determined → Results Revealed → Payout Processed
```

## Related Features
- [Wheel of Chance Rules](./wheel-of-chance.md)
- [Blackjack Rules](./blackjack.md)
- [Statistics System](../backend/statistics-README.md)