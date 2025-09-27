# Tarkov Casino API Documentation

## Overview

The Tarkov Casino API provides endpoints for user authentication, game operations, and account management. All endpoints return JSON responses and use standard HTTP status codes.

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

The API uses Supabase Auth with JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

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
| `AUTH_REQUIRED` | Authentication token required |
| `INVALID_TOKEN` | Invalid or expired token |
| `INSUFFICIENT_BALANCE` | Not enough virtual currency |
| `INVALID_BET` | Bet amount or type is invalid |
| `GAME_ERROR` | Game logic error |
| `VALIDATION_ERROR` | Input validation failed |
| `SERVER_ERROR` | Internal server error |

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- Authentication endpoints: 5 requests per minute
- Game endpoints: 30 requests per minute
- General endpoints: 60 requests per minute

## Endpoints

### Authentication

#### POST /auth/register
Register a new user account.

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
      "id": "uuid",
      "username": "string",
      "email": "string",
      "balance": 10000,
      "createdAt": "ISO date"
    },
    "token": "jwt_token"
  }
}
```

#### POST /auth/login
Authenticate user and get access token.

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
      "id": "uuid",
      "username": "string",
      "email": "string",
      "balance": 10000,
      "lastLogin": "ISO date"
    },
    "token": "jwt_token"
  }
}
```

#### POST /auth/logout
Invalidate current session.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": null
}
```

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

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "balance": 10000,
    "createdAt": "ISO date",
    "lastLogin": "ISO date",
    "stats": {
      "totalGamesPlayed": 150,
      "totalWagered": 50000,
      "totalWon": 45000,
      "favoriteGame": "roulette"
    }
  }
}
```

#### GET /user/balance
Get current virtual currency balance.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 10000,
    "lastUpdated": "ISO date"
  }
}
```

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
    "database": "connected",
    "supabase": "connected"
  }
}
```

## WebSocket Events

The API also supports real-time updates via WebSocket connections.

### Connection
```javascript
const socket = io('wss://your-domain.com', {
  auth: {
    token: 'jwt_token'
  }
});
```

### Events

#### Client to Server
- `join-game`: Join a game room for real-time updates
- `leave-game`: Leave a game room

#### Server to Client
- `balance-update`: Real-time balance changes
- `game-result`: Game completion notifications
- `system-message`: System announcements

## SDK Examples

### JavaScript/TypeScript
```typescript
class TarkovCasinoAPI {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (data.success) {
      this.token = data.data.token;
    }
    return data;
  }

  async placeBet(gameType: string, betData: object) {
    return fetch(`${this.baseUrl}/games/${gameType}/bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(betData)
    }).then(res => res.json());
  }
}
```

### cURL Examples
```bash
# Login
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Place roulette bet
curl -X POST https://your-domain.com/api/games/roulette/bet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"betAmount":100,"betType":"number","betValue":7}'

# Get user profile
curl -X GET https://your-domain.com/api/user/profile \
  -H "Authorization: Bearer <token>"
```

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
- Check that JWT token is included in Authorization header
- Verify token hasn't expired (tokens expire after 24 hours)
- Ensure user account is active

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