# Stock Market Game - Quick Setup Guide

## 🚀 Quick Start

### Step 1: Create Stock Market Collections
```bash
bun run packages/backend/scripts/setup-stock-market-collections.ts
```

This creates:
- `stock_market_positions`
- `stock_market_trades`
- `stock_market_candles`
- `stock_market_state`

### Step 2: Update game_history Collection (Manual)

**⚠️ IMPORTANT**: Appwrite doesn't allow modifying enum attributes after creation.

#### Option A: Manual Update (Recommended)
1. Open Appwrite Console
2. Navigate to: **Databases** → **tarkov_casino** → **game_history**
3. Go to **Attributes** tab
4. Find `game_type` attribute
5. **Delete** it
6. **Recreate** it with these values:
   - `roulette`
   - `blackjack`
   - `case_opening`
   - `stock_market` ⬅️ **ADD THIS**
7. Make it **required**
8. Save

#### Option B: Recreate Collection (If no important data)
```bash
bun run packages/backend/scripts/setup-game-history-collection.ts
```

### Step 3: Start the Application

```bash
# Terminal 1 - Backend
cd packages/backend
bun run dev

# Terminal 2 - Frontend
cd packages/frontend
bun run dev
```

### Step 4: Access the Game
Navigate to: `http://localhost:5173/stock-market`

---

## ✅ Verification Checklist

### Backend
- [ ] Backend starts without errors
- [ ] Market state service initializes
- [ ] Price generation starts (check logs)
- [ ] API endpoints respond correctly

### Frontend
- [ ] Page loads without errors
- [ ] Chart displays data
- [ ] Current price updates
- [ ] Trading interface is responsive

### Trading
- [ ] Can place buy orders
- [ ] Can place sell orders
- [ ] Balance updates correctly
- [ ] Position displays correctly
- [ ] P&L calculations are accurate

### Real-time
- [ ] Price updates every 1-2 seconds
- [ ] Chart updates smoothly
- [ ] Trade feed shows recent trades
- [ ] Leaderboard displays data

---

## 🐛 Troubleshooting

### Issue: "Failed to get market state"
**Solution**: Check if `stock_market_state` collection exists and has a document with ID `current`

### Issue: "game_type check constraint failed"
**Solution**: Update the `game_history` collection enum (see Step 2)

### Issue: Prices not updating
**Solution**: Check backend logs for market state service initialization

### Issue: Leaderboard shows no data
**Solution**: Make some trades first, then check if trades are being recorded

---

## 📚 Additional Resources

- Full documentation: `.cursor/plans/STOCK_MARKET_IMPLEMENTATION_COMPLETE.md`
- API documentation: `README.md`
- Collection setup: `packages/backend/scripts/update-game-history-collection.md`

---

## 🎯 Quick Test

1. Create a test account
2. Navigate to Stock Market page
3. Buy 10 shares
4. Wait for price to change
5. Sell 5 shares
6. Check your position
7. View leaderboard

If all steps work, the game is ready! 🎉

