# Real-Time Updates Implementation

## Overview

This document explains how **TRUE REAL-TIME** updates work in the Tarkov Casino frontend application. The system uses **Appwrite Realtime WebSocket subscriptions** for instant updates, with polling as a fallback.

## Architecture

### 1. Primary: Appwrite Realtime (WebSocket Subscriptions) ⚡

We use **Appwrite Realtime** to subscribe to database document changes. When the backend updates a user's balance or game history, the frontend receives the update **INSTANTLY** via WebSocket.

#### Key Features:

- **INSTANT Updates**: Updates happen the moment data changes in the database
- **Efficient**: Only updates when something actually changes (no wasted API calls)
- **WebSocket Connection**: Real-time bidirectional communication
- **Automatic Reconnection**: Handles connection drops gracefully

#### Subscriptions:

- **User Balance**: Subscribes to user document updates → **INSTANT balance updates**
- **Game History**: Subscribes to game_history collection → **INSTANT game results**
- **Statistics**: Automatically refreshes when balance changes

### 2. Fallback: Polling (React Query)

We keep **slow polling as a fallback** (every 30 seconds) in case the WebSocket connection drops:

- **Balance Updates**: 30-second fallback poll
- **Statistics Updates**: 30-second fallback poll  
- **Game History Updates**: 30-second fallback poll
- **Currency Stats Updates**: 30-second fallback poll

This ensures the app works even if WebSocket fails.

## Implementation Details

### Real-Time Configuration

All queries use the following configuration:

```typescript
{
  staleTime: 5000, // Consider data stale after 5 seconds
  refetchInterval: 30000, // Fallback poll every 30 seconds (only if WebSocket fails)
  refetchIntervalInBackground: true, // Continue polling even when tab is in background
}
```

### Appwrite Realtime Subscription

The `useBalance` hook sets up a real-time subscription:

```typescript
// Subscribe to user document changes
const unsubscribe = subscribeToUserBalance(user.id, (newBalance) => {
  console.log('💰 Balance updated via real-time:', newBalance);
  
  // Update React Query cache INSTANTLY
  queryClient.setQueryData(['balance', user.id], newBalance);
  
  // Invalidate related queries
  queryClient.invalidateQueries({ queryKey: ['currencyStats', user.id] });
  queryClient.invalidateQueries({ queryKey: ['userStats', user.id] });
});
```

### Files Modified

1. **`useBalance.ts`** - Balance polling with 3-second interval
2. **`StatisticsDashboard.tsx`** - Statistics and game history polling
3. **`CurrencyManager.tsx`** - Currency stats polling

### Performance Considerations

#### Why Real-Time Instead of Polling?

**Before (Polling every 3 seconds):**
- ❌ **Delayed**: Updates every 3 seconds at most
- ❌ **Wasteful**: Makes API calls even when nothing changed
- ❌ **Server load**: Constant requests every 3 seconds
- ❌ **Battery drain**: Constant network activity

**Now (Appwrite Realtime):**
- ✅ **INSTANT**: Updates the moment data changes in the database
- ✅ **Efficient**: Only updates when something actually changes
- ✅ **Server-friendly**: No constant polling
- ✅ **Battery-friendly**: Only uses network when data changes

#### Fallback Polling (30 seconds)

We keep a slow fallback poll (30 seconds) to ensure:
- App works even if WebSocket connection drops
- Data stays fresh if real-time fails
- Graceful degradation for poor network conditions

### Real-Time Features

#### What Updates INSTANTLY (via WebSocket):

✅ **Balance** - Your current roubles balance (INSTANT!)  
✅ **Profit/Loss** - Net profit or loss from all games (INSTANT!)  
✅ **Statistics** - Total games, win rate, biggest wins/losses (INSTANT!)  
✅ **Game History** - Recent game results (INSTANT!)  
✅ **Currency Stats** - Total wagered, won, games played (INSTANT!)  

#### Update Flow:

1. **You play a game** → Backend updates your balance in Appwrite
2. **Appwrite fires WebSocket event** → Frontend receives update
3. **React Query cache updates** → UI updates INSTANTLY
4. **You see your profit change** → No page refresh needed!

#### What Doesn't Update (by design):

❌ **Game State** - Active game state is managed separately  
❌ **Chat Messages** - Uses separate WebSocket connection  
❌ **User Presence** - Uses separate WebSocket connection  

## Usage Example

### Watching Your Profit Go Up/Down

```typescript
// In any component
import { useBalance } from '@/hooks/useBalance'

function MyComponent() {
  const { balance, previousBalance } = useBalance()
  
  // balance will update automatically every 3 seconds
  // previousBalance is kept for animation purposes
}
```

### Manual Refresh

If you need to force an immediate update:

```typescript
import { useQueryClient } from '@tanstack/react-query'

function MyComponent() {
  const queryClient = useQueryClient()
  
  const handleRefresh = () => {
    // Invalidate all queries
    queryClient.invalidateQueries()
    
    // Or invalidate specific queries
    queryClient.invalidateQueries({ queryKey: ['balance', userId] })
    queryClient.invalidateQueries({ queryKey: ['userStats', userId] })
  }
}
```

## Troubleshooting

### Updates Not Showing?

1. **Check Network Tab**: Look for API calls every 3 seconds
2. **Check Console**: Look for React Query logs
3. **Check Backend**: Ensure API endpoints are returning fresh data

### Too Many API Calls?

If you're concerned about server load:

1. **Increase `refetchInterval`**: Change from 3000 to 5000 or 10000
2. **Disable Background Polling**: Set `refetchIntervalInBackground: false`
3. **Use WebSocket Only**: Rely on Appwrite Realtime instead of polling

### Performance Issues?

If the app feels sluggish:

1. **Reduce Polling Frequency**: Increase `refetchInterval` to 5000ms
2. **Optimize Backend**: Ensure API endpoints are fast (< 100ms)
3. **Add Caching**: Use React Query's caching more aggressively

## Future Improvements

### Planned Enhancements:

1. **Adaptive Polling**: Reduce polling frequency when user is idle
2. **WebSocket-First**: Prioritize WebSocket updates over polling
3. **Optimistic Updates**: Update UI immediately before server confirms
4. **Smart Invalidation**: Only refresh data that actually changed

### Performance Monitoring:

- Track API call frequency
- Monitor WebSocket connection health
- Measure update latency
- Track user engagement metrics

## Best Practices

### For Developers:

1. **Always use `refetchIntervalInBackground: true`** for game data
2. **Keep polling intervals between 2-5 seconds** for real-time feel
3. **Use WebSocket subscriptions** for critical updates (balance, chat)
4. **Invalidate queries** after mutations (game results, balance changes)
5. **Test on slow connections** to ensure graceful degradation

### For Users:

1. **Keep browser tab active** for best performance
2. **Check internet connection** if updates stop
3. **Refresh page** if data seems stale
4. **Report issues** if updates don't work as expected

## Related Documentation

- [React Query Documentation](https://tanstack.com/query/latest)
- [Appwrite Realtime Documentation](https://appwrite.io/docs/products/realtime)
- [Performance Optimization Guide](./performance-optimization.md)

