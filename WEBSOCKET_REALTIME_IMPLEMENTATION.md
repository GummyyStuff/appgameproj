# Appwrite Realtime Websocket Implementation

## Summary

We've successfully implemented proper Appwrite Realtime websocket connections for the stock market game and other games in the application.

## What Was Fixed

### 1. **Real-time Game Service (`realtime-game.ts`)**
   - **Before**: The service was just a stub that stored callbacks but didn't actually implement Appwrite Realtime subscriptions
   - **After**: Now properly implements Appwrite Realtime subscriptions using `client.subscribe()`
   - **Key Features**:
     - Subscribes to `game_updates` collection for user-specific game updates
     - Subscribes to `game_rooms` collection for global game room state
     - Properly manages subscription lifecycle (subscribe/unsubscribe)
     - Tracks connection status
     - Supports all game types: roulette, blackjack, stock_market, case_opening
     - **Uses correct pattern**: `client.subscribe()` for Web/JavaScript (not a separate Realtime service)

### 2. **Stock Market Realtime Hook (`useStockMarketRealtime.ts`)**
   - Already properly implemented with Appwrite Realtime
   - Subscribes to three collections:
     - `stock_market_state` - Current market price and state
     - `stock_market_trades` - Trade feed updates
     - `stock_market_candles` - Historical candle data
   - Properly handles subscription lifecycle
   - Provides callbacks for price updates, trade updates, and candle updates

### 3. **Realtime Game Hook (`useRealtimeGame.ts`)**
   - Updated to support `stock_market` game type
   - Uses the updated realtime-game service
   - Provides unified interface for all games

### 4. **Appwrite Realtime Service (`appwrite-realtime.ts`)**
   - **Fixed**: Updated to use correct `client.subscribe()` pattern
   - Used by balance updates, chat, game history, and presence
   - **Uses correct pattern**: `client.subscribe()` for Web/JavaScript

### 5. **Removed Custom WebSocket Server**
   - **Deleted**: `websocket-server.ts` (no longer needed)
   - **Updated**: `currency-new.ts` to rely on Appwrite Realtime instead of custom broadcasts
   - **Updated**: `backend/index.ts` to remove WebSocket server initialization
   - **Result**: Simpler architecture using Appwrite Realtime for all real-time updates

## How Appwrite Realtime Works

### Subscription Pattern

**For Web/JavaScript**, you use `client.subscribe()` directly (NOT a separate Realtime service):

```typescript
const unsubscribe = appwriteClient.subscribe(
  `databases.${DATABASE_ID}.collections.{collection}.documents`,
  (response: any) => {
    if (response.events.includes('databases.*.collections.*.documents.*.update')) {
      // Handle update
      onUpdate(response.payload)
    }
  }
)
```

**Important**: For Web/JavaScript, you use `client.subscribe()` directly. For other platforms (Flutter, Apple, Android), you would use a separate `Realtime` service.

### Event Types

Appwrite Realtime provides these event types:
- `databases.*.collections.*.documents.*.create` - New document created
- `databases.*.collections.*.documents.*.update` - Document updated
- `databases.*.collections.*.documents.*.delete` - Document deleted

### Channels

Channels follow this pattern:
```
databases.{databaseId}.collections.{collectionId}.documents.{documentId}
```

You can use wildcards:
- `databases.{databaseId}.collections.{collectionId}.documents` - All documents in a collection
- `databases.{databaseId}.collections.*.documents` - All documents in all collections
- `databases.*.collections.*.documents` - All documents in all databases

## Required Database Collections

To make this work, you need to create these collections in Appwrite:

### 1. **game_updates** (for user-specific game updates)
   - Attributes:
     - `userId` (string, required)
     - `gameType` (string, required) - roulette, blackjack, stock_market, case_opening
     - `gameId` (string, optional)
     - `status` (string, required) - betting, playing, completed
     - `data` (string, optional) - JSON data
     - `timestamp` (integer, required)
   - Permissions: User can read/write their own documents

