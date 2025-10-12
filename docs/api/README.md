# Tarkov Casino API Documentation

## Overview

The Tarkov Casino API provides endpoints for user authentication, game operations, and account management. All endpoints return JSON responses and use standard HTTP status codes.

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

The API uses Appwrite Authentication with session-based authentication. The Appwrite client SDK automatically handles session management. For direct API calls, you can include the session in headers:

```
X-Appwrite-Project: <PROJECT_ID>
X-Appwrite-JWT: <session_jwt>
```

Alternatively, the backend API provides its own authentication layer that integrates with Appwrite sessions.

## Response Format

All API responses follow this structure:

```json
{
  "success": boolean,
  "data": object | array | null,
  "error": {
    "code": string,
    "message": string
  } | null
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication session required |
| `INVALID_SESSION` | Invalid or expired session |
| `INSUFFICIENT_BALANCE` | Not enough virtual currency |
| `INVALID_BET` | Bet amount or type is invalid |
| `GAME_ERROR` | Game logic error |
| `VALIDATION_ERROR` | Input validation failed (Zod schema) |
| `APPWRITE_ERROR` | Appwrite service error |
| `CACHE_ERROR` | Cache service error (non-critical) |
| `SERVER_ERROR` | Internal server error |

## Rate Limiting

API endpoints are rate limited to prevent abuse (powered by Dragonfly cache):
- Authentication endpoints: 5 requests per minute per IP
- Game endpoints: 30 requests per minute per user
- General endpoints: 60 requests per minute per IP
- Daily bonus: 1 request per 24 hours per user

Rate limits automatically reset after the time window expires.

## Endpoints

### Authentication

#### POST /auth/register
Register a new user account via Appwrite.

**Request Body:**
```json
{
  "username": "string (3-20 characters)",
  "email": "string (valid email)",
  "password": "string (min 8 characters)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "$id": "unique_user_id",
      "username": "string",
      "email": "string",
      "balance": 10000,
      "$createdAt": "ISO date",
      "$updatedAt": "ISO date"
    },
    "session": {
      "$id": "session_id",
      "userId": "unique_user_id",
      "expire": "ISO date"
    }
  }
}
```

> **Note**: Appwrite automatically creates a session upon registration. The session is stored client-side by the Appwrite SDK.

#### POST /auth/login
Authenticate user and create session.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "$id": "unique_user_id",
      "username": "string",
      "email": "string",
      "balance": 10000,
      "$updatedAt": "ISO date"
    },
    "session": {
      "$id": "session_id",
      "userId": "unique_user_id",
      "provider": "email",
      "expire": "ISO date"
    }
  }
}
```

> **Note**: The session is automatically managed by the Appwrite SDK and stored in browser cookies/localStorage.

#### POST /auth/logout
Invalidate current Appwrite session.

**Headers:** Session automatically included by Appwrite SDK

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Session deleted successfully"
  }
}
```

> **Note**: This endpoint deletes the active Appwrite session. The SDK clears client-side session storage automatically.

#### POST /auth/reset-password
Request password reset email.

**Request Body:**
```json
{
  "email": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset email sent"
  }
}
```

### User Management

#### GET /user/profile
Get current user profile information.

**Headers:** Session automatically included by Appwrite SDK

**Response:**
```json
{
  "success": true,
  "data": {
    "$id": "unique_user_id",
    "username": "string",
    "email": "string",
    "balance": 10000,
    "$createdAt": "ISO date",
    "$updatedAt": "ISO date",
    "stats": {
      "totalGamesPlayed": 150,
      "totalWagered": 50000,
      "totalWon": 45000,
      "favoriteGame": "roulette"
    }
  }
}
```

> **Note**: User data is fetched from Appwrite and cached for performance.

#### GET /user/balance
Get current virtual currency balance.

**Headers:** Session automatically included by Appwrite SDK

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 10000,
    "$updatedAt": "ISO date"
  }
}
```

