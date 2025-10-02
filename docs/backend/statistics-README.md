# Game History and Statistics System

## Overview

The game history and statistics system provides comprehensive tracking, analysis, and visualization of user gaming data for the Tarkov Casino Website. This system automatically records all game transactions and provides detailed analytics through various API endpoints.

## Architecture

### Core Components

1. **DatabaseService** - Handles game transaction recording and basic data retrieval
2. **StatisticsService** - Provides advanced analytics and data processing
3. **Statistics API Routes** - RESTful endpoints for accessing statistics data
4. **Database RPC Functions** - Atomic database operations for game transactions

### Data Flow

```
Game Play → DatabaseService.processGameTransaction() → Database (game_history table)
                                ↓
User Request → Statistics API → StatisticsService → Processed Analytics → JSON Response
```

## Features

### 1. Game History Recording

All game sessions are automatically recorded with the following data:
- Game type (roulette, blackjack)
- Bet amount and win amount
- Game-specific result data (cards, numbers, multipliers)
- Timestamp and duration
- User identification

**Implementation:**
```typescript
// Automatic recording during game transactions
await DatabaseService.processGameTransaction(
  userId,
  gameType,
  betAmount,
  winAmount,
  resultData,
  gameDuration
)
```

### 2. Statistics Calculation

#### Overview Statistics
- Total games played
- Total amount wagered and won
- Net profit/loss
- Win rate percentage
- Biggest wins and losses
- Average bet and win amounts
- Profit margin

#### Game Type Breakdown
- Statistics per game type (roulette, blackjack)
- Popularity rankings
- Recent performance trends
- Comparative analysis

#### Time Series Data
- Daily gaming activity
- Wagered and won amounts over time
- Profit/loss trends
- Data prepared for chart visualization

#### Win/Loss Streaks
- Current streak (wins or losses)
- Longest winning streak
- Longest losing streak
- Streak pattern analysis

#### Betting Patterns
- Most common bet amounts
- Bet distribution across ranges
- Betting behavior analysis

#### Playing Habits
- Most active hours and days
- Session length analysis
- Total play time tracking
- Gaming pattern insights

### 3. Data Visualization Preparation

All statistics are formatted for easy integration with frontend charting libraries:

```typescript
interface TimeSeriesData {
  date: string
  games: number
  wagered: number
  won: number
  profit: number
}

interface GameTypeBreakdown {
  gameType: string
  statistics: GameStatistics
  recentTrend: 'up' | 'down' | 'stable'
  popularityRank: number
}
```

## API Endpoints

### Basic Statistics
```
GET /api/statistics/basic
```
Returns fundamental user statistics from the database.

### Advanced Statistics
```
GET /api/statistics/advanced?gameType=roulette&dateFrom=2024-01-01T00:00:00Z
```
Returns comprehensive analytics with filtering options.

### Game History
```
GET /api/statistics/history?limit=50&offset=0&gameType=blackjack
```
Returns paginated game history with filtering.

### Time Series Data
```
GET /api/statistics/time-series?dateFrom=2024-01-01T00:00:00Z
```
Returns data formatted for time-based charts.

### Game Breakdown
```
GET /api/statistics/game-breakdown
```
Returns statistics broken down by game type.

### Win/Loss Streaks
```
GET /api/statistics/streaks?gameType=roulette
```
Returns streak analysis data.

### Betting Patterns
```
GET /api/statistics/betting-patterns
```
Returns betting behavior analysis.

### Playing Habits
```
GET /api/statistics/playing-habits
```
Returns session and timing analysis.

### Leaderboard
```
GET /api/statistics/leaderboard?metric=balance&limit=10
```
Returns top players by various metrics.

### Global Statistics
```
GET /api/statistics/global?days=30
```
Returns platform-wide statistics (admin/analytics).

### Data Export
```
GET /api/statistics/export?gameType=roulette
```
Returns data formatted for CSV export.

## Database Schema