### 2. **game_rooms** (for global game room state)
   - Attributes:
     - `gameType` (string, required)
     - `activeGames` (integer, required)
     - `recentWins` (string, required) - JSON array
     - `onlineUsers` (integer, required)
   - Permissions: Public read, authenticated write

### 3. **stock_market_state** (for current market state)
   - Attributes:
     - `current_price` (double, required)
     - `trend` (string, required) - up, down, neutral
     - `volatility` (double, required)
     - `last_update` (datetime, required)
   - Permissions: Public read, authenticated write

### 4. **stock_market_trades** (for trade feed)
   - Attributes:
     - `userId` (string, required)
     - `username` (string, required)
     - `type` (string, required) - buy, sell
     - `amount` (double, required)
     - `price` (double, required)
     - `timestamp` (datetime, required)
   - Permissions: Public read, authenticated write

### 5. **stock_market_candles** (for historical data)
   - Attributes:
     - `timestamp` (datetime, required)
     - `open` (double, required)
     - `high` (double, required)
     - `low` (double, required)
     - `close` (double, required)
     - `volume` (integer, required)
   - Permissions: Public read, authenticated write

## Testing the Implementation

### 1. Test Stock Market Realtime

```typescript
// In your component
const { isConnected, error } = useStockMarketRealtime({
  onPriceUpdate: (state) => {
    console.log('Price updated:', state)
  },
  onTradeUpdate: (trade) => {
    console.log('New trade:', trade)
  },
  onCandleUpdate: (candle) => {
    console.log('New candle:', candle)
  },
  enabled: true
})

console.log('Connected:', isConnected)
console.log('Error:', error)
```

### 2. Test Game Realtime

```typescript
const { isSubscribed, isInRoom } = useRealtimeGame({
  gameType: 'stock_market',
  onGameUpdate: (update) => {
    console.log('Game update:', update)
  },
  onRoomUpdate: (state) => {
    console.log('Room update:', state)
  },
  autoJoinRoom: true,
  enablePresence: true
})
```

### 3. Check Browser Console

Look for these log messages:
- ✅ Subscribed to stock_market updates for user {userId}
- ✅ Subscribed to stock_market room updates
- ✅ All stock market subscriptions active
- ✅ User {username} joined stock_market room

### 4. Test with Network Tab

1. Open Chrome DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Look for connections to your Appwrite instance
4. You should see WebSocket connections being established

### 5. Test Real-time Updates

1. Open the stock market page
2. In another tab/window, manually update a document in the Appwrite console
3. You should see the update reflected immediately in the first tab

## Common Issues and Solutions

### Issue: "Not connected to realtime"
**Solution**: Check that:
- You're authenticated (user is logged in)
- The collections exist in Appwrite
- You have proper permissions on the collections
- The DATABASE_ID environment variable is set correctly

### Issue: "No updates received"
**Solution**: 
- Check that documents are being created/updated in the database
- Verify the collection names match exactly
- Check browser console for subscription errors
- Verify the user has read permissions on the collections

### Issue: "WebSocket connection failed"
**Solution**:
- Check your Appwrite instance is running
- Verify the endpoint URL is correct
- Check for CORS issues
- Ensure WebSocket connections are allowed by your firewall/proxy

## Next Steps

1. **Create the required collections** in Appwrite Console
2. **Set up proper permissions** for each collection
3. **Test the stock market page** to verify real-time updates work
4. **Add real-time updates to other games** (roulette, case opening, etc.)
5. **Implement backend logic** to create/update documents when game events occur

## Documentation References

- [Appwrite Realtime Documentation](https://appwrite.io/docs/advanced/platform/realtime)
- [Appwrite Client SDK](https://appwrite.io/docs/sdks/client/web)
- [Appwrite Databases](https://appwrite.io/docs/products/databases)

## Notes

- The current implementation uses placeholder logic for broadcasting (just logs)
- You'll need to implement actual document creation/updates in your backend
- Consider using Appwrite Functions to handle game logic and emit real-time updates
- For production, implement proper error handling and reconnection logic

