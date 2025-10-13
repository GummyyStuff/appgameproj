# Replace Blackjack with Stock Market Trading Game

## Overview

Transform the blackjack game into an engaging multiplayer stock market trading simulator where players buy and sell "shares" in real-time, compete on leaderboards, and experience realistic market movements powered by provably fair random generation.

## Game Mechanics Design

### Core Trading System

- **Continuous Trading**: Market runs 24/7 with real-time price updates every 1-2 seconds
- **Buy/Sell Actions**: Players can buy shares at current market price and sell them later for profit/loss
- **Position Management**: Track open positions, average buy price, unrealized P&L, realized P&L
- **Portfolio Tracker**: Display total portfolio value, cash balance, and holdings
- **Market Price**: Single "stock" price that moves up/down continuously
- **Simple 1:1 Trading**: No leverage or multipliers - players trade with their actual balance only
- **No Pausing**: Market never stops, continuous action

### Market Movement Algorithm (Hybrid Provably Fair + Realistic)

- **Provably Fair Foundation**: Use existing `SecureRandomGenerator` for base randomness
- **Realistic Patterns**: Generate candlestick-style movements (open, high, low, close) that look like real markets
- **Trend Simulation**: Implement momentum/mean-reversion to create realistic chart patterns
- **Dynamic Volatility**: Vary volatility naturally to create exciting trading opportunities
- **Price Bounds**: Keep price within reasonable range (e.g., $50-$150) with soft boundaries
- **Pure Random Movement**: No news events, no pausing - just continuous hybrid random price action

### Multiplayer Features

- **Shared Market View**: All players see the same market price in real-time
- **Live Trade Feed**: Display recent trades from other players with usernames
- **Leaderboard**: Track top traders by total profit, portfolio value, ROI percentage
- **Session Leaderboard**: Reset daily/weekly for competitive seasons
- **Performance Analytics**: Win rate, average return, best trade statistics

## Backend Implementation

### Research Phase (Critical)

Before implementation, thoroughly research:

1. **Provably Fair Algorithms**: Study existing implementations in crash games (Bustabit, BC.Game)
   - SHA-256 chain generation for verifiable randomness
   - Server seed + client seed + nonce methodology
   - How to make price generation verifiable by players

2. **Market Simulation Algorithms**: Research realistic price movement generation
   - Geometric Brownian Motion (GBM) for stock price simulation
   - Ornstein-Uhlenbeck process for mean reversion
   - GARCH models for volatility clustering
   - How to combine provably fair RNG with realistic patterns

3. **Financial Mathematics**: Study proper P&L calculations
   - Average price calculation for multiple buys (FIFO vs weighted average)
   - Realized vs unrealized P&L tracking
   - Portfolio value calculation
   - Preventing negative balances and overdrafts

4. **Concurrency & Race Conditions**: Research handling simultaneous trades
   - Database transactions for atomic operations
   - Optimistic locking vs pessimistic locking
   - Queue-based order processing
   - Preventing double-spending and balance manipulation

5. **Existing Implementations**: Study open-source trading simulators
   - Review StonksQuest architecture for portfolio management
   - Study crash game implementations for continuous price updates
   - Research WebSocket/realtime best practices for financial data

### New Game Engine

**File**: `packages/backend/src/services/game-engine/stock-market-game.ts`

- Extend `BaseGame` class similar to `blackjack-game.ts`
- Implement **hybrid provably fair + realistic** price generation:
  - Use `SecureRandomGenerator` for base entropy
  - Apply GBM or similar for realistic price walks
  - Implement momentum factor (trend continuation)
  - Add mean reversion to prevent runaway prices
  - Dynamic volatility based on recent price action
  - Ensure all randomness is verifiable
- Handle buy/sell order execution with proper validation:
  - Check sufficient balance before buy
  - Check sufficient shares before sell
  - Atomic balance/position updates
  - Transaction rollback on errors
- Calculate P&L accurately:
  - Track average buy price for positions
  - Calculate unrealized P&L in real-time
  - Calculate realized P&L on sells
  - Handle partial position closes
- Integrate with `PayoutCalculator` for winnings
- Implement comprehensive error handling and logging

### Market State Management

**File**: `packages/backend/src/services/stock-market-state.ts`

- Singleton service managing global market state
- Price generation engine:
  - Initialize with starting price (e.g., $100)
  - Generate new price every 1-2 seconds
  - Store price history (last 1000 ticks or 24 hours)
  - Calculate OHLC candles from ticks (1min, 5min, 15min)
  - Maintain volatility state
  - Track momentum/trend direction
- Store current price, historical candles, active positions
- Broadcast price updates via Appwrite realtime
- Persistence: Save market state to database periodically
- Recovery: Load last state on server restart
- Performance: Optimize for high-frequency updates

### API Routes

**Update**: `packages/backend/src/routes/games.ts`

