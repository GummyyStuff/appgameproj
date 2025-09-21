# Real-time Communication Implementation

## Overview

This document describes the implementation of real-time communication using Supabase Realtime for the Tarkov Casino Website. The system provides real-time updates for game events, balance changes, and notifications across all connected clients.

## Architecture

### Backend Components

1. **SupabaseRealtimeService** (`src/services/realtime-supabase.ts`)
   - Singleton service managing Supabase Realtime channels
   - Handles broadcasting of game updates, balance changes, and notifications
   - Manages channel subscriptions and cleanup

2. **Database Integration** (`src/services/database.ts`)
   - Enhanced to work with real-time broadcasting
   - Processes game transactions and triggers real-time updates
   - Maintains data consistency between database and real-time events

3. **Database Triggers** (`src/database/migrations/004_realtime_triggers.sql`)
   - PostgreSQL triggers for automatic real-time notifications
   - Functions for balance changes, game completions, and big wins
   - Realtime publication configuration

### Frontend Components

1. **useSupabaseRealtime Hook** (`src/hooks/useSupabaseRealtime.ts`)
   - React hook for managing real-time subscriptions
   - Handles connection management and event callbacks
   - Provides connection status and cleanup

2. **RealtimeNotifications Component** (`src/components/ui/RealtimeNotifications.tsx`)
   - UI component for displaying real-time notifications
   - Toast notifications for important events
   - Notification history and management

3. **Real-time Game Service** (`src/services/realtime-game.ts`)
   - Game-specific real-time functionality
   - Room management and presence tracking
   - Game state synchronization

4. **useRealtimeGame Hook** (`src/hooks/useRealtimeGame.ts`)
   - React hook for game-specific real-time features
   - Handles game room joining/leaving
   - Manages game state updates and broadcasts

## Features Implemented

### ✅ Supabase Realtime Channels
- **game-events**: Real-time game state updates
- **balance-updates**: User balance change notifications
- **notifications**: System messages and alerts
- **user-specific channels**: Private user communications

### ✅ Real-time Game State Synchronization
- Game start/end notifications
- Player action broadcasts
- Game result distribution
- Multi-player game coordination

### ✅ Real-time Balance Updates
- Instant balance synchronization across all clients
- Transaction notifications
- Balance change animations
- Automatic UI updates

### ✅ Real-time Notifications
- Big win announcements
- System messages
- Game completion alerts
- Daily bonus notifications

### ✅ Database Triggers (Optional)
- Automatic real-time events from database changes
- Balance change notifications
- Game completion triggers
- Big win detection

## Usage Examples

### Backend - Broadcasting Events

```typescript
import { supabaseRealtimeService } from './services/realtime-supabase'

// Initialize service
await supabaseRealtimeService.initialize()

// Broadcast balance update
await supabaseRealtimeService.broadcastBalanceUpdate({
  userId: 'user-id',
  newBalance: 1500,
  previousBalance: 1000,
  change: 500,
  reason: 'game_win',
  timestamp: Date.now()
})

// Broadcast big win
await supabaseRealtimeService.broadcastBigWin(
  'user-id',
  'PlayerName',
  'roulette',
  5000,
  { betAmount: 100, multiplier: 50 }
)
```

### Frontend - Using Real-time Hooks

```typescript
import { useSupabaseRealtime } from './hooks/useSupabaseRealtime'

function GameComponent() {
  const { isConnected } = useSupabaseRealtime({
    onBalanceUpdate: (update) => {
      console.log('Balance updated:', update)
      // Update UI
    },
    onNotification: (notification) => {
      console.log('New notification:', notification)
      // Show toast
    },
    onBigWin: (data) => {
      console.log('Big win!', data)
      // Show celebration
    }
  })

  return (
    <div>
      Status: {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  )
}
```

### Frontend - Game-specific Real-time

```typescript
import { useRealtimeGame } from './hooks/useRealtimeGame'

function RouletteGame() {
  const { broadcastAction, sendGameUpdate } = useRealtimeGame({
    gameType: 'roulette',
    onGameUpdate: (update) => {
      console.log('Game update:', update)
    },
    onRoomUpdate: (state) => {
      console.log('Room state:', state)
    }
  })

  const placeBet = async (amount: number, betType: string) => {
    await broadcastAction('place_bet', { amount, betType })
  }

  return (
    <div>
      {/* Game UI */}
    </div>
  )
}
```

## Testing

### Backend Tests
- **test-realtime-setup.ts**: Basic real-time service functionality
- **test-realtime-integration.ts**: Complete integration with database operations

### Test Results
```
🎉 All realtime tests passed!
✅ Realtime service initialized
✅ Game transaction processed
✅ Balance update broadcast sent
✅ Big win broadcast sent
✅ Service shutdown completed
```

## Configuration

### Environment Variables
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
```

### Supabase Configuration
- Realtime enabled on tables: `user_profiles`, `game_history`, `daily_bonuses`
- RLS policies configured for secure access
- Publication `supabase_realtime` includes all relevant tables

## Performance Considerations

1. **Connection Management**
   - Automatic reconnection on network issues
   - Graceful degradation when real-time is unavailable
   - Connection pooling and cleanup

2. **Message Filtering**
   - User-specific channels to reduce unnecessary traffic
   - Event filtering on client side
   - Efficient payload sizes

3. **Scalability**
   - Channel-based architecture for horizontal scaling
   - Stateless service design
   - Database-driven event sourcing

## Security

1. **Authentication**
   - All real-time channels require authentication
   - User-specific channels with proper access control
   - RLS policies enforce data security

2. **Data Validation**
   - Server-side validation of all real-time events
   - Sanitized payloads to prevent XSS
   - Rate limiting on broadcast operations

## Future Enhancements

1. **Advanced Features**
   - Presence tracking for online users
   - Typing indicators for chat
   - Real-time leaderboards
   - Live game spectating

2. **Performance Optimizations**
   - Message batching for high-frequency updates
   - Compression for large payloads
   - CDN integration for global distribution

3. **Monitoring**
   - Real-time connection metrics
   - Event delivery tracking
   - Performance monitoring dashboard

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check Supabase URL and keys
   - Verify network connectivity
   - Review CORS configuration

2. **Missing Events**
   - Confirm channel subscriptions
   - Check RLS policies
   - Verify user authentication

3. **Performance Issues**
   - Monitor connection count
   - Review message frequency
   - Check for memory leaks

### Debug Commands

```bash
# Test real-time setup
bun run src/scripts/test-realtime-setup.ts

# Test complete integration
bun run src/scripts/test-realtime-integration.ts

# Check database connectivity
bun run src/scripts/test-connection.ts
```

## Conclusion

The real-time communication system is fully implemented and tested. It provides a robust foundation for real-time features in the Tarkov Casino Website, with proper error handling, security measures, and scalability considerations.

The system successfully handles:
- ✅ Real-time game state synchronization
- ✅ Instant balance updates across all clients
- ✅ System-wide notifications and alerts
- ✅ User-specific private communications
- ✅ Automatic cleanup and connection management

All requirements from task 18 have been successfully implemented and verified through comprehensive testing.