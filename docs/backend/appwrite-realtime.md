# Appwrite Realtime Guide

## Overview

Appwrite Realtime provides WebSocket-based live data synchronization, enabling real-time features like instant balance updates, live leaderboards, chat systems, and game notifications.

### Key Features

- 🔄 **Automatic Updates**: Receive data changes in real-time
- 🔌 **WebSocket Based**: Efficient bidirectional communication
- 🔒 **Permission Aware**: Only receive updates for accessible data
- 📡 **Channel System**: Subscribe to specific resources
- ⚡ **Low Latency**: Sub-second update delivery
- 🎯 **Event Filtering**: React to specific events only

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend Client                                    │
│  ├── Appwrite Client SDK                            │
│  ├── WebSocket Connection                           │
│  └── Event Handlers                                 │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ WSS (WebSocket Secure)
                      │
┌─────────────────────▼───────────────────────────────┐
│  Appwrite Realtime Service                          │
│  ├── WebSocket Server                               │
│  ├── Event Broadcasting                             │
│  ├── Permission Filtering                           │
│  └── Channel Management                             │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│  Appwrite Services                                  │
│  ├── Database Changes → Events                      │
│  ├── Auth Changes → Events                          │
│  ├── Storage Changes → Events                       │
│  └── Function Executions → Events                   │
└─────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User updates balance in database
   ↓
2. Appwrite Database Service triggers event
   ↓
3. Realtime Service broadcasts to subscribers
   ↓
4. Permission check for each subscriber
   ↓
5. Deliver event to authorized clients
   ↓
6. Client callback function executes
   ↓
7. UI updates with new data
```

---

## Basic Usage

### Setup Connection

```typescript
import { Client } from 'appwrite';

const client = new Client()
  .setEndpoint('https://<REGION>.cloud.appwrite.io/v1')
  .setProject('<PROJECT_ID>');

// Connection is automatically established when subscribing
```

### Simple Subscription

```typescript
// Subscribe to account updates
const unsubscribe = client.subscribe('account', response => {
  console.log('Account event:', response);
  console.log('Event type:', response.events);
  console.log('Updated data:', response.payload);
});

// Unsubscribe when component unmounts
unsubscribe();
```

### React Hook Example

```typescript
import { useEffect, useState } from 'react';
import { client } from '@/lib/appwrite';

function useRealtimeBalance(userId: string) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    // Subscribe to user profile updates
    const unsubscribe = client.subscribe(
      `databases.tarkov_casino.tables.user_profiles.rows.${userId}`,
      response => {
        // Check if balance was updated
        if (response.events.includes('databases.*.tables.*.rows.*.update')) {
          setBalance(response.payload.balance);
        }
      }
    );

    // Cleanup on unmount
    return () => unsubscribe();
  }, [userId]);

  return balance;
}
```

---

## Channel Types

### Account Channel

Subscribe to current user's account updates:

```typescript
client.subscribe('account', response => {
  // Triggered when:
  // - User updates name/email
  // - User updates preferences
  // - Session changes
  // - MFA changes
  console.log('Account updated:', response.payload);
});
```

**Events:**
- `users.*.update` - Account information updated
- `users.*.sessions.*.create` - New session created
- `users.*.sessions.*.delete` - Session deleted

### Database Channels

#### Subscribe to All Rows in a Table

```typescript
client.subscribe(
  'databases.tarkov_casino.tables.user_profiles.rows',
  response => {
    console.log('Any profile updated:', response.payload);
  }
);
```

**Use Cases:**
- Leaderboards (any user's balance changes)
- Global statistics
- Admin dashboards

#### Subscribe to Specific Row

```typescript
client.subscribe(
  `databases.tarkov_casino.tables.user_profiles.rows.${userId}`,
  response => {
    console.log('My profile updated:', response.payload);
  }
);
```

**Use Cases:**
- User's own balance
- User's profile data
- User-specific notifications

#### Subscribe to All Databases

```typescript
client.subscribe('databases', response => {
  console.log('Any database change:', response.payload);
});
```

**Use Cases:**
- Admin monitoring
- Audit logging
- System-wide notifications

### Storage Channels

```typescript
// All files in a bucket
client.subscribe('buckets.avatars.files', response => {
  if (response.events.includes('buckets.*.files.*.create')) {
    console.log('New avatar uploaded:', response.payload);
  }
});