> **Note**: Balance is cached in Dragonfly with 60-second TTL for optimal performance.

#### GET /user/history
Get game history with optional filtering.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `gameType`: Filter by game type (roulette, blackjack)
- `limit`: Number of results (default: 50, max: 200)
- `offset`: Pagination offset (default: 0)
- `startDate`: Filter from date (ISO format)
- `endDate`: Filter to date (ISO format)

**Response:**
```json
{
  "success": true,
  "data": {
    "games": [
      {
        "id": "uuid",
        "gameType": "roulette",
        "betAmount": 100,
        "winAmount": 200,
        "result": 7,
        "gameData": {
          "betType": "number",
          "winningNumber": 7
        },
        "timestamp": "ISO date"
      }
    ],
    "total": 150,
    "hasMore": true
  }
}
```

#### GET /user/stats
Get detailed user statistics.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "totalGamesPlayed": 150,
      "totalWagered": 50000,
      "totalWon": 45000,
      "netProfit": -5000,
      "winRate": 0.45
    },
    "byGame": {
      "roulette": {
        "gamesPlayed": 75,
        "totalWagered": 25000,
        "totalWon": 22000,
        "winRate": 0.42
      },
      "blackjack": {
        "gamesPlayed": 50,
        "totalWagered": 15000,
        "totalWon": 14500,
        "winRate": 0.48
      }
    }
  }
}
```

### Game Endpoints

#### POST /games/roulette/bet
Place a roulette bet.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "betAmount": 100,
  "betType": "number|red|black|odd|even|high|low",
  "betValue": 7
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gameId": "uuid",
    "winningNumber": 7,
    "winAmount": 3600,
    "newBalance": 13500,
    "gameData": {
      "betType": "number",
      "betValue": 7,
      "multiplier": 36
    }
  }
}
```

#### POST /games/blackjack/start
Start a new blackjack hand.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "betAmount": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gameId": "uuid",
    "playerHand": [
      {"suit": "hearts", "rank": "A", "value": 11},
      {"suit": "spades", "rank": "K", "value": 10}
    ],
    "dealerHand": [
      {"suit": "diamonds", "rank": "7", "value": 7},
      {"suit": "hidden", "rank": "hidden", "value": 0}
    ],
    "playerValue": 21,
    "dealerValue": 7,
    "gameStatus": "blackjack",
    "canDouble": false,
    "canSplit": false
  }
}
```

#### POST /games/blackjack/action
Perform blackjack action (hit, stand, double, split).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "gameId": "uuid",
  "action": "hit|stand|double|split"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gameId": "uuid",
    "playerHand": [
      {"suit": "hearts", "rank": "A", "value": 11},
      {"suit": "spades", "rank": "K", "value": 10},
      {"suit": "clubs", "rank": "5", "value": 5}
    ],
    "dealerHand": [
      {"suit": "diamonds", "rank": "7", "value": 7},
      {"suit": "hearts", "rank": "Q", "value": 10}
    ],
    "playerValue": 16,
    "dealerValue": 17,
    "gameStatus": "lost",
    "winAmount": 0,
    "newBalance": 9900
  }
}
```


### Health Check

#### GET /health
Check API health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "ISO date",
    "version": "1.0.0",
    "uptime": 123456,
    "services": {
      "appwrite": "connected",
      "cache": "connected",
      "database": "connected"
    }
  }
}
```

#### GET /health/detailed
Get detailed system health information including memory usage and service status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "ISO date",
    "uptime": 123456,
    "memory": {
      "heapUsed": 45678901,
      "heapTotal": 89012345,
      "external": 1234567
    },
    "services": {
      "appwrite": {
        "status": "connected",
        "endpoint": "https://<REGION>.cloud.appwrite.io/v1"
      },
      "cache": {
        "status": "connected",
        "type": "dragonfly",
        "onlinePlayers": 42
      }
    }
  }
}
```