### game_history Table
```sql
CREATE TABLE game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  game_type TEXT NOT NULL CHECK (game_type IN ('roulette', 'blackjack')),
  bet_amount DECIMAL(15,2) NOT NULL,
  win_amount DECIMAL(15,2) NOT NULL,
  result_data JSONB NOT NULL,
  game_duration INTEGER, -- milliseconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### RPC Functions

#### process_game_transaction
Atomically processes game bets and wins while recording history:
```sql
SELECT process_game_transaction(
  user_uuid,
  game_type_param,
  bet_amount_param,
  win_amount_param,
  result_data_param,
  game_duration_param
);
```

#### get_user_statistics
Returns comprehensive user statistics:
```sql
SELECT get_user_statistics(user_uuid);
```

#### get_game_history
Returns paginated game history with filtering:
```sql
SELECT get_game_history(user_uuid, limit_param, offset_param, game_type_filter);
```

## Usage Examples

### Recording a Game Transaction
```typescript
const result = await DatabaseService.processGameTransaction(
  'user-123',
  'roulette',
  100,
  200,
  {
    bet_type: 'red',
    bet_value: 'red',
    winning_number: 7,
    multiplier: 2
  },
  30000 // 30 seconds
)
```

### Getting Advanced Statistics
```typescript
const stats = await StatisticsService.getAdvancedStatistics('user-123', {
  gameType: 'blackjack',
  dateFrom: '2024-01-01T00:00:00Z',
  dateTo: '2024-01-31T23:59:59Z'
})
```

### Calculating Time Series for Charts
```typescript
const gameHistory = await StatisticsService.getFilteredGameHistory('user-123', filters)
const timeSeriesData = StatisticsService.calculateTimeSeriesData(gameHistory)

// Use with Chart.js, D3, or other visualization libraries
const chartData = {
  labels: timeSeriesData.map(d => d.date),
  datasets: [{
    label: 'Daily Profit',
    data: timeSeriesData.map(d => d.profit)
  }]
}
```

## Testing

### Unit Tests
- **statistics.test.ts** - Comprehensive tests for all calculation methods
- **statistics-integration.test.ts** - Integration tests between services
- **statistics.test.ts** (routes) - API endpoint functionality tests

### Test Coverage
- ✅ Empty data handling
- ✅ Single game scenarios
- ✅ Multiple game calculations
- ✅ Edge cases (zero bets, negative wins)
- ✅ Large number handling
- ✅ Date/time processing
- ✅ Streak calculations
- ✅ Session grouping
- ✅ API parameter validation
- ✅ Error handling

### Running Tests
```bash
# Run all statistics tests
bun test packages/backend/src/services/statistics*.test.ts packages/backend/src/routes/statistics.test.ts --run

# Run specific test file
bun test packages/backend/src/services/statistics.test.ts --run
```

## Performance Considerations

### Database Optimization
- Indexed columns: `user_id`, `game_type`, `created_at`
- Pagination for large result sets
- RPC functions for atomic operations
- Efficient query patterns

### Caching Strategy
- Statistics can be cached for short periods (5-15 minutes)
- Time series data is suitable for longer caching
- User-specific data requires user-scoped caching

### Memory Management
- Limit result sets to reasonable sizes (1000 games max for calculations)
- Stream large exports rather than loading all data
- Use pagination for history endpoints

## Security

### Authentication
- All endpoints require valid user authentication
- User data is isolated by user ID
- RLS (Row Level Security) policies in database

### Data Validation
- Input sanitization for all parameters
- Game type validation against allowed values
- Numeric range validation for amounts and dates
- SQL injection prevention through parameterized queries

### Privacy
- User statistics are private to each user
- Global statistics are anonymized
- Leaderboard shows only usernames/display names

## Error Handling

### Service Level
- Graceful handling of empty data sets
- Validation of input parameters
- Database connection error recovery
- Logging of calculation errors

### API Level
- HTTP status codes for different error types
- Structured error responses
- Input validation with detailed messages
- Rate limiting protection

## Future Enhancements

### Planned Features
- Real-time statistics updates via WebSocket
- Advanced filtering (date ranges, bet ranges)
- Comparative statistics (vs other players)
- Achievement tracking
- Detailed session analysis
- Machine learning insights

### Scalability Improvements
- Database partitioning for large datasets
- Redis caching layer
- Background job processing for heavy calculations
- API response compression

## Troubleshooting

### Common Issues

1. **Empty Statistics**
   - Check if user has played any games
   - Verify game transactions are being recorded
   - Ensure proper date filtering

2. **Incorrect Calculations**
   - Verify game result data format
   - Check win/loss determination logic
   - Validate bet amount and win amount values

3. **Performance Issues**
   - Check database indexes
   - Limit result set sizes
   - Use appropriate caching
   - Monitor query execution times

### Debug Tools
```typescript
// Enable detailed logging
console.log('Game history count:', gameHistory.length)
console.log('Calculation input:', { userId, filters })
console.log('Statistics result:', statistics)
```

## Conclusion

The game history and statistics system provides a comprehensive foundation for tracking and analyzing user gaming behavior. With robust testing, proper error handling, and scalable architecture, it supports both current needs and future growth of the Tarkov Casino platform.