// Specific file
client.subscribe('buckets.avatars.files.avatar123', response => {
  console.log('Avatar updated:', response.payload);
});
```

### Function Execution Channels

```typescript
client.subscribe('functions.processGameResult', response => {
  console.log('Function executed:', response.payload);
});
```

---

## Event Filtering

### Event Patterns

All Appwrite events follow a hierarchical pattern with wildcards:

```typescript
// Specific event
'databases.tarkov_casino.tables.user_profiles.rows.user123.update'

// Wildcard patterns (from most specific to least)
'databases.tarkov_casino.tables.user_profiles.rows.user123.update'
'databases.tarkov_casino.tables.user_profiles.rows.user123.*'
'databases.tarkov_casino.tables.user_profiles.rows.*.update'
'databases.tarkov_casino.tables.user_profiles.rows.*'
'databases.tarkov_casino.tables.user_profiles.*'
'databases.tarkov_casino.tables.*'
'databases.tarkov_casino.*'
'databases.*'
```

### Filtering in Callbacks

```typescript
client.subscribe('databases.tarkov_casino.tables.game_history.rows', response => {
  // Filter for specific events
  if (response.events.includes('databases.*.tables.*.rows.*.create')) {
    console.log('New game recorded:', response.payload);
  }

  if (response.events.includes('databases.*.tables.*.rows.*.update')) {
    console.log('Game updated:', response.payload);
  }

  // Filter by game type
  if (response.payload.game_type === 'roulette') {
    console.log('Roulette game:', response.payload);
  }
});
```

---

## Common Use Cases

### 1. Real-time Balance Updates

```typescript
import { useEffect, useState } from 'react';