- `POST /api/games/stock-market/buy` - Buy shares at market price
- `POST /api/games/stock-market/sell` - Sell shares at market price
- `GET /api/games/stock-market/state` - Get current market state
- `GET /api/games/stock-market/positions` - Get user's open positions
- `GET /api/games/stock-market/history` - Get user's trade history
- `GET /api/games/stock-market/leaderboard` - Get top traders

### Appwrite Database Collections

**Create Appwrite Collections** (using Appwrite Console or SDK):

1. **`stock_market_positions` Collection**:
   - `user_id` (string, required) - Links to Appwrite Users
   - `shares` (float, required) - Number of shares owned
   - `avg_price` (float, required) - Average purchase price
   - `unrealized_pnl` (float) - Current unrealized profit/loss
   - `created_at` (datetime)
   - Permissions: Read/Write for authenticated users

2. **`stock_market_trades` Collection**:
   - `user_id` (string, required) - Links to Appwrite Users
   - `trade_type` (enum: 'buy', 'sell')
   - `shares` (float, required)
   - `price` (float, required)
   - `pnl` (float) - Realized profit/loss
   - `timestamp` (datetime)
   - Permissions: Read for all, Write for authenticated users

3. **`stock_market_candles` Collection**:
   - `timestamp` (datetime, required)
   - `open` (float, required)
   - `high` (float, required)
   - `low` (float, required)
   - `close` (float, required)
   - `volume` (float)
   - Permissions: Read for all, Write for server only

4. **`stock_market_state` Collection** (single document):
   - `current_price` (float, required)
   - `last_update` (datetime)
   - `volatility` (float)
   - `trend` (string: 'up', 'down', 'neutral')
   - Permissions: Read for all, Write for server only

5. **Update `game_history` Collection**:
   - Add `'stock_market'` to game_type enum values

### Appwrite Realtime Integration

**Backend - Market State Service**:
- Use Appwrite Server SDK to update documents in real-time
- Update `stock_market_state` document on price changes
- Create new documents in `stock_market_candles` collection
- Create new documents in `stock_market_trades` collection

**Frontend - Realtime Subscriptions**:
- Subscribe to `stock_market_state` document changes for price updates
- Subscribe to `stock_market_candles` collection for historical data
- Subscribe to `stock_market_trades` collection for live trade feed
- Use Appwrite Realtime SDK (already configured in frontend)

**Implementation**:
- Backend: Use `appwriteClient` from `config/appwrite.ts`
- Frontend: Use existing Appwrite client setup
- No custom WebSocket server needed - Appwrite handles it

## Frontend Implementation

### Main Game Component

**New File**: `packages/frontend/src/components/games/StockMarketGame.tsx`

- Real-time price chart (using lightweight-charts or recharts)
- Buy/Sell buttons with quantity input
- Position display (shares owned, avg price, current P&L)
- Order history table
- Live trade feed from other players

### Chart Component

**New File**: `packages/frontend/src/components/games/StockMarketChart.tsx`

- Candlestick or line chart showing price history
- Real-time updates as new prices arrive
- Technical indicators (optional: moving averages, volume)
- Responsive design for mobile/desktop

### Position Manager

**New File**: `packages/frontend/src/components/games/StockMarketPositions.tsx`

- Display open positions with unrealized P&L
- Quick sell buttons
- Position sizing calculator
- Risk metrics (exposure, max loss)

### Leaderboard Component

**New File**: `packages/frontend/src/components/games/StockMarketLeaderboard.tsx`

- Top traders by profit
- User's current rank
- Session statistics
- Filter by timeframe (daily/weekly/all-time)

### Page Component

**New File**: `packages/frontend/src/pages/StockMarketPage.tsx`

- Layout combining chart, trading panel, positions, and leaderboard
- Tarkov-themed styling consistent with existing games
- Mobile-responsive design

### Realtime Hook

**New File**: `packages/frontend/src/hooks/useStockMarketRealtime.ts`

- Subscribe to Appwrite realtime for price updates
- Subscribe to trade feed
- Handle connection state and reconnection
- Optimistic UI updates for user's own trades

### API Service

**New File**: `packages/frontend/src/services/stock-market-api.ts`

- `buyShares(amount, quantity)` - Place buy order
- `sellShares(quantity)` - Place sell order
- `getMarketState()` - Fetch current market data
- `getPositions()` - Fetch user positions
- `getLeaderboard()` - Fetch leaderboard data

## Routing and Navigation

### Router Update

**Update**: `packages/frontend/src/router/AppRouter.tsx`

- Replace `/blackjack` route with `/stock-market` route
- Import `StockMarketPage` instead of `BlackjackPage`
- Keep lazy loading pattern for performance

### Navigation Update

**Update**: Navigation components (likely `AppLayout.tsx` or similar)

- Replace "Blackjack" link with "Stock Market" or "Trading"
- Update icons and labels

### Homepage Update

**Update**: `packages/frontend/src/pages/HomePage.tsx`

- Replace blackjack game card with stock market game card
- Update description and preview image
- Update game statistics if displayed

