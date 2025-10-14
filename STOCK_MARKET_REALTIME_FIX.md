# Stock Market Realtime Connection Fix

## Problem
The Appwrite realtime connection for the stock market game was failing with the following errors:
1. WebSocket connection to `wss://db.juanis.cool/v1/realtime` was failing
2. WebSocket was closed before the connection was established
3. Wrong channel format being used (tables/rows instead of collections/documents)

## Root Causes

### 1. Missing Realtime Endpoint Configuration
The Appwrite client was configured with the HTTP endpoint (`https://db.juanis.cool/v1`) but the realtime WebSocket connection needs the WSS endpoint (`wss://db.juanis.cool/v1/realtime`).

### 2. Incorrect Channel Format
The stock market collections use the old Appwrite API format (collections/documents), but the realtime hook was trying to subscribe using the new format (tables/rows).

## Fixes Applied

### 1. Configured Realtime Endpoint
**File:** `packages/frontend/src/lib/appwrite.ts`

Added code to automatically convert the HTTP endpoint to WSS for WebSocket connections:

```typescript
// Configure Realtime endpoint for WebSocket connections
// Convert https:// to wss:// for WebSocket connections
const realtimeEndpoint = requiredEnvVars.VITE_APPWRITE_ENDPOINT.replace('https://', 'wss://').replace('http://', 'ws://');
appwriteClient.setEndpointRealtime(realtimeEndpoint);
```

### 2. Fixed Channel Format
**File:** `packages/frontend/src/hooks/useStockMarketRealtime.ts`

Updated all channel subscriptions to use the correct format:

**Before:**
```typescript
`databases.${DATABASE_ID}.tables.stock_market_state.rows.current`
`databases.${DATABASE_ID}.tables.stock_market_trades.rows`
`databases.${DATABASE_ID}.tables.stock_market_candles.rows`
```

**After:**
```typescript
`databases.${DATABASE_ID}.collections.stock_market_state.documents.current`
`databases.${DATABASE_ID}.collections.stock_market_trades.documents`
`databases.${DATABASE_ID}.collections.stock_market_candles.documents`
```

## Testing

To verify the fix works:

1. **Restart the frontend development server:**
   ```bash
   cd packages/frontend
   bun run dev
   ```

2. **Navigate to the Stock Market page:**
   - Open your browser to the stock market page
   - Open the browser console (F12)
   - Look for these success messages:
     - `✅ Subscribed to market state updates`
     - `✅ Subscribed to trade feed updates`
     - `✅ Subscribed to candle updates`
     - `✅ All stock market subscriptions active`

3. **Verify realtime updates:**
   - The stock price should update in real-time
   - The chart should update with new candles
   - Trade feed should show new trades as they happen

## Expected Behavior

After the fix, the stock market page should:
- ✅ Load the initial market data
- ✅ Establish WebSocket connection to Appwrite Realtime
- ✅ Subscribe to market state updates
- ✅ Subscribe to trade feed updates
- ✅ Subscribe to candle updates
- ✅ Display real-time price changes on the chart
- ✅ Update the current price display in real-time
- ✅ Show new trades in the trade feed

## Troubleshooting

If you still see errors:

1. **Check the browser console for WebSocket errors**
   - Should see `✅ Subscribed to...` messages
   - Should NOT see `WebSocket connection failed` errors

2. **Verify environment variables:**
   ```bash
   cat packages/frontend/.env
   ```
   - Ensure `VITE_APPWRITE_ENDPOINT=https://db.juanis.cool/v1`
   - Ensure `VITE_APPWRITE_PROJECT_ID=tarkovcas`
   - Ensure `VITE_APPWRITE_DATABASE_ID=main_db`

3. **Check Appwrite server logs:**
   - Verify the WebSocket endpoint is accessible
   - Check if there are any permission issues

4. **Verify stock market collections exist:**
   ```bash
   cd packages/backend
   bun run packages/backend/scripts/setup-stock-market-collections.ts
   ```

## Technical Details

### Channel Format
Appwrite Realtime uses channels to subscribe to specific resources. The format is:
```
databases.<DATABASE_ID>.collections.<COLLECTION_ID>.documents.<DOCUMENT_ID>
```

For wildcards:
- `databases.<DATABASE_ID>.collections.<COLLECTION_ID>.documents` - All documents in a collection
- `databases.*.collections.*.documents.*` - All documents in all collections

### Event Types
- `create` - New document created
- `update` - Document updated
- `delete` - Document deleted

### WebSocket Connection
The Appwrite client automatically handles:
- WebSocket connection establishment
- Reconnection on disconnect
- Heartbeat/ping messages
- Authentication via session

## References

- [Appwrite Realtime Documentation](https://appwrite.io/docs/apis/realtime)
- [Appwrite Client SDK](https://appwrite.io/docs/sdks/web)
- [WebSocket Protocol](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