## Real-time Updates

The application supports real-time updates via Appwrite Realtime API.

### Appwrite Realtime Channels

```javascript
import { Client } from 'appwrite';

const client = new Client()
  .setEndpoint('https://<REGION>.cloud.appwrite.io/v1')
  .setProject('<PROJECT_ID>');

// Subscribe to user balance updates
client.subscribe('databases.<DATABASE_ID>.tables.<USERS_TABLE_ID>.rows.<USER_ID>', response => {
  if (response.events.includes('databases.*.tables.*.rows.*.update')) {
    console.log('Balance updated:', response.payload.balance);
  }
});
```

### Available Channels

- `account` - User account updates (profile, preferences)
- `databases.<DB_ID>.tables.<TABLE_ID>.rows.<ROW_ID>` - Specific user data updates
- `databases.<DB_ID>.tables.<TABLE_ID>.rows` - All rows in a table (for leaderboards)

### Events

All Appwrite Realtime events follow the pattern:
- `databases.*.tables.*.rows.*.create` - New row created
- `databases.*.tables.*.rows.*.update` - Row updated  
- `databases.*.tables.*.rows.*.delete` - Row deleted

> **Permissions**: Users only receive updates for data they have read permissions for, enforced by Appwrite.

## SDK Examples

### JavaScript/TypeScript with Appwrite
```typescript
import { Client, Account, TablesDB, ID } from 'appwrite';

class TarkovCasinoClient {
  private client: Client;
  private account: Account;
  private databases: TablesDB;
  private apiUrl: string;

  constructor(endpoint: string, projectId: string, apiUrl: string) {
    this.client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId);
    
    this.account = new Account(this.client);
    this.databases = new TablesDB(this.client);
    this.apiUrl = apiUrl;
  }

  async register(email: string, password: string, username: string) {
    // Create Appwrite account
    const user = await this.account.create({
      userId: ID.unique(),
      email,
      password,
      name: username
    });
    
    // Create session
    const session = await this.account.createEmailPasswordSession({
      email,
      password
    });
    
    return { user, session };
  }

  async login(email: string, password: string) {
    const session = await this.account.createEmailPasswordSession({
      email,
      password
    });
    return session;
  }

  async placeBet(gameType: string, betData: object) {
    // Session is automatically included by Appwrite SDK
    return fetch(`${this.apiUrl}/games/${gameType}/bet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(betData)
    }).then(res => res.json());
  }

  async getProfile() {
    // Get current user from Appwrite
    return await this.account.get();
  }
}
```

### cURL Examples
```bash
# Register (via backend API)
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","username":"player1"}'

# Login (via backend API)
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Place roulette bet (session handled by frontend SDK)
curl -X POST https://your-domain.com/api/games/roulette/bet \
  -H "Content-Type: application/json" \
  -d '{"betAmount":100,"betType":"number","betValue":7}'

# Get user profile (session handled by frontend SDK)
curl -X GET https://your-domain.com/api/user/profile
```

> **Note**: When using the Appwrite client SDK, session management is automatic. Direct API calls may require session headers.

## Testing

Use the provided test endpoints to verify API functionality:

```bash
# Health check
curl https://your-domain.com/api/health

# Test authentication
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

## Support

For API support and questions:
- Check the troubleshooting section below
- Review error codes and responses
- Contact development team

## Troubleshooting

### Common Issues

**401 Unauthorized**
- Ensure user is logged in via Appwrite
- Check that session hasn't expired (default: 365 days)
- Verify Appwrite project ID is correct
- Ensure user account is active and verified

**400 Bad Request**
- Validate request body format matches API specification
- Check required fields are included
- Verify data types match expected values

**429 Too Many Requests**
- Implement exponential backoff in your client
- Respect rate limits outlined above
- Consider caching responses where appropriate

**500 Internal Server Error**
- Check API status page
- Retry request after brief delay
- Contact support if issue persists