## File Removals

### Backend Files to Remove

- `packages/backend/src/services/game-engine/blackjack-game.ts`
- Any blackjack-specific validation schemas
- Blackjack routes from `packages/backend/src/routes/games.ts`

### Frontend Files to Remove

- `packages/frontend/src/components/games/BlackjackGame.tsx`
- `packages/frontend/src/pages/BlackjackPage.tsx`
- Any blackjack-specific hooks or utilities

### Documentation to Remove/Update

- `docs/game-rules/blackjack.md`

## Testing Considerations

### Backend Tests

- Test buy/sell order execution
- Test P&L calculations
- Test position management
- Test provably fair price generation
- Test concurrent trading (race conditions)

### Frontend Tests

- Test real-time price updates
- Test order placement UI
- Test position display accuracy
- Test leaderboard updates

## Key Technical Details

### Appwrite Realtime Channels

- `databases.[DATABASE_ID].collections.stock_market_candles.documents` - Price updates
- `databases.[DATABASE_ID].collections.stock_market_trades.documents` - Trade feed
- Custom channel for market state if needed

### Price Generation Algorithm

```typescript
// Pseudocode for hybrid provably fair + realistic movement
1. Generate base random value using SecureRandomGenerator
2. Apply momentum factor (trend continuation)
3. Add mean reversion pressure (prevent runaway prices)
4. Apply volatility multiplier
5. Ensure price stays within bounds
6. Create OHLC candle from tick data
7. Store in Appwrite stock_market_candles collection
8. Update Appwrite stock_market_state document
9. Appwrite Realtime automatically broadcasts to all subscribers
```

### Position Management

- Track shares owned, average buy price
- Calculate unrealized P&L: `(currentPrice - avgPrice) * shares`
- On sell: realize P&L, update balance, record trade history
- Prevent selling more shares than owned

### Balance Integration

- Use existing Appwrite-based `CurrencyService` for balance management
- Update user balance in Appwrite `user_profiles` collection
- Deduct cost when buying: `price * shares`
- Credit proceeds when selling: `price * shares`
- Record in `game_history` collection with game_type='stock_market'
- Use Appwrite transactions for atomic operations

## UI/UX Considerations

### Tarkov Theme

- Dark military aesthetic consistent with existing games
- Green/red for profit/loss (standard trading colors)
- Gritty textures and fonts
- Sound effects for trades (cash register, market bell)

### Mobile Responsiveness

- Chart adapts to screen size
- Simplified trading interface on mobile
- Swipe gestures for chart navigation
- Bottom sheet for positions/orders

### Performance

- Throttle price updates to avoid overwhelming UI
- Use canvas-based charting library for smooth rendering
- Lazy load historical data
- Optimize Appwrite subscriptions

## Implementation Strategy

1. Remove all blackjack files and references
2. Create new stock market game from scratch
3. Update database schema with migrations
4. Build backend API and game engine
5. Build frontend components and pages
6. Update routing and navigation
7. Test thoroughly
8. Update documentation

## Future Enhancements (Optional)

### Phase 1 - Core Enhancements

- Multiple stocks/assets to trade
- Portfolio diversification metrics
- Achievements for trading milestones

### Phase 2 - Short Selling Implementation

**Short Selling Mechanics**:

- **Borrow & Sell**: Players can "short" shares they don't own by borrowing them
- **Profit from Decline**: Make money when the price goes down
- **Buy to Cover**: Close short position by buying shares back at (hopefully) lower price
- **Position Types**: Track both LONG (owned shares) and SHORT (borrowed shares) separately
- **P&L Calculation**: For shorts: `(shortPrice - currentPrice) * shares`

**Database Schema Additions**:

- Update `stock_market_positions` table to include `position_type` field ('long' or 'short')
- Track `borrow_price` for short positions (equivalent to avg_price for longs)
- Add `short_interest` metric to market state

**UI/UX for Shorts**:

- Add "Short" button alongside "Buy" button
- Add "Cover" button alongside "Sell" button
- Display short positions separately with inverted P&L colors (green when price drops)
- Show total exposure (long + short positions)
- Warning indicators for high-risk short positions

**Risk Management**:

- Require minimum balance to open short positions
- Implement margin requirements (e.g., must have 150% of short value in account)
- Add stop-loss for shorts to prevent unlimited losses
- Display risk metrics (max loss potential for shorts is theoretically unlimited)

**API Endpoints**:

- `POST /api/games/stock-market/short` - Open short position
- `POST /api/games/stock-market/cover` - Close short position
- `GET /api/games/stock-market/short-interest` - Get market short interest data

**Leaderboard Integration**:

- Track best short traders
- Show total short P&L separately
- Add "Short Squeeze" events to leaderboard highlights

**Educational Elements**:

- Tutorial explaining short selling mechanics
- Risk warnings for new players
- Examples of profitable vs. risky short trades

This feature would add significant depth to the trading game while maintaining the provably fair, continuous trading experience.

