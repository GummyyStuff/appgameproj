# API Reference

## Health & Monitoring

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Basic service health status |
| GET | `/api/health/detailed` | Detailed system information |
| GET | `/api/ready` | Kubernetes-style readiness probe |
| GET | `/api/live` | Kubernetes-style liveness probe |
| GET | `/api/metrics` | Prometheus-compatible metrics |

## Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| POST | `/api/auth/reset-password` | Password reset |
| POST | `/api/auth/refresh` | Refresh authentication token |

## User

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/user/profile` | Get user profile |
| GET | `/api/user/balance` | Get current balance |
| GET | `/api/user/history` | Get user game history |
| GET | `/api/user/stats` | Get user statistics |
| GET | `/api/user/transactions` | Get transaction history |
| PUT | `/api/user/profile` | Update user profile |
| POST | `/api/user/validate-balance` | Validate sufficient balance |
| POST | `/api/user/daily-bonus` | Claim daily bonus |

## Games

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/games` | List all available games |
| GET | `/api/games/wheel-of-chance` | Get server-signed wheel layout + game information |
| POST | `/api/games/wheel-of-chance/spin` | Spin the wheel (requires signed layout + bets) |
| POST | `/api/games/provably-fair/verify` | Verify a spin's HMAC-SHA256 outcome |
| GET | `/api/games/roulette` | Get roulette game information |
| POST | `/api/games/roulette/bet` | Place roulette bet |
| GET | `/api/games/blackjack` | Get blackjack game information |
| POST | `/api/games/blackjack/start` | Start blackjack hand |
| POST | `/api/games/blackjack/action` | Perform blackjack action (hit, stand, double, split) |
| GET | `/api/games/cases` | Get available case types |
| GET | `/api/games/cases/:caseTypeId` | Get specific case details |
| POST | `/api/games/cases/start` | Start case opening (deduct price) |
| POST | `/api/games/cases/complete` | Complete case opening (credit winnings) |
| POST | `/api/games/cases/open` | One-step case opening |
| GET | `/api/games/cases/stats/:userId?` | Get case opening statistics |

## Statistics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/statistics/basic` | Get basic game statistics |
| GET | `/api/statistics/advanced` | Get comprehensive game statistics |
| GET | `/api/statistics/history` | Get filtered game history |
| GET | `/api/statistics/time-series` | Get time series data for charts |
| GET | `/api/statistics/game-breakdown` | Get statistics by game type |
| GET | `/api/statistics/streaks` | Get winning/losing streak data |
| GET | `/api/statistics/betting-patterns` | Get betting pattern analysis |
| GET | `/api/statistics/playing-habits` | Get playing habit statistics |
| GET | `/api/statistics/global` | Get global platform statistics |
| GET | `/api/statistics/export` | Export user statistics |

## Case Statistics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/case-statistics` | Get comprehensive case opening item statistics |

## Achievements

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/achievements` | Get all achievements with user progress |
| POST | `/api/achievements/progress` | Update achievement progress |
| POST | `/api/achievements/claim` | Claim achievement reward |
| GET | `/api/achievements/definitions` | Get all achievement definitions |

## Chat

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat/messages` | Send a chat message |
| GET | `/api/chat/messages` | Get recent chat messages |
| DELETE | `/api/chat/messages/:messageId` | Delete a message |
| POST | `/api/chat/presence` | Update user presence (online status) |
| GET | `/api/chat/online` | Get online users list |
| POST | `/api/chat/presence/cleanup` | Cleanup stale presence (moderator) |

## Analytics

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/analytics/events` | Track analytics events |
| GET | `/api/analytics/stats` | Get analytics data (placeholder) |

## Architecture

The API uses Hono for routing with TypeScript and Zod schema validation. Authentication is handled via Appwrite. All endpoints return JSON responses with proper HTTP status codes.

## Related

- [Appwrite Integration](../backend/appwrite-README.md)
- [Database Operations](../backend/database-README.md)
- [Statistics System](../backend/statistics-README.md)