function BalanceDisplay({ userId }: { userId: string }) {
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    // Subscribe to balance updates
    const unsubscribe = client.subscribe(
      `databases.tarkov_casino.tables.user_profiles.rows.${userId}`,
      response => {
        if (response.payload.balance !== undefined) {
          setBalance(response.payload.balance);
        }
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return <div>Balance: {balance}</div>;
}
```

### 2. Live Leaderboard

```typescript
function Leaderboard() {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    // Subscribe to all user profile changes
    const unsubscribe = client.subscribe(
      'databases.tarkov_casino.tables.user_profiles.rows',
      response => {
        // Re-fetch leaderboard when any balance changes
        if (response.events.includes('databases.*.tables.*.rows.*.update')) {
          fetchLeaderboard().then(setPlayers);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <ul>
      {players.map(player => (
        <li key={player.$id}>{player.username}: {player.balance}</li>
      ))}
    </ul>
  );
}
```

### 3. Real-time Chat

```typescript
function ChatWindow({ userId }: { userId: string }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Subscribe to chat messages
    const unsubscribe = client.subscribe(
      'databases.tarkov_casino.tables.chat_messages.rows',
      response => {
        if (response.events.includes('databases.*.tables.*.rows.*.create')) {
          // New message received
          setMessages(prev => [...prev, response.payload]);
        }

        if (response.events.includes('databases.*.tables.*.rows.*.delete')) {
          // Message deleted (moderation)
          setMessages(prev => 
            prev.filter(msg => msg.$id !== response.payload.$id)
          );
        }
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.$id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

### 4. Game Result Notifications

```typescript
function GameNotifications({ userId }: { userId: string }) {
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = client.subscribe(
      `databases.tarkov_casino.tables.game_history.rows`,
      response => {
        // Only show notifications for current user's games
        if (response.payload.user_id === userId &&
            response.events.includes('databases.*.tables.*.rows.*.create')) {
          
          const game = response.payload;
          if (game.win_amount > game.bet_amount) {
            setNotification(`You won ${game.win_amount}!`);
          } else {
            setNotification(`Better luck next time!`);
          }

          // Clear notification after 3 seconds
          setTimeout(() => setNotification(null), 3000);
        }
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return notification ? <div className="notification">{notification}</div> : null;
}
```

---

## Advanced Patterns

### Multiple Subscriptions

```typescript
function useRealtimeUserData(userId: string) {
  const [profile, setProfile] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);

  useEffect(() => {
    // Subscribe to profile updates
    const unsubProfile = client.subscribe(
      `databases.tarkov_casino.tables.user_profiles.rows.${userId}`,
      response => setProfile(response.payload)
    );

    // Subscribe to game history
    const unsubGames = client.subscribe(
      'databases.tarkov_casino.tables.game_history.rows',
      response => {
        if (response.payload.user_id === userId) {
          setGameHistory(prev => [response.payload, ...prev]);
        }
      }
    );

    return () => {
      unsubProfile();
      unsubGames();
    };
  }, [userId]);

  return { profile, gameHistory };
}
```

### Batched Updates

```typescript
function useBatchedLeaderboard() {
  const [updates, setUpdates] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    let updateQueue = [];
    let timeoutId;

    const unsubscribe = client.subscribe(
      'databases.tarkov_casino.tables.user_profiles.rows',
      response => {
        // Add to queue
        updateQueue.push(response.payload);

        // Debounce updates (batch within 500ms)
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          // Process batch
          setLeaderboard(prev => {
            const updated = [...prev];
            updateQueue.forEach(update => {
              const index = updated.findIndex(p => p.$id === update.$id);
              if (index >= 0) {
                updated[index] = update;
              } else {
                updated.push(update);
              }
            });
            updateQueue = [];
            return updated.sort((a, b) => b.balance - a.balance);
          });
        }, 500);
      }
    );

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  return leaderboard;
}
```

### Reconnection Handling

```typescript
function useRealtimeWithReconnect(channel: string, callback: (response: any) => void) {
  useEffect(() => {
    let unsubscribe: () => void;
    let reconnectTimeout: NodeJS.Timeout;

    const subscribe = () => {
      try {
        unsubscribe = client.subscribe(channel, response => {
          callback(response);
        });
      } catch (error) {
        console.error('Subscription failed, retrying in 5s:', error);
        reconnectTimeout = setTimeout(subscribe, 5000);
      }
    };

    subscribe();

    return () => {
      if (unsubscribe) unsubscribe();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [channel, callback]);
}
```

---

## Realtime Events Reference

### Database Events

```typescript
// Row created
'databases.*.tables.*.rows.*.create'
'databases.<DB_ID>.tables.<TABLE_ID>.rows.*.create'

// Row updated
'databases.*.tables.*.rows.*.update'
'databases.<DB_ID>.tables.<TABLE_ID>.rows.<ROW_ID>.update'

// Row deleted
'databases.*.tables.*.rows.*.delete'
'databases.<DB_ID>.tables.<TABLE_ID>.rows.<ROW_ID>.delete'

// Any row change
'databases.*.tables.*.rows.*'
```

### Authentication Events

```typescript
// Session created
'users.*.sessions.*.create'

// Session deleted
'users.*.sessions.*.delete'

// User updated
'users.*.update'

// Account recovery
'users.*.recovery.*.create'
```

### Storage Events

```typescript
// File created
'buckets.*.files.*.create'
'buckets.<BUCKET_ID>.files.*.create'

// File updated
'buckets.*.files.*.update'
'buckets.<BUCKET_ID>.files.<FILE_ID>.update'

// File deleted
'buckets.*.files.*.delete'
```

### Function Events

```typescript
// Function execution
'functions.*.executions.*'
'functions.<FUNCTION_ID>.executions.*.create'
```

---

## Performance Optimization

### Best Practices

1. **Subscribe Once**
   ```typescript
   // ✅ Good - Single subscription per component
   useEffect(() => {
     const unsubscribe = client.subscribe(channel, callback);
     return () => unsubscribe();
   }, []);

   // ❌ Bad - Multiple subscriptions
   client.subscribe(channel, callback1);
   client.subscribe(channel, callback2);  // Duplicate!
   ```

2. **Use Specific Channels**
   ```typescript
   // ✅ Good - Specific channel
   client.subscribe(
     `databases.tarkov_casino.tables.user_profiles.rows.${userId}`,
     callback
   );

   // ❌ Bad - Too broad
   client.subscribe('databases', callback);  // All database changes!
   ```

3. **Filter Events in Callback**
   ```typescript
   client.subscribe('databases.tarkov_casino.tables.game_history.rows', response => {
     // Only process relevant events
     if (!response.events.includes('databases.*.tables.*.rows.*.create')) {
       return;  // Ignore other events
     }

     // Only process current user's games
     if (response.payload.user_id !== currentUserId) {
       return;
     }

     // Process the event
     handleNewGame(response.payload);
   });
   ```

4. **Cleanup Subscriptions**
   ```typescript
   useEffect(() => {
     const unsubscribe = client.subscribe(channel, callback);
     
     // Always cleanup to prevent memory leaks
     return () => unsubscribe();
   }, [channel]);
   ```

### Performance Considerations

- **Connection Overhead**: Single WebSocket per client, reused for all subscriptions
- **Event Filtering**: Happens server-side based on permissions
- **Bandwidth**: Only receive events for subscribed channels
- **Latency**: Typically < 100ms from event to callback

---

## Security and Permissions

### Permission Filtering

Appwrite automatically filters events based on permissions:

```typescript
// User A subscribes to all profiles
client.subscribe('databases.tarkov_casino.tables.user_profiles.rows', response => {
  // User A will ONLY receive updates for:
  // 1. Rows with Permission.read(Role.any())
  // 2. Rows with Permission.read(Role.user(userA_id))
  // 3. Rows with Permission.read(Role.users())
  
  // User A will NOT receive updates for:
  // - Rows with Permission.read(Role.user(userB_id))
  // - Rows with no read permissions
});
```

### Authentication Required

```typescript
// Realtime requires authentication
// First, ensure user is logged in
const user = await account.get();

// Then subscribe (session is automatically included)
const unsubscribe = client.subscribe(channel, callback);
```

### Reconnection on Re-authentication

```typescript
// If user logs out and logs back in, recreate subscriptions
useEffect(() => {
  if (!user) return;

  // Subscribe after authentication
  const unsubscribe = client.subscribe(
    `databases.tarkov_casino.tables.user_profiles.rows.${user.$id}`,
    callback
  );

  return () => unsubscribe();
}, [user]);  // Re-subscribe when user changes
```

---

## Error Handling

### Connection Errors

```typescript
function useRealtimeWithErrorHandling(channel: string, callback: (response: any) => void) {
  const [error, setError] = useState<Error | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    try {
      const unsubscribe = client.subscribe(channel, response => {
        setConnected(true);
        setError(null);
        callback(response);
      });

      return () => {
        unsubscribe();
        setConnected(false);
      };
    } catch (err) {
      setError(err as Error);
      setConnected(false);
    }
  }, [channel, callback]);

  return { error, connected };
}
```

### Retry Logic

```typescript
function useRealtimeWithRetry(
  channel: string,
  callback: (response: any) => void,
  maxRetries: number = 3
) {
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    const subscribe = () => {
      try {
        return client.subscribe(channel, response => {
          setRetries(0);  // Reset on success
          callback(response);
        });
      } catch (error) {
        if (retries < maxRetries) {
          console.log(`Retry ${retries + 1}/${maxRetries}`);
          setTimeout(() => setRetries(r => r + 1), 1000 * (retries + 1));
        }
      }
    };

    const unsubscribe = subscribe();
    return () => unsubscribe?.();
  }, [channel, callback, retries, maxRetries]);
}
```

---

## Testing Realtime

### Development Testing

```typescript
// Test file: test-realtime.ts
import { Client } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!);

// Test subscription
const unsubscribe = client.subscribe('account', response => {
  console.log('✅ Realtime working!', response);
});

// Trigger event by updating account
setTimeout(async () => {
  const account = new Account(client);
  await account.updateName({ name: 'Test Name' });
  
  // Should trigger subscription callback
  setTimeout(() => unsubscribe(), 1000);
}, 2000);
```

### Mock Realtime for Tests

```typescript
// Mock for unit tests
const mockClient = {
  subscribe: jest.fn((channel, callback) => {
    // Return unsubscribe function
    return jest.fn();
  })
};

// Test component with mock
test('subscribes to realtime updates', () => {
  render(<Component client={mockClient} />);
  
  expect(mockClient.subscribe).toHaveBeenCalledWith(
    'account',
    expect.any(Function)
  );
});
```

---

## Integration Examples

### Complete User Profile Component

```typescript
import { useEffect, useState } from 'react';
import { client, databases } from '@/lib/appwrite';

interface UserProfile {
  $id: string;
  username: string;
  balance: number;
  total_games_played: number;
}

function UserProfileCard({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    async function loadProfile() {
      try {
        const data = await databases.getRow({
          databaseId: 'tarkov_casino',
          tableId: 'user_profiles',
          rowId: userId
        });
        setProfile(data as UserProfile);
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();

    // Subscribe to updates
    const unsubscribe = client.subscribe(
      `databases.tarkov_casino.tables.user_profiles.rows.${userId}`,
      response => {
        if (response.events.includes('databases.*.tables.*.rows.*.update')) {
          setProfile(response.payload as UserProfile);
        }
      }
    );

    return () => unsubscribe();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>Profile not found</div>;

  return (
    <div>
      <h2>{profile.username}</h2>
      <p>Balance: {profile.balance}</p>
      <p>Games Played: {profile.total_games_played}</p>
    </div>
  );
}
```

---

## Debugging

### Enable Debug Logging

```typescript
// Add to your initialization
const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

// Subscribe with logging
const unsubscribe = client.subscribe(channel, response => {
  console.log('📡 Realtime Event Received:');
  console.log('  Channel:', channel);
  console.log('  Events:', response.events);
  console.log('  Timestamp:', response.timestamp);
  console.log('  Payload:', response.payload);
});
```

### Monitor Subscription Status

```typescript
function useRealtimeStatus() {
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = client.subscribe('account', response => {
      setConnected(true);
      setLastUpdate(new Date());
    });

    // Check if connected
    setTimeout(() => {
      if (!connected) {
        console.warn('Realtime not connected after 5 seconds');
      }
    }, 5000);

    return () => {
      unsubscribe();
      setConnected(false);
    };
  }, []);

  return { connected, lastUpdate };
}
```

---

## Troubleshooting

### Common Issues

**1. Subscription Not Receiving Events**

Possible causes:
- User not authenticated
- Insufficient permissions on the row
- Wrong channel format
- Event type doesn't match filter

**Solution:**
```typescript
// Check authentication
const user = await account.get().catch(() => null);
if (!user) {
  console.error('Not authenticated');
}

// Verify channel format
console.log('Subscribing to:', channel);

// Log all events to debug
client.subscribe(channel, response => {
  console.log('Received event:', response.events);
  console.log('Payload:', response.payload);
});
```

**2. Multiple Duplicate Events**

Possible causes:
- Multiple subscriptions to same channel
- Component re-mounting without cleanup

**Solution:**
```typescript
// ✅ Good - Cleanup on unmount
useEffect(() => {
  const unsubscribe = client.subscribe(channel, callback);
  return () => unsubscribe();  // Always cleanup!
}, []);

// ❌ Bad - Missing cleanup
useEffect(() => {
  client.subscribe(channel, callback);
  // No cleanup! Creates duplicate subscriptions
}, []);
```

**3. Connection Dropping**

Possible causes:
- Network issues
- Server maintenance
- Session expired

**Solution:**
```typescript
// Implement reconnection logic
const subscribe = () => {
  try {
    return client.subscribe(channel, callback);
  } catch (error) {
    setTimeout(subscribe, 5000);  // Retry after 5s
  }
};
```

---

## Best Practices Summary

### ✅ Do's

1. **Cleanup Subscriptions**: Always unsubscribe on component unmount
2. **Use Specific Channels**: Subscribe to the most specific channel possible
3. **Filter Events**: Check event types in callbacks
4. **Handle Errors**: Implement error handling and retry logic
5. **Authenticate First**: Ensure user is logged in before subscribing
6. **Optimize Updates**: Batch or debounce rapid updates

### ❌ Don'ts

1. **Don't Subscribe to Everything**: Avoid `databases.*` subscriptions
2. **Don't Forget Cleanup**: Missing cleanup causes memory leaks
3. **Don't Duplicate Subscriptions**: One subscription per channel
4. **Don't Ignore Permissions**: Ensure proper read permissions
5. **Don't Block UI**: Keep callbacks fast and non-blocking

---

## Resources

### Official Documentation
- [Appwrite Realtime API](https://appwrite.io/docs/apis/realtime)
- [Appwrite Events Reference](https://appwrite.io/docs/advanced/platform/events)
- [Appwrite Permissions](https://appwrite.io/docs/advanced/platform/permissions)

### Project Documentation
- [Appwrite Integration Guide](./appwrite-README.md)
- [Database Guide](./database-README.md)
- [Chat System Implementation](../chat-system.md)

---

**Last Updated:** 2025-10-12  
**Appwrite Version:** 18.0+  
**Status:** Production Ready ✅

